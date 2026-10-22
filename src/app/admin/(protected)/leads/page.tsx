import { createClient } from '@/lib/supabase/server'
import LeadsClient from './LeadsClient'

export default async function LeadsPage() {
  const supabase = await createClient()

  // Load first 50 leads — client handles pagination via Supabase realtime
  const { data: leads, count } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50)

  return <LeadsClient initialLeads={leads || []} totalCount={count || 0} />
}
