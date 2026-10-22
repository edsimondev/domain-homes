import { createClient } from '@/lib/supabase/server'
import BlogForm from '../BlogForm'

export default async function NewBlogPage() {
  const supabase = await createClient()
  const { data: agents } = await supabase.from('agents').select('id, name').eq('is_active', true)
  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#372308]">New Blog Post</h1>
        <p className="text-[#8a7968] text-sm mt-1">Write and publish a new article</p>
      </div>
      <BlogForm agents={agents || []} />
    </div>
  )
}
