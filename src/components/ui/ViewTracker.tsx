'use client'

import { useEffect } from 'react'

interface ViewTrackerProps {
  type: 'listing' | 'blog'
  id: string
}

export default function ViewTracker({ type, id }: ViewTrackerProps) {
  useEffect(() => {
    // Fire and forget — never blocks rendering
    fetch('/api/analytics/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, id }),
    }).catch(() => {})
  }, [type, id])

  return null
}
