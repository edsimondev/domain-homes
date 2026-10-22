import Link from 'next/link'
import Image from 'next/image'
import { RiArrowRightLine, RiTimeLine } from 'react-icons/ri'
import { format } from 'date-fns'

interface Post {
  id: string; title: string; slug: string; excerpt: string
  cover_image?: string | null; published_at?: string | null; read_time?: number | null; category?: string | null
}

export default function BlogPreview({ posts }: { posts: Post[] }) {
  if (!posts.length) return null
  return (
    <section className="bg-[#F5F0E8] py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="section-label mb-3">Journal</p>
            <h2 className="editorial-md text-[#372308]">Market<br /><span className="italic font-light text-[#8a7968]">insights</span></h2>
          </div>
          <Link href="/blog" className="btn-outline group">
            All articles <RiArrowRightLine size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {posts.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group block">
              <div className="bg-[#E8E0D0]/40 rounded-2xl overflow-hidden border border-[#372308]/6 hover:border-[#372308]/15 transition-all">
                <div className="aspect-video relative bg-[#E8E0D0] overflow-hidden">
                  {post.cover_image ? (
                    <Image src={post.cover_image} alt={post.title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
                  ) : (
                    <div className="w-full h-full bg-[#F0D5A0]/50 flex items-center justify-center">
                      <span className="text-[#372308]/20 text-4xl font-black">J</span>
                    </div>
                  )}
                  {post.category && (
                    <span className="absolute top-3 left-3 tag-pill bg-[#372308] text-[#F5F0E8]">{post.category}</span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-[#372308] leading-snug mb-2 group-hover:text-[#5a3a14] transition-colors line-clamp-2">{post.title}</h3>
                  <p className="text-[#8a7968] text-sm leading-relaxed mb-4 line-clamp-2">{post.excerpt}</p>
                  <div className="flex items-center justify-between text-xs text-[#372308]/30">
                    <span>{post.published_at ? format(new Date(post.published_at), 'MMM d, yyyy') : ''}</span>
                    {post.read_time && <span className="flex items-center gap-1"><RiTimeLine size={11} />{post.read_time} min</span>}
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
