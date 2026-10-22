import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  RiAddLine,
  RiEditLine,
  RiDeleteBinLine,
  RiStarLine,
  RiStarFill,
} from 'react-icons/ri'
import ListingActionsCell from './ListingActionsCell'

export default async function AdminListingsPage() {
  const supabase = await createClient()

  const { data: listings } = await supabase
    .from('listings')
    .select('id, title, price, status, listing_type, city, state, is_featured, bedrooms, bathrooms, created_at, agent:agents(name)')
    .order('created_at', { ascending: false })

  const statusColors: Record<string, string> = {
    available: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    sold: 'bg-red-50 text-red-700',
    rented: 'bg-purple-50 text-purple-700',
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#372308]">Listings</h1>
          <p className="text-[#8a7968] text-sm mt-1">{listings?.length || 0} total properties</p>
        </div>
        <Link
          href="/admin/listings/new"
          className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors"
        >
          <RiAddLine size={16} /> Add Listing
        </Link>
      </div>

      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#372308]/6 bg-[#F5F0E8]/50">
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Property</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden md:table-cell">Price</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden lg:table-cell">Location</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden xl:table-cell">Agent</th>
                <th className="text-left px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider hidden lg:table-cell">Added</th>
                <th className="text-right px-5 py-3.5 text-xs font-medium text-[#8a7968] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {!listings?.length && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-[#372308]/35 text-sm">
                    No listings yet. <Link href="/admin/listings/new" className="text-[#372308] hover:underline">Add your first listing</Link>
                  </td>
                </tr>
              )}
              {listings?.map(listing => (
                <tr key={listing.id} className="hover:bg-[#F5F0E8]/50 transition-colors">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2.5">
                      {listing.is_featured && (
                        <RiStarFill className="text-[#D4B87A] shrink-0" size={13} />
                      )}
                      <div>
                        <p className="font-medium text-[#372308] text-sm line-clamp-1 max-w-xs">{listing.title}</p>
                        <p className="text-xs text-[#372308]/35 capitalize">{listing.listing_type} · {listing.bedrooms}bd {listing.bathrooms}ba</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 hidden md:table-cell">
                    <span className="font-medium text-[#372308]">${Number(listing.price).toLocaleString()}</span>
                  </td>
                  <td className="px-5 py-4 text-[#8a7968] hidden lg:table-cell">{listing.city}, {listing.state}</td>
                  <td className="px-5 py-4">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${statusColors[listing.status]}`}>
                      {listing.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-[#8a7968] text-xs hidden xl:table-cell">
                    {(listing.agent as any)?.name || '—'}
                  </td>
                  <td className="px-5 py-4 text-[#372308]/35 text-xs hidden lg:table-cell">
                    {format(new Date(listing.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-4">
                    <ListingActionsCell listingId={listing.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
