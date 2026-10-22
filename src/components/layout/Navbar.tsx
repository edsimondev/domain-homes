'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { RiMenu3Line, RiCloseLine, RiArrowRightUpLine } from 'react-icons/ri'
import DomaineLogo from '@/components/ui/Logo'

const links = [
  { href: '/', label: 'Home' },
  { href: '/listings', label: 'Properties' },
  { href: '/agents', label: 'Agents' },
  { href: '/blog', label: 'Journal' },
  { href: '/contact', label: 'Contact' },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setOpen(false) }, [pathname])

  const transparent = isHome && !scrolled && !open

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          transparent
            ? 'bg-transparent'
            : 'bg-[#F5F0E8]/95 backdrop-blur-xl border-b border-[#372308]/8'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="flex items-center justify-between h-16 lg:h-18">

            {/* Logo */}
            <Link href="/">
              <DomaineLogo variant={transparent ? 'light' : 'dark'} size="sm" />
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {links.map(link => {
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      active
                        ? transparent
                          ? 'bg-[#F5F0E8]/20 text-[#F5F0E8]'
                          : 'bg-[#372308]/8 text-[#372308]'
                        : transparent
                        ? 'text-[#F5F0E8]/70 hover:text-[#F5F0E8] hover:bg-[#F5F0E8]/10'
                        : 'text-[#372308]/60 hover:text-[#372308] hover:bg-[#372308]/6'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </nav>

            {/* CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/listings"
                className={`flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-full transition-all ${
                  transparent
                    ? 'bg-[#F5F0E8] text-[#372308] hover:bg-[#F0D5A0]'
                    : 'bg-[#372308] text-[#F5F0E8] hover:bg-[#5a3a14]'
                }`}
              >
                Browse Homes
                <RiArrowRightUpLine size={14} />
              </Link>
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setOpen(v => !v)}
              className={`lg:hidden p-2 rounded-full transition-colors ${
                transparent
                  ? 'text-[#F5F0E8] hover:bg-[#F5F0E8]/10'
                  : 'text-[#372308] hover:bg-[#372308]/8'
              }`}
            >
              {open ? <RiCloseLine size={22} /> : <RiMenu3Line size={22} />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div className={`lg:hidden fixed inset-0 z-40 transition-all duration-300 ${
        open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}>
        <div className="absolute inset-0 bg-[#F5F0E8]" />
        <div className="relative flex flex-col justify-center h-full px-8 pt-16">
          <nav className="space-y-2">
            {links.map((link, i) => (
              <Link
                key={link.href}
                href={link.href}
                className="block py-3 text-4xl font-800 text-[#372308] tracking-tight hover:text-[#8a7968] transition-colors"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-10">
            <Link href="/listings" className="btn-espresso inline-flex">
              Browse All Properties <RiArrowRightUpLine size={16} />
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
