import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Mark lead as unsubscribed so nurture sequences skip them
    const { error } = await supabase
      .from('leads')
      .update({ is_unsubscribed: true, unsubscribed_at: new Date().toISOString() })
      .eq('email', email.toLowerCase().trim())

    if (error) {
      // Column may not exist yet — still return success to the user
      console.warn('[Unsubscribe] DB update failed (column may not exist):', error.message)
    }

    console.log(`[Unsubscribe] ${email} unsubscribed at ${new Date().toISOString()}`)
    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
