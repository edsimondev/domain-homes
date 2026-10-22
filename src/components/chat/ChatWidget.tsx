'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { RiRobot2Line, RiCloseLine, RiSendPlane2Line, RiLoader4Line, RiSubtractLine, RiCalendarLine } from 'react-icons/ri'
import { v4 as uuidv4 } from 'uuid'

interface Message { role: 'user' | 'assistant'; content: string }

export default function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "Hi, I'm Alex — your property assistant. Looking to buy, rent, or explore? I'll help you find the perfect match.",
  }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => uuidv4())
  const [showBooking, setShowBooking] = useState(false)
  const [pulsing, setPulsing] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, open])
  useEffect(() => { if (open) inputRef.current?.focus() }, [open])
  useEffect(() => { const t = setTimeout(() => setPulsing(false), 6000); return () => clearTimeout(t) }, [])

  const send = useCallback(async (msg?: string) => {
    const text = (msg || input).trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, session_id: sessionId }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "I'm having trouble right now. Please try again." }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Connection issue. Please try again." }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId])

  return (
    <>
      {/* Chat panel */}
      {open && !minimized && (
        <div
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[min(calc(100vw-2rem),380px)] rounded-2xl overflow-hidden flex flex-col shadow-2xl"
          style={{ maxHeight: 'min(560px, calc(100vh - 120px))', background: '#F5F0E8', border: '1px solid rgba(55,35,8,0.1)' }}
        >
          {/* Header */}
          <div className="bg-[#372308] px-4 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#F0D5A0]/20 rounded-full flex items-center justify-center">
                <RiRobot2Line className="text-[#F0D5A0]" size={16} />
              </div>
              <div>
                <p className="text-[#F5F0E8] font-semibold text-sm">Alex</p>
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-[#F0D5A0] rounded-full" />
                  <p className="text-[#F5F0E8]/40 text-xs">AI Property Assistant</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimized(true)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F0E8]/8 text-[#F5F0E8]/40 hover:text-[#F5F0E8] transition-colors">
                <RiSubtractLine size={16} />
              </button>
              <button onClick={() => setOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F0E8]/8 text-[#F5F0E8]/40 hover:text-[#F5F0E8] transition-colors">
                <RiCloseLine size={16} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-full bg-[#F0D5A0] flex items-center justify-center shrink-0 mt-0.5">
                    <RiRobot2Line className="text-[#372308]" size={11} />
                  </div>
                )}
                <div className={`max-w-[85%] text-sm rounded-2xl px-4 py-2.5 leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-[#372308] text-[#F5F0E8] rounded-br-sm'
                    : 'bg-[#E8E0D0] text-[#372308] rounded-bl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-full bg-[#F0D5A0] flex items-center justify-center shrink-0">
                  <RiRobot2Line className="text-[#372308]" size={11} />
                </div>
                <div className="bg-[#E8E0D0] rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    {[0, 1, 2].map(i => (
                      <span key={i} className="w-1.5 h-1.5 bg-[#372308]/30 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick replies */}
          {messages.length <= 2 && (
            <div className="px-4 pb-2 flex flex-wrap gap-1.5">
              {[
                { label: 'I want to buy', action: 'chat' },
                { label: "I'm looking to rent", action: 'chat' },
                { label: '📅 Book a viewing', action: 'book' },
                { label: 'Just browsing', action: 'chat' },
              ].map(({ label, action }) => (
                <button key={label} onClick={() => {
                  if (action === 'book') {
                    setMessages(prev => [...prev,
                      { role: 'user', content: 'I want to book a viewing' },
                      { role: 'assistant', content: "Perfect — click below to pick a time. Our agent will meet you at the property." }
                    ])
                    setShowBooking(true)
                  } else {
                    send(label)
                  }
                }}
                  className="text-xs bg-[#372308]/6 text-[#372308] border border-[#372308]/10 px-3 py-1.5 rounded-full hover:bg-[#372308]/10 transition-colors font-medium">
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Cal.com booking */}
          {showBooking && (
            <div className="px-4 pb-3">
              <div className="bg-[#F0D5A0]/40 border border-[#372308]/10 rounded-xl p-4 text-center">
                <RiCalendarLine className="text-[#372308] mx-auto mb-2" size={20} />
                <p className="text-xs font-semibold text-[#372308] mb-0.5">Book a Property Viewing</p>
                <p className="text-xs text-[#372308]/50 mb-3">Free · 30 min · In-person or virtual</p>
                <a
                  href={process.env.NEXT_PUBLIC_CAL_BOOKING_URL || "https://cal.com/book"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-espresso inline-flex text-xs py-2 px-5"
                >
                  Choose a Time →
                </a>
                <button onClick={() => setShowBooking(false)} className="block mx-auto mt-2 text-xs text-[#372308]/30 hover:text-[#372308]/60">
                  I'll do it later
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-4 pb-4 pt-2 border-t border-[#372308]/6 shrink-0">
            <div className="flex items-center gap-2 bg-[#E8E0D0] border border-[#372308]/8 rounded-xl px-3 py-2 focus-within:border-[#372308]/25 transition-colors">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && send()}
                placeholder="Ask me anything..."
                className="flex-1 bg-transparent text-sm text-[#372308] outline-none placeholder-[#372308]/30 font-medium"
                disabled={loading}
              />
              <button
                onClick={() => send()}
                disabled={loading || !input.trim()}
                className="w-8 h-8 bg-[#372308] hover:bg-[#5a3a14] disabled:bg-[#372308]/20 text-[#F5F0E8] rounded-lg flex items-center justify-center transition-colors"
              >
                {loading ? <RiLoader4Line className="animate-spin" size={13} /> : <RiSendPlane2Line size={13} />}
              </button>
            </div>
            <p className="text-center text-[#372308]/20 text-xs mt-2">Powered by Gemini AI</p>
          </div>
        </div>
      )}

      {/* Minimized bar */}
      {open && minimized && (
        <div onClick={() => setMinimized(false)}
          className="fixed bottom-24 right-4 sm:right-6 z-50 bg-[#372308] text-[#F5F0E8] px-4 py-2.5 rounded-xl flex items-center gap-2.5 cursor-pointer hover:bg-[#5a3a14] transition-colors shadow-lg">
          <RiRobot2Line size={15} className="text-[#F0D5A0]" />
          <span className="text-sm font-medium">Chat with Alex</span>
          <span className="w-2 h-2 bg-[#F0D5A0] rounded-full animate-pulse" />
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => { setOpen(v => !v); setMinimized(false) }}
        className={`fixed bottom-5 right-4 sm:right-6 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
          open ? 'bg-[#5a3a14]' : 'bg-[#372308] hover:bg-[#5a3a14]'
        }`}
      >
        {open ? <RiCloseLine className="text-[#F5F0E8]" size={22} /> : <RiRobot2Line className="text-[#F0D5A0]" size={22} />}
        {!open && pulsing && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#F0D5A0] border-2 border-[#F5F0E8] rounded-full animate-pulse" />
        )}
      </button>
    </>
  )
}
