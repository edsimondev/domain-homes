'use client'

import Link from 'next/link'
import Image from 'next/image'
import { RiArrowRightUpLine, RiHotelBedLine, RiRulerLine, RiMapPin2Line } from 'react-icons/ri'
import { BiBath } from 'react-icons/bi' 
import { LuShowerHead } from 'react-icons/lu'

interface Listing {
  id: string
  title: string
  slug: string
  price: number
  listing_type: string
  property_type: string
  bedrooms: number
  bathrooms: number
  square_footage?: number
  city: string
  state: string
  cover_image?: string
  is_featured?: boolean
}

function formatPrice(price: number, type: string) {
  const f = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(price)
  return type === 'rent' ? `${f}/mo` : f
}

function MasonryCard({
  listing,
  size = 'default',
}: {
  listing: Listing
  size?: 'hero' | 'default' | 'wide'
}) {
  const heights: Record<string, string> = {
    hero: 'h-[520px] lg:h-[640px]',
    default: 'h-[260px] lg:h-[312px]',
    wide: 'h-[260px] lg:h-[312px]',
  }

  return (
    <Link href={`/property/${listing.slug}`} className={`prop-card block ${heights[size]}`}>
      {listing.cover_image ? (
        <Image
          src={listing.cover_image}
          alt={listing.title}
          fill
          className="object-cover"
          sizes={size === 'hero' ? '50vw' : '(max-width: 768px) 100vw, 33vw'}
        />
      ) : (
        <div className="w-full h-full bg-[#372308]" />
      )}

      <div className="prop-card-overlay" />

      {/* Tags top-left */}
      <div className="absolute top-4 left-4 flex gap-2">
        <span className={`tag-pill ${listing.listing_type === 'rent' ? 'tag-rent' : 'tag-sale'}`}>
          For {listing.listing_type}
        </span>
        {listing.is_featured && (
          <span className="tag-pill tag-featured">Featured</span>
        )}
      </div>

      {/* Arrow top-right */}
      <div className="absolute top-4 right-4 w-8 h-8 bg-[#F5F0E8]/15 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <RiArrowRightUpLine className="text-[#F5F0E8]" size={14} />
      </div>

      {/* Info bottom */}
      <div className="prop-card-info">
        <p className="text-[#F0D5A0] font-black text-xl lg:text-2xl tracking-tight leading-none mb-1">
          {formatPrice(listing.price, listing.listing_type)}
        </p>
        <p className="text-[#F5F0E8] font-semibold text-sm leading-snug mb-2 line-clamp-2">
          {listing.title}
        </p>
        <div className="flex items-center gap-1.5 text-[#F5F0E8]/50 text-xs mb-2">
          <RiMapPin2Line size={11} />
          <span>{listing.city}, {listing.state}</span>
        </div>
        <div className="flex items-center gap-3 text-[#F5F0E8]/60 text-xs">
          {listing.bedrooms > 0 && (
            <span className="flex items-center gap-1"><RiHotelBedLine size={11} />{listing.bedrooms} Bed</span>
          )}
          {listing.bathrooms > 0 && (
            <span className="flex items-center gap-1"><BiBath size={11} />{listing.bathrooms} Bath</span>
          )}
          {listing.square_footage && (
            <span className="flex items-center gap-1"><RiRulerLine size={11} />{listing.square_footage.toLocaleString()} sqft</span>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function FeaturedListings({ listings }: { listings: Listing[] }) {
  if (!listings.length) return null

  const [hero, ...rest] = listings

  return (
    <section className="bg-[#F5F0E8] py-20 lg:py-28">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-10">
          <div>
            <p className="section-label mb-3">Featured Properties</p>
            <h2 className="editorial-md text-[#372308]">
              Handpicked<br />
              <span className="italic font-light text-[#8a7968]">for you</span>
            </h2>
          </div>
          <Link
            href="/listings?is_featured=true"
            className="btn-outline group shrink-0"
          >
            View all properties
            <RiArrowRightUpLine size={15} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </Link>
        </div>

        {/* Masonry grid */}
        {listings.length >= 4 ? (
          <div className="masonry-grid">
            {/* Hero card — tall left */}
            <div className="masonry-card-hero">
              <MasonryCard listing={listings[0]} size="hero" />
            </div>
            {/* Top right 1 */}
            <div className="masonry-card-top-right-1">
              <MasonryCard listing={listings[1]} size="default" />
            </div>
            {/* Top right 2 */}
            <div className="masonry-card-top-right-2">
              <MasonryCard listing={listings[2]} size="default" />
            </div>
            {/* Wide bottom right */}
            <div className="masonry-card-bottom-wide">
              <MasonryCard listing={listings[3]} size="wide" />
            </div>
          </div>
        ) : (
          /* Fallback regular grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {listings.map(l => (
              <MasonryCard key={l.id} listing={l} size="default" />
            ))}
          </div>
        )}

        {/* Listings count strip */}
        {listings.length >= 4 && (
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-[#372308]/10" />
            <p className="text-[#8a7968] text-sm font-medium">
              {listings.length} featured · <Link href="/listings" className="text-[#372308] hover:underline">Browse all 500+ listings</Link>
            </p>
            <div className="flex-1 h-px bg-[#372308]/10" />
          </div>
        )}
      </div>
    </section>
  )
}
