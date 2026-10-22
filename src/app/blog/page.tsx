import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { format } from 'date-fns'
import { RiTimeLine, RiArrowRightLine } from 'react-icons/ri'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Real Estate Blog — Insights & Advice',
  description: 'Market insights, buying tips, investment advice, and real estate guides from our expert team.',
}

export const revalidate = 300

export default async function BlogPage() {
  const supabase = await createClient()

  const { data: posts } = await supabase
    .from('blog_posts')
    .select('id, title, slug, excerpt, cover_image, published_at, read_time, category, author:agents(name, photo_url)')
    .eq('is_published', true)
    .order('published_at', { ascending: false })

  const featured = posts?.[0]
  const rest = posts?.slice(1) || []

  const categoryColors: Record<string, string> = {
    'Market Trends': 'bg-blue-50 text-blue-700',
    'Buying Guide': 'bg-emerald-50 text-emerald-700',
    'Investment': 'bg-purple-50 text-purple-700',
    'Selling Tips': 'bg-orange-50 text-orange-700',
    'Lifestyle': 'bg-pink-50 text-pink-700',
  }

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-[#F5F0E8]">
        {/* Hero */}
        <div className="bg-[#F5F0E8] border-b border-[#372308]/6 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <span className="text-[#372308] text-sm font-medium uppercase tracking-widest block mb-3">Blog</span>
            <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-[#372308]">
              Real Estate Insights
            </h1>
            <p className="mt-4 text-[#8a7968] max-w-xl mx-auto">
              Expert guides, market analysis, and tips to help you make smarter property decisions.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          {!posts?.length ? (
            <p className="text-center text-[#372308]/35 py-20">No posts published yet.</p>
          ) : (
            <>
              {/* Featured post */}
              {featured && (
                <Link href={`/blog/${featured.slug}`} className="group block mb-12">
                  <div className="bg-[#F5F0E8] rounded-3xl overflow-hidden shadow-sm hover:shadow-sm-hover transition-all">
                    <div className="grid lg:grid-cols-2">
                      <div className="relative aspect-video lg:aspect-auto lg:min-h-[320px] bg-[#E8E0D0]">
                        {featured.cover_image ? (
                          <Image
                            src={featured.cover_image}
                            alt={featured.title}
                            fill
                            className="object-cover group-hover:scale-105 transition-transform duration-500"
                            priority
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-brand-100 to-brand-200" />
                        )}
                        {featured.category && (
                          <span className={`absolute top-4 left-4 text-xs font-medium px-3 py-1.5 rounded-full ${categoryColors[featured.category] || 'bg-[#E8E0D0] text-[#372308]/60'}`}>
                            {featured.category}
                          </span>
                        )}
                      </div>
                      <div className="p-7 sm:p-10 flex flex-col justify-center">
                        <span className="text-[#5a3a14] text-xs font-medium uppercase tracking-widest mb-3">Featured</span>
                        <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#372308] group-hover:text-[#372308] transition-colors leading-snug mb-4">
                          {featured.title}
                        </h2>
                        <p className="text-[#8a7968] leading-relaxed mb-6 line-clamp-3">{featured.excerpt}</p>
                        <div className="flex items-center justify-between mt-auto">
                          <div className="flex items-center gap-2.5">
                            {(featured.author as any)?.photo_url ? (
                              <Image src={(featured.author as any).photo_url} alt="" width={32} height={32} className="rounded-full" />
                            ) : (
                              <div className="w-8 h-8 bg-[#F0D5A0]/30 rounded-full flex items-center justify-center text-[#372308] text-xs font-bold">
                                {(featured.author as any)?.name?.charAt(0) || 'E'}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-medium text-[#372308]/75">{(featured.author as any)?.name || 'Domaine'}</p>
                              <p className="text-xs text-[#372308]/35">
                                {featured.published_at ? format(new Date(featured.published_at), 'MMM d, yyyy') : ''}
                                {featured.read_time ? ` · ${featured.read_time} min read` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 text-[#372308] text-sm font-medium group-hover:gap-2 transition-all">
                            Read <RiArrowRightLine size={14} />
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Post grid */}
              {rest.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rest.map(post => (
                    <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
                      <div className="bg-[#F5F0E8] rounded-2xl overflow-hidden shadow-sm hover:shadow-sm-hover transition-all h-full flex flex-col">
                        <div className="relative aspect-video bg-[#E8E0D0] overflow-hidden">
                          {post.cover_image ? (
                            <Image
                              src={post.cover_image}
                              alt={post.title}
                              fill
                              className="object-cover group-hover:scale-105 transition-transform duration-500"
                              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-brand-50 to-brand-100" />
                          )}
                          {post.category && (
                            <span className={`absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full ${categoryColors[post.category] || 'bg-[#F5F0E8]/80 text-[#372308]/60'}`}>
                              {post.category}
                            </span>
                          )}
                        </div>
                        <div className="p-5 flex flex-col flex-1">
                          <h3 className="font-semibold text-[#372308] leading-snug mb-2 group-hover:text-[#372308] transition-colors line-clamp-2">
                            {post.title}
                          </h3>
                          <p className="text-sm text-[#8a7968] leading-relaxed mb-4 flex-1 line-clamp-3">{post.excerpt}</p>
                          <div className="flex items-center justify-between text-xs text-[#372308]/35 mt-auto pt-3 border-t border-[#372308]/6">
                            <span>{post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : ''}</span>
                            {post.read_time && (
                              <span className="flex items-center gap-1">
                                <RiTimeLine size={11} /> {post.read_time} min
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  )
}
