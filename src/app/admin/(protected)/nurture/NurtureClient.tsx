'use client'

import { useState } from 'react'
import {
  RiMailSendLine,
  RiUserAddLine,
  RiLoader4Line,
  RiCheckLine,
  RiFireLine,
  RiAddLine,
  RiToggleLine,
  RiToggleFill,
  RiArrowRightLine,
} from 'react-icons/ri'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

interface Sequence {
  id: string
  name: string
  description: string
  trigger_type: string
  target_lead_score: string
  steps_count: number
  delay_days: number[]
  is_active: boolean
  total_enrolled: number
  context?: string
}

interface Lead {
  id: string
  name: string
  email: string
  lead_score: string
  preferred_location?: string
  created_at: string
}

interface NurtureClientProps {
  sequences: Sequence[]
  leads: Lead[]
}

const scoreColors: Record<string, string> = {
  hot: 'badge-hot',
  warm: 'badge-warm',
  cold: 'badge-cold',
}

export default function NurtureClient({ sequences: initialSequences, leads }: NurtureClientProps) {
  const [sequences, setSequences] = useState(initialSequences)
  const [selectedSeq, setSelectedSeq] = useState<string | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set())
  const [enrolling, setEnrolling] = useState(false)
  const [scoreFilter, setScoreFilter] = useState<string>('all')
  const [tab, setTab] = useState<'sequences' | 'enroll'>('sequences')
  const supabase = createClient()

  const filteredLeads = leads.filter(l =>
    scoreFilter === 'all' || l.lead_score === scoreFilter
  )

  const toggleLeadSelect = (id: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll = () => {
    if (selectedLeads.size === filteredLeads.length) {
      setSelectedLeads(new Set())
    } else {
      setSelectedLeads(new Set(filteredLeads.map(l => l.id)))
    }
  }

  const handleEnroll = async () => {
    if (!selectedSeq || selectedLeads.size === 0) {
      toast.error('Select a sequence and at least one lead')
      return
    }
    setEnrolling(true)
    try {
      const res = await fetch('/api/automation/nurture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'enroll',
          sequence_id: selectedSeq,
          lead_ids: Array.from(selectedLeads),
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(`✅ Enrolled ${data.enrolled} lead${data.enrolled !== 1 ? 's' : ''}${data.skipped ? ` (${data.skipped} already enrolled)` : ''}`)
        setSelectedLeads(new Set())
        setSequences(prev => prev.map(s =>
          s.id === selectedSeq
            ? { ...s, total_enrolled: s.total_enrolled + data.enrolled }
            : s
        ))
      } else {
        throw new Error(data.error)
      }
    } catch (err: any) {
      toast.error(err.message || 'Enrollment failed')
    } finally {
      setEnrolling(false)
    }
  }

  const toggleSequence = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from('nurture_sequences')
      .update({ is_active: !current })
      .eq('id', id)

    if (!error) {
      setSequences(prev => prev.map(s => s.id === id ? { ...s, is_active: !current } : s))
      toast.success(current ? 'Sequence paused' : 'Sequence activated')
    }
  }

  const triggerLabels: Record<string, string> = {
    manual: 'Manual only',
    on_lead: 'Auto: every new lead',
    on_cold: 'Auto: cold leads',
    on_warm: 'Auto: warm leads',
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#372308]">Nurture Sequences</h1>
        <p className="text-[#8a7968] text-sm mt-1">AI-personalized follow-up email campaigns that run automatically</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#E8E0D0] p-1 rounded-xl w-fit mb-6">
        {([['sequences', 'Sequences'], ['enroll', 'Enroll Leads']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${tab === key ? 'bg-[#F5F0E8] text-[#372308] shadow-sm' : 'text-[#8a7968] hover:text-[#372308]/75'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* SEQUENCES TAB */}
      {tab === 'sequences' && (
        <div className="space-y-4">
          {sequences.map(seq => (
            <div key={seq.id} className={`bg-[#F5F0E8] rounded-2xl border transition-all overflow-hidden ${selectedSeq === seq.id ? 'border-[#372308]/25 shadow-sm' : 'border-[#372308]/6'}`}>
              <div className="p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
                  <RiMailSendLine className="text-purple-600" size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-semibold text-[#372308]">{seq.name}</h3>
                      <p className="text-sm text-[#8a7968] mt-0.5">{seq.description}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => toggleSequence(seq.id, seq.is_active)}
                        className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                          seq.is_active
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-[#F5F0E8] text-[#8a7968] border-[#372308]/10'
                        }`}
                      >
                        {seq.is_active ? <RiToggleFill size={14} /> : <RiToggleLine size={14} />}
                        {seq.is_active ? 'Active' : 'Paused'}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 mt-3">
                    <span className="text-xs bg-[#F5F0E8] text-[#372308]/60 px-2.5 py-1 rounded-full border border-[#372308]/6">
                      {seq.steps_count} steps
                    </span>
                    <span className="text-xs bg-[#F5F0E8] text-[#372308]/60 px-2.5 py-1 rounded-full border border-[#372308]/6">
                      {triggerLabels[seq.trigger_type] || seq.trigger_type}
                    </span>
                    {seq.target_lead_score && seq.target_lead_score !== 'all' && (
                      <span className={`text-xs px-2.5 py-1 rounded-full ${scoreColors[seq.target_lead_score]}`}>
                        {seq.target_lead_score} leads only
                      </span>
                    )}
                    <span className="text-xs text-[#372308]/35">
                      {seq.total_enrolled} enrolled
                    </span>
                  </div>

                  {/* Step timeline */}
                  <div className="flex items-center gap-1 mt-3 overflow-x-auto pb-1">
                    {seq.delay_days.slice(0, seq.steps_count).map((day, i) => (
                      <div key={i} className="flex items-center gap-1 shrink-0">
                        <div className="flex flex-col items-center">
                          <div className="w-6 h-6 rounded-full bg-[#F0D5A0]/30 border-2 border-[#372308]/25 flex items-center justify-center">
                            <span className="text-xs text-[#1e1200] font-bold">{i + 1}</span>
                          </div>
                          <span className="text-xs text-[#372308]/35 mt-0.5 whitespace-nowrap">Day {day}</span>
                        </div>
                        {i < seq.steps_count - 1 && (
                          <div className="h-0.5 w-8 bg-[#F0D5A0]/30 mb-3" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-5 py-3 bg-[#F5F0E8]/50 border-t border-[#372308]/6 flex items-center justify-between">
                <p className="text-xs text-[#372308]/35">
                  {seq.context ? seq.context.slice(0, 80) + '...' : 'AI personalizes each email based on lead data'}
                </p>
                <button
                  onClick={() => { setSelectedSeq(seq.id); setTab('enroll') }}
                  className="flex items-center gap-1.5 text-xs text-[#372308] font-medium hover:underline shrink-0"
                >
                  Enroll leads <RiArrowRightLine size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ENROLL TAB */}
      {tab === 'enroll' && (
        <div className="grid lg:grid-cols-5 gap-6">
          {/* Sequence picker */}
          <div className="lg:col-span-2">
            <h3 className="font-semibold text-[#372308] text-sm mb-3">1. Pick a sequence</h3>
            <div className="space-y-2">
              {sequences.filter(s => s.is_active).map(seq => (
                <button
                  key={seq.id}
                  onClick={() => setSelectedSeq(seq.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selectedSeq === seq.id
                      ? 'border-[#372308]/35 bg-[#F0D5A0]/20'
                      : 'border-[#372308]/10 bg-[#F5F0E8] hover:border-[#372308]/15'
                  }`}
                >
                  <p className="font-medium text-[#372308] text-sm">{seq.name}</p>
                  <p className="text-xs text-[#372308]/35 mt-0.5">{seq.steps_count} steps · {seq.total_enrolled} enrolled</p>
                  {selectedSeq === seq.id && <RiCheckLine className="text-[#372308] mt-1" size={14} />}
                </button>
              ))}
            </div>

            {selectedLeads.size > 0 && selectedSeq && (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="w-full flex items-center justify-center gap-2 bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium py-3 rounded-xl transition-colors mt-4"
              >
                {enrolling
                  ? <RiLoader4Line className="animate-spin" size={16} />
                  : <RiUserAddLine size={16} />
                }
                {enrolling ? 'Enrolling...' : `Enroll ${selectedLeads.size} lead${selectedLeads.size !== 1 ? 's' : ''}`}
              </button>
            )}
          </div>

          {/* Lead picker */}
          <div className="lg:col-span-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[#372308] text-sm">2. Select leads</h3>
              <div className="flex items-center gap-2">
                <select
                  value={scoreFilter}
                  onChange={e => setScoreFilter(e.target.value)}
                  className="text-xs border border-[#372308]/10 rounded-lg px-2 py-1.5 outline-none"
                >
                  <option value="all">All scores</option>
                  <option value="hot">🔥 Hot</option>
                  <option value="warm">☀️ Warm</option>
                  <option value="cold">❄️ Cold</option>
                </select>
                <button onClick={selectAll} className="text-xs text-[#372308] hover:underline font-medium">
                  {selectedLeads.size === filteredLeads.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {filteredLeads.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => toggleLeadSelect(lead.id)}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedLeads.has(lead.id)
                      ? 'border-[#372308]/25 bg-[#F0D5A0]/20'
                      : 'border-[#372308]/10 bg-[#F5F0E8] hover:border-gray-300'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                    selectedLeads.has(lead.id)
                      ? 'bg-[#372308] border-brand-600'
                      : 'border-gray-300'
                  }`}>
                    {selectedLeads.has(lead.id) && <RiCheckLine className="text-white" size={11} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#372308] truncate">{lead.name}</p>
                    <p className="text-xs text-[#372308]/35 truncate">{lead.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${scoreColors[lead.lead_score]}`}>
                    {lead.lead_score}
                  </span>
                </div>
              ))}
            </div>

            {selectedLeads.size > 0 && (
              <p className="text-xs text-[#372308] font-medium mt-2 text-center">
                {selectedLeads.size} lead{selectedLeads.size !== 1 ? 's' : ''} selected
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
