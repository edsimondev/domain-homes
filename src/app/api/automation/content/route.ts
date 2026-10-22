import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateListingContentSuite } from '@/lib/ai-engine'

// POST /api/automation/content
export async function POST(request: NextRequest) {
  try {
    const { listing_id, regenerate = false } = await request.json()
    if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

    const supabase = await createAdminClient()

    // Check cache unless regenerating
    if (!regenerate) {
      const { data: cached } = await supabase
        .from('generated_content')
        .select('*')
        .eq('listing_id', listing_id)
        .single()

      if (cached) return NextResponse.json({ content: cached, cached: true })
    }

    // Fetch listing
    const { data: listing, error } = await supabase
      .from('listings')
      .select('*')
      .eq('id', listing_id)
      .single()

    if (error || !listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    // Generate all content
    const content = await generateListingContentSuite({
      title: listing.title,
      price: listing.price,
      listing_type: listing.listing_type,
      property_type: listing.property_type,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      square_footage: listing.square_footage,
      city: listing.city,
      state: listing.state,
      address: listing.address,
      amenities: listing.amenities,
      year_built: listing.year_built,
      features: listing.features,
    })

    // Cache in DB
    const { data: saved } = await supabase
      .from('generated_content')
      .upsert({
        listing_id,
        ...content,
        generated_at: new Date().toISOString(),
        regenerated_count: regenerate ? 1 : 0,
      }, { onConflict: 'listing_id' })
      .select()
      .single()

    // Log it
    await supabase.from('automation_logs').insert({
      automation_type: 'content_suite',
      status: 'success',
      listing_id,
      metadata: { regenerated: regenerate },
    })

    return NextResponse.json({ content: saved || content, cached: false })
  } catch (error: any) {
    console.error('[Content API]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET /api/automation/content?listing_id=xxx
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const listing_id = searchParams.get('listing_id')
  if (!listing_id) return NextResponse.json({ error: 'listing_id required' }, { status: 400 })

  const supabase = await createAdminClient()
  const { data } = await supabase
    .from('generated_content')
    .select('*')
    .eq('listing_id', listing_id)
    .single()

  return NextResponse.json({ content: data || null })
}
