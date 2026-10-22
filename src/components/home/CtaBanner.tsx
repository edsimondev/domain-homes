import Link from 'next/link'
import { RiArrowRightLine, RiPhoneLine } from 'react-icons/ri'

export default function CtaBanner() {
  return (
    <section className="bg-[#F0D5A0] py-16 lg:py-20 overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none select-none flex items-center justify-center overflow-hidden">
        <span className="font-black text-[#372308]/5 whitespace-nowrap"
          style={{ fontSize: 'clamp(6rem, 20vw, 18rem)', letterSpacing: '-0.05em', lineHeight: 1 }}>
          HOME
        </span>
      </div>
      <div className="relative max-w-7xl mx-auto px-6 lg:px-10">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div>
            <p className="section-label text-[#372308]/50 mb-3">Ready?</p>
            <h2 className="font-black text-[#372308] tracking-tight"
              style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', letterSpacing: '-0.04em', lineHeight: 0.95 }}>
              Find your dream<br />home today
            </h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Link href="/listings" className="btn-espresso">
              Browse Properties <RiArrowRightLine size={15} />
            </Link>
            <a href="tel:+15551234567" className="btn-outline border-[#372308] text-[#372308]">
              <RiPhoneLine size={15} /> Call Us Now
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}
