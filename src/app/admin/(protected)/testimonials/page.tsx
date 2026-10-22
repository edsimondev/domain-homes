import { createClient } from '@/lib/supabase/server'
import TestimonialsClient from './TestimonialsClient'

export default async function AdminTestimonialsPage() {
  const supabase = await createClient()
  const { data } = await supabase.from('testimonials').select('*').order('created_at', { ascending: false })
  return <TestimonialsClient initialTestimonials={data || []} />
}
