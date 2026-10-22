'use client'

import { useState } from 'react'
import {
  RiSparklingLine,
  RiLoader4Line,
  RiFileCopyLine,
  RiCheckLine,
  RiInstagramLine,
  RiFacebookCircleLine,
  RiMailLine,
  RiGlobalLine,
  RiRefreshLine,
  RiArrowLeftLine,
} from 'react-icons/ri'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface ContentSuiteClientProps {
  listings: {
    id: string
    title: string
    city: string
    state: string
    price: number
    listing_type: string
    bedrooms: number
    bathrooms: number
    property_type: string
  }[]
}

interface GeneratedContent {
  description: string
  instagram_caption: string
  facebook_post: string
  email_newsletter: string
  meta_description: string
  generated_at?: string
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success(`${label} copied!`)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="flex items-center gap-1.5 text-xs text-[#8a7968] hover:text-[#372308] border border-[#372308]/10 hover:border-[#372308]/15 px-2.5 py-1.5 rounded-lg transition-colors">
      {copied ? <RiCheckLine size={12} className="text-emerald-500" /> : <RiFileCopyLine size={12} />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function ContentBlock({
  icon: Icon,
  label,
  color,
  content,
  mono = false,
}: {
  icon: any
  label: string
  color: string
  content: string
  mono?: boolean
}) {
  return (
    <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
      <div className={`flex items-center justify-between px-4 py-3 border-b border-[#372308]/6 ${color}`}>
        <div className="flex items-center gap-2">
          <Icon size={16} />
          <span className="text-sm font-semibold">{label}</span>
        </div>
        <CopyButton text={content} label={label} />
      </div>
      <div className="p-4">
        <p className={`text-sm text-[#372308]/75 leading-relaxed whitespace-pre-wrap ${mono ? 'font-mono text-xs' : ''}`}>
          {content}
        </p>
      </div>
    </div>
  )
}

export default function ContentSuiteClient({ listings }: ContentSuiteClientProps) {
  const [selectedId, setSelectedId] = useState<string>('')
  const [content, setContent] = useState<GeneratedContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [cached, setCached] = useState(false)

  const selectedListing = listings.find(l => l.id === selectedId)

  const generate = async (regenerate = false) => {
    if (!selectedId) { toast.error('Select a listing first'); return }
    setLoading(true)
    setContent(null)
    try {
      const res = await fetch('/api/automation/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listing_id: selectedId, regenerate }),
      })
      const data = await res.json()
      if (data.content) {
        setContent(data.content)
        setCached(data.cached && !regenerate)
        if (!regenerate && data.cached) toast('Using cached content — click Regenerate for fresh copy', { icon: 'ℹ️' })
        else toast.success('✨ Content generated!')
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const copyAll = async () => {
    if (!content) return
    const all = [
      `=== WEBSITE DESCRIPTION ===\n${content.description}`,
      `\n=== INSTAGRAM CAPTION ===\n${content.instagram_caption}`,
      `\n=== FACEBOOK POST ===\n${content.facebook_post}`,
      `\n=== EMAIL NEWSLETTER ===\n${content.email_newsletter}`,
      `\n=== META DESCRIPTION ===\n${content.meta_description}`,
    ].join('\n')
    await navigator.clipboard.writeText(all)
    toast.success('All content copied to clipboard!')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/automation" className="text-[#372308]/35 hover:text-[#372308]/60">
          <RiArrowLeftLine size={18} />
        </Link>
        <h1 className="font-display text-2xl font-bold text-[#372308]">Listing Content Suite</h1>
      </div>
      <p className="text-[#8a7968] text-sm mb-8 ml-7">
        Select a listing → AI generates all marketing content in one click. Website copy, Instagram, Facebook, email — done.
      </p>

      {/* Listing selector */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 mb-6">
        <label className="block text-xs font-medium text-[#372308]/60 mb-2">Select a Property</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setContent(null) }}
            className="flex-1 text-sm border border-[#372308]/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#372308]/35 transition-colors"
          >
            <option value="">Choose a listing...</option>
            {listings.map(l => (
              <option key={l.id} value={l.id}>
                {l.title} — {l.city}, {l.state} · {formatPrice(l.price, l.listing_type)}
              </option>
            ))}
          </select>
          <button
            onClick={() => generate(false)}
            disabled={loading || !selectedId}
            className="flex items-center justify-center gap-2 bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium px-6 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            {loading
              ? <RiLoader4Line className="animate-spin" size={16} />
              : <RiSparklingLine size={16} />
            }
            {loading ? 'Generating...' : 'Generate All Content'}
          </button>
        </div>

        {/* Selected listing preview */}
        {selectedListing && (
          <div className="mt-3 pt-3 border-t border-[#372308]/6 flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-[#8a7968]">
              <span className="capitalize font-medium text-[#372308]">{selectedListing.property_type}</span>
              <span>·</span>
              <span>{selectedListing.bedrooms}bd {selectedListing.bathrooms}ba</span>
              <span>·</span>
              <span>{selectedListing.city}, {selectedListing.state}</span>
            </div>
            {content && (
              <div className="flex gap-2">
                <button
                  onClick={copyAll}
                  className="flex items-center gap-1.5 text-xs text-[#8a7968] hover:text-[#372308] border border-[#372308]/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <RiFileCopyLine size={12} /> Copy All
                </button>
                <button
                  onClick={() => generate(true)}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-xs text-[#8a7968] hover:text-[#372308] border border-[#372308]/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                >
                  <RiRefreshLine size={12} /> Regenerate
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 bg-[#F0D5A0]/20 rounded-2xl flex items-center justify-center">
            <RiSparklingLine className="text-[#372308] animate-pulse" size={28} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[#372308]">AI is writing your content...</p>
            <p className="text-[#372308]/35 text-sm mt-1">Generating description, social posts, and email copy</p>
          </div>
        </div>
      )}

      {/* Generated content */}
      {content && !loading && (
        <>
          {cached && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2 text-sm text-amber-700">
              <RiSparklingLine size={14} />
              Showing cached content from {content.generated_at ? new Date(content.generated_at).toLocaleDateString() : 'previous generation'}. Click Regenerate for fresh copy.
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ContentBlock
              icon={RiGlobalLine}
              label="Website Description"
              color="bg-[#F0D5A0]/20 text-[#1e1200]"
              content={content.description}
            />
            <ContentBlock
              icon={RiInstagramLine}
              label="Instagram Caption"
              color="bg-pink-50 text-pink-700"
              content={content.instagram_caption}
            />
            <ContentBlock
              icon={RiFacebookCircleLine}
              label="Facebook Post"
              color="bg-blue-50 text-blue-700"
              content={content.facebook_post}
            />
            <ContentBlock
              icon={RiMailLine}
              label="Email Newsletter Blurb"
              color="bg-purple-50 text-purple-700"
              content={content.email_newsletter}
            />
          </div>

          {/* Meta description */}
          <div className="mt-5 bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#8a7968] uppercase tracking-wider">SEO Meta Description</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${content.meta_description.length > 155 ? 'text-red-500' : 'text-[#372308]/35'}`}>
                  {content.meta_description.length}/155 chars
                </span>
                <CopyButton text={content.meta_description} label="Meta description" />
              </div>
            </div>
            <p className="text-sm text-[#372308]/60 font-mono">{content.meta_description}</p>
          </div>
        </>
      )}

      {/* Empty state */}
      {!content && !loading && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl flex items-center justify-center mb-4">
            <RiSparklingLine className="text-[#372308]" size={28} />
          </div>
          <h3 className="font-semibold text-[#372308] mb-2">Ready to create content</h3>
          <p className="text-[#372308]/35 text-sm max-w-sm">
            Select any listing above and click Generate. AI will write the website description, Instagram caption, Facebook post, and email blurb — all in one shot.
          </p>
        </div>
      )}
    </div>
  )
}
