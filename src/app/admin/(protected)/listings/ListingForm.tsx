'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { generateSlug } from '@/lib/utils'
import toast from 'react-hot-toast'
import { RiLoader4Line, RiImageAddLine, RiCloseLine, RiSparklingLine, RiInstagramLine, RiShareLine, RiCheckLine } from 'react-icons/ri'
import type { Listing } from '@/types'
import { v4 as uuidv4 } from 'uuid'
// AI description is generated via /api/generate-description (server-side route)
// so that secret API keys are never exposed to the browser.

interface ListingFormProps {
  agents: { id: string; name: string }[]
  listing?: Listing
}

const AMENITIES = ['Pool', 'Gym', 'Parking', 'Garden', 'Security', 'Elevator', 'Concierge', 'Rooftop', 'Pet Friendly', 'Furnished', 'AC', 'Fireplace', 'Waterfront', 'City View']

export default function ListingForm({ agents, listing }: ListingFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!listing

  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [uploadingImages, setUploadingImages] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>(
    listing?.images?.map(i => i.url) || []
  )

  const [socialPosting, setSocialPosting] = useState(false)
  const [socialPosted, setSocialPosted]   = useState(false)

  const [form, setForm] = useState({
    title: listing?.title || '',
    description: listing?.description || '',
    price: listing?.price?.toString() || '',
    listing_type: listing?.listing_type || 'sale',
    property_type: listing?.property_type || 'house',
    status: listing?.status || 'available',
    bedrooms: listing?.bedrooms?.toString() || '3',
    bathrooms: listing?.bathrooms?.toString() || '2',
    square_footage: listing?.square_footage?.toString() || '',
    year_built: listing?.year_built?.toString() || '',
    address: listing?.address || '',
    city: listing?.city || '',
    state: listing?.state || '',
    zip_code: listing?.zip_code || '',
    is_featured: listing?.is_featured || false,
    agent_id: listing?.agent_id || '',
    amenities: listing?.amenities || [] as string[],
  })

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setImageFiles(prev => [...prev, ...files])
    files.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => setImagePreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  const removeImage = (i: number) => {
    setImageFiles(prev => prev.filter((_, idx) => idx !== i))
    setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
  }

  const generateAIDescription = async () => {
    if (!form.title || !form.city) {
      toast.error('Add a title and city first')
      return
    }
    setAiLoading(true)
    try {
      // Calls server-side API route so API keys are never exposed to the browser
      const res = await fetch('/api/generate-description', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          bedrooms: Number(form.bedrooms),
          bathrooms: Number(form.bathrooms),
          sqft: form.square_footage ? Number(form.square_footage) : undefined,
          city: form.city,
          price: Number(form.price),
          type: form.property_type,
          amenities: form.amenities,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.description) {
        throw new Error(data.error || 'No description returned')
      }

      set('description', data.description)
      toast.success('Description generated!')
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate description')
    } finally {
      setAiLoading(false)
    }
  }

  const uploadImages = async (listingId: string): Promise<string[]> => {
    const urls: string[] = []
    for (const file of imageFiles) {
      const ext = file.name.split('.').pop()
      const path = `${listingId}/${uuidv4()}.${ext}`
      const { data, error } = await supabase.storage.from('listings').upload(path, file, { upsert: true })
      if (!error && data) {
        const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(path)
        urls.push(publicUrl)
      }
    }
    return urls
  }

  const postToSocials = async () => {
    if (!form.title || !form.city) {
      const toast = (await import('react-hot-toast')).default
      toast.error('Save the listing first before posting to socials')
      return
    }
    setSocialPosting(true)
    try {
      // Get the cover image — first uploaded preview or existing image
      const coverImage = imagePreviews[0] || listing?.images?.[0]?.url || ''

      const payload = {
        // Listing details
        listing_title:    form.title,
        listing_price:    form.price ? `$${Number(form.price).toLocaleString()}` : '',
        listing_type:     form.listing_type === 'rent' ? 'For Rent' : 'For Sale',
        property_type:    form.property_type,
        bedrooms:         form.bedrooms,
        bathrooms:        form.bathrooms,
        square_footage:   form.square_footage || '',
        city:             form.city,
        state:            form.state,
        address:          form.address,
        description:      form.description,
        amenities:        form.amenities.join(', '),
        is_featured:      form.is_featured,
        // Image for Instagram
        cover_image_url:  coverImage,
        // URLs
        listing_url:      listing?.slug
          ? `${process.env.NEXT_PUBLIC_SITE_URL}/property/${listing.slug}`
          : `${process.env.NEXT_PUBLIC_SITE_URL}/listings`,
        site_name:        process.env.NEXT_PUBLIC_SITE_NAME || 'Domaine',
        site_url:         process.env.NEXT_PUBLIC_SITE_URL  || '',
        // Trigger label
        trigger:          'post_to_socials',
        posted_at:        new Date().toISOString(),
      }

      const makeWebhookUrl = process.env.NEXT_PUBLIC_MAKE_LISTING_WEBHOOK_URL
        || 'https://hook.eu1.make.com/pbdpp1gqpw9ilwjmdkcepcgvbn34q99c'

      const res = await fetch(makeWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const toast = (await import('react-hot-toast')).default
        setSocialPosted(true)
        toast.success('Sent to Make.com — Instagram post is being prepared')
        setTimeout(() => setSocialPosted(false), 5000)
      } else {
        throw new Error(`Webhook returned ${res.status}`)
      }
    } catch (err: any) {
      const toast = (await import('react-hot-toast')).default
      toast.error('Failed to post to socials: ' + (err.message || 'Unknown error'))
    } finally {
      setSocialPosting(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.price || !form.city) {
      toast.error('Fill in all required fields')
      return
    }
    setLoading(true)

    try {
      const slug = isEdit ? listing!.slug : generateSlug(form.title)
      const payload = {
        title: form.title,
        slug,
        description: form.description,
        price: Number(form.price),
        listing_type: form.listing_type,
        property_type: form.property_type,
        status: form.status,
        bedrooms: Number(form.bedrooms),
        bathrooms: Number(form.bathrooms),
        square_footage: form.square_footage ? Number(form.square_footage) : null,
        year_built: form.year_built ? Number(form.year_built) : null,
        address: form.address,
        city: form.city,
        state: form.state,
        zip_code: form.zip_code,
        is_featured: form.is_featured,
        agent_id: form.agent_id || null,
        amenities: form.amenities,
      }

      let listingId = listing?.id
      if (isEdit) {
        const { error } = await supabase.from('listings').update(payload).eq('id', listingId!)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('listings').insert(payload).select('id').single()
        if (error) throw error
        listingId = data.id
      }

      // Upload images
      if (imageFiles.length > 0 && listingId) {
        setUploadingImages(true)
        const urls = await uploadImages(listingId)
        const imagePayload = urls.map((url, i) => ({ listing_id: listingId!, url, order: (listing?.images?.length || 0) + i }))
        await supabase.from('property_images').insert(imagePayload)
        setUploadingImages(false)
      }

      toast.success(isEdit ? 'Listing updated!' : 'Listing created!')
      router.push('/admin/listings')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
      setLoading(false)
      setUploadingImages(false)
    }
  }

  const inputClass = "w-full text-sm border border-[#372308]/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#372308]/35 transition-colors bg-[#F5F0E8]"
  const labelClass = "block text-xs font-medium text-[#372308]/60 mb-1.5"

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <h3 className="font-semibold text-[#372308] mb-4 text-sm">Basic Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Title *</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Modern 3BR Home with Pool" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>For Sale / Rent *</label>
            <select value={form.listing_type} onChange={e => set('listing_type', e.target.value)} className={inputClass}>
              <option value="sale">For Sale</option>
              <option value="rent">For Rent</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>Property Type *</label>
            <select value={form.property_type} onChange={e => set('property_type', e.target.value)} className={inputClass}>
              {['house','apartment','condo','villa','townhouse','land','commercial'].map(t => (
                <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Price *</label>
            <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} className={inputClass}>
              {['available','pending','sold','rented'].map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-[#372308] text-sm">Description</h3>
          <button type="button" onClick={generateAIDescription} disabled={aiLoading} className="flex items-center gap-1.5 text-xs text-[#372308] hover:text-[#1e1200] border border-[#372308]/15 hover:border-[#372308]/25 px-3 py-1.5 rounded-lg transition-colors">
            {aiLoading ? <RiLoader4Line className="animate-spin" size={12} /> : <RiSparklingLine size={12} />}
            AI Generate
          </button>
        </div>
        <textarea
          value={form.description}
          onChange={e => set('description', e.target.value)}
          rows={5}
          placeholder="Describe the property..."
          className={inputClass + ' resize-none'}
        />
      </div>

      {/* Details */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <h3 className="font-semibold text-[#372308] mb-4 text-sm">Property Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className={labelClass}>Bedrooms</label>
            <input type="number" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} min="0" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Bathrooms</label>
            <input type="number" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} min="0" step="0.5" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Sq. Footage</label>
            <input type="number" value={form.square_footage} onChange={e => set('square_footage', e.target.value)} placeholder="sqft" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Year Built</label>
            <input type="number" value={form.year_built} onChange={e => set('year_built', e.target.value)} placeholder="e.g. 2019" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <h3 className="font-semibold text-[#372308] mb-4 text-sm">Location</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Street Address *</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>City *</label>
            <input value={form.city} onChange={e => set('city', e.target.value)} required className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>State</label>
            <input value={form.state} onChange={e => set('state', e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>ZIP Code</label>
            <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <h3 className="font-semibold text-[#372308] mb-4 text-sm">Amenities</h3>
        <div className="flex flex-wrap gap-2">
          {AMENITIES.map(a => (
            <button
              key={a} type="button"
              onClick={() => set('amenities', form.amenities.includes(a) ? form.amenities.filter((x: string) => x !== a) : [...form.amenities, a])}
              className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                form.amenities.includes(a)
                  ? 'bg-[#372308] text-white border-brand-600'
                  : 'bg-[#F5F0E8] text-[#372308]/60 border-[#372308]/10 hover:border-[#372308]/25'
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Images */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <h3 className="font-semibold text-[#372308] mb-1 text-sm">Images</h3>
        <p className="text-xs text-[#372308]/35 mb-4">Drag to reorder. First image is the cover.</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
          {imagePreviews.map((src, i) => (
            <div
              key={i}
              draggable
              onDragStart={e => e.dataTransfer.setData('text/plain', String(i))}
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault()
                const from = Number(e.dataTransfer.getData('text/plain'))
                const to = i
                if (from === to) return
                const newPreviews = [...imagePreviews]
                const newFiles   = [...imageFiles]
                const [pItem] = newPreviews.splice(from, 1)
                newPreviews.splice(to, 0, pItem)
                setImagePreviews(newPreviews)
                // Only reorder files array for newly added (not existing) images
                if (from < newFiles.length) {
                  const [fItem] = newFiles.splice(from, 1)
                  newFiles.splice(Math.min(to, newFiles.length), 0, fItem)
                  setImageFiles(newFiles)
                }
              }}
              className="relative aspect-square rounded-xl overflow-hidden bg-[#E8E0D0] cursor-grab active:cursor-grabbing group"
            >
              <img src={src} className="w-full h-full object-cover" alt="" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <RiCloseLine size={11} />
              </button>
              {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-[#372308] text-white px-1.5 py-0.5 rounded-full">Cover</span>}
              {i > 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/40 text-white px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">{i + 1}</span>}
            </div>
          ))}
          <label className="aspect-square rounded-xl border-2 border-dashed border-[#372308]/10 hover:border-[#372308]/25 flex flex-col items-center justify-center gap-1 cursor-pointer text-[#372308]/35 hover:text-[#372308] transition-colors">
            <RiImageAddLine size={20} />
            <span className="text-xs">Add</span>
            <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          </label>
        </div>
      </div>

      {/* Agent + Featured */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <h3 className="font-semibold text-[#372308] mb-4 text-sm">Assignment</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          <div>
            <label className={labelClass}>Assign Agent</label>
            <select value={form.agent_id} onChange={e => set('agent_id', e.target.value)} className={inputClass}>
              <option value="">No agent</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <input
              type="checkbox"
              id="is_featured"
              checked={form.is_featured}
              onChange={e => set('is_featured', e.target.checked)}
              className="w-4 h-4 text-[#372308] rounded"
            />
            <label htmlFor="is_featured" className="text-sm font-medium text-[#372308]/75 cursor-pointer">
              Mark as Featured
            </label>
          </div>
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={loading || uploadingImages}
          className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium px-6 py-3 rounded-xl transition-colors"
        >
          {(loading || uploadingImages) && <RiLoader4Line className="animate-spin" size={16} />}
          {uploadingImages ? 'Uploading...' : loading ? 'Saving...' : isEdit ? 'Update Listing' : 'Create Listing'}
        </button>

        {/* Post to Socials — fires Make.com → Instagram/Facebook */}
        {isEdit && (
          <button
            type="button"
            onClick={postToSocials}
            disabled={socialPosting || socialPosted}
            className={`flex items-center gap-2 font-medium px-6 py-3 rounded-xl transition-all text-sm border ${
              socialPosted
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-[#F5F0E8] text-[#372308] border-[#372308]/15 hover:border-[#372308]/30 hover:bg-[#F0E6D3]'
            }`}
            title="Post this listing to Instagram and Facebook via Make.com"
          >
            {socialPosting ? (
              <RiLoader4Line className="animate-spin" size={15} />
            ) : socialPosted ? (
              <RiCheckLine size={15} />
            ) : (
              <RiInstagramLine size={15} />
            )}
            {socialPosting ? 'Posting...' : socialPosted ? 'Sent to Socials' : 'Post to Socials'}
          </button>
        )}

        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 text-sm text-[#372308]/60 hover:text-gray-800 border border-[#372308]/10 rounded-xl hover:border-gray-300 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}



// 'use client'

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'
// import { createClient } from '@/lib/supabase/client'
// import { generateSlug } from '@/lib/utils'
// import toast from 'react-hot-toast'
// import { RiLoader4Line, RiImageAddLine, RiCloseLine, RiSparklingLine } from 'react-icons/ri'
// import type { Listing } from '@/types'
// import { v4 as uuidv4 } from 'uuid'
// // AI description is generated via /api/generate-description (server-side route)
// // so that secret API keys are never exposed to the browser.

// interface ListingFormProps {
//   agents: { id: string; name: string }[]
//   listing?: Listing
// }

// const AMENITIES = ['Pool', 'Gym', 'Parking', 'Garden', 'Security', 'Elevator', 'Concierge', 'Rooftop', 'Pet Friendly', 'Furnished', 'AC', 'Fireplace', 'Waterfront', 'City View']

// export default function ListingForm({ agents, listing }: ListingFormProps) {
//   const router = useRouter()
//   const supabase = createClient()
//   const isEdit = !!listing

//   const [loading, setLoading] = useState(false)
//   const [aiLoading, setAiLoading] = useState(false)
//   const [uploadingImages, setUploadingImages] = useState(false)
//   const [imageFiles, setImageFiles] = useState<File[]>([])
//   const [imagePreviews, setImagePreviews] = useState<string[]>(
//     listing?.images?.map(i => i.url) || []
//   )

//   const [form, setForm] = useState({
//     title: listing?.title || '',
//     description: listing?.description || '',
//     price: listing?.price?.toString() || '',
//     listing_type: listing?.listing_type || 'sale',
//     property_type: listing?.property_type || 'house',
//     status: listing?.status || 'available',
//     bedrooms: listing?.bedrooms?.toString() || '3',
//     bathrooms: listing?.bathrooms?.toString() || '2',
//     square_footage: listing?.square_footage?.toString() || '',
//     year_built: listing?.year_built?.toString() || '',
//     address: listing?.address || '',
//     city: listing?.city || '',
//     state: listing?.state || '',
//     zip_code: listing?.zip_code || '',
//     is_featured: listing?.is_featured || false,
//     agent_id: listing?.agent_id || '',
//     amenities: listing?.amenities || [] as string[],
//   })

//   const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))

//   const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const files = Array.from(e.target.files || [])
//     setImageFiles(prev => [...prev, ...files])
//     files.forEach(f => {
//       const reader = new FileReader()
//       reader.onload = ev => setImagePreviews(prev => [...prev, ev.target?.result as string])
//       reader.readAsDataURL(f)
//     })
//   }

//   const removeImage = (i: number) => {
//     setImageFiles(prev => prev.filter((_, idx) => idx !== i))
//     setImagePreviews(prev => prev.filter((_, idx) => idx !== i))
//   }

//   const generateAIDescription = async () => {
//     if (!form.title || !form.city) {
//       toast.error('Add a title and city first')
//       return
//     }
//     setAiLoading(true)
//     try {
//       // Calls server-side API route so API keys are never exposed to the browser
//       const res = await fetch('/api/generate-description', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           title: form.title,
//           bedrooms: Number(form.bedrooms),
//           bathrooms: Number(form.bathrooms),
//           sqft: form.square_footage ? Number(form.square_footage) : undefined,
//           city: form.city,
//           price: Number(form.price),
//           type: form.property_type,
//           amenities: form.amenities,
//         }),
//       })

//       const data = await res.json()

//       if (!res.ok || !data.description) {
//         throw new Error(data.error || 'No description returned')
//       }

//       set('description', data.description)
//       toast.success('Description generated!')
//     } catch (err: any) {
//       toast.error(err.message || 'Failed to generate description')
//     } finally {
//       setAiLoading(false)
//     }
//   }

//   const uploadImages = async (listingId: string): Promise<string[]> => {
//     const urls: string[] = []
//     for (const file of imageFiles) {
//       const ext = file.name.split('.').pop()
//       const path = `${listingId}/${uuidv4()}.${ext}`
//       const { data, error } = await supabase.storage.from('listings').upload(path, file, { upsert: true })
//       if (!error && data) {
//         const { data: { publicUrl } } = supabase.storage.from('listings').getPublicUrl(path)
//         urls.push(publicUrl)
//       }
//     }
//     return urls
//   }

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault()
//     if (!form.title || !form.price || !form.city) {
//       toast.error('Fill in all required fields')
//       return
//     }
//     setLoading(true)

//     try {
//       const slug = isEdit ? listing!.slug : generateSlug(form.title)
//       const payload = {
//         title: form.title,
//         slug,
//         description: form.description,
//         price: Number(form.price),
//         listing_type: form.listing_type,
//         property_type: form.property_type,
//         status: form.status,
//         bedrooms: Number(form.bedrooms),
//         bathrooms: Number(form.bathrooms),
//         square_footage: form.square_footage ? Number(form.square_footage) : null,
//         year_built: form.year_built ? Number(form.year_built) : null,
//         address: form.address,
//         city: form.city,
//         state: form.state,
//         zip_code: form.zip_code,
//         is_featured: form.is_featured,
//         agent_id: form.agent_id || null,
//         amenities: form.amenities,
//       }

//       let listingId = listing?.id
//       if (isEdit) {
//         const { error } = await supabase.from('listings').update(payload).eq('id', listingId!)
//         if (error) throw error
//       } else {
//         const { data, error } = await supabase.from('listings').insert(payload).select('id').single()
//         if (error) throw error
//         listingId = data.id
//       }

//       // Upload images
//       if (imageFiles.length > 0 && listingId) {
//         setUploadingImages(true)
//         const urls = await uploadImages(listingId)
//         const imagePayload = urls.map((url, i) => ({ listing_id: listingId!, url, order: (listing?.images?.length || 0) + i }))
//         await supabase.from('property_images').insert(imagePayload)
//         setUploadingImages(false)
//       }

//       toast.success(isEdit ? 'Listing updated!' : 'Listing created!')
//       router.push('/admin/listings')
//       router.refresh()
//     } catch (err: any) {
//       toast.error(err.message || 'Something went wrong')
//       setLoading(false)
//       setUploadingImages(false)
//     }
//   }

//   const inputClass = "w-full text-sm border border-[#372308]/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#372308]/35 transition-colors bg-[#F5F0E8]"
//   const labelClass = "block text-xs font-medium text-[#372308]/60 mb-1.5"

//   return (
//     <form onSubmit={handleSubmit} className="space-y-6">
//       {/* Basic info */}
//       <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
//         <h3 className="font-semibold text-[#372308] mb-4 text-sm">Basic Information</h3>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div className="sm:col-span-2">
//             <label className={labelClass}>Title *</label>
//             <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Modern 3BR Home with Pool" required className={inputClass} />
//           </div>
//           <div>
//             <label className={labelClass}>For Sale / Rent *</label>
//             <select value={form.listing_type} onChange={e => set('listing_type', e.target.value)} className={inputClass}>
//               <option value="sale">For Sale</option>
//               <option value="rent">For Rent</option>
//             </select>
//           </div>
//           <div>
//             <label className={labelClass}>Property Type *</label>
//             <select value={form.property_type} onChange={e => set('property_type', e.target.value)} className={inputClass}>
//               {['house','apartment','condo','villa','townhouse','land','commercial'].map(t => (
//                 <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase()+t.slice(1)}</option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className={labelClass}>Price *</label>
//             <input type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="0" required className={inputClass} />
//           </div>
//           <div>
//             <label className={labelClass}>Status</label>
//             <select value={form.status} onChange={e => set('status', e.target.value)} className={inputClass}>
//               {['available','pending','sold','rented'].map(s => (
//                 <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>
//               ))}
//             </select>
//           </div>
//         </div>
//       </div>

//       {/* Description */}
//       <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
//         <div className="flex items-center justify-between mb-4">
//           <h3 className="font-semibold text-[#372308] text-sm">Description</h3>
//           <button type="button" onClick={generateAIDescription} disabled={aiLoading} className="flex items-center gap-1.5 text-xs text-[#372308] hover:text-[#1e1200] border border-[#372308]/15 hover:border-[#372308]/25 px-3 py-1.5 rounded-lg transition-colors">
//             {aiLoading ? <RiLoader4Line className="animate-spin" size={12} /> : <RiSparklingLine size={12} />}
//             AI Generate
//           </button>
//         </div>
//         <textarea
//           value={form.description}
//           onChange={e => set('description', e.target.value)}
//           rows={5}
//           placeholder="Describe the property..."
//           className={inputClass + ' resize-none'}
//         />
//       </div>

//       {/* Details */}
//       <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
//         <h3 className="font-semibold text-[#372308] mb-4 text-sm">Property Details</h3>
//         <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
//           <div>
//             <label className={labelClass}>Bedrooms</label>
//             <input type="number" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} min="0" className={inputClass} />
//           </div>
//           <div>
//             <label className={labelClass}>Bathrooms</label>
//             <input type="number" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} min="0" step="0.5" className={inputClass} />
//           </div>
//           <div>
//             <label className={labelClass}>Sq. Footage</label>
//             <input type="number" value={form.square_footage} onChange={e => set('square_footage', e.target.value)} placeholder="sqft" className={inputClass} />
//           </div>
//           <div>
//             <label className={labelClass}>Year Built</label>
//             <input type="number" value={form.year_built} onChange={e => set('year_built', e.target.value)} placeholder="e.g. 2019" className={inputClass} />
//           </div>
//         </div>
//       </div>

//       {/* Location */}
//       <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
//         <h3 className="font-semibold text-[#372308] mb-4 text-sm">Location</h3>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div className="sm:col-span-2">
//             <label className={labelClass}>Street Address *</label>
//             <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" required className={inputClass} />
//           </div>
//           <div>
//             <label className={labelClass}>City *</label>
//             <input value={form.city} onChange={e => set('city', e.target.value)} required className={inputClass} />
//           </div>
//           <div>
//             <label className={labelClass}>State</label>
//             <input value={form.state} onChange={e => set('state', e.target.value)} className={inputClass} />
//           </div>
//           <div>
//             <label className={labelClass}>ZIP Code</label>
//             <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} className={inputClass} />
//           </div>
//         </div>
//       </div>

//       {/* Amenities */}
//       <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
//         <h3 className="font-semibold text-[#372308] mb-4 text-sm">Amenities</h3>
//         <div className="flex flex-wrap gap-2">
//           {AMENITIES.map(a => (
//             <button
//               key={a} type="button"
//               onClick={() => set('amenities', form.amenities.includes(a) ? form.amenities.filter((x: string) => x !== a) : [...form.amenities, a])}
//               className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
//                 form.amenities.includes(a)
//                   ? 'bg-[#372308] text-white border-brand-600'
//                   : 'bg-[#F5F0E8] text-[#372308]/60 border-[#372308]/10 hover:border-[#372308]/25'
//               }`}
//             >
//               {a}
//             </button>
//           ))}
//         </div>
//       </div>

//       {/* Images */}
//       <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
//         <h3 className="font-semibold text-[#372308] mb-1 text-sm">Images</h3>
//         <p className="text-xs text-[#372308]/35 mb-4">Drag to reorder. First image is the cover.</p>
//         <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mb-4">
//           {imagePreviews.map((src, i) => (
//             <div
//               key={i}
//               draggable
//               onDragStart={e => e.dataTransfer.setData('text/plain', String(i))}
//               onDragOver={e => e.preventDefault()}
//               onDrop={e => {
//                 e.preventDefault()
//                 const from = Number(e.dataTransfer.getData('text/plain'))
//                 const to = i
//                 if (from === to) return
//                 const newPreviews = [...imagePreviews]
//                 const newFiles   = [...imageFiles]
//                 const [pItem] = newPreviews.splice(from, 1)
//                 newPreviews.splice(to, 0, pItem)
//                 setImagePreviews(newPreviews)
//                 // Only reorder files array for newly added (not existing) images
//                 if (from < newFiles.length) {
//                   const [fItem] = newFiles.splice(from, 1)
//                   newFiles.splice(Math.min(to, newFiles.length), 0, fItem)
//                   setImageFiles(newFiles)
//                 }
//               }}
//               className="relative aspect-square rounded-xl overflow-hidden bg-[#E8E0D0] cursor-grab active:cursor-grabbing group"
//             >
//               <img src={src} className="w-full h-full object-cover" alt="" />
//               <button
//                 type="button"
//                 onClick={() => removeImage(i)}
//                 className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center hover:bg-red-500 transition-colors opacity-0 group-hover:opacity-100"
//               >
//                 <RiCloseLine size={11} />
//               </button>
//               {i === 0 && <span className="absolute bottom-1 left-1 text-xs bg-[#372308] text-white px-1.5 py-0.5 rounded-full">Cover</span>}
//               {i > 0 && <span className="absolute bottom-1 left-1 text-xs bg-black/40 text-white px-1.5 py-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">{i + 1}</span>}
//             </div>
//           ))}
//           <label className="aspect-square rounded-xl border-2 border-dashed border-[#372308]/10 hover:border-[#372308]/25 flex flex-col items-center justify-center gap-1 cursor-pointer text-[#372308]/35 hover:text-[#372308] transition-colors">
//             <RiImageAddLine size={20} />
//             <span className="text-xs">Add</span>
//             <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
//           </label>
//         </div>
//       </div>

//       {/* Agent + Featured */}
//       <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
//         <h3 className="font-semibold text-[#372308] mb-4 text-sm">Assignment</h3>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
//           <div>
//             <label className={labelClass}>Assign Agent</label>
//             <select value={form.agent_id} onChange={e => set('agent_id', e.target.value)} className={inputClass}>
//               <option value="">No agent</option>
//               {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
//             </select>
//           </div>
//           <div className="flex items-center gap-3 mt-2">
//             <input
//               type="checkbox"
//               id="is_featured"
//               checked={form.is_featured}
//               onChange={e => set('is_featured', e.target.checked)}
//               className="w-4 h-4 text-[#372308] rounded"
//             />
//             <label htmlFor="is_featured" className="text-sm font-medium text-[#372308]/75 cursor-pointer">
//               Mark as Featured
//             </label>
//           </div>
//         </div>
//       </div>

//       {/* Submit */}
//       <div className="flex gap-3">
//         <button
//           type="submit"
//           disabled={loading || uploadingImages}
//           className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium px-6 py-3 rounded-xl transition-colors"
//         >
//           {(loading || uploadingImages) && <RiLoader4Line className="animate-spin" size={16} />}
//           {uploadingImages ? 'Uploading...' : loading ? 'Saving...' : isEdit ? 'Update Listing' : 'Create Listing'}
//         </button>
//         <button
//           type="button"
//           onClick={() => router.back()}
//           className="px-6 py-3 text-sm text-[#372308]/60 hover:text-gray-800 border border-[#372308]/10 rounded-xl hover:border-gray-300 transition-colors"
//         >
//           Cancel
//         </button>
//       </div>
//     </form>
//   )
// }
