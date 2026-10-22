'use client'

import { useState, useEffect, useCallback } from 'react'
import { RiStarFill, RiArrowLeftLine, RiArrowRightLine } from 'react-icons/ri'

interface Testimonial {
  id: string
  name: string
  role?: string
  content: string
  rating: number
  location?: string
}

export default function Testimonials({ testimonials }: { testimonials: Testimonial[] }) {
  const [current, setCurrent] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const total = testimonials.length

  const go = useCallback((dir: 'next' | 'prev') => {
    if (transitioning || total === 0) return
    setTransitioning(true)
    setTimeout(() => {
      setCurrent(prev => dir === 'next' ? (prev + 1) % total : (prev - 1 + total) % total)
      setTransitioning(false)
    }, 300)
  }, [transitioning, total])

  useEffect(() => {
    if (total <= 1) return
    const t = setInterval(() => go('next'), 7000)
    return () => clearInterval(t)
  }, [go, total])

  if (!total) return null

  const t = testimonials[current]

  return (
    <section className="bg-[#372308] py-20 lg:py-28 overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — label + controls */}
          <div>
            <p className="section-label text-[#F0D5A0]/50 mb-4">Testimonials</p>
            <h2 className="font-black text-[#F5F0E8] tracking-tight mb-8"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.04em', lineHeight: 0.95 }}>
              What our<br />
              <span className="italic font-light text-[#F0D5A0]">clients say</span>
            </h2>

            {/* Trust metrics */}
            <div className="grid grid-cols-2 gap-4 mb-10">
              {[
                { val: '2,400+', lbl: 'Happy Clients' },
                { val: '4.9/5', lbl: 'Average Rating' },
              ].map(m => (
                <div key={m.lbl} className="bg-[#F5F0E8]/5 rounded-2xl p-5 border border-[#F5F0E8]/8">
                  <p className="font-black text-[#F0D5A0] text-3xl tracking-tight">{m.val}</p>
                  <p className="text-[#F5F0E8]/40 text-xs uppercase tracking-widest mt-1">{m.lbl}</p>
                </div>
              ))}
            </div>

            {/* Controls */}
            {total > 1 && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => go('prev')}
                  className="w-11 h-11 rounded-full border border-[#F5F0E8]/15 flex items-center justify-center text-[#F5F0E8]/50 hover:text-[#F5F0E8] hover:border-[#F5F0E8]/30 transition-all"
                >
                  <RiArrowLeftLine size={17} />
                </button>
                <button
                  onClick={() => go('next')}
                  className="w-11 h-11 rounded-full bg-[#F0D5A0] flex items-center justify-center text-[#372308] hover:bg-[#F5F0E8] transition-all"
                >
                  <RiArrowRightLine size={17} />
                </button>
                <div className="flex gap-1.5 ml-2">
                  {testimonials.map((_, i) => (
                    <div
                      key={i}
                      className={`rounded-full transition-all duration-300 ${
                        i === current ? 'w-6 h-1.5 bg-[#F0D5A0]' : 'w-1.5 h-1.5 bg-[#F5F0E8]/20'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right — quote */}
          <div
            className={`transition-all duration-300 ${transitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
          >
            {/* Open quote */}
            <div className="text-[#F0D5A0]/20 font-black leading-none mb-4 select-none"
              style={{ fontSize: '8rem', lineHeight: 0.7 }}>
              &ldquo;
            </div>
            <blockquote className="text-[#F5F0E8] text-lg lg:text-2xl font-light leading-relaxed mb-8 -mt-6">
              {t.content}
            </blockquote>

            {/* Stars */}
            <div className="flex gap-1 mb-4">
              {Array.from({ length: t.rating }).map((_, i) => (
                <RiStarFill key={i} className="text-[#F0D5A0]" size={14} />
              ))}
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#F0D5A0] flex items-center justify-center text-[#372308] font-bold text-sm">
                {t.name.charAt(0)}
              </div>
              <div>
                <p className="text-[#F5F0E8] font-semibold text-sm">{t.name}</p>
                {(t.role || t.location) && (
                  <p className="text-[#F5F0E8]/35 text-xs">
                    {t.role}{t.role && t.location ? ' · ' : ''}{t.location}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
