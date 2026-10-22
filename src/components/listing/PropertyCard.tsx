'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { RiHotelBedLine, RiRulerLine, RiHeartLine, RiHeartFill, RiMapPin2Line, RiArrowRightUpLine } from 'react-icons/ri'
import { BiBath } from 'react-icons/bi' 
import { LuShowerHead } from 'react-icons/lu'
import { formatPrice } from '@/lib/utils'
import type { Listing } from '@/types'

export default function PropertyCard({ listing, className = '' }: { listing: Listing; className?: string }) {
  const [liked, setLiked] = useState(false)

  return (
    <div className={`group bg-[#F5F0E8] rounded-2xl overflow-hidden border border-[#372308]/6 hover:border-[#372308]/15 transition-all hover:shadow-md ${className}`}>
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-[#E8E0D0]">
        {listing.cover_image ? (
          <Image
            src={listing.cover_image}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-104 transition-transform duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full bg-[#E8E0D0] flex items-center justify-center">
            <span className="font-black text-5xl text-[#372308]/10">E</span>
          </div>
        )}

        {/* Overlay on hover */}
        <div className="absolute inset-0 bg-[#372308]/0 group-hover:bg-[#372308]/10 transition-colors" />

        {/* Tags */}
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span className={`tag-pill ${listing.listing_type === 'rent' ? 'tag-rent' : 'tag-sale'}`}>
            For {listing.listing_type}
          </span>
          {listing.status === 'pending' && (
            <span className="tag-pill bg-[#F0D5A0] text-[#372308]">Pending</span>
          )}
        </div>

        {/* Wishlist */}
        <button
          onClick={e => { e.preventDefault(); setLiked(v => !v) }}
          className="absolute top-3 right-3 w-8 h-8 bg-[#F5F0E8]/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-[#F5F0E8] transition-all"
        >
          {liked
            ? <RiHeartFill className="text-[#372308]" size={14} />
            : <RiHeartLine className="text-[#372308]/50" size={14} />
          }
        </button>

        {/* Arrow on hover */}
        <div className="absolute bottom-3 right-3 w-8 h-8 bg-[#372308] rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all">
          <RiArrowRightUpLine className="text-[#F5F0E8]" size={14} />
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <span className="font-black text-[#372308] text-lg tracking-tight leading-none">
            {formatPrice(listing.price, listing.listing_type)}
          </span>
          <span className="text-xs text-[#8a7968] capitalize mt-0.5 shrink-0">{listing.property_type}</span>
        </div>

        <Link href={`/property/${listing.slug}`}>
          <h3 className="font-semibold text-[#372308] text-sm leading-snug mb-1.5 hover:text-[#5a3a14] transition-colors line-clamp-2">
            {listing.title}
          </h3>
        </Link>

        <div className="flex items-center gap-1 text-[#8a7968] text-xs mb-3">
          <RiMapPin2Line size={11} className="shrink-0" />
          <span className="truncate">{listing.city}, {listing.state}</span>
        </div>

        <div className="border-t border-[#372308]/6 pt-3 flex items-center gap-4">
          {listing.bedrooms > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#372308]/50">
              <RiHotelBedLine size={12} />{listing.bedrooms} {listing.bedrooms === 1 ? 'Bed' : 'Beds'}
            </span>
          )}
          {listing.bathrooms > 0 && (
            <span className="flex items-center gap-1 text-xs text-[#372308]/50">
              <LuShowerHead size={12} />{listing.bathrooms} {listing.bathrooms === 1 ? 'Bath' : 'Baths'}
            </span>
          )}
          {listing.square_footage && (
            <span className="flex items-center gap-1 text-xs text-[#372308]/50 ml-auto">
              <RiRulerLine size={12} />{listing.square_footage.toLocaleString()} sqft
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
