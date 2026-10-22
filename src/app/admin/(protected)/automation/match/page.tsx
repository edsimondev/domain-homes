import { createClient } from '@/lib/supabase/server'
import MatchEngineClient from './MatchEngineClient'

export default async function MatchEnginePage() {
  const supabase = await createClient()

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, price, listing_type, city, state, bedrooms, bathrooms, property_type, status, created_at')
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(30)

  return <MatchEngineClient listings={listings || []} />
}
