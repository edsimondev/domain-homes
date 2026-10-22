import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import BlogForm from '../../BlogForm'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditBlogPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()

  const [{ data: post }, { data: agents }] = await Promise.all([
    supabase.from('blog_posts').select('*').eq('id', id).single(),
    supabase.from('agents').select('id, name').eq('is_active', true),
  ])

  if (!post) notFound()

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#372308]">
          Edit Post
        </h1>
        <p className="text-[#8a7968] text-sm mt-1 truncate max-w-lg">
          {post.title}
        </p>
      </div>

      <BlogForm agents={agents || []} post={post} />
    </div>
  )
}

// import { createClient } from '@/lib/supabase/server'
// import { notFound } from 'next/navigation'
// import BlogForm from '../../BlogForm'

// export default async function EditBlogPage({ params }: { params: { id: string } }) {
//   const supabase = await createClient()

//   const [{ data: post }, { data: agents }] = await Promise.all([
//     supabase.from('blog_posts').select('*').eq('id', params.id).single(),
//     supabase.from('agents').select('id, name').eq('is_active', true),
//   ])

//   if (!post) notFound()

//   return (
//     <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-4xl">
//       <div className="mb-6">
//         <h1 className="font-display text-2xl font-bold text-[#372308]">Edit Post</h1>
//         <p className="text-[#8a7968] text-sm mt-1 truncate max-w-lg">{post.title}</p>
//       </div>
//       <BlogForm agents={agents || []} post={post} />
//     </div>
//   )
// }
