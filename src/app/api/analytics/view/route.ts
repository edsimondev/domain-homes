import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// POST /api/analytics/view
// Called client-side when a property or blog post is viewed
export async function POST(request: NextRequest) {
  try {
    const { type, id } = await request.json()

    if (!type || !id) {
      return NextResponse.json({ error: 'type and id required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    if (type === 'listing') {
      await supabase.rpc('increment_listing_views', { listing_id: id })
    } else if (type === 'blog') {
      await supabase.rpc('increment_blog_views', { post_id: id })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    // Silently fail — view tracking should never break anything
    return NextResponse.json({ success: false })
  }
}
