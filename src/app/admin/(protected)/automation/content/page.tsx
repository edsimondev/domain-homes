import { createClient } from '@/lib/supabase/server'
import ContentSuiteClient from './ContentSuiteClient'

export default async function ContentSuitePage() {
  const supabase = await createClient()
  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, city, state, price, listing_type, bedrooms, bathrooms, property_type')
    .order('created_at', { ascending: false })
    .limit(50)

  return <ContentSuiteClient listings={listings || []} />
}
