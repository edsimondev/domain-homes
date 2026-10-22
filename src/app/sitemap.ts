import { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://domaine.com'
  const supabase = await createClient()

  const [{ data: listings }, { data: posts }] = await Promise.all([
    supabase.from('listings').select('slug, updated_at').eq('status', 'available'),
    supabase.from('blog_posts').select('slug, updated_at').eq('is_published', true),
  ])

  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), priority: 1 },
    { url: `${baseUrl}/listings`, lastModified: new Date(), priority: 0.9 },
    { url: `${baseUrl}/agents`, lastModified: new Date(), priority: 0.8 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), priority: 0.7 },
    { url: `${baseUrl}/contact`, lastModified: new Date(), priority: 0.6 },
  ]

  const listingPages: MetadataRoute.Sitemap = (listings || []).map(l => ({
    url: `${baseUrl}/property/${l.slug}`,
    lastModified: new Date(l.updated_at),
    priority: 0.8,
  }))

  const blogPages: MetadataRoute.Sitemap = (posts || []).map(p => ({
    url: `${baseUrl}/blog/${p.slug}`,
    lastModified: new Date(p.updated_at),
    priority: 0.6,
  }))

  return [...staticPages, ...listingPages, ...blogPages]
}
