'use client'

import { useState } from 'react'
import { RiLoader4Line, RiCheckLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function ContactFormInner({ listingId, dark = false }: { listingId: string; dark?: boolean }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const inputClass = dark
    ? 'w-full bg-[#F5F0E8] border border-[#e5ddd2] rounded-xl px-4 py-3 text-sm text-[#372308] placeholder-[#372308]/50 outline-none focus:border-[#F0D5A0] transition-colors font-medium'
    : 'input-field'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, listing_id: listingId, source: 'contact_form' }),
      })
      if (res.ok) { setSent(true); toast.success('Message sent!') }
      else throw new Error()
    } catch {
      toast.error('Could not send. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div className="flex flex-col items-center py-6 text-center">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${dark ? 'bg-[#F0D5A0]/15' : 'bg-[#F0D5A0]'}`}>
        <RiCheckLine className={dark ? 'text-[#F0D5A0]' : 'text-[#372308]'} size={22} />
      </div>
      <p className={`font-semibold text-sm ${dark ? 'text-[#F5F0E8]' : 'text-[#372308]'}`}>Message Sent!</p>
      <p className={`text-xs mt-1 ${dark ? 'text-[#F5F0E8]/40' : 'text-[#8a7968]'}`}>We'll be in touch within 24 hours.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name *" required className={inputClass} />
      <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address *" required className={inputClass} />
      <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Phone (optional)" className={inputClass} />
      <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="I'm interested and would like to schedule a viewing..." rows={3} className={inputClass + ' resize-none'} />
      <button type="submit" disabled={loading}
        className={`w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl transition-colors text-sm ${
          dark
            ? 'bg-[#F0D5A0] hover:bg-[#F5F0E8] text-[#372308] disabled:bg-[#F0D5A0]/30 disabled:text-[#372308]/40'
            : 'btn-espresso w-full justify-center'
        }`}>
        {loading && <RiLoader4Line className="animate-spin" size={15} />}
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
