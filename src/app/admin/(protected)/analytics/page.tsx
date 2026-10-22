import { createClient } from '@/lib/supabase/server'
import { format, subDays } from 'date-fns'
import Link from 'next/link'
import { RiBarChart2Line, RiEye2Line, RiUserVoiceLine, RiBuilding2Line, RiArrowUpLine, RiArrowDownLine } from 'react-icons/ri'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()
  const sevenDaysAgo  = subDays(new Date(), 7).toISOString()

  const [
    { data: topListings },
    { data: leadsBySource },
    { data: leadsByScore },
    { data: recentLeads30d },
    { data: recentLeads7d },
    { data: topBlogs },
  ] = await Promise.all([
    // Most viewed listings
    supabase
      .from('listings')
      .select('id, title, city, price, views_count, listing_type, status')
      .order('views_count', { ascending: false })
      .limit(10),

    // Leads grouped by source
    supabase
      .from('leads')
      .select('source')
      .gte('created_at', thirtyDaysAgo),

    // Leads grouped by score
    supabase
      .from('leads')
      .select('lead_score')
      .gte('created_at', thirtyDaysAgo),

    // Total leads last 30 days
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),

    // Total leads last 7 days
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo),

    // Most viewed blog posts
    supabase
      .from('blog_posts')
      .select('id, title, views_count, published_at, category')
      .eq('is_published', true)
      .order('views_count', { ascending: false })
      .limit(5),
  ])

  // Aggregate source counts
  const sourceCounts: Record<string, number> = {}
  leadsBySource?.forEach((l: any) => {
    const s = l.source || 'unknown'
    sourceCounts[s] = (sourceCounts[s] || 0) + 1
  })

  // Aggregate score counts
  const scoreCounts: Record<string, number> = { hot: 0, warm: 0, cold: 0 }
  leadsByScore?.forEach((l: any) => { scoreCounts[l.lead_score] = (scoreCounts[l.lead_score] || 0) + 1 })

  const totalLeads30d = recentLeads30d?.length ?? 0
  const totalLeads7d  = recentLeads7d?.length ?? 0
  const totalViews    = topListings?.reduce((s, l) => s + (l.views_count || 0), 0) || 0
  const hotRate       = totalLeads30d > 0 ? Math.round((scoreCounts.hot / totalLeads30d) * 100) : 0

  const sourceLabels: Record<string, string> = {
    ai_chat:      'AI Chat',
    contact_form: 'Property Form',
    contact_page: 'Contact Page',
    website:      'Website',
  }

  const scoreColors: Record<string, string> = {
    hot:  'bg-red-100 text-red-700',
    warm: 'bg-amber-100 text-amber-700',
    cold: 'bg-slate-100 text-slate-600',
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-[#372308]">Analytics</h1>
        <p className="text-[#8a7968] text-sm mt-1">Last 30 days · {format(new Date(), 'MMM d, yyyy')}</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Leads (30d)',   value: totalLeads30d,        sub: `${totalLeads7d} this week`,   icon: RiUserVoiceLine, color: 'bg-purple-50 text-purple-600' },
          { label: 'Hot Lead Rate', value: `${hotRate}%`,        sub: `${scoreCounts.hot} hot leads`, icon: RiBarChart2Line, color: 'bg-red-50 text-red-600' },
          { label: 'Property Views',value: totalViews.toLocaleString(), sub: 'across all listings', icon: RiEye2Line,        color: 'bg-[#F0D5A0]/40 text-[#372308]' },
          { label: 'Top Listing',   value: topListings?.[0]?.views_count ?? 0, sub: topListings?.[0]?.title?.slice(0, 24) ?? 'None yet', icon: RiBuilding2Line, color: 'bg-emerald-50 text-emerald-600' },
        ].map(({ label, value, sub, icon: Icon, color }) => (
          <div key={label} className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${color}`}>
              <Icon size={18} />
            </div>
            <p className="font-display text-2xl font-bold text-[#372308]">{value}</p>
            <p className="text-xs text-[#8a7968] mt-1">{label}</p>
            <p className="text-xs text-[#372308]/30 mt-0.5 truncate">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">

        {/* Lead sources */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5">
          <h2 className="font-semibold text-[#372308] text-sm mb-4">Leads by Source</h2>
          <div className="space-y-3">
            {Object.entries(sourceCounts).sort(([,a],[,b]) => b - a).map(([source, count]) => {
              const pct = totalLeads30d > 0 ? Math.round((count / totalLeads30d) * 100) : 0
              return (
                <div key={source}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[#372308]/70">{sourceLabels[source] || source}</span>
                    <span className="font-medium text-[#372308]">{count} <span className="text-[#372308]/35">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-[#E8DDD0] rounded-full overflow-hidden">
                    <div className="h-full bg-[#B8894A] rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
            {Object.keys(sourceCounts).length === 0 && (
              <p className="text-[#372308]/30 text-xs">No leads in the last 30 days</p>
            )}
          </div>
        </div>

        {/* Lead quality breakdown */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5">
          <h2 className="font-semibold text-[#372308] text-sm mb-4">Lead Quality (30d)</h2>
          <div className="space-y-3">
            {(['hot', 'warm', 'cold'] as const).map(score => {
              const count = scoreCounts[score] || 0
              const pct = totalLeads30d > 0 ? Math.round((count / totalLeads30d) * 100) : 0
              return (
                <div key={score}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${scoreColors[score]}`}>{score}</span>
                    <span className="font-medium text-[#372308]">{count} <span className="text-[#372308]/35">({pct}%)</span></span>
                  </div>
                  <div className="h-1.5 bg-[#E8DDD0] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${score === 'hot' ? 'bg-red-400' : score === 'warm' ? 'bg-amber-400' : 'bg-slate-300'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-5 pt-4 border-t border-[#372308]/6">
            <p className="text-xs text-[#372308]/40">Conversion insight</p>
            <p className="text-sm font-medium text-[#372308] mt-1">
              {hotRate >= 20 ? 'Strong lead quality' : hotRate >= 10 ? 'Average lead quality' : 'Consider improving qualification'}
            </p>
          </div>
        </div>

        {/* Top blog posts */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
          <div className="px-5 py-4 border-b border-[#372308]/6">
            <h2 className="font-semibold text-[#372308] text-sm">Top Blog Posts</h2>
          </div>
          <div className="divide-y divide-[#372308]/4">
            {topBlogs?.length === 0 && (
              <p className="text-[#372308]/30 text-xs p-5">No published posts yet</p>
            )}
            {topBlogs?.map((post: any) => (
              <div key={post.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-[#372308] truncate font-medium">{post.title}</p>
                  <p className="text-xs text-[#372308]/35">{post.category || 'Uncategorized'}</p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[#372308]/50 shrink-0">
                  <RiEye2Line size={12} /> {(post.views_count || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Top listings table */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#372308]/6">
          <div>
            <h2 className="font-semibold text-[#372308] text-sm">Top Properties by Views</h2>
            <p className="text-xs text-[#372308]/35 mt-0.5">All time</p>
          </div>
          <Link href="/admin/listings" className="text-xs text-[#372308] hover:underline">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#372308]/6 bg-[#F5F0E8]/50">
                <th className="text-left px-5 py-3 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Property</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden md:table-cell">Location</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden md:table-cell">Price</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Status</th>
                <th className="text-right px-5 py-3 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#372308]/4">
              {topListings?.map((listing: any) => (
                <tr key={listing.id} className="hover:bg-[#F0D5A0]/10 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-[#372308] text-sm truncate max-w-xs">{listing.title}</p>
                    <p className="text-xs text-[#372308]/35 capitalize">{listing.listing_type}</p>
                  </td>
                  <td className="px-5 py-3.5 text-[#8a7968] text-xs hidden md:table-cell">{listing.city}</td>
                  <td className="px-5 py-3.5 font-medium text-[#372308] text-sm hidden md:table-cell">${Number(listing.price).toLocaleString()}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${
                      listing.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                      listing.status === 'pending'   ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>{listing.status}</span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="font-semibold text-[#372308]">{(listing.views_count || 0).toLocaleString()}</span>
                  </td>
                </tr>
              ))}
              {!topListings?.length && (
                <tr><td colSpan={5} className="text-center py-8 text-[#372308]/30 text-sm">No listings yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
