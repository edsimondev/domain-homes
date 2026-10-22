import Link from 'next/link'
import {
  RiShieldCheckLine,
  RiUserStarLine,
  RiBarChartLine,
  RiHandHeartLine,
  RiArrowRightLine,
} from 'react-icons/ri'

const features = [
  {
    icon: RiShieldCheckLine,
    title: 'Every listing verified',
    body: 'Our team personally vets every property before it appears on the platform. No surprises.',
  },
  {
    icon: RiUserStarLine,
    title: 'Expert-led, always',
    body: 'Work directly with licensed agents who know your local market better than anyone.',
  },
  {
    icon: RiBarChartLine,
    title: 'Real-time insights',
    body: 'Live market data, price history, and neighborhood trends — all in one place.',
  },
  {
    icon: RiHandHeartLine,
    title: 'End-to-end support',
    body: 'From first search to signed contract, we are with you every step of the way.',
  },
]

export default function WhyUs() {
  return (
    <>
      {/* Stats bar */}
      <div className="bg-[#372308] py-12 lg:py-16">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-0 lg:divide-x lg:divide-[#F5F0E8]/10">
            {[
              { value: '2,400+', label: 'Properties Sold' },
              { value: '98%', label: 'Client Satisfaction' },
              { value: '$1.2B+', label: 'Total Sales Volume' },
              { value: '15 yrs', label: 'Market Experience' },
            ].map(s => (
              <div key={s.label} className="text-center lg:px-8">
                <p className="font-black text-[#F0D5A0] tracking-tight mb-1"
                  style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', letterSpacing: '-0.04em', lineHeight: 1 }}>
                  {s.value}
                </p>
                <p className="text-[#F5F0E8]/40 text-xs uppercase tracking-widest">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Why us */}
      <section className="bg-[#F5F0E8] py-20 lg:py-28">
        <div className="max-w-7xl mx-auto px-6 lg:px-10">
          <div className="grid lg:grid-cols-2 gap-16 items-start">

            {/* Left */}
            <div>
              <p className="section-label mb-4">Why Domaine</p>
              <h2 className="editorial-md text-[#372308] mb-6">
                The smarter way to<br />
                <span className="italic font-light text-[#8a7968]">buy, sell & rent</span>
              </h2>
              <p className="text-[#372308]/60 text-base leading-relaxed mb-8 max-w-md">
                We combine deep human expertise with intelligent technology to make your real estate journey seamless, transparent, and genuinely rewarding.
              </p>
              <div className="flex gap-3">
                <Link href="/listings" className="btn-espresso">
                  Browse Properties <RiArrowRightLine size={15} />
                </Link>
                <Link href="/agents" className="btn-outline">
                  Meet Our Agents
                </Link>
              </div>
            </div>

            {/* Right — feature grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {features.map(({ icon: Icon, title, body }) => (
                <div
                  key={title}
                  className="bg-[#F5F0E8] border border-[#372308]/10 rounded-2xl p-6 hover:border-[#372308]/20 hover:bg-[#F0D5A0]/20 transition-all"
                >
                  <div className="w-10 h-10 bg-[#372308]/6 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="text-[#372308]" size={18} />
                  </div>
                  <h3 className="font-semibold text-[#372308] text-sm mb-2">{title}</h3>
                  <p className="text-[#372308]/55 text-sm leading-relaxed">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
