'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const email = searchParams.get('email')
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle')

  useEffect(() => {
    if (!email) return
    setStatus('loading')
    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
      .then(r => setStatus(r.ok ? 'success' : 'error'))
      .catch(() => setStatus('error'))
  }, [email])

  return (
    <main className="min-h-screen bg-[#FAF7F2] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="font-serif text-2xl tracking-widest text-[#2C1A08] uppercase mb-10">
          Domaine
        </div>

        <div className="bg-white border border-[#E8DDD0] rounded-sm p-10">
          {!email ? (
            <>
              <h1 className="font-serif text-2xl text-[#2C1A08] mb-4">Unsubscribe</h1>
              <p className="text-[#9C8878] text-sm leading-relaxed mb-6">
                To unsubscribe from our emails, please use the unsubscribe link in any email we have sent you.
              </p>
              <Link href="/" className="text-[#B8894A] text-sm hover:underline">
                Return to home
              </Link>
            </>
          ) : status === 'loading' ? (
            <>
              <div className="w-8 h-8 border-2 border-[#E8DDD0] border-t-[#B8894A] rounded-full animate-spin mx-auto mb-6" />
              <p className="text-[#9C8878] text-sm">Processing your request...</p>
            </>
          ) : status === 'success' ? (
            <>
              <div className="w-12 h-12 bg-[#EDF7F2] border border-[#A8D5BC] rounded-full flex items-center justify-center mx-auto mb-6">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M4 10l4 4 8-8" stroke="#2D6A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h1 className="font-serif text-2xl text-[#2C1A08] mb-3">You have been unsubscribed</h1>
              <p className="text-[#9C8878] text-sm leading-relaxed mb-2">
                <strong className="text-[#5C3D1E]">{email}</strong> has been removed from all marketing emails.
              </p>
              <p className="text-[#9C8878] text-sm leading-relaxed mb-8">
                You will no longer receive property alerts, market reports, or nurture emails from us. Transactional emails (booking confirmations) may still be sent.
              </p>
              <Link href="/" className="text-[#B8894A] text-sm hover:underline">
                Return to home
              </Link>
            </>
          ) : (
            <>
              <h1 className="font-serif text-2xl text-[#2C1A08] mb-3">Something went wrong</h1>
              <p className="text-[#9C8878] text-sm leading-relaxed mb-6">
                We could not process your request. Please reply to any of our emails and we will remove you manually within 24 hours.
              </p>
              <Link href="/" className="text-[#B8894A] text-sm hover:underline">
                Return to home
              </Link>
            </>
          )}
        </div>

        <p className="text-[#9C8878] text-xs mt-8">
          &copy; {new Date().getFullYear()} Domaine Real Estate. All rights reserved.
        </p>
      </div>
    </main>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#FAF7F2] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#E8DDD0] border-t-[#B8894A] rounded-full animate-spin" />
      </main>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
