import { createClient } from '@/lib/supabase/server'
import {
  RiBuilding2Line,
  RiUserVoiceLine,
  RiGroupLine,
  RiEye2Line,
  RiFireLine,
  RiArrowUpLine,
  RiCalendarLine,
} from 'react-icons/ri'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const [
    { count: listingsCount },
    { count: leadsCount },
    { count: hotLeadsCount },
    { count: agentsCount },
    { data: recentLeads },
    { data: recentListings },
  ] = await Promise.all([
    supabase.from('listings').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*', { count: 'exact', head: true }).eq('lead_score', 'hot'),
    supabase.from('agents').select('*', { count: 'exact', head: true }),
    supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(6),
    supabase.from('listings').select('id, title, price, status, city, created_at').order('created_at', { ascending: false }).limit(5),
  ])

  const stats = [
    { label: 'Total Listings', value: listingsCount || 0, icon: RiBuilding2Line, color: 'bg-[#F0D5A0]/20 text-[#372308]', href: '/admin/listings' },
    { label: 'Total Leads', value: leadsCount || 0, icon: RiUserVoiceLine, color: 'bg-purple-50 text-purple-600', href: '/admin/leads' },
    { label: 'Hot Leads', value: hotLeadsCount || 0, icon: RiFireLine, color: 'bg-red-50 text-red-600', href: '/admin/leads?score=hot' },
    { label: 'Active Agents', value: agentsCount || 0, icon: RiGroupLine, color: 'bg-emerald-50 text-emerald-600', href: '/admin/agents' },
  ]

  const scoreColors: Record<string, string> = {
    hot: 'badge-hot',
    warm: 'badge-warm',
    cold: 'badge-cold',
  }

  return (
    <div className="p-6 lg:p-10 pt-16 lg:pt-10">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-[#372308]">Dashboard</h1>
        <p className="text-[#8a7968] text-sm mt-1">Welcome back. Here's what's happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, href }) => (
          <Link
            key={label}
            href={href}
            className="bg-[#F5F0E8] rounded-2xl p-5 border border-[#372308]/6 hover:border-[#372308]/15 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon size={18} />
              </div>
              <RiArrowUpLine className="text-gray-300 group-hover:text-[#5a3a14] transition-colors" size={14} />
            </div>
            <p className="font-display text-2xl font-bold text-[#372308]">{value.toLocaleString()}</p>
            <p className="text-[#8a7968] text-xs mt-1">{label}</p>
          </Link>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Leads */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#372308]/6">
            <h2 className="font-semibold text-[#372308] text-sm">Recent Leads</h2>
            <Link href="/admin/leads" className="text-xs text-[#372308] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[#372308]/4">
            {recentLeads?.length === 0 && (
              <p className="text-[#372308]/35 text-sm text-center py-8">No leads yet</p>
            )}
            {recentLeads?.map(lead => (
              <div key={lead.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#E8E0D0] flex items-center justify-center text-[#372308] text-xs font-semibold shrink-0">
                    {lead.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#372308] truncate">{lead.name || 'Unknown'}</p>
                    <p className="text-xs text-[#372308]/35 truncate">{lead.email || lead.phone || 'No contact'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColors[lead.lead_score]}`}>
                    {lead.lead_score}
                  </span>
                  <span className="text-xs text-[#372308]/35 hidden sm:block">
                    {format(new Date(lead.created_at), 'MMM d')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Listings */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#372308]/6">
            <h2 className="font-semibold text-[#372308] text-sm">Recent Listings</h2>
            <Link href="/admin/listings" className="text-xs text-[#372308] hover:underline">View all</Link>
          </div>
          <div className="divide-y divide-[#372308]/4">
            {recentListings?.length === 0 && (
              <p className="text-[#372308]/35 text-sm text-center py-8">No listings yet</p>
            )}
            {recentListings?.map(listing => (
              <div key={listing.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#F0D5A0]/20 flex items-center justify-center shrink-0">
                    <RiBuilding2Line className="text-[#372308]" size={14} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[#372308] truncate">{listing.title}</p>
                    <p className="text-xs text-[#372308]/35">{listing.city}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize
                    ${listing.status === 'available' ? 'bg-emerald-50 text-emerald-700' :
                      listing.status === 'pending' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'}`}>
                    {listing.status}
                  </span>
                  <span className="text-xs font-medium text-[#372308] hidden sm:block">
                    ${Number(listing.price).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Add Listing', href: '/admin/listings/new', icon: RiBuilding2Line },
          { label: 'Add Agent', href: '/admin/agents/new', icon: RiGroupLine },
          { label: 'Write Post', href: '/admin/blog/new', icon: RiCalendarLine },
          { label: 'View Leads', href: '/admin/leads', icon: RiUserVoiceLine },
        ].map(({ label, href, icon: Icon }) => (
          <Link
            key={label}
            href={href}
            className="flex items-center gap-2.5 bg-[#F5F0E8] border border-[#372308]/6 hover:border-[#372308]/15 hover:bg-[#F0D5A0]/20 text-[#372308]/75 hover:text-[#1e1200] text-sm font-medium px-4 py-3 rounded-xl transition-all"
          >
            <Icon size={16} className="text-[#372308]" />
            {label}
          </Link>
        ))}
      </div>
    </div>
  )
}
