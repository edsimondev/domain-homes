/**
 * /api/automation/stale-leads
 *
 * Called by Make.com on a daily schedule (not a webhook from the app —
 * Make.com's own Scheduler module triggers this via a GET request).
 *
 * Returns every lead that:
 *   - has not been contacted (is_contacted = false)
 *   - was created more than 24 hours ago
 *   - is not unsubscribed
 *
 * Make.com then loops over the returned array, calls Groq for each one
 * to draft a follow-up message, and emails/WhatsApps the agent a reminder.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: staleLeads, error } = await supabase
      .from('leads')
      .select('id, name, email, phone, lead_score, source, budget_min, budget_max, preferred_location, property_type, timeline, message, created_at')
      .eq('is_contacted', false)
      .lte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: true })
      .limit(20)

    if (error) {
      console.error('[stale-leads] Supabase error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const now = Date.now()
    const enriched = (staleLeads || []).map(lead => {
      const hoursWaiting = Math.floor((now - new Date(lead.created_at).getTime()) / (1000 * 60 * 60))
      const budgetText = lead.budget_max
        ? `$${Number(lead.budget_max).toLocaleString()}`
        : 'Not specified'

      return {
        id:                 lead.id,
        name:               lead.name || 'Unknown',
        first_name:         (lead.name || 'there').split(' ')[0],
        email:              lead.email || '',
        phone:              lead.phone || '',
        lead_score:         lead.lead_score,
        lead_score_label:   lead.lead_score === 'hot' ? 'HOT' : lead.lead_score === 'warm' ? 'WARM' : 'COLD',
        source:             lead.source,
        budget_text:        budgetText,
        preferred_location: lead.preferred_location || 'Not specified',
        property_type:      lead.property_type || 'Not specified',
        timeline:           lead.timeline || 'Not specified',
        message:            lead.message || '',
        hours_waiting:      hoursWaiting,
        admin_lead_url:     `${process.env.NEXT_PUBLIC_SITE_URL}/admin/leads`,
      }
    })

    return NextResponse.json({
      success: true,
      count: enriched.length,
      leads: enriched,
      checked_at: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[stale-leads] Unexpected error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
