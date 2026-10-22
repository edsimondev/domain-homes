'use client'

import { useState, useEffect, useCallback } from 'react'
import { RiFilterLine, RiCloseLine, RiSearchLine, RiLoader4Line, RiArrowDownSLine } from 'react-icons/ri'
import PropertyCard from './PropertyCard'
import type { Listing, ListingFilters } from '@/types'

const PROPERTY_TYPES = ['', 'house', 'apartment', 'condo', 'villa', 'townhouse', 'land', 'commercial']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'featured', label: 'Featured First' },
]

export default function ListingsClient({ initialSearchParams }: { initialSearchParams: Record<string, string | undefined> }) {
  const [listings, setListings] = useState<Listing[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [searchInput, setSearchInput] = useState(initialSearchParams.search || '')
  const [priceMax, setPriceMax] = useState(initialSearchParams.max_price ? Number(initialSearchParams.max_price) : 5000000)

  const [filters, setFilters] = useState<ListingFilters>({
    search: initialSearchParams.search || '',
    listing_type: (initialSearchParams.listing_type as any) || '',
    property_type: (initialSearchParams.property_type as any) || '',
    city: initialSearchParams.city || '',
    bedrooms: initialSearchParams.bedrooms ? Number(initialSearchParams.bedrooms) : undefined,
    sort: (initialSearchParams.sort as any) || 'newest',
    is_featured: initialSearchParams.is_featured === 'true' ? true : undefined,
  })

  const fetch_ = useCallback(async (f: ListingFilters, p: number) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries({ ...f, page: p, per_page: 12 }).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== null) params.set(k, String(v))
      })
      const res = await fetch(`/api/listings?${params}`)
      const json = await res.json()
      setListings(json.data || [])
      setTotal(json.count || 0)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch_(filters, page) }, [filters, page, fetch_])

  const applyFilters = () => {
    setFilters(f => ({ ...f, search: searchInput, max_price: priceMax }))
    setPage(1)
    setFiltersOpen(false)
  }

  const reset = () => {
    setFilters({ sort: 'newest' })
    setSearchInput('')
    setPriceMax(5000000)
    setPage(1)
  }

  const formatPriceLabel = (v: number) =>
    v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${(v / 1000).toFixed(0)}K`

  const totalPages = Math.ceil(total / 12)

  const sel = (k: keyof ListingFilters, v: any) => { setFilters(f => ({ ...f, [k]: v })); setPage(1) }

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-8">
      {/* Top controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 relative">
          <RiSearchLine className="absolute left-4 top-1/2 -translate-y-1/2 text-[#372308]/30" size={15} />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyFilters()}
            placeholder="Search by city, address, keyword..."
            className="input-field pl-10"
          />
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={filters.sort}
            onChange={e => sel('sort', e.target.value)}
            className="input-field pr-8 appearance-none cursor-pointer min-w-[160px]"
          >
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <RiArrowDownSLine className="absolute right-3 top-1/2 -translate-y-1/2 text-[#372308]/40 pointer-events-none" size={16} />
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setFiltersOpen(v => !v)}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl border text-sm font-semibold transition-all ${
            filtersOpen
              ? 'bg-[#372308] text-[#F5F0E8] border-[#372308]'
              : 'border-[#372308]/15 text-[#372308] hover:border-[#372308]/30'
          }`}
        >
          <RiFilterLine size={15} />
          Filters
        </button>
      </div>

      {/* Filter panel */}
      {filtersOpen && (
        <div className="bg-[#F5F0E8] border border-[#372308]/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-[#372308] text-sm">Refine Search</h3>
            <button onClick={() => setFiltersOpen(false)} className="text-[#372308]/30 hover:text-[#372308]">
              <RiCloseLine size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#372308]/40 uppercase tracking-wider mb-2">For</label>
              <select value={filters.listing_type || ''} onChange={e => sel('listing_type', e.target.value)} className="input-field text-sm">
                <option value="">Buy or Rent</option>
                <option value="sale">For Sale</option>
                <option value="rent">For Rent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#372308]/40 uppercase tracking-wider mb-2">Type</label>
              <select value={filters.property_type || ''} onChange={e => sel('property_type', e.target.value)} className="input-field text-sm">
                <option value="">Any Type</option>
                {PROPERTY_TYPES.filter(Boolean).map(t => (
                  <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#372308]/40 uppercase tracking-wider mb-2">Beds</label>
              <select value={filters.bedrooms || ''} onChange={e => sel('bedrooms', e.target.value ? Number(e.target.value) : undefined)} className="input-field text-sm">
                <option value="">Any</option>
                {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}+</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#372308]/40 uppercase tracking-wider mb-2">City</label>
              <input value={filters.city || ''} onChange={e => sel('city', e.target.value)} placeholder="Any city" className="input-field text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#372308]/40 uppercase tracking-wider mb-2">
                Max Price: {formatPriceLabel(priceMax)}
              </label>
              <input
                type="range" min={0} max={5000000} step={50000} value={priceMax}
                onChange={e => setPriceMax(Number(e.target.value))}
                className="w-full accent-[#372308]"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-5 pt-4 border-t border-[#372308]/8">
            <button onClick={applyFilters} className="btn-espresso">
              <RiSearchLine size={14} /> Apply Filters
            </button>
            <button onClick={reset} className="text-sm text-[#372308]/50 hover:text-[#372308] px-4 py-2 rounded-xl hover:bg-[#372308]/4 transition-all">
              Reset
            </button>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-[#372308]/40">
          {loading ? 'Finding properties...' : `${total.toLocaleString()} propert${total === 1 ? 'y' : 'ies'} found`}
        </p>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <RiLoader4Line className="text-[#372308]/30 animate-spin" size={28} />
          <p className="text-[#372308]/40 text-sm">Finding properties...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <span className="text-5xl mb-4">🏠</span>
          <h3 className="font-semibold text-[#372308] mb-2">No properties found</h3>
          <p className="text-[#8a7968] text-sm max-w-sm mb-4">Try adjusting your filters or search terms.</p>
          <button onClick={reset} className="btn-outline text-sm">Clear all filters</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map(l => <PropertyCard key={l.id} listing={l} />)}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-12">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="px-4 py-2 text-sm border border-[#372308]/15 rounded-xl hover:border-[#372308]/30 disabled:opacity-30 text-[#372308] transition-all">
            Previous
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => setPage(p)}
              className={`w-10 h-10 text-sm rounded-xl transition-all ${
                page === p ? 'bg-[#372308] text-[#F5F0E8]' : 'border border-[#372308]/15 text-[#372308] hover:border-[#372308]/30'
              }`}>
              {p}
            </button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="px-4 py-2 text-sm border border-[#372308]/15 rounded-xl hover:border-[#372308]/30 disabled:opacity-30 text-[#372308] transition-all">
            Next
          </button>
        </div>
      )}
    </div>
  )
}
