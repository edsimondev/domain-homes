'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { RiAddLine, RiDeleteBinLine, RiStarFill, RiStarLine, RiLoader4Line } from 'react-icons/ri'
import type { Testimonial } from '@/types'

export default function TestimonialsClient({ initialTestimonials }: { initialTestimonials: Testimonial[] }) {
  const [testimonials, setTestimonials] = useState(initialTestimonials)
  const [adding, setAdding] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', role: '', content: '', rating: 5, location: '', is_published: true })
  const supabase = createClient()
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const inputClass = "w-full text-sm border border-[#372308]/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#372308]/35 transition-colors"

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.content) { toast.error('Name and content required'); return }
    setSaving(true)
    const { data, error } = await supabase.from('testimonials').insert(form).select().single()
    if (error) { toast.error(error.message); setSaving(false); return }
    setTestimonials(prev => [data, ...prev])
    setForm({ name: '', role: '', content: '', rating: 5, location: '', is_published: true })
    setAdding(false)
    toast.success('Testimonial added!')
    setSaving(false)
  }

  const togglePublish = async (id: string, current: boolean) => {
    const { error } = await supabase.from('testimonials').update({ is_published: !current }).eq('id', id)
    if (!error) setTestimonials(prev => prev.map(t => t.id === id ? { ...t, is_published: !current } : t))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this testimonial?')) return
    const { error } = await supabase.from('testimonials').delete().eq('id', id)
    if (!error) { setTestimonials(prev => prev.filter(t => t.id !== id)); toast.success('Deleted') }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#372308]">Testimonials</h1>
          <p className="text-[#8a7968] text-sm mt-1">{testimonials.length} total testimonials</p>
        </div>
        <button onClick={() => setAdding(v => !v)} className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <RiAddLine size={16} /> Add Testimonial
        </button>
      </div>

      {/* Add form */}
      {adding && (
        <form onSubmit={handleAdd} className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-6 mb-5 space-y-4 animate-fade-up">
          <h3 className="font-semibold text-[#372308] text-sm">New Testimonial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[#372308]/60 mb-1.5">Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} placeholder="Client name" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#372308]/60 mb-1.5">Role / Title</label>
              <input value={form.role} onChange={e => set('role', e.target.value)} className={inputClass} placeholder="e.g. Homeowner, Investor" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#372308]/60 mb-1.5">Location</label>
              <input value={form.location} onChange={e => set('location', e.target.value)} className={inputClass} placeholder="City, State" />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#372308]/60 mb-1.5">Rating</label>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => set('rating', n)}>
                    {n <= form.rating ? <RiStarFill className="text-[#F0D5A0]" size={22} /> : <RiStarLine className="text-gray-300" size={22} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#372308]/60 mb-1.5">Review *</label>
            <textarea value={form.content} onChange={e => set('content', e.target.value)} required rows={3} className={inputClass + ' resize-none'} placeholder="Client review..." />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_published} onChange={e => set('is_published', e.target.checked)} className="w-4 h-4 text-[#372308] rounded" />
              <span className="text-sm text-[#372308]/75">Publish immediately</span>
            </label>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors">
              {saving && <RiLoader4Line className="animate-spin" size={14} />}
              {saving ? 'Saving...' : 'Add Testimonial'}
            </button>
            <button type="button" onClick={() => setAdding(false)} className="text-sm text-[#372308]/60 border border-[#372308]/10 px-5 py-2.5 rounded-xl hover:border-gray-300 transition-colors">Cancel</button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-4">
        {!testimonials.length && <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-12 text-center text-[#372308]/35 text-sm">No testimonials yet.</div>}
        {testimonials.map(t => (
          <div key={t.id} className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#F0D5A0]/30 flex items-center justify-center text-[#372308] font-bold shrink-0">{t.name.charAt(0)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <p className="font-semibold text-[#372308] text-sm">{t.name}</p>
                  {t.role && <p className="text-xs text-[#372308]/35">{t.role}{t.location ? ` · ${t.location}` : ''}</p>}
                  <div className="flex gap-0.5 mt-1">{Array.from({length: t.rating}).map((_,i) => <RiStarFill key={i} className="text-[#F0D5A0]" size={12} />)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => togglePublish(t.id, t.is_published)} className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${t.is_published ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-[#E8E0D0] text-[#8a7968] hover:bg-gray-200'}`}>
                    {t.is_published ? 'Published' : 'Draft'}
                  </button>
                  <button onClick={() => handleDelete(t.id)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <RiDeleteBinLine size={14} />
                  </button>
                </div>
              </div>
              <p className="text-sm text-[#372308]/60 mt-2 leading-relaxed line-clamp-3">{t.content}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
