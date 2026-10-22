'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { RiArrowRightLine, RiSearchLine } from 'react-icons/ri'
import DomaineLogo from '@/components/ui/Logo'

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1800&q=85&auto=format',
    tag: 'Curated Collection',
    headline: 'A place that truly feels like',
    accent: 'home.',
    sub: 'More than a house — a life well lived.',
  },
  {
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1800&q=85&auto=format',
    tag: 'Luxury Portfolio',
    headline: 'Where luxury meets',
    accent: 'living.',
    sub: 'Made to fit your life, today and tomorrow.',
  },
  {
    image: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1800&q=85&auto=format',
    tag: 'Investment Grade',
    headline: 'Find your next',
    accent: 'chapter.',
    sub: 'Premium properties for discerning buyers.',
  },
]

export default function Hero() {
  const [current, setCurrent] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [searchType, setSearchType] = useState<'sale' | 'rent'>('sale')

  const goTo = (idx: number) => {
    if (transitioning || idx === current) return
    setTransitioning(true)
    setPrev(current)
    setTimeout(() => {
      setCurrent(idx)
      setPrev(null)
      setTransitioning(false)
    }, 700)
  }

  useEffect(() => {
    const t = setInterval(() => goTo((current + 1) % slides.length), 6000)
    return () => clearInterval(t)
  }, [current, transitioning])

  const slide = slides[current]

  return (
    <section className="relative w-full h-screen min-h-[680px] max-h-[960px] overflow-hidden bg-[#372308]">

      {/* Images */}
      {slides.map((s, i) => (
        <div
          key={i}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === current ? 1 : 0 }}
        >
          <img
            src={s.image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1e1200]/90 via-[#1e1200]/30 to-[#1e1200]/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#1e1200]/40 to-transparent" />
        </div>
      ))}

      {/* Big background wordmark — like Everhome */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none overflow-hidden">
        <span
          className="font-black text-[#F5F0E8]/5 whitespace-nowrap"
          style={{ fontSize: 'clamp(8rem, 22vw, 22rem)', letterSpacing: '-0.05em', lineHeight: 1 }}
        >
          Domaine
        </span>
      </div>

      {/* Small labels top — like Everhome */}
      <div className="absolute top-24 left-0 right-0 hidden lg:flex justify-end px-10">
        <div className="flex gap-16">
          <div>
            <p className="text-[#F5F0E8]/40 text-xs uppercase tracking-widest mb-1">Est.</p>
            <p className="text-[#F5F0E8]/70 text-sm font-medium">Premium Real Estate</p>
          </div>
          <div>
            <p className="text-[#F5F0E8]/40 text-xs uppercase tracking-widest mb-1">Portfolio</p>
            <p className="text-[#F5F0E8]/70 text-sm font-medium">500+ Properties</p>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 h-full flex flex-col justify-end pb-16 px-6 lg:px-10 max-w-7xl mx-auto w-full">

        {/* Slide tag */}
        <div className="mb-4">
          <span className="tag-pill bg-[#F0D5A0]/20 text-[#F0D5A0] border border-[#F0D5A0]/30 text-xs tracking-widest">
            {slide.tag}
          </span>
        </div>

        {/* Main headline — massive, editorial */}
        <div className="mb-6 max-w-4xl">
          <h1
            key={current}
            className="font-black text-[#F5F0E8] leading-none tracking-tighter"
            style={{
              fontSize: 'clamp(3.5rem, 9vw, 8.5rem)',
              letterSpacing: '-0.04em',
              lineHeight: 0.92,
            }}
          >
            {slide.headline}
            <br />
            <span
              className="text-[#F0D5A0] italic"
              style={{ fontStyle: 'italic' }}
            >
              {slide.accent}
            </span>
          </h1>
          <p className="text-[#F5F0E8]/50 text-base lg:text-lg mt-4 font-light tracking-wide">
            {slide.sub}
          </p>
        </div>

        {/* Search bar */}
        <div className="bg-[#F5F0E8] rounded-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl mb-8 shadow-2xl">
          <div className="flex bg-[#372308]/8 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setSearchType('sale')}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                searchType === 'sale'
                  ? 'bg-[#372308] text-[#F5F0E8]'
                  : 'text-[#372308]/50 hover:text-[#372308]'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => setSearchType('rent')}
              className={`text-sm font-semibold px-4 py-2 rounded-lg transition-all ${
                searchType === 'rent'
                  ? 'bg-[#372308] text-[#F5F0E8]'
                  : 'text-[#372308]/50 hover:text-[#372308]'
              }`}
            >
              Rent
            </button>
          </div>
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (window.location.href = `/listings?listing_type=${searchType}&search=${encodeURIComponent(searchInput)}`)}
            placeholder="City, neighborhood, or address..."
            className="flex-1 px-4 py-2.5 text-sm text-[#372308] bg-transparent outline-none placeholder-[#372308]/35 font-medium"
          />
          <Link
            href={`/listings?listing_type=${searchType}&search=${encodeURIComponent(searchInput)}`}
            className="flex items-center justify-center gap-2 bg-[#372308] hover:bg-[#5a3a14] text-[#F5F0E8] text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0"
          >
            <RiSearchLine size={15} />
            Search
          </Link>
        </div>

        {/* Bottom row: stats + slide controls */}
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-8 lg:gap-12">
            {[
              { value: '2,400+', label: 'Properties Sold' },
              { value: '98%', label: 'Client Satisfaction' },
              { value: '$1.2B', label: 'Sales Volume' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-[#F0D5A0] font-black text-xl lg:text-3xl tracking-tight">{stat.value}</p>
                <p className="text-[#F5F0E8]/40 text-xs mt-0.5 tracking-wider uppercase">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Slide indicators */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-8 h-1.5 bg-[#F0D5A0]'
                    : 'w-1.5 h-1.5 bg-[#F5F0E8]/25 hover:bg-[#F5F0E8]/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
