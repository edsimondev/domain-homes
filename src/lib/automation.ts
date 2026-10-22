// ============================================================
// AUTOMATION ORCHESTRATOR
// All 4 automations flow through here
// ============================================================
import { createAdminClient } from '@/lib/supabase/server'
import {
  sendInstantLeadAlert,
  sendPropertyMatchEmail,
  sendWeeklyMarketReport,
} from '@/lib/email/templates'
import {
  generateSuggestedReply,
  generateMatchReason,
  scoreLeadListingMatch,
} from '@/lib/ai-engine'
import type { Lead, Listing } from '@/types'

// ============================================================
// AUTOMATION 1: INSTANT AGENT ALERT
// ============================================================
export async function runInstantLeadAlert(lead: Lead): Promise<void> {
  try {
    const [suggestedReply, matchedListings] = await Promise.all([
      generateSuggestedReply(lead).catch(() => undefined),
      findMatchedListingsForLead(lead).catch(() => []),
    ])

    await sendInstantLeadAlert({
      ...lead,
      ai_suggested_reply: suggestedReply,
      matched_listings: matchedListings.slice(0, 3).map((l: any) => ({
        title: l.title,
        price: l.price,
        slug: l.slug,
      })),
    })
  } catch (err) {
    console.error('[Automation 1] Instant alert failed:', err)
  }
}

