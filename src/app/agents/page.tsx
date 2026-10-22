import { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { RiPhoneLine, RiMailLine } from 'react-icons/ri'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Our Agents — Meet the Team',
  description: 'Expert licensed agents who know the market inside and out.',
}

export const revalidate = 300

export default async function AgentsPage() {
  const supabase = await createClient()
  const { data: agents } = await supabase
    .from('agents')
    .select('*, listings:listings(count)')
    .eq('is_active', true)
    .order('created_at')

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-[#F5F0E8]">
        {/* Header */}
        <div className="bg-[#F5F0E8] border-b border-[#372308]/8 py-16 lg:py-24">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="section-label mb-4">Our Team</p>
            <h1 className="editorial-lg text-[#372308]">
              Meet your<br /><span className="italic font-light text-[#8a7968]">expert agents</span>
            </h1>
            <p className="mt-6 text-[#8a7968] max-w-lg text-base">
              Licensed professionals with deep local knowledge and a genuine commitment to your success.
            </p>
          </div>
        </div>

        {/* Grid */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-14">
          {!agents?.length ? (
            <p className="text-center text-[#8a7968] py-20">No agents found.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {agents.map((agent: any) => (
                <div key={agent.id} className="bg-[#F5F0E8] rounded-2xl overflow-hidden border border-[#372308]/6 hover:border-[#372308]/15 hover:shadow-sm transition-all group">
                  <div className="relative aspect-[3/4] bg-[#E8E0D0] overflow-hidden">
                    {agent.photo_url ? (
                      <Image src={agent.photo_url} alt={agent.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="25vw" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="font-black text-8xl text-[#372308]/8">{agent.name.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <h2 className="font-bold text-[#372308] text-base mb-0.5">{agent.name}</h2>
                    <p className="text-xs text-[#8a7968] mb-3">Licensed Real Estate Agent</p>
                    {agent.specialties?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {agent.specialties.slice(0, 2).map((s: string) => (
                          <span key={s} className="text-xs bg-[#F0D5A0]/40 text-[#372308] px-2 py-0.5 rounded-full border border-[#372308]/8">{s}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2 pt-3 border-t border-[#372308]/6">
                      {agent.phone && (
                        <a href={`tel:${agent.phone}`} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#372308]/60 hover:text-[#372308] border border-[#372308]/10 hover:border-[#372308]/25 py-2 rounded-xl transition-all">
                          <RiPhoneLine size={12} /> Call
                        </a>
                      )}
                      <a href={`mailto:${agent.email}`} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#372308]/60 hover:text-[#372308] border border-[#372308]/10 hover:border-[#372308]/25 py-2 rounded-xl transition-all">
                        <RiMailLine size={12} /> Email
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="max-w-7xl mx-auto px-6 lg:px-10 pb-16">
          <div className="bg-[#372308] rounded-3xl p-10 lg:p-14 text-center">
            <h2 className="font-black text-[#F5F0E8] tracking-tight mb-3"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', letterSpacing: '-0.04em', lineHeight: 1 }}>
              Ready to work with<br /><span className="text-[#F0D5A0] italic">an expert?</span>
            </h2>
            <p className="text-[#F5F0E8]/40 mb-8 max-w-md mx-auto">Our agents are standing by to help you find your perfect property or sell at the best price.</p>
            <Link href="/contact" className="btn-cream inline-flex">
              Get in Touch
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
