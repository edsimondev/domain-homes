import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runInstantLeadAlert } from '@/lib/automation'
import { sendLeadConfirmation } from '@/lib/email/templates'
import { sendLeadTelegramAlert } from '@/lib/telegram'
import { scoreLead } from '@/lib/scoring'

// Simple in-memory rate limiter — max 5 submissions per IP per 10 minutes
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const window = 10 * 60 * 1000 // 10 minutes
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + window })
    return true
  }
  if (entry.count >= 5) return false
  entry.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
    }

    const body = await request.json()
    const {
      name, email, phone, message, listing_id,
      source = 'website', budget_min, budget_max,
      preferred_location, property_type, timeline
    } = body

    // Basic validation
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return NextResponse.json({ error: 'A valid name is required' }, { status: 400 })
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }
    if (!email && !phone) {
      return NextResponse.json({ error: 'Email or phone number is required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Score lead using unified BANT scorer
    const lead_score = scoreLead({ name, email, phone, budget_min, budget_max, preferred_location, property_type, timeline, message })

    // Fetch listing title if this came from a listing page
    let listing_title: string | null = null
    if (listing_id) {
      const { data: listing } = await supabase
        .from('listings')
        .select('title')
        .eq('id', listing_id)
        .single()
      listing_title = listing?.title || null
    }

    const payload = {
      name,
      email: email || null,
      phone: phone || null,
      message: message || null,
      listing_id: listing_id || null,
      source,
      lead_score,
      budget_min: budget_min || null,
      budget_max: budget_max || null,
      preferred_location: preferred_location || null,
      property_type: property_type || null,
      timeline: timeline || null,
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(payload)
      .select()
      .single()

    if (error) throw error

    // 🔥 AUTOMATION 1: Instant agent alert (non-blocking)
    runInstantLeadAlert(data).catch(console.error)

    // ✅ CONFIRMATION EMAIL to the lead (non-blocking)
    if (email) {
      sendLeadConfirmation({
        to: email,
        leadName: name.split(' ')[0],
        source,
        budget_max: budget_max || null,
        preferred_location: preferred_location || null,
        property_type: property_type || null,
        message: message || null,
        listing_title,
      }).catch(console.error)
    }

    // 📊 MAKE.COM WEBHOOK — fires on every new lead
    // Sends full lead data to Make.com which handles:
    //   → Google Sheets logging
    //   → Agent email alert with AI suggested reply
    //   → Lead acknowledgement email
    //   → Telegram ping
    const makeWebhookUrl = process.env.MAKE_LEAD_WEBHOOK_URL || 'https://hook.eu1.make.com/5ldoq65rty8cxrk3yvjackofrlxijjo6'
    fetch(makeWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Lead identity
        id:                 data.id,
        name:               data.name || '',
        first_name:         (data.name || '').split(' ')[0],
        email:              data.email || '',
        phone:              data.phone || '',
        // Qualification
        lead_score:         data.lead_score || 'cold',
        lead_score_label:   data.lead_score === 'hot' ? 'HOT LEAD' : data.lead_score === 'warm' ? 'WARM LEAD' : 'NEW LEAD',
        source:             data.source || 'website',
        source_label:       data.source === 'ai_chat' ? 'AI Chat' : data.source === 'contact_form' ? 'Contact Form' : 'Website',
        // Property preferences
        budget_min:         data.budget_min || '',
        budget_max:         data.budget_max || '',
        budget_text:        data.budget_max ? `$${Number(data.budget_max).toLocaleString()}` : 'Not specified',
        preferred_location: data.preferred_location || '',
        property_type:      data.property_type || '',
        timeline:           data.timeline || '',
        listing_type:       data.listing_type || '',
        // Message
        message:            data.message || '',
        listing_title:      listing_title || '',
        // Meta
        created_at:         data.created_at,
        site_name:          process.env.NEXT_PUBLIC_SITE_NAME || 'Domaine',
        site_url:           process.env.NEXT_PUBLIC_SITE_URL  || '',
        admin_url:          `${process.env.NEXT_PUBLIC_SITE_URL}/admin/leads`,
        booking_url:        process.env.NEXT_PUBLIC_CAL_BOOKING_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/contact`,
      }),
    }).catch(err => console.warn('[Make.com] Webhook failed:', err.message))

    // 📣 TELEGRAM ALERT — fires for ALL leads (hot, warm, cold)
    sendLeadTelegramAlert(data)

    // Auto-enroll in default nurture sequence if one is set to trigger on new leads
    const { data: autoSequence } = await supabase
      .from('nurture_sequences')
      .select('id, steps_count, delay_days')
      .eq('trigger_type', 'on_lead')
      .eq('is_active', true)
      .or(`target_lead_score.eq.all,target_lead_score.eq.${lead_score}`)
      .limit(1)
      .single()

    if (autoSequence) {
      const delayDays: number[] = autoSequence.delay_days || [1, 7, 14, 30, 60]

      await supabase.from('nurture_enrollments').upsert({
        sequence_id: autoSequence.id,
        lead_id: data.id,
        status: 'active',
        enrolled_at: new Date().toISOString(),
      }, { onConflict: 'sequence_id,lead_id' })

      const queueItems = delayDays.slice(0, autoSequence.steps_count).map((days: number, idx: number) => ({
        sequence_id: autoSequence.id,
        lead_id: data.id,
        step_number: idx + 1,
        total_steps: autoSequence.steps_count,
        status: 'pending',
        scheduled_for: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
      }))

      await supabase.from('nurture_queue').upsert(queueItems, {
        onConflict: 'sequence_id,lead_id,step_number',
      })
    }

    return NextResponse.json({ success: true, id: data.id })
  } catch (error: any) {
    console.error('[Leads API]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()
    const { searchParams } = new URL(request.url)
    const score = searchParams.get('score')
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (score) query = query.eq('lead_score', score)

    const { data, error } = await query
    if (error) throw error

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


// import { NextRequest, NextResponse } from 'next/server'
// import { createAdminClient } from '@/lib/supabase/server'
// import { runInstantLeadAlert } from '@/lib/automation'
// import { sendLeadConfirmation } from '@/lib/email/templates'
// import { sendLeadTelegramAlert } from '@/lib/telegram'
// import { scoreLead } from '@/lib/scoring'

// // Simple in-memory rate limiter — max 5 submissions per IP per 10 minutes
// const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// function checkRateLimit(ip: string): boolean {
//   const now = Date.now()
//   const window = 10 * 60 * 1000 // 10 minutes
//   const entry = rateLimitMap.get(ip)
//   if (!entry || now > entry.resetAt) {
//     rateLimitMap.set(ip, { count: 1, resetAt: now + window })
//     return true
//   }
//   if (entry.count >= 5) return false
//   entry.count++
//   return true
// }

// export async function POST(request: NextRequest) {
//   try {
//     // Rate limiting
//     const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
//     if (!checkRateLimit(ip)) {
//       return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
//     }

//     const body = await request.json()
//     const {
//       name, email, phone, message, listing_id,
//       source = 'website', budget_min, budget_max,
//       preferred_location, property_type, timeline
//     } = body

//     // Basic validation
//     if (!name || typeof name !== 'string' || name.trim().length < 2) {
//       return NextResponse.json({ error: 'A valid name is required' }, { status: 400 })
//     }
//     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
//     }
//     if (!email && !phone) {
//       return NextResponse.json({ error: 'Email or phone number is required' }, { status: 400 })
//     }

//     const supabase = await createAdminClient()

//     // Score lead using unified BANT scorer
//     const lead_score = scoreLead({ name, email, phone, budget_min, budget_max, preferred_location, property_type, timeline, message })

//     // Fetch listing title if this came from a listing page
//     let listing_title: string | null = null
//     if (listing_id) {
//       const { data: listing } = await supabase
//         .from('listings')
//         .select('title')
//         .eq('id', listing_id)
//         .single()
//       listing_title = listing?.title || null
//     }

//     const payload = {
//       name,
//       email: email || null,
//       phone: phone || null,
//       message: message || null,
//       listing_id: listing_id || null,
//       source,
//       lead_score,
//       budget_min: budget_min || null,
//       budget_max: budget_max || null,
//       preferred_location: preferred_location || null,
//       property_type: property_type || null,
//       timeline: timeline || null,
//     }

//     const { data, error } = await supabase
//       .from('leads')
//       .insert(payload)
//       .select()
//       .single()

//     if (error) throw error

//     // 🔥 AUTOMATION 1: Instant agent alert (non-blocking)
//     runInstantLeadAlert(data).catch(console.error)

//     // ✅ CONFIRMATION EMAIL to the lead (non-blocking)
//     if (email) {
//       sendLeadConfirmation({
//         to: email,
//         leadName: name.split(' ')[0],
//         source,
//         budget_max: budget_max || null,
//         preferred_location: preferred_location || null,
//         property_type: property_type || null,
//         message: message || null,
//         listing_title,
//       }).catch(console.error)
//     }

//     // 📊 GOOGLE SHEETS MIRROR (non-blocking, only if webhook is configured)
//     // Mirror lead to Google Sheets (via Apps Script — no Make.com needed)
//     if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
//       fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sheets`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: data.name,
//           email: data.email || '',
//           phone: data.phone || '',
//           lead_score: data.lead_score,
//           source: data.source,
//           budget_max: data.budget_max || '',
//           preferred_location: data.preferred_location || '',
//           property_type: data.property_type || '',
//           listing_title: listing_title || '',
//           message: data.message || '',
//           created_at: data.created_at,
//         }),
//       }).catch(console.error)
//     }

//     // 📣 TELEGRAM ALERT — fires for ALL leads (hot, warm, cold)
//     sendLeadTelegramAlert(data)

//     // Auto-enroll in default nurture sequence if one is set to trigger on new leads
//     const { data: autoSequence } = await supabase
//       .from('nurture_sequences')
//       .select('id, steps_count, delay_days')
//       .eq('trigger_type', 'on_lead')
//       .eq('is_active', true)
//       .or(`target_lead_score.eq.all,target_lead_score.eq.${lead_score}`)
//       .limit(1)
//       .single()

//     if (autoSequence) {
//       const delayDays: number[] = autoSequence.delay_days || [1, 7, 14, 30, 60]

//       await supabase.from('nurture_enrollments').upsert({
//         sequence_id: autoSequence.id,
//         lead_id: data.id,
//         status: 'active',
//         enrolled_at: new Date().toISOString(),
//       }, { onConflict: 'sequence_id,lead_id' })

//       const queueItems = delayDays.slice(0, autoSequence.steps_count).map((days: number, idx: number) => ({
//         sequence_id: autoSequence.id,
//         lead_id: data.id,
//         step_number: idx + 1,
//         total_steps: autoSequence.steps_count,
//         status: 'pending',
//         scheduled_for: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
//       }))

//       await supabase.from('nurture_queue').upsert(queueItems, {
//         onConflict: 'sequence_id,lead_id,step_number',
//       })
//     }

//     return NextResponse.json({ success: true, id: data.id })
//   } catch (error: any) {
//     console.error('[Leads API]', error)
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }

// export async function GET(request: NextRequest) {
//   try {
//     const supabase = await createAdminClient()
//     const { searchParams } = new URL(request.url)
//     const score = searchParams.get('score')
//     const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50

//     let query = supabase
//       .from('leads')
//       .select('*')
//       .order('created_at', { ascending: false })
//       .limit(limit)

//     if (score) query = query.eq('lead_score', score)

//     const { data, error } = await query
//     if (error) throw error

//     return NextResponse.json({ data })
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }


// import { NextRequest, NextResponse } from 'next/server'
// import { createAdminClient } from '@/lib/supabase/server'
// import { runInstantLeadAlert } from '@/lib/automation'
// import { sendLeadConfirmation } from '@/lib/email/templates'
// import { sendLeadTelegramAlert } from '@/lib/telegram'
// import { scoreLead } from '@/lib/scoring'

// // Simple in-memory rate limiter — max 5 submissions per IP per 10 minutes
// const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

// function checkRateLimit(ip: string): boolean {
//   const now = Date.now()
//   const window = 10 * 60 * 1000 // 10 minutes
//   const entry = rateLimitMap.get(ip)
//   if (!entry || now > entry.resetAt) {
//     rateLimitMap.set(ip, { count: 1, resetAt: now + window })
//     return true
//   }
//   if (entry.count >= 5) return false
//   entry.count++
//   return true
// }

// export async function POST(request: NextRequest) {
//   try {
//     // Rate limiting
//     const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
//     if (!checkRateLimit(ip)) {
//       return NextResponse.json({ error: 'Too many submissions. Please try again later.' }, { status: 429 })
//     }

//     const body = await request.json()
//     const {
//       name, email, phone, message, listing_id,
//       source = 'website', budget_min, budget_max,
//       preferred_location, property_type, timeline
//     } = body

//     // Basic validation
//     if (!name || typeof name !== 'string' || name.trim().length < 2) {
//       return NextResponse.json({ error: 'A valid name is required' }, { status: 400 })
//     }
//     if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//       return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
//     }
//     if (!email && !phone) {
//       return NextResponse.json({ error: 'Email or phone number is required' }, { status: 400 })
//     }

//     const supabase = await createAdminClient()

//     // Score lead using unified BANT scorer
//     const lead_score = scoreLead({ name, email, phone, budget_min, budget_max, preferred_location, property_type, timeline, message })

//     // Fetch listing title if this came from a listing page
//     let listing_title: string | null = null
//     if (listing_id) {
//       const { data: listing } = await supabase
//         .from('listings')
//         .select('title')
//         .eq('id', listing_id)
//         .single()
//       listing_title = listing?.title || null
//     }

//     const payload = {
//       name,
//       email: email || null,
//       phone: phone || null,
//       message: message || null,
//       listing_id: listing_id || null,
//       source,
//       lead_score,
//       budget_min: budget_min || null,
//       budget_max: budget_max || null,
//       preferred_location: preferred_location || null,
//       property_type: property_type || null,
//       timeline: timeline || null,
//     }

//     const { data, error } = await supabase
//       .from('leads')
//       .insert(payload)
//       .select()
//       .single()

//     if (error) throw error

//     // 🔥 AUTOMATION 1: Instant agent alert (non-blocking)
//     runInstantLeadAlert(data).catch(console.error)

//     // ✅ CONFIRMATION EMAIL to the lead (non-blocking)
//     if (email) {
//       sendLeadConfirmation({
//         to: email,
//         leadName: name.split(' ')[0],
//         source,
//         budget_max: budget_max || null,
//         preferred_location: preferred_location || null,
//         property_type: property_type || null,
//         message: message || null,
//         listing_title,
//       }).catch(console.error)
//     }

//     // 📊 GOOGLE SHEETS MIRROR (non-blocking, only if webhook is configured)
//     if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
//       fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: data.name,
//           email: data.email || '',
//           phone: data.phone || '',
//           lead_score: data.lead_score,
//           source: data.source,
//           budget_max: data.budget_max || '',
//           preferred_location: data.preferred_location || '',
//           property_type: data.property_type || '',
//           listing_title: listing_title || '',
//           message: data.message || '',
//           created_at: data.created_at,
//         }),
//       }).catch(console.error)
//     }

//     // 📣 TELEGRAM ALERT — fires for ALL leads (hot, warm, cold)
//     sendLeadTelegramAlert(data)

//     // Auto-enroll in default nurture sequence if one is set to trigger on new leads
//     const { data: autoSequence } = await supabase
//       .from('nurture_sequences')
//       .select('id, steps_count, delay_days')
//       .eq('trigger_type', 'on_lead')
//       .eq('is_active', true)
//       .or(`target_lead_score.eq.all,target_lead_score.eq.${lead_score}`)
//       .limit(1)
//       .single()

//     if (autoSequence) {
//       const delayDays: number[] = autoSequence.delay_days || [1, 7, 14, 30, 60]

//       await supabase.from('nurture_enrollments').upsert({
//         sequence_id: autoSequence.id,
//         lead_id: data.id,
//         status: 'active',
//         enrolled_at: new Date().toISOString(),
//       }, { onConflict: 'sequence_id,lead_id' })

//       const queueItems = delayDays.slice(0, autoSequence.steps_count).map((days: number, idx: number) => ({
//         sequence_id: autoSequence.id,
//         lead_id: data.id,
//         step_number: idx + 1,
//         total_steps: autoSequence.steps_count,
//         status: 'pending',
//         scheduled_for: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
//       }))

//       await supabase.from('nurture_queue').upsert(queueItems, {
//         onConflict: 'sequence_id,lead_id,step_number',
//       })
//     }

//     return NextResponse.json({ success: true, id: data.id })
//   } catch (error: any) {
//     console.error('[Leads API]', error)
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }

// export async function GET(request: NextRequest) {
//   try {
//     const supabase = await createAdminClient()
//     const { searchParams } = new URL(request.url)
//     const score = searchParams.get('score')
//     const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 50

//     let query = supabase
//       .from('leads')
//       .select('*')
//       .order('created_at', { ascending: false })
//       .limit(limit)

//     if (score) query = query.eq('lead_score', score)

//     const { data, error } = await query
//     if (error) throw error

//     return NextResponse.json({ data })
//   } catch (error: any) {
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }
