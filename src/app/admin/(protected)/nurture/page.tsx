import { createClient } from '@/lib/supabase/server'
import NurtureClient from './NurtureClient'

export default async function NurturePage() {
  const supabase = await createClient()

  const [{ data: sequences }, { data: leads }] = await Promise.all([
    supabase.from('nurture_sequences').select(`
      *,
      enrollments:nurture_enrollments(count),
      queue:nurture_queue(count)
    `).order('created_at'),
    supabase.from('leads').select('id, name, email, lead_score, preferred_location, created_at').not('email', 'is', null).order('created_at', { ascending: false }).limit(100),
  ])

  return <NurtureClient sequences={sequences || []} leads={leads || []} />
}
