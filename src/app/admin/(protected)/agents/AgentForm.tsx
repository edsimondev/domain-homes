'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { RiLoader4Line, RiImageAddLine } from 'react-icons/ri'
import { v4 as uuidv4 } from 'uuid'

const SPECIALTIES = ['Luxury Homes', 'Waterfront', 'Commercial', 'First-time Buyers', 'Investment', 'Condos', 'Urban Properties', 'Relocation', 'Family Homes']

export default function AgentForm({ agent }: { agent?: any }) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!agent
  const [loading, setLoading] = useState(false)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string>(agent?.photo_url || '')
  const [form, setForm] = useState({
    name: agent?.name || '',
    email: agent?.email || '',
    phone: agent?.phone || '',
    bio: agent?.bio || '',
    specialties: agent?.specialties || [] as string[],
    is_active: agent?.is_active ?? true,
  })
  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }))
  const inputClass = "w-full text-sm border border-[#372308]/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#372308]/35 transition-colors"
  const labelClass = "block text-xs font-medium text-[#372308]/60 mb-1.5"

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = ev => setPhotoPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name || !form.email) { toast.error('Name and email required'); return }
    setLoading(true)
    try {
      let photo_url = agent?.photo_url || null
      if (photoFile) {
        const path = `agents/${uuidv4()}.${photoFile.name.split('.').pop()}`
        const { data } = await supabase.storage.from('avatars').upload(path, photoFile, { upsert: true })
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
          photo_url = publicUrl
        }
      }
      const payload = { ...form, photo_url }
      if (isEdit) {
        const { error } = await supabase.from('agents').update(payload).eq('id', agent.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('agents').insert(payload)
        if (error) throw error
      }
      toast.success(isEdit ? 'Agent updated!' : 'Agent added!')
      router.push('/admin/agents')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-6 space-y-4">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full overflow-hidden bg-[#F0D5A0]/20 shrink-0">
            {photoPreview ? (
              <img src={photoPreview} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-brand-300">
                <RiImageAddLine size={24} />
              </div>
            )}
          </div>
          <label className="text-sm text-[#372308] hover:text-[#1e1200] cursor-pointer font-medium">
            {photoPreview ? 'Change photo' : 'Upload photo'}
            <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
          </label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Full Name *</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Email *</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
          </div>
          <div className="flex items-center gap-3 mt-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} className="w-4 h-4 text-[#372308] rounded" />
            <label htmlFor="is_active" className="text-sm font-medium text-[#372308]/75 cursor-pointer">Active agent</label>
          </div>
        </div>
        <div>
          <label className={labelClass}>Bio</label>
          <textarea value={form.bio} onChange={e => set('bio', e.target.value)} rows={3} className={inputClass + ' resize-none'} placeholder="Agent background and expertise..." />
        </div>
        <div>
          <label className={labelClass}>Specialties</label>
          <div className="flex flex-wrap gap-2">
            {SPECIALTIES.map(s => (
              <button key={s} type="button"
                onClick={() => set('specialties', form.specialties.includes(s) ? form.specialties.filter((x: string) => x !== s) : [...form.specialties, s])}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all ${form.specialties.includes(s) ? 'bg-[#372308] text-white border-brand-600' : 'bg-[#F5F0E8] text-[#372308]/60 border-[#372308]/10 hover:border-[#372308]/25'}`}
              >{s}</button>
            ))}
          </div>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium px-6 py-3 rounded-xl transition-colors">
          {loading && <RiLoader4Line className="animate-spin" size={16} />}
          {loading ? 'Saving...' : isEdit ? 'Update Agent' : 'Add Agent'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-3 text-sm text-[#372308]/60 border border-[#372308]/10 rounded-xl hover:border-gray-300 transition-colors">Cancel</button>
      </div>
    </form>
  )
}
