import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { RiTimeLine, RiArrowLeftLine, RiCalendarLine } from 'react-icons/ri'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/server'

interface PageProps { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('blog_posts').select('title, meta_title, meta_description, excerpt').eq('slug', slug).single()
  if (!data) return { title: 'Post Not Found' }
  return {
    title: data.meta_title || data.title,
    description: data.meta_description || data.excerpt,
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: post } = await supabase
    .from('blog_posts')
    .select('*, author:agents(name, photo_url, bio)')
    .eq('slug', slug)
    .eq('is_published', true)
    .single()

  if (!post) notFound()

  // Increment views
  supabase.from('blog_posts').update({ views_count: (post.views_count || 0) + 1 }).eq('id', post.id).then(() => {})

  // Related posts
  const { data: related } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, published_at, read_time')
    .eq('is_published', true)
    .eq('category', post.category || '')
    .neq('id', post.id)
    .limit(3)

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-[#F5F0E8]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          {/* Back */}
          <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-[#8a7968] hover:text-[#372308]/75 mb-6 transition-colors">
            <RiArrowLeftLine size={15} /> Back to Blog
          </Link>

          {/* Article */}
          <article className="bg-[#F5F0E8] rounded-3xl border border-[#372308]/6 overflow-hidden shadow-sm">
            {/* Cover */}
            {post.cover_image && (
              <div className="relative aspect-video w-full">
                <Image src={post.cover_image} alt={post.title} fill className="object-cover" priority />
              </div>
            )}

            <div className="p-6 sm:p-10">
              {/* Meta */}
              <div className="flex flex-wrap items-center gap-3 mb-5">
                {post.category && (
                  <span className="text-xs font-medium bg-[#F0D5A0]/20 text-[#372308] px-3 py-1.5 rounded-full border border-brand-100">
                    {post.category}
                  </span>
                )}
                {post.tags?.map((tag: string) => (
                  <span key={tag} className="text-xs text-[#372308]/35 bg-[#F5F0E8] px-2.5 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>

              <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-bold text-[#372308] leading-tight mb-5">
                {post.title}
              </h1>

              <p className="text-lg text-[#8a7968] leading-relaxed border-l-4 border-[#372308]/35 pl-4 mb-8">
                {post.excerpt}
              </p>

              {/* Author bar */}
              <div className="flex items-center justify-between py-4 border-y border-[#372308]/6 mb-8">
                <div className="flex items-center gap-3">
                  {(post.author as any)?.photo_url ? (
                    <Image src={(post.author as any).photo_url} alt="" width={40} height={40} className="rounded-full" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[#F0D5A0]/30 flex items-center justify-center text-[#372308] font-bold">
                      {(post.author as any)?.name?.charAt(0) || 'E'}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-medium text-[#372308]">{(post.author as any)?.name || 'Domaine'}</p>
                    <p className="text-xs text-[#372308]/35">Real Estate Expert</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#372308]/35">
                  <span className="flex items-center gap-1">
                    <RiCalendarLine size={12} />
                    {post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : ''}
                  </span>
                  {post.read_time && (
                    <span className="flex items-center gap-1">
                      <RiTimeLine size={12} /> {post.read_time} min read
                    </span>
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="prose-content" dangerouslySetInnerHTML={{ __html: post.content }} />
            </div>
          </article>

          {/* Related */}
          {related && related.length > 0 && (
            <div className="mt-12">
              <h2 className="font-display text-xl font-bold text-[#372308] mb-5">Related Articles</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                {related.map(r => (
                  <Link key={r.id} href={`/blog/${r.slug}`} className="group block bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden hover:shadow-sm transition-shadow">
                    {r.cover_image && (
                      <div className="relative aspect-video">
                        <Image src={r.cover_image} alt={r.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-4">
                      <h3 className="font-semibold text-[#372308] text-sm leading-snug line-clamp-2 group-hover:text-[#372308] transition-colors">{r.title}</h3>
                      <p className="text-xs text-[#372308]/35 mt-1">{r.read_time ? `${r.read_time} min read` : ''}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
