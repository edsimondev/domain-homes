import { createClient } from '@/lib/supabase/server'
import type { Listing, ListingFilters, PaginatedResponse } from '@/types'

export async function getListings(filters: ListingFilters = {}): Promise<PaginatedResponse<Listing>> {
  const supabase = await createClient()
  const {
    search, listing_type, property_type, min_price, max_price,
    bedrooms, bathrooms, city, status = 'available', is_featured,
    sort = 'newest', page = 1, per_page = 12,
  } = filters

  let query = supabase
    .from('listings')
    .select(`*, agent:agents(id, name, email, phone, photo_url), images:property_images(id, url, alt, order)`, { count: 'exact' })

  if (search) query = query.textSearch('search_vector', search, { type: 'websearch' })
  if (listing_type) query = query.eq('listing_type', listing_type)
  if (property_type) query = query.eq('property_type', property_type)
  if (status) query = query.eq('status', status)
  if (city) query = query.ilike('city', `%${city}%`)
  if (min_price) query = query.gte('price', min_price)
  if (max_price) query = query.lte('price', max_price)
  if (bedrooms) query = query.gte('bedrooms', bedrooms)
  if (bathrooms) query = query.gte('bathrooms', bathrooms)
  if (is_featured !== undefined) query = query.eq('is_featured', is_featured)

  switch (sort) {
    case 'price_asc': query = query.order('price', { ascending: true }); break
    case 'price_desc': query = query.order('price', { ascending: false }); break
    case 'featured': query = query.order('is_featured', { ascending: false }).order('created_at', { ascending: false }); break
    default: query = query.order('created_at', { ascending: false })
  }

  const from = (page - 1) * per_page
  query = query.range(from, from + per_page - 1)

  const { data, error, count } = await query
  if (error) throw error

  return {
    data: (data || []).map(normalizeListingImages),
    count: count || 0,
    page,
    per_page,
    total_pages: Math.ceil((count || 0) / per_page),
  }
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('listings')
    .select(`*, agent:agents(id, name, email, phone, photo_url, bio, specialties), images:property_images(id, url, alt, order)`)
    .eq('slug', slug)
    .single()

  if (error || !data) return null

  supabase.from('listings').update({ views_count: (data.views_count || 0) + 1 }).eq('id', data.id).then(() => {})

  return normalizeListingImages(data)
}

export async function getFeaturedListings(limit = 6): Promise<Listing[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select(`*, agent:agents(id, name, photo_url), images:property_images(id, url, alt, order)`)
    .eq('is_featured', true)
    .eq('status', 'available')
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []).map(normalizeListingImages)
}

export async function getRelatedListings(listing: Listing, limit = 3): Promise<Listing[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('listings')
    .select(`*, images:property_images(id, url, alt, order)`)
    .eq('property_type', listing.property_type)
    .eq('listing_type', listing.listing_type)
    .eq('status', 'available')
    .neq('id', listing.id)
    .order('created_at', { ascending: false })
    .limit(limit)
  return (data || []).map(normalizeListingImages)
}

function normalizeListingImages(listing: any): Listing {
  const images = (listing.images || []).sort((a: any, b: any) => a.order - b.order)
  return { ...listing, images, cover_image: images[0]?.url || null }
}
