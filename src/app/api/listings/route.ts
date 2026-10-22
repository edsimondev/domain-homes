import { NextRequest, NextResponse } from 'next/server'
import { getListings } from '@/lib/listings'
import type { ListingFilters } from '@/types'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const filters: ListingFilters = {
    search: searchParams.get('search') || undefined,
    listing_type: (searchParams.get('listing_type') as any) || undefined,
    property_type: (searchParams.get('property_type') as any) || undefined,
    min_price: searchParams.get('min_price') ? Number(searchParams.get('min_price')) : undefined,
    max_price: searchParams.get('max_price') ? Number(searchParams.get('max_price')) : undefined,
    bedrooms: searchParams.get('bedrooms') ? Number(searchParams.get('bedrooms')) : undefined,
    bathrooms: searchParams.get('bathrooms') ? Number(searchParams.get('bathrooms')) : undefined,
    city: searchParams.get('city') || undefined,
    status: (searchParams.get('status') as any) || 'available',
    is_featured: searchParams.get('is_featured') === 'true' ? true : undefined,
    sort: (searchParams.get('sort') as any) || 'newest',
    page: searchParams.get('page') ? Number(searchParams.get('page')) : 1,
    per_page: searchParams.get('per_page') ? Number(searchParams.get('per_page')) : 12,
  }

  try {
    const result = await getListings(filters)
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
