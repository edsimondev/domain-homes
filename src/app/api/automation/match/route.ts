import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runPropertyMatchEngine, sendMatchNotifications } from '@/lib/automation'

// POST /api/automation/match
export async function POST(request: NextRequest) {
  try {
    const { action, listing_id, lead_ids } = await request.json()
    const supabase = await createAdminClient()

    // ── RUN MATCH ENGINE FOR A LISTING ────────────────────────
    if (action === 'run') {
      if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

      const { data: listing } = await supabase
        .from('listings')
        .select('*')
        .eq('id', listing_id)
        .single()

      if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

      const { matches } = await runPropertyMatchEngine(listing)

      await supabase.from('automation_logs').insert({
        automation_type: 'match_engine',
        status: 'success',
        listing_id,
        metadata: { matches_found: matches.length },
      })

      return NextResponse.json({
        success: true,
        matches_found: matches.length,
        top_matches: matches.slice(0, 5).map(m => ({
          lead_name: m.lead.name,
          lead_email: m.lead.email,
          score: m.score,
          reason: m.matchReason,
        })),
      })
    }

    // ── SEND NOTIFICATIONS TO SELECTED LEADS ─────────────────
    if (action === 'notify') {
      if (!listing_id || !lead_ids?.length) {
        return NextResponse.json({ error: 'listing_id and lead_ids required' }, { status: 400 })
      }

      const result = await sendMatchNotifications(listing_id, lead_ids)

      await supabase.from('automation_logs').insert({
        automation_type: 'match_engine',
        status: result.failed > 0 ? 'partial' : 'success',
        listing_id,
        metadata: { sent: result.sent, failed: result.failed },
      })

      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/automation/match?listing_id=xxx
// Get matches for a listing
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const listing_id = searchParams.get('listing_id')
  const supabase = await createAdminClient()

  if (!listing_id) {
    // Return summary of all pending matches
    const { data } = await supabase
      .from('listing_lead_matches')
      .select('listing_id, listing:listings(title), count:id')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(20)
    return NextResponse.json({ data })
  }

  const { data: matches } = await supabase
    .from('listing_lead_matches')
    .select(`
      *,
      lead:leads(id, name, email, phone, lead_score, budget_max, preferred_location, property_type, timeline)
    `)
    .eq('listing_id', listing_id)
    .order('match_score', { ascending: false })

  return NextResponse.json({ matches: matches || [] })
}