// ============================================================
// AUTOMATION 2: NURTURE STEP RUNNER
// ============================================================
export async function runNurtureStep(nurture: {
  id: string
  lead_id: string
  sequence_id: string
  step_number: number
  total_steps: number
}): Promise<void> {
  const supabase = await createAdminClient()

  try {
    const { data: lead } = await supabase
      .from('leads')
      .select('*')
      .eq('id', nurture.lead_id)
      .single()

    if (!lead || !lead.email) {
      await supabase.from('nurture_queue').update({ status: 'skipped', notes: 'No email' }).eq('id', nurture.id)
      return
    }

    // Respect unsubscribe — never email opted-out leads
    if (lead.is_unsubscribed) {
      await supabase.from('nurture_queue').update({ status: 'skipped', notes: 'Unsubscribed' }).eq('id', nurture.id)
      return
    }

    const { data: sequence } = await supabase
      .from('nurture_sequences')
      .select('*')
      .eq('id', nurture.sequence_id)
      .single()

    if (!sequence) return

    const { generateNurtureEmail } = await import('@/lib/ai-engine')
    const { sendNurtureEmail } = await import('@/lib/email/templates')

    const emailContent = await generateNurtureEmail(
      lead,
      nurture.step_number,
      nurture.total_steps,
      sequence.context || undefined
    )

    await sendNurtureEmail({
      to: lead.email,
      subject: emailContent.subject,
      leadName: lead.name?.split(' ')[0] || 'there',
      bodyHtml: emailContent.bodyHtml,
      ctaText: emailContent.ctaText,
      ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL}/listings`,
      preheader: emailContent.preheader,
    })

    await supabase
      .from('nurture_queue')
      .update({ status: 'sent', sent_at: new Date().toISOString() })
      .eq('id', nurture.id)

  } catch (err) {
    console.error('[Automation 2] Nurture step failed:', err)
    await supabase.from('nurture_queue').update({ status: 'failed' }).eq('id', nurture.id)
  }
}

// ============================================================
// AUTOMATION 3: PROPERTY MATCH ENGINE
// ============================================================
export async function runPropertyMatchEngine(listing: Listing): Promise<{
  matches: { lead: Lead; score: number; matchReason: string }[]
}> {
  const supabase = await createAdminClient()

  try {
    const { data: leads } = await supabase
      .from('leads')
      .select('*')
      .not('email', 'is', null)
      .eq('is_contacted', false)
      .order('created_at', { ascending: false })
      .limit(200)

    if (!leads?.length) return { matches: [] }

    const scoredLeads = leads
      .map((lead: any) => ({ lead, score: scoreLeadListingMatch(lead, listing) }))
      .filter(({ score }: any) => score >= 3)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 20)

    if (!scoredLeads.length) return { matches: [] }

    const matches = await Promise.all(
      scoredLeads.map(async ({ lead, score }: any) => {
        const matchReason = await generateMatchReason(lead, listing).catch(
          () => `This ${listing.property_type} in ${listing.city} matches your budget and location preferences.`
        )
        return { lead, score, matchReason }
      })
    )

    const matchRecords = matches.map(({ lead, score, matchReason }) => ({
      listing_id: listing.id,
      lead_id: lead.id,
      match_score: score,
      match_reason: matchReason,
      status: 'pending',
    }))

    await supabase.from('listing_lead_matches').upsert(matchRecords, {
      onConflict: 'listing_id,lead_id',
    })

    return { matches }
  } catch (err) {
    console.error('[Automation 3] Match engine failed:', err)
    return { matches: [] }
  }
}

export async function sendMatchNotifications(
  listingId: string,
  leadIds: string[]
): Promise<{ sent: number; failed: number }> {
  const supabase = await createAdminClient()
  let sent = 0
  let failed = 0

  const { data: listing } = await supabase
    .from('listings')
    .select('*, images:property_images(url, order)')
    .eq('id', listingId)
    .single()

  if (!listing) return { sent: 0, failed: 0 }

  const coverImage = listing.images?.sort((a: any, b: any) => a.order - b.order)[0]?.url

  for (const leadId of leadIds) {
    try {
      const { data: match } = await supabase
        .from('listing_lead_matches')
        .select('*, lead:leads(*)')
        .eq('listing_id', listingId)
        .eq('lead_id', leadId)
        .single()

      if (!match?.lead?.email) { failed++; continue }

      await sendPropertyMatchEmail({
        to: match.lead.email,
        leadName: match.lead.name?.split(' ')[0] || 'there',
        listing: { ...listing, cover_image: coverImage },
        matchReason: match.match_reason,
      })

      await supabase
        .from('listing_lead_matches')
        .update({ status: 'notified', notified_at: new Date().toISOString() })
        .eq('listing_id', listingId)
        .eq('lead_id', leadId)

      sent++
    } catch { failed++ }
  }

  return { sent, failed }
}

// ============================================================
// AUTOMATION 4: WEEKLY MARKET REPORT
// ============================================================
export async function runWeeklyMarketReport(city: string): Promise<{ sent: number }> {
  const supabase = await createAdminClient()
  let sent = 0

  try {
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

    const [{ data: allListings }, { data: newListings }, { data: lastWeekListings }] = await Promise.all([
      supabase.from('listings').select('price, created_at').ilike('city', `%${city}%`).eq('status', 'available'),
      supabase.from('listings').select('title, price, slug, listing_type, created_at').ilike('city', `%${city}%`).gte('created_at', oneWeekAgo).eq('status', 'available'),
      supabase.from('listings').select('price').ilike('city', `%${city}%`).gte('created_at', twoWeeksAgo).lt('created_at', oneWeekAgo),
    ])

    const prices = allListings?.map((l: any) => Number(l.price)) || []
    const avgPrice = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : 0

    // Real price change: compare this week's avg vs last week's avg
    const lastWeekPrices = lastWeekListings?.map((l: any) => Number(l.price)) || []
    const lastWeekAvg = lastWeekPrices.length ? lastWeekPrices.reduce((a, b) => a + b, 0) / lastWeekPrices.length : 0
    const thisWeekPrices = newListings?.map((l: any) => Number(l.price)) || []
    const thisWeekAvg = thisWeekPrices.length ? thisWeekPrices.reduce((a, b) => a + b, 0) / thisWeekPrices.length : 0
    const priceChange = lastWeekAvg > 0 && thisWeekAvg > 0
      ? Number((((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100).toFixed(1))
      : 0

    // Real days on market: avg days from created_at to now for available listings
    const availableDates = allListings?.map((l: any) => new Date(l.created_at).getTime()) || []
    const avgDaysOnMarket = availableDates.length
      ? Math.round(availableDates.reduce((sum, t) => sum + (Date.now() - t) / (1000 * 60 * 60 * 24), 0) / availableDates.length)
      : 0

    const stats = {
      new_listings: newListings?.length || 0,
      avg_price: avgPrice,
      price_change: priceChange,
      days_on_market: avgDaysOnMarket,
    }

    const { data: leads } = await supabase
      .from('leads')
      .select('id, name, email, preferred_location')
      .ilike('preferred_location', `%${city}%`)
      .not('email', 'is', null)

    if (!leads?.length) return { sent: 0 }

    for (const lead of leads) {
      if (!lead.email) continue
      try {
        await sendWeeklyMarketReport({
          to: lead.email,
          leadName: lead.name?.split(' ')[0] || 'there',
          city,
          stats,
          newListings: (newListings || []).slice(0, 3),
        })
        sent++
        await new Promise(r => setTimeout(r, 200))
      } catch (err) {
        console.error(`Failed report for ${lead.email}:`, err)
      }
    }
  } catch (err) {
    console.error('[Automation 4] Market report failed:', err)
  }

  return { sent }
}

async function findMatchedListingsForLead(lead: Lead) {
  const supabase = await createAdminClient()

  let query = supabase
    .from('listings')
    .select('id, title, price, slug, city, state, property_type, listing_type, bedrooms')
    .eq('status', 'available')
    .limit(20)

  if (lead.budget_max) query = query.lte('price', lead.budget_max * 1.1)
  if (lead.property_type) query = query.eq('property_type', lead.property_type)
  if (lead.preferred_location) query = query.ilike('city', `%${lead.preferred_location}%`)

  const { data } = await query
  return data || []
}
