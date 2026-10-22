import { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import Hero from '@/components/home/Hero'
import FeaturedListings from '@/components/home/FeaturedListings'
import WhyUs from '@/components/home/WhyUs'
import Testimonials from '@/components/home/Testimonials'
import AgentsPreview from '@/components/home/AgentsPreview'
import BlogPreview from '@/components/home/BlogPreview'
import CtaBanner from '@/components/home/CtaBanner'
import { getFeaturedListings } from '@/lib/listings'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Domaine — Find Your Perfect Home',
  description: 'Premium real estate. Curated properties, expert agents, and intelligent tools to help you find exactly where you belong.',
}

export const revalidate = 300

export default async function HomePage() {
  const supabase = await createClient()

  const [featured, testimonials, agents, posts] = await Promise.all([
    getFeaturedListings(5),
    supabase.from('testimonials').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(5).then(r => r.data || []),
    supabase.from('agents').select('id, name, email, photo_url, bio, specialties').eq('is_active', true).limit(4).then(r => r.data || []),
    supabase.from('blog_posts').select('id, title, slug, excerpt, cover_image, published_at, read_time, category').eq('is_published', true).order('published_at', { ascending: false }).limit(3).then(r => r.data || []),
  ])

  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <FeaturedListings listings={featured} />
        <WhyUs />
        <AgentsPreview agents={agents} />
        <Testimonials testimonials={testimonials} />
        <BlogPreview posts={posts} />
        <CtaBanner />
      </main>
      <Footer />
    </>
  )
}
