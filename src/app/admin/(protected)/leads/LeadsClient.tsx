'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import {
  RiFilterLine,
  RiFireLine,
  RiMailLine,
  RiPhoneLine,
  RiCheckLine,
  RiDeleteBinLine,
  RiArrowDownLine,
  RiUserLine,
  RiMapPin2Line,
  RiMoneyDollarCircleLine,
} from 'react-icons/ri'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import type { Lead } from '@/types'

interface LeadsClientProps {
  initialLeads: Lead[]
  totalCount: number
}

export default function LeadsClient({ initialLeads, totalCount }: LeadsClientProps) {
  const [leads, setLeads] = useState(initialLeads)
  const [scoreFilter, setScoreFilter] = useState<string>('all')
  const [contactedFilter, setContactedFilter] = useState<string>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const supabase = createClient()

  const hasMore = leads.length < totalCount

  const loadMore = async () => {
    setLoadingMore(true)
    const { data } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .range(leads.length, leads.length + 49)
    if (data) setLeads(prev => [...prev, ...data])
    setLoadingMore(false)
  }

  const scoreColors: Record<string, string> = {
    hot: 'badge-hot',
    warm: 'badge-warm',
    cold: 'badge-cold',
  }

  const filtered = leads.filter(l => {
    if (scoreFilter !== 'all' && l.lead_score !== scoreFilter) return false
    if (contactedFilter === 'contacted' && !l.is_contacted) return false
    if (contactedFilter === 'new' && l.is_contacted) return false
    return true
  })

  const markContacted = async (id: string) => {
    const { error } = await supabase.from('leads').update({ is_contacted: true }).eq('id', id)
    if (!error) {
      setLeads(prev => prev.map(l => l.id === id ? { ...l, is_contacted: true } : l))
      toast.success('Marked as contacted')
    }
  }

  const deleteLead = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (!error) {
      setLeads(prev => prev.filter(l => l.id !== id))
      if (selected === id) setSelected(null)
      toast.success('Lead deleted')
    }
  }

  const selectedLead = leads.find(l => l.id === selected)

  const counts = {
    all: leads.length,
    hot: leads.filter(l => l.lead_score === 'hot').length,
    warm: leads.filter(l => l.lead_score === 'warm').length,
    cold: leads.filter(l => l.lead_score === 'cold').length,
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#372308]">Leads</h1>
          <p className="text-[#8a7968] text-sm mt-1">{totalCount.toLocaleString()} total leads captured · showing {leads.length}</p>
        </div>
      </div>

      {/* Score filter tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {(['all', 'hot', 'warm', 'cold'] as const).map(score => (
          <button
            key={score}
            onClick={() => setScoreFilter(score)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all ${
              scoreFilter === score
                ? score === 'hot' ? 'bg-red-100 text-red-700 border border-red-200'
                : score === 'warm' ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : score === 'cold' ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'bg-[#372308] text-white'
                : 'bg-[#F5F0E8] border border-[#372308]/10 text-[#372308]/60 hover:border-gray-300'
            }`}
          >
            {score === 'hot' && <RiFireLine size={13} />}
            {score.charAt(0).toUpperCase() + score.slice(1)}
            <span className="bg-black/10 px-1.5 py-0.5 rounded-full text-xs">{counts[score]}</span>
          </button>
        ))}

        <select
          value={contactedFilter}
          onChange={e => setContactedFilter(e.target.value)}
          className="ml-auto appearance-none bg-[#F5F0E8] border border-[#372308]/10 rounded-xl px-3 py-1.5 text-sm text-[#372308]/60 outline-none cursor-pointer"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
        </select>
      </div>

      <div className="flex gap-5 items-start">
        {/* Leads list */}
        <div className={`flex-1 min-w-0 space-y-2 ${selected ? 'hidden lg:block lg:max-w-md xl:max-w-lg' : ''}`}>
          {filtered.length === 0 && (
            <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-12 text-center">
              <p className="text-[#372308]/35 text-sm">No leads found</p>
            </div>
          )}
          {filtered.map(lead => (
            <div
              key={lead.id}
              onClick={() => setSelected(lead.id === selected ? null : lead.id)}
              className={`bg-[#F5F0E8] rounded-xl border cursor-pointer transition-all p-4 ${
                selected === lead.id
                  ? 'border-[#372308]/25 shadow-sm'
                  : 'border-[#372308]/6 hover:border-[#372308]/10 hover:shadow-sm'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-[#E8E0D0] flex items-center justify-center text-[#372308] font-semibold text-sm shrink-0">
                    {lead.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-[#372308] text-sm truncate">{lead.name || 'Anonymous'}</p>
                      {!lead.is_contacted && (
                        <span className="text-xs bg-[#F0D5A0]/20 text-[#372308] px-1.5 py-0.5 rounded font-medium">New</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {lead.email && <span className="text-xs text-[#372308]/35 truncate">{lead.email}</span>}
                      {lead.phone && <span className="text-xs text-[#372308]/35">{lead.phone}</span>}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColors[lead.lead_score]}`}>
                    {lead.lead_score}
                  </span>
                  <span className="text-xs text-[#372308]/35 hidden sm:block">
                    {format(new Date(lead.created_at), 'MMM d')}
                  </span>
                </div>
              </div>

              {(lead.preferred_location || lead.budget_max) && (
                <div className="flex items-center gap-4 mt-2.5 pl-12 flex-wrap">
                  {lead.preferred_location && (
                    <span className="flex items-center gap-1 text-xs text-[#372308]/35">
                      <RiMapPin2Line size={11} /> {lead.preferred_location}
                    </span>
                  )}
                  {lead.budget_max && (
                    <span className="flex items-center gap-1 text-xs text-[#372308]/35">
                      <RiMoneyDollarCircleLine size={11} /> Up to ${lead.budget_max.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {/* Load more */}
          {hasMore && scoreFilter === 'all' && contactedFilter === 'all' && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="w-full mt-2 py-3 text-sm text-[#372308]/60 hover:text-[#372308] border border-[#372308]/10 hover:border-[#372308]/20 rounded-xl transition-colors disabled:opacity-40"
            >
              {loadingMore ? 'Loading...' : `Load more (${totalCount - leads.length} remaining)`}
            </button>
          )}
        </div>

        {/* Lead detail panel */}
        {selectedLead && (
          <div className="flex-1 lg:flex-none lg:w-80 xl:w-96 bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 sticky top-4">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-semibold text-[#372308]">Lead Details</h3>
              <button onClick={() => setSelected(null)} className="text-[#372308]/35 hover:text-[#372308]/60 text-xs">
                Close
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5 pb-5 border-b border-[#372308]/6">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-lg font-bold">
                {selectedLead.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-semibold text-[#372308]">{selectedLead.name || 'Anonymous'}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${scoreColors[selectedLead.lead_score]}`}>
                  {selectedLead.lead_score} lead
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-5">
              {selectedLead.email && (
                <div className="flex items-center gap-2.5">
                  <RiMailLine className="text-[#372308]/35 shrink-0" size={15} />
                  <a href={`mailto:${selectedLead.email}`} className="text-sm text-[#372308] hover:underline truncate">{selectedLead.email}</a>
                </div>
              )}
              {selectedLead.phone && (
                <div className="flex items-center gap-2.5">
                  <RiPhoneLine className="text-[#372308]/35 shrink-0" size={15} />
                  <a href={`tel:${selectedLead.phone}`} className="text-sm text-[#372308] hover:underline">{selectedLead.phone}</a>
                </div>
              )}
              {selectedLead.preferred_location && (
                <div className="flex items-center gap-2.5">
                  <RiMapPin2Line className="text-[#372308]/35 shrink-0" size={15} />
                  <span className="text-sm text-[#372308]/60">{selectedLead.preferred_location}</span>
                </div>
              )}
              {(selectedLead.budget_min || selectedLead.budget_max) && (
                <div className="flex items-center gap-2.5">
                  <RiMoneyDollarCircleLine className="text-[#372308]/35 shrink-0" size={15} />
                  <span className="text-sm text-[#372308]/60">
                    {selectedLead.budget_min ? `$${selectedLead.budget_min.toLocaleString()}` : ''}
                    {selectedLead.budget_min && selectedLead.budget_max ? ' – ' : ''}
                    {selectedLead.budget_max ? `$${selectedLead.budget_max.toLocaleString()}` : ''}
                  </span>
                </div>
              )}
              {selectedLead.property_type && (
                <div className="flex items-center gap-2.5">
                  <RiUserLine className="text-[#372308]/35 shrink-0" size={15} />
                  <span className="text-sm text-[#372308]/60 capitalize">{selectedLead.property_type}</span>
                </div>
              )}
              {selectedLead.timeline && (
                <div className="flex items-start gap-2.5">
                  <RiArrowDownLine className="text-[#372308]/35 shrink-0 mt-0.5" size={15} />
                  <span className="text-sm text-[#372308]/60">Timeline: {selectedLead.timeline}</span>
                </div>
              )}
            </div>

            {selectedLead.message && (
              <div className="bg-[#F5F0E8] rounded-xl p-3 mb-5 text-sm text-[#372308]/60 leading-relaxed">
                "{selectedLead.message}"
              </div>
            )}

            <div className="text-xs text-[#372308]/35 mb-5">
              Added {format(new Date(selectedLead.created_at), 'MMMM d, yyyy HH:mm')} · via {selectedLead.source}
            </div>

            <div className="flex gap-2">
              {!selectedLead.is_contacted && (
                <button
                  onClick={() => markContacted(selectedLead.id)}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#372308] hover:bg-[#1e1200] text-white text-sm font-medium px-3 py-2.5 rounded-xl transition-colors"
                >
                  <RiCheckLine size={14} /> Mark Contacted
                </button>
              )}
              <button
                onClick={() => deleteLead(selectedLead.id)}
                className="flex items-center justify-center gap-2 border border-red-200 text-red-600 hover:bg-red-50 text-sm px-3 py-2.5 rounded-xl transition-colors"
              >
                <RiDeleteBinLine size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
