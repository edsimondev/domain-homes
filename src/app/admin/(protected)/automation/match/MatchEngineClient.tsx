'use client'

import { useState } from 'react'
import {
  RiSearchEyeLine,
  RiLoader4Line,
  RiMailSendLine,
  RiCheckLine,
  RiArrowLeftLine,
  RiFireLine,
  RiMapPin2Line,
  RiMoneyDollarCircleLine,
} from 'react-icons/ri'
import toast from 'react-hot-toast'
import Link from 'next/link'
import { formatPrice } from '@/lib/utils'

interface Match {
  id: string
  match_score: number
  match_reason: string
  status: string
  lead: {
    id: string
    name: string
    email: string
    phone?: string
    lead_score: string
    budget_max?: number
    preferred_location?: string
    property_type?: string
    timeline?: string
  }
}

const scoreColors: Record<string, string> = {
  hot: 'badge-hot',
  warm: 'badge-warm',
  cold: 'badge-cold',
}

export default function MatchEngineClient({ listings }: { listings: any[] }) {
  const [selectedId, setSelectedId] = useState('')
  const [matches, setMatches] = useState<Match[]>([])
  const [scanning, setScanning] = useState(false)
  const [sending, setSending] = useState(false)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [notifiedIds, setNotifiedIds] = useState<Set<string>>(new Set())

  const selectedListing = listings.find(l => l.id === selectedId)

  const runScan = async () => {
    if (!selectedId) { toast.error('Select a listing first'); return }
    setScanning(true)
    setMatches([])
    setSelectedLeads(new Set())
    try {
      // First run the engine to find/score matches
      const runRes = await fetch('/api/automation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'run', listing_id: selectedId }),
      })
      const runData = await runRes.json()

      // Then fetch the full match records
      const getRes = await fetch(`/api/automation/match?listing_id=${selectedId}`)
      const getData = await getRes.json()

      setMatches(getData.matches || [])

      if (getData.matches?.length) {
        toast.success(`Found ${getData.matches.length} matching lead${getData.matches.length !== 1 ? 's' : ''}!`)
        // Pre-select all pending matches
        const pending = getData.matches.filter((m: Match) => m.status === 'pending').map((m: Match) => m.lead.id)
        setSelectedLeads(new Set(pending))
      } else {
        toast('No matching leads found for this listing', { icon: 'ℹ️' })
      }
    } catch {
      toast.error('Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const sendNotifications = async () => {
    if (!selectedLeads.size) { toast.error('Select at least one lead to notify'); return }
    setSending(true)
    try {
      const res = await fetch('/api/automation/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'notify',
          listing_id: selectedId,
          lead_ids: Array.from(selectedLeads),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`✅ Sent ${data.sent} notification email${data.sent !== 1 ? 's' : ''}${data.failed ? ` (${data.failed} failed)` : ''}`)
        setNotifiedIds(prev => new Set([...prev, ...selectedLeads]))
        setSelectedLeads(new Set())
        // Refresh matches
        const getRes = await fetch(`/api/automation/match?listing_id=${selectedId}`)
        const getData = await getRes.json()
        setMatches(getData.matches || [])
      }
    } catch {
      toast.error('Failed to send notifications')
    } finally {
      setSending(false)
    }
  }

  const toggleLead = (leadId: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev)
      next.has(leadId) ? next.delete(leadId) : next.add(leadId)
      return next
    })
  }

  const matchScoreBar = (score: number) => {
    const max = 9
    const pct = Math.min(100, (score / max) * 100)
    const color = score >= 7 ? 'bg-emerald-400' : score >= 5 ? 'bg-amber-400' : 'bg-blue-400'
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[#E8E0D0] rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-[#8a7968] shrink-0">{score}/9</span>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="flex items-center gap-3 mb-2">
        <Link href="/admin/automation" className="text-[#372308]/35 hover:text-[#372308]/60">
          <RiArrowLeftLine size={18} />
        </Link>
        <h1 className="font-display text-2xl font-bold text-[#372308]">Property Match Engine</h1>
      </div>
      <p className="text-[#8a7968] text-sm mb-8 ml-7">
        Pick a listing → AI scans every lead → sends personalized "we just listed your perfect match" emails.
      </p>

      {/* Listing selector */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 mb-6">
        <label className="block text-xs font-medium text-[#372308]/60 mb-2">Select a Listing to Match</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setMatches([]); setSelectedLeads(new Set()) }}
            className="flex-1 text-sm border border-[#372308]/10 rounded-xl px-3.5 py-2.5 outline-none focus:border-[#372308]/35"
          >
            <option value="">Choose a listing...</option>
            {listings.map(l => (
              <option key={l.id} value={l.id}>
                {l.title} — {l.city}, {l.state} · {formatPrice(l.price, l.listing_type)}
              </option>
            ))}
          </select>
          <button
            onClick={runScan}
            disabled={scanning || !selectedId}
            className="flex items-center justify-center gap-2 bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium px-6 py-2.5 rounded-xl transition-colors whitespace-nowrap"
          >
            {scanning
              ? <RiLoader4Line className="animate-spin" size={16} />
              : <RiSearchEyeLine size={16} />
            }
            {scanning ? 'Scanning leads...' : 'Find Matching Leads'}
          </button>
        </div>

        {selectedListing && (
          <div className="mt-3 pt-3 border-t border-[#372308]/6 flex flex-wrap items-center gap-3 text-sm text-[#8a7968]">
            <span className="font-medium text-[#372308]">{selectedListing.property_type}</span>
            <span>·</span>
            <span>{selectedListing.bedrooms}bd {selectedListing.bathrooms}ba</span>
            <span>·</span>
            <span>{selectedListing.city}, {selectedListing.state}</span>
            <span>·</span>
            <span className="font-medium text-[#372308]">{formatPrice(selectedListing.price, selectedListing.listing_type)}</span>
          </div>
        )}
      </div>

      {/* Scanning state */}
      {scanning && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-14 h-14 bg-[#F0D5A0]/20 rounded-2xl flex items-center justify-center">
            <RiSearchEyeLine className="text-[#372308] animate-pulse" size={28} />
          </div>
          <div className="text-center">
            <p className="font-semibold text-[#372308]">Scanning your lead database...</p>
            <p className="text-[#372308]/35 text-sm mt-1">AI is scoring every lead against this property's specs</p>
          </div>
        </div>
      )}

      {/* Match results */}
      {matches.length > 0 && !scanning && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-[#372308]">
                {matches.length} Matching Lead{matches.length !== 1 ? 's' : ''} Found
              </h2>
              <p className="text-xs text-[#372308]/35 mt-0.5">
                {matches.filter(m => m.status === 'pending').length} pending notification
                {selectedLeads.size > 0 && ` · ${selectedLeads.size} selected`}
              </p>
            </div>
            {selectedLeads.size > 0 && (
              <button
                onClick={sendNotifications}
                disabled={sending}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-medium text-sm px-5 py-2.5 rounded-xl transition-colors"
              >
                {sending
                  ? <RiLoader4Line className="animate-spin" size={15} />
                  : <RiMailSendLine size={15} />
                }
                {sending ? 'Sending...' : `Notify ${selectedLeads.size} Lead${selectedLeads.size !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {matches.map(match => {
              const alreadyNotified = match.status === 'notified' || notifiedIds.has(match.lead.id)
              return (
                <div
                  key={match.id}
                  onClick={() => !alreadyNotified && toggleLead(match.lead.id)}
                  className={`bg-[#F5F0E8] rounded-2xl border transition-all overflow-hidden ${
                    alreadyNotified
                      ? 'border-[#372308]/6 opacity-60 cursor-default'
                      : selectedLeads.has(match.lead.id)
                      ? 'border-[#372308]/25 shadow-sm cursor-pointer'
                      : 'border-[#372308]/6 hover:border-[#372308]/10 cursor-pointer'
                  }`}
                >
                  <div className="p-4 flex items-start gap-3">
                    {/* Checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                      alreadyNotified
                        ? 'bg-[#E8E0D0] border-[#372308]/10'
                        : selectedLeads.has(match.lead.id)
                        ? 'bg-[#372308] border-brand-600'
                        : 'border-gray-300'
                    }`}>
                      {alreadyNotified
                        ? <RiCheckLine className="text-[#372308]/35" size={11} />
                        : selectedLeads.has(match.lead.id)
                        ? <RiCheckLine className="text-white" size={11} />
                        : null
                      }
                    </div>

                    {/* Lead info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-[#372308] text-sm">{match.lead.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColors[match.lead.lead_score]}`}>
                              {match.lead.lead_score}
                            </span>
                            {alreadyNotified && (
                              <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                                ✓ Notified
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-[#372308]/35 mt-0.5">{match.lead.email}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs text-[#8a7968]">Match score</p>
                          <div className="w-24">{matchScoreBar(match.match_score)}</div>
                        </div>
                      </div>

                      {/* Lead preferences */}
                      <div className="flex flex-wrap gap-3 mt-2">
                        {match.lead.budget_max && (
                          <span className="flex items-center gap-1 text-xs text-[#372308]/35">
                            <RiMoneyDollarCircleLine size={11} /> Up to ${match.lead.budget_max.toLocaleString()}
                          </span>
                        )}
                        {match.lead.preferred_location && (
                          <span className="flex items-center gap-1 text-xs text-[#372308]/35">
                            <RiMapPin2Line size={11} /> {match.lead.preferred_location}
                          </span>
                        )}
                        {match.lead.timeline && (
                          <span className="text-xs text-[#372308]/35">⏰ {match.lead.timeline}</span>
                        )}
                      </div>

                      {/* AI match reason */}
                      <div className="mt-3 bg-[#F0D5A0]/20 rounded-lg px-3 py-2">
                        <p className="text-xs text-[#1e1200]">
                          <span className="font-semibold">✨ Why this matches: </span>
                          {match.match_reason}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Empty state */}
      {!matches.length && !scanning && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-50 to-brand-50 rounded-2xl flex items-center justify-center mb-4">
            <RiSearchEyeLine className="text-[#372308]" size={28} />
          </div>
          <h3 className="font-semibold text-[#372308] mb-2">Ready to match</h3>
          <p className="text-[#372308]/35 text-sm max-w-sm">
            Select a listing and click "Find Matching Leads." AI will scan your entire lead database and surface the best matches with a personalized reason for each.
          </p>
        </div>
      )}
    </div>
  )
}
