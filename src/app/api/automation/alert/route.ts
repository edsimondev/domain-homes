import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { runInstantLeadAlert } from '@/lib/automation'

// POST /api/automation/alert
// Called automatically after a lead is created
export async function POST(request: NextRequest) {
  try {
    const { lead_id } = await request.json()
    if (!lead_id) return NextResponse.json({ error: 'lead_id required' }, { status: 400 })

    const supabase = await createAdminClient()
    const { data: lead, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single()

    if (error || !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    // Run in background — don't block the response
    runInstantLeadAlert(lead).catch(console.error)

    // Log it
    await supabase.from('automation_logs').insert({
      automation_type: 'lead_alert',
      status: 'success',
      lead_id: lead.id,
      metadata: { lead_score: lead.lead_score, source: lead.source },
    })

    return NextResponse.json({ success: true, message: 'Alert sent' })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
