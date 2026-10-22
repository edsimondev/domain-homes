'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { RiLoader4Line, RiImageAddLine, RiSparklingLine } from 'react-icons/ri'
import { v4 as uuidv4 } from 'uuid'

interface BlogFormProps {
  agents: { id: string; name: string }[]
  post?: any
}

const CATEGORIES = ['Market Trends', 'Buying Guide', 'Selling Tips', 'Investment', 'Lifestyle', 'News', 'Renting Guide']

export default function BlogForm({ agents, post }: BlogFormProps) {
  const router = useRouter()
  const supabase = createClient()
  const isEdit = !!post

  const [loading, setLoading] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string>(post?.cover_image || '')
  const [coverFile, setCoverFile] = useState<File | null>(null)

  const [form, setForm] = useState({
    title: post?.title || '',
    excerpt: post?.excerpt || '',
    content: post?.content || '',
    category: post?.category || '',
    tags: post?.tags?.join(', ') || '',
    author_id: post?.author_id || '',
    read_time: post?.read_time?.toString() || '5',
    is_published: post?.is_published || false,
    meta_title: post?.meta_title || '',
    meta_description: post?.meta_description || '',
  })

  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }))
  const inputClass = "w-full text-sm border border-[#372308]/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#372308]/35 transition-colors"
  const labelClass = "block text-xs font-medium text-[#372308]/60 mb-1.5"

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setCoverFile(file)
    const reader = new FileReader()
    reader.onload = ev => setCoverPreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const generateSlug = (title: string) =>
    title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() + '-' + Date.now().toString(36)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.excerpt || !form.content) {
      toast.error('Fill in title, excerpt, and content')
      return
    }
    setLoading(true)

    try {
      let cover_image = post?.cover_image || null

      if (coverFile) {
        const path = `covers/${uuidv4()}.${coverFile.name.split('.').pop()}`
        const { data } = await supabase.storage.from('blog').upload(path, coverFile, { upsert: true })
        if (data) {
          const { data: { publicUrl } } = supabase.storage.from('blog').getPublicUrl(path)
          cover_image = publicUrl
        }
      }

      const tagsArray = form.tags ? form.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : []

      const payload = {
        title: form.title,
        slug: isEdit ? post.slug : generateSlug(form.title),
        excerpt: form.excerpt,
        content: form.content,
        cover_image,
        category: form.category || null,
        tags: tagsArray,
        author_id: form.author_id || null,
        read_time: form.read_time ? Number(form.read_time) : null,
        is_published: form.is_published,
        published_at: form.is_published ? new Date().toISOString() : null,
        meta_title: form.meta_title || null,
        meta_description: form.meta_description || null,
      }

      if (isEdit) {
        const { error } = await supabase.from('blog_posts').update(payload).eq('id', post.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('blog_posts').insert(payload)
        if (error) throw error
      }

      toast.success(isEdit ? 'Post updated!' : 'Post created!')
      router.push('/admin/blog')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save post')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Basic */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-[#372308] text-sm">Post Details</h3>
        <div>
          <label className={labelClass}>Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Post title..." required className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Excerpt *</label>
          <textarea value={form.excerpt} onChange={e => set('excerpt', e.target.value)} rows={2} placeholder="Short summary..." required className={inputClass + ' resize-none'} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)} className={inputClass}>
              <option value="">None</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Author</label>
            <select value={form.author_id} onChange={e => set('author_id', e.target.value)} className={inputClass}>
              <option value="">Domaine</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass}>Read Time (min)</label>
            <input type="number" value={form.read_time} onChange={e => set('read_time', e.target.value)} min="1" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Tags (comma-separated)</label>
          <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="real estate, market, investing" className={inputClass} />
        </div>
      </div>

      {/* Cover image */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <h3 className="font-semibold text-[#372308] text-sm mb-4">Cover Image</h3>
        {coverPreview ? (
          <div className="relative aspect-video rounded-xl overflow-hidden bg-[#E8E0D0] mb-3">
            <img src={coverPreview} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => { setCoverPreview(''); setCoverFile(null) }} className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2.5 py-1.5 rounded-lg hover:bg-red-500 transition-colors">Remove</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[#372308]/10 hover:border-[#372308]/25 rounded-xl aspect-video cursor-pointer text-[#372308]/35 hover:text-[#372308] transition-colors">
            <RiImageAddLine size={28} />
            <span className="text-sm">Upload cover image</span>
            <input type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
          </label>
        )}
      </div>

      {/* Content */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6">
        <h3 className="font-semibold text-[#372308] text-sm mb-4">Content *</h3>

        {/* Formatting toolbar */}
        <div className="flex flex-wrap gap-1 mb-2 p-2 bg-white/60 rounded-xl border border-[#372308]/8">
          {[
            { label: 'H2', insert: '<h2>', close: '</h2>' },
            { label: 'H3', insert: '<h3>', close: '</h3>' },
            { label: 'B', insert: '<strong>', close: '</strong>' },
            { label: 'I', insert: '<em>', close: '</em>' },
            { label: 'P', insert: '<p>', close: '</p>' },
            { label: 'UL', insert: '<ul>\n  <li>', close: '</li>\n</ul>' },
            { label: 'LI', insert: '<li>', close: '</li>' },
            { label: 'Quote', insert: '<blockquote>', close: '</blockquote>' },
            { label: 'Link', insert: '<a href="URL">', close: '</a>' },
          ].map(({ label, insert, close }) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                const ta = document.getElementById('blog-content') as HTMLTextAreaElement
                if (!ta) return
                const start = ta.selectionStart
                const end = ta.selectionEnd
                const selected = form.content.substring(start, end)
                const newVal = form.content.substring(0, start) + insert + selected + close + form.content.substring(end)
                set('content', newVal)
                setTimeout(() => { ta.focus(); ta.setSelectionRange(start + insert.length, start + insert.length + selected.length) }, 0)
              }}
              className="px-2.5 py-1 text-xs font-medium text-[#372308]/60 hover:text-[#372308] hover:bg-[#F0D5A0]/30 rounded-lg transition-colors border border-transparent hover:border-[#372308]/10"
            >
              {label}
            </button>
          ))}
        </div>

        <textarea
          id="blog-content"
          value={form.content}
          onChange={e => set('content', e.target.value)}
          rows={20}
          placeholder="<h2>Introduction</h2>&#10;<p>Your article content here...</p>&#10;&#10;<h2>Section Title</h2>&#10;<p>More content...</p>"
          required
          className={inputClass + ' resize-y font-mono text-xs'}
        />

        {/* Live preview toggle */}
        {form.content && (
          <details className="mt-3">
            <summary className="text-xs text-[#372308]/40 cursor-pointer hover:text-[#372308]/60 select-none">Preview rendered output</summary>
            <div
              className="mt-3 p-4 bg-white rounded-xl border border-[#372308]/8 prose prose-sm max-w-none text-[#372308]/70 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: form.content }}
            />
          </details>
        )}
      </div>

      {/* SEO */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sm:p-6 space-y-4">
        <h3 className="font-semibold text-[#372308] text-sm">SEO (optional)</h3>
        <div>
          <label className={labelClass}>Meta Title</label>
          <input value={form.meta_title} onChange={e => set('meta_title', e.target.value)} placeholder="SEO title (defaults to post title)" className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Meta Description</label>
          <textarea value={form.meta_description} onChange={e => set('meta_description', e.target.value)} rows={2} placeholder="SEO description (150–160 chars)" className={inputClass + ' resize-none'} />
        </div>
      </div>

      {/* Publish */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <div
            onClick={() => set('is_published', !form.is_published)}
            className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${form.is_published ? 'bg-[#372308]' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-[#F5F0E8] shadow-sm transition-all ${form.is_published ? 'left-5' : 'left-1'}`} />
          </div>
          <span className="text-sm font-medium text-[#372308]/75">
            {form.is_published ? 'Publish immediately' : 'Save as draft'}
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium px-6 py-3 rounded-xl transition-colors">
          {loading && <RiLoader4Line className="animate-spin" size={16} />}
          {loading ? 'Saving...' : isEdit ? 'Update Post' : form.is_published ? 'Publish Post' : 'Save Draft'}
        </button>
        <button type="button" onClick={() => router.back()} className="px-6 py-3 text-sm text-[#372308]/60 border border-[#372308]/10 rounded-xl hover:border-gray-300 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  )
}
