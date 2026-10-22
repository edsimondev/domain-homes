import { Metadata } from 'next'
import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'
import ContactPageForm from './ContactPageForm'
import { RiPhoneLine, RiMailLine, RiMapPin2Line, RiTimeLine } from 'react-icons/ri'

export const metadata: Metadata = {
  title: 'Contact Us',
  description: "Reach out to our team. Whether you're buying, selling, or renting — we're here.",
}

export default function ContactPage() {
  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen bg-[#F5F0E8]">
        <div className="bg-[#F5F0E8] border-b border-[#372308]/8 py-16">
          <div className="max-w-7xl mx-auto px-6 lg:px-10">
            <p className="section-label mb-4">Contact</p>
            <h1 className="editorial-lg text-[#372308]">
              Let&apos;s find your<br /><span className="italic font-light text-[#8a7968]">perfect home</span>
            </h1>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 lg:px-10 py-14">
          <div className="grid lg:grid-cols-5 gap-10 items-start">
            {/* Info */}
            <div className="lg:col-span-2 space-y-4">
              {[
                { icon: RiPhoneLine, title: 'Phone', lines: ['+1 (555) 123-4567', 'Mon–Fri, 9am–6pm EST'] },
                { icon: RiMailLine, title: 'Email', lines: ['hello@domaine.co', 'We reply within 24 hours'] },
                { icon: RiMapPin2Line, title: 'Office', lines: ['123 Realty Ave, Suite 400', 'New York, NY 10001'] },
                { icon: RiTimeLine, title: 'Hours', lines: ['Mon–Fri: 9:00am – 6:00pm', 'Sat: 10:00am – 4:00pm'] },
              ].map(({ icon: Icon, title, lines }) => (
                <div key={title} className="flex items-start gap-4 p-5 bg-[#F5F0E8] border border-[#372308]/8 rounded-2xl hover:border-[#372308]/15 transition-all">
                  <div className="w-9 h-9 bg-[#F0D5A0]/40 rounded-xl flex items-center justify-center shrink-0">
                    <Icon className="text-[#372308]" size={16} />
                  </div>
                  <div>
                    <p className="font-semibold text-[#372308] text-sm mb-1">{title}</p>
                    {lines.map((l, i) => <p key={i} className="text-sm text-[#8a7968]">{l}</p>)}
                  </div>
                </div>
              ))}
            </div>

            {/* Form */}
            <div className="lg:col-span-3 bg-[#372308] rounded-2xl p-8 lg:p-10">
              <h2 className="font-bold text-[#F5F0E8] text-xl mb-1">Send a Message</h2>
              <p className="text-[#F5F0E8]/40 text-sm mb-7">Tell us about your property needs.</p>
              <ContactPageForm />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}
