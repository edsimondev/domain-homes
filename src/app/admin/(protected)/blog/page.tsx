import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import { RiAddLine, RiEditLine, RiEyeLine } from 'react-icons/ri'
import BlogDeleteButton from './BlogDeleteButton'

export default async function AdminBlogPage() {
  const supabase = await createClient()
  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, is_published, published_at, views_count, category, read_time')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#372308]">Blog Posts</h1>
          <p className="text-[#8a7968] text-sm mt-1">{posts?.length || 0} posts total</p>
        </div>
        <Link href="/admin/blog/new" className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <RiAddLine size={16} /> New Post
        </Link>
      </div>

      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#372308]/6 bg-[#F5F0E8]/50">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Title</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden md:table-cell">Category</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden lg:table-cell">Views</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden lg:table-cell">Published</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!posts?.length && (
                <tr><td colSpan={6} className="text-center py-12 text-[#372308]/35 text-sm">No posts yet. <Link href="/admin/blog/new" className="text-[#372308] hover:underline">Write your first post</Link></td></tr>
              )}
              {posts?.map(post => (
                <tr key={post.id} className="hover:bg-[#F5F0E8]/50 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-medium text-[#372308] text-sm line-clamp-1 max-w-xs">{post.title}</p>
                    {post.read_time && <p className="text-xs text-[#372308]/35">{post.read_time} min read</p>}
                  </td>
                  <td className="px-5 py-4 text-[#8a7968] hidden md:table-cell">{post.category || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${post.is_published ? 'bg-emerald-50 text-emerald-700' : 'bg-[#E8E0D0] text-[#8a7968]'}`}>
                      {post.is_published ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#8a7968] text-xs hidden lg:table-cell">{(post.views_count || 0).toLocaleString()}</td>
                  <td className="px-5 py-4 text-[#372308]/35 text-xs hidden lg:table-cell">
                    {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : '—'}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {post.is_published && (
                        <Link href={`/blog/${post.slug}`} target="_blank" className="w-8 h-8 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-[#372308] hover:bg-[#F0D5A0]/20 transition-colors">
                          <RiEyeLine size={15} />
                        </Link>
                      )}
                      <Link href={`/admin/blog/${post.id}/edit`} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-[#372308] hover:bg-[#F0D5A0]/20 transition-colors">
                        <RiEditLine size={15} />
                      </Link>
                      <BlogDeleteButton postId={post.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
