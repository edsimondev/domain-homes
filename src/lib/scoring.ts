/**
 * lib/scoring.ts — Unified Lead Scorer
 *
 * Single source of truth for lead quality.
 * Used by: /api/leads (form), /api/chat (AI chat), and anywhere else a lead is created.
 *
 * Scoring model (BANT-inspired):
 *   Contact info  — required minimum, weighted heavily
 *   Budget        — defined budget signals intent
 *   Location      — specific location signals seriousness
 *   Timeline      — urgency multiplier
 *   Property type — signals they know what they want
 *   Name          — basic qualification
 *
 * Thresholds:
 *   HOT  ≥ 8 pts  — ready to act, has contact + budget + timeline
 *   WARM ≥ 4 pts  — interested, some info provided
 *   COLD < 4 pts  — early stage, just browsing
 */

import type { LeadScore } from '@/types'

interface ScoringInput {
  name?:               string | null
  email?:              string | null
  phone?:              string | null
  budget_min?:         number | null
  budget_max?:         number | null
  preferred_location?: string | null
  property_type?:      string | null
  timeline?:           string | null
  listing_type?:       string | null
  message?:            string | null
}

export function scoreLead(data: ScoringInput): LeadScore {
  let score = 0

  // ── Contact info ──────────────────────────────────────────
  // Both email AND phone = highly qualified, more likely to be real
  if (data.email && data.phone) score += 4
  else if (data.email)          score += 2
  else if (data.phone)          score += 1

  // ── Budget ────────────────────────────────────────────────
  // Having ANY budget defined shows they've thought about it
  if (data.budget_max || data.budget_min) score += 2

  // ── Location ──────────────────────────────────────────────
  // Specific location = they know what they want
  if (data.preferred_location && data.preferred_location.length > 2) score += 2

  // ── Timeline (urgency multiplier) ────────────────────────
  if (data.timeline) {
    const t = data.timeline.toLowerCase()
    if (
      t.includes('asap') ||
      t.includes('immediately') ||
      t.includes('urgent') ||
      t.includes('1 month') ||
      t.includes('one month') ||
      t.includes('this month')
    ) {
      score += 4   // Very urgent
    } else if (
      t.includes('3 month') ||
      t.includes('three month') ||
      t.includes('soon') ||
      t.includes('quarter')
    ) {
      score += 2   // Moderate urgency
    } else {
      score += 1   // Some timeline defined
    }
  }

  // ── Property type ─────────────────────────────────────────
  if (data.property_type) score += 1

  // ── Name ─────────────────────────────────────────────────
  if (data.name && data.name.trim().length > 1) score += 1

  // ── Message quality bonus ─────────────────────────────────
  // A detailed message suggests genuine intent
  if (data.message && data.message.trim().length > 50) score += 1

  // ── Thresholds ────────────────────────────────────────────
  if (score >= 8) return 'hot'
  if (score >= 4) return 'warm'
  return 'cold'
}
