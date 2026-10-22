'use client'

import { useState } from 'react'
import { RiLoader4Line, RiCheckLine } from 'react-icons/ri'
import toast from 'react-hot-toast'

export default function ContactPageForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '', location: '', budget: '' })
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const dark = true
   const inputClass =
    'w-full bg-[#F5F0E8] border border-[#e5ddd2] rounded-xl px-4 py-3 text-sm text-[#372308] placeholder-[#372308]/50 outline-none focus:border-[#F0D5A0] transition-colors font-medium'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name, email: form.email, phone: form.phone || undefined,
          message: `Subject: ${form.subject}\n\n${form.message}`,
          source: 'contact_page', preferred_location: form.location || undefined,
          budget_max: form.budget ? Number(form.budget.replace(/\D/g, '')) : undefined,
        }),
      })
      if (res.ok) { setSent(true) } else throw new Error()
    } catch { toast.error('Could not send. Please try again.') }
    finally { setLoading(false) }
  }

  if (sent) return (
    <div className="flex flex-col items-center py-12 text-center">
      <div className="w-14 h-14 bg-[#F0D5A0]/15 rounded-full flex items-center justify-center mb-4">
        <RiCheckLine className="text-[#F0D5A0]" size={26} />
      </div>
      <h3 className="font-bold text-[#F5F0E8] text-xl mb-2">Message Received!</h3>
      <p className="text-[#F5F0E8]/40 max-w-xs text-sm">One of our agents will contact you within 24 hours.</p>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider mb-2">Name *</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Smith" required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider mb-2">Email *</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@email.com" required className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider mb-2">Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+1 (555) 000-0000" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider mb-2">I want to</label>
          <select value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className={inputClass + ' cursor-pointer'}>
            <option value="" className="bg-[#372308]">Select a topic</option>
            <option className="bg-[#372308]">Buy a property</option>
            <option className="bg-[#372308]">Rent a property</option>
            <option className="bg-[#372308]">Sell my property</option>
            <option className="bg-[#372308]">Investment inquiry</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider mb-2">Location</label>
          <input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="City or neighborhood" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider mb-2">Budget</label>
          <input value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="e.g. $500,000" className={inputClass} />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#F5F0E8] uppercase tracking-wider mb-2">Message *</label>
        <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="Tell us what you're looking for..." rows={4} required className={inputClass + ' resize-none'} />
      </div>
      <button type="submit" disabled={loading}
        className="w-full flex items-center justify-center gap-2 bg-[#F0D5A0] hover:bg-[#F5F0E8] text-[#372308] font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50">
        {loading && <RiLoader4Line className="animate-spin" size={17} />}
        {loading ? 'Sending...' : 'Send Message'}
      </button>
    </form>
  )
}
