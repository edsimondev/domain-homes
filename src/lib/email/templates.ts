// ============================================================
// EMAIL ENGINE
// Primary:  Plunk  — free tier, no domain verification needed
// Fallback: Resend — used if PLUNK_API_KEY is not set
// ============================================================
import type { Lead } from '@/types'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || process.env.PLUNK_FROM_EMAIL || 'noreply@example.com'
const SITE_NAME  = process.env.NEXT_PUBLIC_SITE_NAME || 'Domaine'
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL  || 'https://domaine.com'

// ─── Unified send function — tries Plunk first, falls back to Resend ──────────
async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  const plunkKey  = process.env.PLUNK_API_KEY
  const resendKey = process.env.RESEND_API_KEY

  // ── Provider 1: Plunk ─────────────────────────────────────
  if (plunkKey) {
    try {
      const res = await fetch('https://api.useplunk.com/v1/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${plunkKey}`,
        },
        body: JSON.stringify({ to, subject, body: html }),
      })
      if (res.ok) return
      const err = await res.text()
      console.warn('[Email] Plunk failed:', res.status, err)
    } catch (err) {
      console.warn('[Email] Plunk error:', (err as Error).message)
    }
  }

  // ── Provider 2: Resend fallback ───────────────────────────
  if (resendKey) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(resendKey)
      await resend.emails.send({ from: `${SITE_NAME} <${FROM_EMAIL}>`, to, subject, html })
      return
    } catch (err) {
      console.warn('[Email] Resend error:', (err as Error).message)
    }
  }

  console.error('[Email] All providers failed — no email sent to', to)
}

// ─── Brand tokens (mirrors admin UI palette) ──────────────────────────────────
const BRAND = {
  dark:          '#2C1A08',   // deep espresso
  mid:           '#5C3D1E',   // warm brown
  muted:         '#9C8878',   // muted tan
  accent:        '#B8894A',   // gold
  accentLight:   '#F0E6D3',   // pale sand
  bg:            '#FAF7F2',   // off-white page bg
  card:          '#FFFFFF',
  border:        '#E8DDD0',
  success:       '#2D6A4F',
  successBg:     '#EDF7F2',
  successBorder: '#A8D5BC',
  danger:        '#8B2020',
  dangerBg:      '#FBF0F0',
  dangerBorder:  '#DFA8A8',
  warn:          '#7A4F1A',
  warnBg:        '#FEF8EE',
  warnBorder:    '#EFD4A0',
}

// ============================================================
// SHARED BASE TEMPLATE
// ============================================================
function baseTemplate(content: string, preheader = '', isLead = false) {
  const footerNote = isLead
    ? `You are receiving this because you enquired on ${SITE_NAME}. <a href="${SITE_URL}/unsubscribe" style="color:rgba(255,255,255,0.3);">Unsubscribe</a>`
    : `You are receiving this because you are a registered agent on ${SITE_NAME}.`

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${SITE_NAME}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{background:${BRAND.bg};font-family:'Georgia','Times New Roman',serif;color:${BRAND.dark};-webkit-text-size-adjust:100%;}
  .wrapper{max-width:600px;margin:0 auto;padding:32px 16px 48px;}
  .card{background:${BRAND.card};border-radius:3px;overflow:hidden;border:1px solid ${BRAND.border};}
  .header{background:${BRAND.dark};padding:28px 40px;border-bottom:3px solid ${BRAND.accent};}
  .logo-wordmark{font-family:'Georgia',serif;font-size:20px;font-weight:400;letter-spacing:4px;text-transform:uppercase;color:#FFFFFF;display:block;}
  .logo-tagline{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.accent};margin-top:3px;display:block;}
  .body{padding:40px;}
  h1{font-family:'Georgia',serif;font-size:26px;font-weight:400;color:${BRAND.dark};line-height:1.35;margin-bottom:14px;letter-spacing:-0.3px;}
  h2{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;color:${BRAND.muted};text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;}
  p{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${BRAND.mid};line-height:1.7;margin-bottom:14px;}
  a{color:${BRAND.accent};text-decoration:none;}
  .badge{display:inline-block;padding:5px 14px;border-radius:2px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;}
  .badge-hot{background:${BRAND.dangerBg};color:${BRAND.danger};border:1px solid ${BRAND.dangerBorder};}
  .badge-warm{background:${BRAND.warnBg};color:${BRAND.warn};border:1px solid ${BRAND.warnBorder};}
  .badge-cold{background:${BRAND.accentLight};color:${BRAND.muted};border:1px solid ${BRAND.border};}
  .badge-new{background:${BRAND.accentLight};color:${BRAND.mid};border:1px solid ${BRAND.border};}
  .badge-match{background:${BRAND.successBg};color:${BRAND.success};border:1px solid ${BRAND.successBorder};}
  .badge-confirmed{background:${BRAND.successBg};color:${BRAND.success};border:1px solid ${BRAND.successBorder};}
  .data-table{width:100%;border-collapse:collapse;margin:20px 0;}
  .data-table td{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;padding:11px 0;border-bottom:1px solid ${BRAND.border};vertical-align:top;line-height:1.5;}
  .data-table tr:last-child td{border-bottom:none;}
  .data-label{color:${BRAND.muted};font-weight:500;width:140px;padding-right:16px;white-space:nowrap;}
  .data-value{color:${BRAND.dark};font-weight:500;}
  .rule{height:1px;background:${BRAND.border};margin:28px 0;}
  .rule-accent{height:2px;background:${BRAND.accent};width:40px;margin:0 0 24px;}
  .section-title{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${BRAND.muted};margin-bottom:14px;margin-top:28px;}
  .btn{display:inline-block;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:2px;margin-right:10px;margin-bottom:10px;}
  .btn-primary{background:${BRAND.dark};color:#FFFFFF !important;}
  .btn-outline{background:transparent;color:${BRAND.dark} !important;border:1px solid ${BRAND.dark};}
  .btn-row{margin:24px 0 4px;}
  .callout{border-left:3px solid ${BRAND.accent};background:${BRAND.accentLight};padding:16px 20px;border-radius:0 2px 2px 0;margin:20px 0;}
  .callout p{margin:0;font-size:14px;color:${BRAND.mid};line-height:1.6;}
  .callout-label{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND.accent};margin-bottom:8px;}
  .ai-box{background:${BRAND.accentLight};border:1px solid ${BRAND.border};border-top:3px solid ${BRAND.accent};padding:20px 24px;margin:20px 0;border-radius:2px;}
  .ai-label{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND.accent};margin-bottom:10px;}
  .ai-box p{color:${BRAND.mid};font-size:14px;line-height:1.7;margin:0;}
  .alert-bar{background:${BRAND.dangerBg};border-left:3px solid ${BRAND.danger};padding:14px 18px;border-radius:0 2px 2px 0;margin-bottom:24px;}
  .alert-bar p{margin:0;font-size:13px;color:${BRAND.danger};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-weight:500;line-height:1.5;}
  .success-bar{background:${BRAND.successBg};border-left:3px solid ${BRAND.success};padding:14px 18px;border-radius:0 2px 2px 0;margin:20px 0;}
  .success-bar p{margin:0;font-size:13px;color:${BRAND.success};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;line-height:1.5;}
  .step{display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;}
  .step-num{font-family:'Georgia',serif;font-size:18px;color:${BRAND.accent};line-height:1;min-width:22px;padding-top:1px;}
  .step-text{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${BRAND.mid};line-height:1.6;}
  .step-text strong{color:${BRAND.dark};}
  .listing-card{border:1px solid ${BRAND.border};border-radius:2px;overflow:hidden;margin:20px 0;}
  .listing-img{width:100%;height:200px;object-fit:cover;display:block;background:${BRAND.accentLight};}
  .listing-body{padding:20px 24px;}
  .listing-price{font-family:'Georgia',serif;font-size:24px;font-weight:400;color:${BRAND.dark};margin-bottom:4px;}
  .listing-title{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${BRAND.mid};margin-bottom:8px;}
  .listing-meta{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${BRAND.muted};letter-spacing:0.5px;}
  .stats-grid{width:100%;border-collapse:collapse;margin:20px 0;}
  .stats-grid td{width:50%;padding:20px 16px;text-align:center;border:1px solid ${BRAND.border};background:${BRAND.accentLight};vertical-align:middle;}
  .stat-num{font-family:'Georgia',serif;font-size:28px;color:${BRAND.dark};display:block;margin-bottom:4px;}
  .stat-label{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:${BRAND.muted};letter-spacing:1px;text-transform:uppercase;}
  .footer{padding:24px 40px;background:${BRAND.dark};text-align:center;}
  .footer p{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.35);margin:0;line-height:1.8;}
  .footer a{color:${BRAND.accent};text-decoration:none;}
  .footer-rule{height:1px;background:rgba(255,255,255,0.08);margin:12px 0;}
  @media(max-width:480px){
    .body{padding:28px 20px;}
    .header{padding:22px 20px;}
    .footer{padding:20px;}
    h1{font-size:22px;}
    .btn{display:block;text-align:center;margin-right:0;}
  }
</style>
</head>
<body>
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#FAF7F2;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
<div class="wrapper">
  <div class="card">
    <div class="header">
      <span class="logo-wordmark">${SITE_NAME}</span>
      <span class="logo-tagline">Real Estate</span>
    </div>
    <div class="body">${content}</div>
    <div class="footer">
      <p>${SITE_NAME} &nbsp;&middot;&nbsp; <a href="${SITE_URL}/admin">Admin Dashboard</a> &nbsp;&middot;&nbsp; <a href="${SITE_URL}">Website</a></p>
      <div class="footer-rule"></div>
      <p>${footerNote}<br>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
    </div>
  </div>
</div>
</body>
</html>`
}

// ============================================================
// 1. INSTANT AGENT ALERT EMAIL
// ============================================================
export async function sendInstantLeadAlert(lead: Lead & {
  ai_suggested_reply?: string
  matched_listings?: { title: string; price: number; slug: string }[]
}) {
  const agentEmail = process.env.AGENT_NOTIFICATION_EMAIL
  if (!agentEmail || !process.env.RESEND_API_KEY) return

  const scoreLabel = { hot: 'Hot Lead', warm: 'Warm Lead', cold: 'New Lead' }[lead.lead_score] ?? 'New Lead'
  const adminUrl   = `${SITE_URL}/admin/leads`
  const calUrl     = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || `${SITE_URL}/contact`

  const budgetText = lead.budget_min && lead.budget_max
    ? `$${lead.budget_min.toLocaleString()} \u2013 $${lead.budget_max.toLocaleString()}`
    : lead.budget_max ? `Up to $${lead.budget_max.toLocaleString()}` : 'Not specified'

  const matchedHtml = lead.matched_listings?.length ? `
    <div class="rule"></div>
    <p class="section-title">Matching Properties (${lead.matched_listings.length})</p>
    <p>The following listings from your portfolio align with what this lead described.</p>
    ${lead.matched_listings.slice(0, 3).map(l => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border:1px solid ${BRAND.border};">
        <tr>
          <td style="padding:14px 16px;">
            <div style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND.dark};">${l.title}</div>
            <div style="font-family:'Georgia',serif;font-size:16px;color:${BRAND.accent};margin-top:3px;">$${l.price.toLocaleString()}</div>
          </td>
          <td style="padding:14px 16px;text-align:right;">
            <a href="${SITE_URL}/property/${l.slug}" class="btn btn-outline" style="font-size:11px;padding:10px 18px;">View listing</a>
          </td>
        </tr>
      </table>`).join('')}` : ''

  const content = `
    <span class="badge badge-${lead.lead_score}">${scoreLabel}</span>
    <h1>A new lead just came in</h1>
    <div class="alert-bar">
      <p>Research shows that responding within 5 minutes increases conversion by up to 400%. This alert was sent the moment the lead was captured.</p>
    </div>
    <div class="rule-accent"></div>
    <p class="section-title" style="margin-top:0;">Contact Details</p>
    <table class="data-table">
      <tr><td class="data-label">Name</td><td class="data-value">${lead.name || 'Not provided'}</td></tr>
      <tr><td class="data-label">Email</td><td class="data-value">${lead.email ? `<a href="mailto:${lead.email}">${lead.email}</a>` : 'Not provided'}</td></tr>
      <tr><td class="data-label">Phone</td><td class="data-value">${lead.phone ? `<a href="tel:${lead.phone}">${lead.phone}</a>` : 'Not provided'}</td></tr>
    </table>
    <p class="section-title">Enquiry Details</p>
    <table class="data-table">
      <tr><td class="data-label">Budget</td><td class="data-value">${budgetText}</td></tr>
      <tr><td class="data-label">Location</td><td class="data-value">${lead.preferred_location || 'Not specified'}</td></tr>
      <tr><td class="data-label">Property type</td><td class="data-value">${lead.property_type ? lead.property_type.charAt(0).toUpperCase() + lead.property_type.slice(1) : 'Not specified'}</td></tr>
      <tr><td class="data-label">Timeline</td><td class="data-value">${lead.timeline || 'Not specified'}</td></tr>
      <tr><td class="data-label">Looking to</td><td class="data-value">${lead.listing_type === 'rent' ? 'Rent' : lead.listing_type === 'sale' ? 'Buy' : 'Not specified'}</td></tr>
      <tr><td class="data-label">Source</td><td class="data-value">${lead.source === 'ai_chat' ? 'AI Chat' : lead.source === 'contact_form' ? 'Contact Form' : lead.source || 'Website'}</td></tr>
    </table>
    ${lead.message ? `
    <div class="callout">
      <div class="callout-label">Their Message</div>
      <p style="font-style:italic;">&ldquo;${lead.message}&rdquo;</p>
    </div>` : ''}
    ${lead.ai_suggested_reply ? `
    <div class="ai-box">
      <div class="ai-label">AI &mdash; Suggested Opening Reply</div>
      <p>${lead.ai_suggested_reply}</p>
    </div>` : ''}
    ${matchedHtml}
    <div class="rule"></div>
    <p class="section-title">Recommended Next Steps</p>
    <div class="step"><div class="step-num">1</div><div class="step-text"><strong>Reply immediately</strong> &mdash; send the suggested reply above or call them directly. Speed is your biggest advantage.</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text"><strong>Within one hour</strong> &mdash; if no response, follow up with a brief text message.</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text"><strong>Tomorrow onward</strong> &mdash; the automated nurture sequence handles follow-ups if no booking has been made.</div></div>
    <div class="btn-row">
      <a href="mailto:${lead.email || ''}" class="btn btn-primary">Reply to Lead</a>
      <a href="${calUrl}" class="btn btn-outline">Share Booking Link</a>
      <a href="${adminUrl}" class="btn btn-outline">Open Dashboard</a>
    </div>`

  await sendEmail({ to: agentEmail, subject: `${scoreLabel}: ${lead.name || 'New enquiry'} \u2014 ${lead.preferred_location || 'Location TBC'} \u00B7 ${budgetText}`, html: baseTemplate(content, `${lead.lead_score === 'hot' ? 'Hot lead' : 'New lead'} from ${lead.name || 'a visitor'} \u2014 budget ${budgetText}`, false) })
}

// ============================================================
// 2. NURTURE SEQUENCE EMAIL (AI-written body, sent to lead)
// ============================================================
export async function sendNurtureEmail({
  to, subject, leadName, bodyHtml, ctaText, ctaUrl, preheader,
}: {
  to: string; subject: string; leadName: string; bodyHtml: string
  ctaText?: string; ctaUrl?: string; preheader?: string
}) {
  if (!process.env.PLUNK_API_KEY && !process.env.RESEND_API_KEY) return
  const content = `
    <h1>Hello, ${leadName}</h1>
    ${bodyHtml}
    ${ctaText && ctaUrl ? `<div class="btn-row"><a href="${ctaUrl}" class="btn btn-primary">${ctaText}</a></div>` : ''}
    <div class="rule"></div>
    <p style="font-size:12px;color:${BRAND.muted};">You are receiving this because you enquired about a property on ${SITE_NAME}. <a href="${SITE_URL}/unsubscribe" style="color:${BRAND.muted};">Unsubscribe</a></p>`
  return sendEmail({ to, subject, html: baseTemplate(content, preheader, true) })
}

// ============================================================
// 3. PROPERTY MATCH ALERT (new listing matches a lead)
// ============================================================
export async function sendPropertyMatchEmail({
  to, leadName, listing, matchReason,
}: {
  to: string; leadName: string
  listing: { title: string; price: number; listing_type: string; bedrooms: number; bathrooms: number; city: string; state: string; slug: string; cover_image?: string; square_footage?: number }
  matchReason: string
}) {
  if (!process.env.PLUNK_API_KEY && !process.env.RESEND_API_KEY) return
  const priceText = listing.listing_type === 'rent' ? `$${listing.price.toLocaleString()} / month` : `$${listing.price.toLocaleString()}`
  const propertyUrl = `${SITE_URL}/property/${listing.slug}`
  const calUrl = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || `${SITE_URL}/contact`
  const content = `
    <span class="badge badge-match">New Match</span>
    <h1>We found a property for you, ${leadName}</h1>
    <p>Based on your search criteria, we believe you will want to see this one.</p>
    <div class="ai-box">
      <div class="ai-label">Why this matches your search</div>
      <p>${matchReason}</p>
    </div>
    <div class="listing-card">
      ${listing.cover_image ? `<img src="${listing.cover_image}" alt="${listing.title}" class="listing-img" />` : `<div class="listing-img" style="display:flex;align-items:center;justify-content:center;"><span style="font-family:'Georgia',serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.muted};">${SITE_NAME}</span></div>`}
      <div class="listing-body">
        <div class="listing-price">${priceText}</div>
        <div class="listing-title">${listing.title}</div>
        <div class="listing-meta">${listing.bedrooms} bed &middot; ${listing.bathrooms} bath${listing.square_footage ? ` &middot; ${listing.square_footage.toLocaleString()} sq ft` : ''} &middot; ${listing.city}, ${listing.state}</div>
        <div class="btn-row" style="margin-top:16px;">
          <a href="${propertyUrl}" class="btn btn-primary">View Property</a>
          <a href="${calUrl}" class="btn btn-outline">Book a Viewing</a>
        </div>
      </div>
    </div>
    <p>Properties at this level do not remain available for long. We recommend booking a viewing at your earliest convenience.</p>
    <div class="rule"></div>
    <p style="font-size:12px;color:${BRAND.muted};">You are receiving this because you enquired about properties on ${SITE_NAME}. <a href="${SITE_URL}/unsubscribe" style="color:${BRAND.muted};">Unsubscribe</a></p>`
  return sendEmail({ to, subject: `A new listing matches your search \u2014 ${listing.title}`, html: baseTemplate(content, `We just listed a ${listing.bedrooms}-bedroom in ${listing.city} that fits what you described`, true) })
}

// ============================================================
// 4. BOOKING CONFIRMATION
// ============================================================
export async function sendBookingConfirmation({
  to, leadName, dateTime, listingTitle, agentName, agentEmail,
}: {
  to: string; leadName: string; dateTime: string
  listingTitle?: string; agentName?: string; agentEmail?: string
}) {
  if (!process.env.PLUNK_API_KEY && !process.env.RESEND_API_KEY) return
  const content = `
    <span class="badge badge-confirmed">Viewing Confirmed</span>
    <h1>Your viewing is confirmed, ${leadName}</h1>
    <p>We look forward to showing you the property. Here are your booking details.</p>
    <div class="rule-accent"></div>
    <table class="data-table">
      <tr><td class="data-label">Date &amp; Time</td><td class="data-value" style="font-family:'Georgia',serif;font-size:16px;color:${BRAND.accent};">${dateTime}</td></tr>
      ${listingTitle ? `<tr><td class="data-label">Property</td><td class="data-value">${listingTitle}</td></tr>` : ''}
      ${agentName ? `<tr><td class="data-label">Your Agent</td><td class="data-value">${agentName}</td></tr>` : ''}
      ${agentEmail ? `<tr><td class="data-label">Agent Contact</td><td class="data-value"><a href="mailto:${agentEmail}">${agentEmail}</a></td></tr>` : ''}
    </table>
    <div class="callout">
      <div class="callout-label">Before your visit</div>
      <p>If you are seriously considering this property, having identification and proof of funds or mortgage pre-approval on hand can significantly speed up the process.</p>
    </div>
    <div class="btn-row">
      <a href="${SITE_URL}/listings" class="btn btn-primary">Browse More Properties</a>
    </div>
    <div class="rule"></div>
    <p style="font-size:12px;color:${BRAND.muted};">Need to reschedule? Reply to this email or contact your agent directly.</p>`
  return sendEmail({ to, subject: `Viewing confirmed \u2014 ${dateTime}${listingTitle ? ` \u00B7 ${listingTitle}` : ''}`, html: baseTemplate(content, `Your property viewing is confirmed for ${dateTime}`, true) })
}

// ============================================================
// 5. WEEKLY MARKET REPORT
// ============================================================
export async function sendWeeklyMarketReport({
  to, leadName, city, stats, newListings,
}: {
  to: string; leadName: string; city: string
  stats: { new_listings: number; avg_price: number; price_change: number; days_on_market: number }
  newListings: { title: string; price: number; slug: string; listing_type: string }[]
}) {
  if (!process.env.PLUNK_API_KEY && !process.env.RESEND_API_KEY) return
  const priceChangeColor   = stats.price_change >= 0 ? BRAND.success : BRAND.danger
  const priceChangeSuffix  = stats.price_change >= 0 ? 'up' : 'down'
  const content = `
    <span class="badge badge-new">Market Report</span>
    <h1>${city} \u2014 Weekly Market Briefing</h1>
    <p>Hello ${leadName}, here is a summary of what happened in the <strong>${city}</strong> real estate market this week.</p>
    <div class="rule-accent"></div>
    <table class="stats-grid" cellpadding="0" cellspacing="0">
      <tr>
        <td><span class="stat-num">${stats.new_listings}</span><span class="stat-label">New Listings</span></td>
        <td><span class="stat-num">$${Math.round(stats.avg_price / 1000)}K</span><span class="stat-label">Average Price</span></td>
      </tr>
      <tr>
        <td><span class="stat-num" style="color:${priceChangeColor};">${Math.abs(stats.price_change)}%</span><span class="stat-label">Prices ${priceChangeSuffix} this week</span></td>
        <td><span class="stat-num">${stats.days_on_market}</span><span class="stat-label">Avg. Days on Market</span></td>
      </tr>
    </table>
    ${newListings.length > 0 ? `
    <p class="section-title">New This Week in ${city}</p>
    ${newListings.slice(0, 3).map(l => `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border:1px solid ${BRAND.border};">
        <tr>
          <td style="padding:14px 16px;">
            <div style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${BRAND.dark};font-weight:600;">${l.title}</div>
            <div style="font-family:'Georgia',serif;font-size:16px;color:${BRAND.accent};margin-top:3px;">$${l.price.toLocaleString()}${l.listing_type === 'rent' ? ' / mo' : ''}</div>
          </td>
          <td style="padding:14px 16px;text-align:right;">
            <a href="${SITE_URL}/property/${l.slug}" class="btn btn-outline" style="font-size:11px;padding:10px 18px;">View</a>
          </td>
        </tr>
      </table>`).join('')}` : ''}
    <div class="btn-row">
      <a href="${SITE_URL}/listings?city=${encodeURIComponent(city)}" class="btn btn-primary">Browse All ${city} Listings</a>
    </div>
    <div class="rule"></div>
    <p style="font-size:12px;color:${BRAND.muted};">You are receiving this weekly update because you searched for properties in ${city} on ${SITE_NAME}. <a href="${SITE_URL}/unsubscribe" style="color:${BRAND.muted};">Unsubscribe</a></p>`
  return sendEmail({ to, subject: `${city} Market Report \u2014 ${stats.new_listings} new listings this week`, html: baseTemplate(content, `${stats.new_listings} new listings in ${city} \u00B7 Avg. $${Math.round(stats.avg_price / 1000)}K`, true) })
}

// ============================================================
// 6. LEAD CONFIRMATION (sent to visitor after enquiry)
// ============================================================
export async function sendLeadConfirmation({
  to, leadName, source, budget_max, preferred_location, property_type, message, listing_title,
}: {
  to: string; leadName: string; source: string
  budget_max?: number | null; preferred_location?: string | null
  property_type?: string | null; message?: string | null; listing_title?: string | null
}) {
  if (!process.env.PLUNK_API_KEY && !process.env.RESEND_API_KEY) return
  const sourceLabel =
    source === 'ai_chat'       ? 'chatting with our AI assistant'
    : source === 'contact_form'  ? 'submitting the contact form'
    : source === 'contact_page'  ? 'reaching out on our contact page'
    : 'getting in touch'
  const summaryRows = [
    preferred_location && `<tr><td class="data-label">Location</td><td class="data-value">${preferred_location}</td></tr>`,
    property_type      && `<tr><td class="data-label">Property type</td><td class="data-value">${property_type.charAt(0).toUpperCase() + property_type.slice(1)}</td></tr>`,
    budget_max         && `<tr><td class="data-label">Budget</td><td class="data-value">Up to $${budget_max.toLocaleString()}</td></tr>`,
    listing_title      && `<tr><td class="data-label">Enquiry about</td><td class="data-value">${listing_title}</td></tr>`,
    message            && `<tr><td class="data-label">Your message</td><td class="data-value" style="font-style:italic;">&ldquo;${message.slice(0, 120)}${message.length > 120 ? '&hellip;' : ''}&rdquo;</td></tr>`,
  ].filter(Boolean).join('')
  const content = `
    <span class="badge badge-new">Enquiry Received</span>
    <h1>Thank you, ${leadName}</h1>
    <p>We have received your enquiry. Thank you for ${sourceLabel} &mdash; one of our agents will review your requirements and be in touch within <strong>24 hours</strong>.</p>
    ${summaryRows ? `
    <div class="rule-accent"></div>
    <p class="section-title" style="margin-top:0;">Your Enquiry Summary</p>
    <table class="data-table">${summaryRows}</table>` : ''}
    <div class="success-bar">
      <p>While you wait, feel free to <a href="${SITE_URL}/listings" style="color:${BRAND.success};font-weight:600;">browse our current listings</a> &mdash; new properties are added regularly.</p>
    </div>
    <div class="btn-row">
      <a href="${SITE_URL}/listings" class="btn btn-primary">Browse Listings</a>
      <a href="${SITE_URL}/contact" class="btn btn-outline">Contact Us</a>
    </div>
    <div class="rule"></div>
    <p style="font-size:12px;color:${BRAND.muted};">You are receiving this because you enquired on ${SITE_NAME}. If this was not you, please disregard this email.</p>`
  return sendEmail({ to, subject: `We received your message \u2014 we will be in touch soon`, html: baseTemplate(content, 'We have received your enquiry and will be in touch within 24 hours', true) })
}


// // ============================================================
// // EMAIL ENGINE — Powered by Resend (free tier: 3,000/mo)
// // ============================================================
// import { Resend } from 'resend'
// import type { Lead } from '@/types'

// const resend = new Resend(process.env.RESEND_API_KEY)

// const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev'
// const SITE_NAME  = process.env.NEXT_PUBLIC_SITE_NAME || 'Domaine'
// const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL  || 'https://domaine.com'

// // ─── Brand tokens (mirrors admin UI palette) ──────────────────────────────────
// const BRAND = {
//   dark:          '#2C1A08',   // deep espresso
//   mid:           '#5C3D1E',   // warm brown
//   muted:         '#9C8878',   // muted tan
//   accent:        '#B8894A',   // gold
//   accentLight:   '#F0E6D3',   // pale sand
//   bg:            '#FAF7F2',   // off-white page bg
//   card:          '#FFFFFF',
//   border:        '#E8DDD0',
//   success:       '#2D6A4F',
//   successBg:     '#EDF7F2',
//   successBorder: '#A8D5BC',
//   danger:        '#8B2020',
//   dangerBg:      '#FBF0F0',
//   dangerBorder:  '#DFA8A8',
//   warn:          '#7A4F1A',
//   warnBg:        '#FEF8EE',
//   warnBorder:    '#EFD4A0',
// }

// // ============================================================
// // SHARED BASE TEMPLATE
// // ============================================================
// function baseTemplate(content: string, preheader = '', isLead = false) {
//   const footerNote = isLead
//     ? `You are receiving this because you enquired on ${SITE_NAME}. <a href="${SITE_URL}/unsubscribe" style="color:rgba(255,255,255,0.3);">Unsubscribe</a>`
//     : `You are receiving this because you are a registered agent on ${SITE_NAME}.`

//   return `<!DOCTYPE html>
// <html lang="en" xmlns="http://www.w3.org/1999/xhtml">
// <head>
// <meta charset="UTF-8" />
// <meta name="viewport" content="width=device-width, initial-scale=1.0" />
// <title>${SITE_NAME}</title>
// <style>
//   *{box-sizing:border-box;margin:0;padding:0;}
//   body{background:${BRAND.bg};font-family:'Georgia','Times New Roman',serif;color:${BRAND.dark};-webkit-text-size-adjust:100%;}
//   .wrapper{max-width:600px;margin:0 auto;padding:32px 16px 48px;}
//   .card{background:${BRAND.card};border-radius:3px;overflow:hidden;border:1px solid ${BRAND.border};}
//   .header{background:${BRAND.dark};padding:28px 40px;border-bottom:3px solid ${BRAND.accent};}
//   .logo-wordmark{font-family:'Georgia',serif;font-size:20px;font-weight:400;letter-spacing:4px;text-transform:uppercase;color:#FFFFFF;display:block;}
//   .logo-tagline{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${BRAND.accent};margin-top:3px;display:block;}
//   .body{padding:40px;}
//   h1{font-family:'Georgia',serif;font-size:26px;font-weight:400;color:${BRAND.dark};line-height:1.35;margin-bottom:14px;letter-spacing:-0.3px;}
//   h2{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;color:${BRAND.muted};text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;}
//   p{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${BRAND.mid};line-height:1.7;margin-bottom:14px;}
//   a{color:${BRAND.accent};text-decoration:none;}
//   .badge{display:inline-block;padding:5px 14px;border-radius:2px;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:20px;}
//   .badge-hot{background:${BRAND.dangerBg};color:${BRAND.danger};border:1px solid ${BRAND.dangerBorder};}
//   .badge-warm{background:${BRAND.warnBg};color:${BRAND.warn};border:1px solid ${BRAND.warnBorder};}
//   .badge-cold{background:${BRAND.accentLight};color:${BRAND.muted};border:1px solid ${BRAND.border};}
//   .badge-new{background:${BRAND.accentLight};color:${BRAND.mid};border:1px solid ${BRAND.border};}
//   .badge-match{background:${BRAND.successBg};color:${BRAND.success};border:1px solid ${BRAND.successBorder};}
//   .badge-confirmed{background:${BRAND.successBg};color:${BRAND.success};border:1px solid ${BRAND.successBorder};}
//   .data-table{width:100%;border-collapse:collapse;margin:20px 0;}
//   .data-table td{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;padding:11px 0;border-bottom:1px solid ${BRAND.border};vertical-align:top;line-height:1.5;}
//   .data-table tr:last-child td{border-bottom:none;}
//   .data-label{color:${BRAND.muted};font-weight:500;width:140px;padding-right:16px;white-space:nowrap;}
//   .data-value{color:${BRAND.dark};font-weight:500;}
//   .rule{height:1px;background:${BRAND.border};margin:28px 0;}
//   .rule-accent{height:2px;background:${BRAND.accent};width:40px;margin:0 0 24px;}
//   .section-title{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:${BRAND.muted};margin-bottom:14px;margin-top:28px;}
//   .btn{display:inline-block;font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;text-decoration:none;padding:14px 28px;border-radius:2px;margin-right:10px;margin-bottom:10px;}
//   .btn-primary{background:${BRAND.dark};color:#FFFFFF !important;}
//   .btn-outline{background:transparent;color:${BRAND.dark} !important;border:1px solid ${BRAND.dark};}
//   .btn-row{margin:24px 0 4px;}
//   .callout{border-left:3px solid ${BRAND.accent};background:${BRAND.accentLight};padding:16px 20px;border-radius:0 2px 2px 0;margin:20px 0;}
//   .callout p{margin:0;font-size:14px;color:${BRAND.mid};line-height:1.6;}
//   .callout-label{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND.accent};margin-bottom:8px;}
//   .ai-box{background:${BRAND.accentLight};border:1px solid ${BRAND.border};border-top:3px solid ${BRAND.accent};padding:20px 24px;margin:20px 0;border-radius:2px;}
//   .ai-label{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${BRAND.accent};margin-bottom:10px;}
//   .ai-box p{color:${BRAND.mid};font-size:14px;line-height:1.7;margin:0;}
//   .alert-bar{background:${BRAND.dangerBg};border-left:3px solid ${BRAND.danger};padding:14px 18px;border-radius:0 2px 2px 0;margin-bottom:24px;}
//   .alert-bar p{margin:0;font-size:13px;color:${BRAND.danger};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-weight:500;line-height:1.5;}
//   .success-bar{background:${BRAND.successBg};border-left:3px solid ${BRAND.success};padding:14px 18px;border-radius:0 2px 2px 0;margin:20px 0;}
//   .success-bar p{margin:0;font-size:13px;color:${BRAND.success};font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;line-height:1.5;}
//   .step{display:flex;gap:14px;margin-bottom:14px;align-items:flex-start;}
//   .step-num{font-family:'Georgia',serif;font-size:18px;color:${BRAND.accent};line-height:1;min-width:22px;padding-top:1px;}
//   .step-text{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${BRAND.mid};line-height:1.6;}
//   .step-text strong{color:${BRAND.dark};}
//   .listing-card{border:1px solid ${BRAND.border};border-radius:2px;overflow:hidden;margin:20px 0;}
//   .listing-img{width:100%;height:200px;object-fit:cover;display:block;background:${BRAND.accentLight};}
//   .listing-body{padding:20px 24px;}
//   .listing-price{font-family:'Georgia',serif;font-size:24px;font-weight:400;color:${BRAND.dark};margin-bottom:4px;}
//   .listing-title{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:15px;color:${BRAND.mid};margin-bottom:8px;}
//   .listing-meta{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:12px;color:${BRAND.muted};letter-spacing:0.5px;}
//   .stats-grid{width:100%;border-collapse:collapse;margin:20px 0;}
//   .stats-grid td{width:50%;padding:20px 16px;text-align:center;border:1px solid ${BRAND.border};background:${BRAND.accentLight};vertical-align:middle;}
//   .stat-num{font-family:'Georgia',serif;font-size:28px;color:${BRAND.dark};display:block;margin-bottom:4px;}
//   .stat-label{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:${BRAND.muted};letter-spacing:1px;text-transform:uppercase;}
//   .footer{padding:24px 40px;background:${BRAND.dark};text-align:center;}
//   .footer p{font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:11px;color:rgba(255,255,255,0.35);margin:0;line-height:1.8;}
//   .footer a{color:${BRAND.accent};text-decoration:none;}
//   .footer-rule{height:1px;background:rgba(255,255,255,0.08);margin:12px 0;}
//   @media(max-width:480px){
//     .body{padding:28px 20px;}
//     .header{padding:22px 20px;}
//     .footer{padding:20px;}
//     h1{font-size:22px;}
//     .btn{display:block;text-align:center;margin-right:0;}
//   }
// </style>
// </head>
// <body>
// ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#FAF7F2;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;</div>` : ''}
// <div class="wrapper">
//   <div class="card">
//     <div class="header">
//       <span class="logo-wordmark">${SITE_NAME}</span>
//       <span class="logo-tagline">Real Estate</span>
//     </div>
//     <div class="body">${content}</div>
//     <div class="footer">
//       <p>${SITE_NAME} &nbsp;&middot;&nbsp; <a href="${SITE_URL}/admin">Admin Dashboard</a> &nbsp;&middot;&nbsp; <a href="${SITE_URL}">Website</a></p>
//       <div class="footer-rule"></div>
//       <p>${footerNote}<br>&copy; ${new Date().getFullYear()} ${SITE_NAME}. All rights reserved.</p>
//     </div>
//   </div>
// </div>
// </body>
// </html>`
// }

// // ============================================================
// // 1. INSTANT AGENT ALERT EMAIL
// // ============================================================
// export async function sendInstantLeadAlert(lead: Lead & {
//   ai_suggested_reply?: string
//   matched_listings?: { title: string; price: number; slug: string }[]
// }) {
//   const agentEmail = process.env.AGENT_NOTIFICATION_EMAIL
//   if (!agentEmail || !process.env.RESEND_API_KEY) return

//   const scoreLabel = { hot: 'Hot Lead', warm: 'Warm Lead', cold: 'New Lead' }[lead.lead_score] ?? 'New Lead'
//   const adminUrl   = `${SITE_URL}/admin/leads`
//   const calUrl     = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || `${SITE_URL}/contact`

//   const budgetText = lead.budget_min && lead.budget_max
//     ? `$${lead.budget_min.toLocaleString()} \u2013 $${lead.budget_max.toLocaleString()}`
//     : lead.budget_max ? `Up to $${lead.budget_max.toLocaleString()}` : 'Not specified'

//   const matchedHtml = lead.matched_listings?.length ? `
//     <div class="rule"></div>
//     <p class="section-title">Matching Properties (${lead.matched_listings.length})</p>
//     <p>The following listings from your portfolio align with what this lead described.</p>
//     ${lead.matched_listings.slice(0, 3).map(l => `
//       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border:1px solid ${BRAND.border};">
//         <tr>
//           <td style="padding:14px 16px;">
//             <div style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;font-weight:600;color:${BRAND.dark};">${l.title}</div>
//             <div style="font-family:'Georgia',serif;font-size:16px;color:${BRAND.accent};margin-top:3px;">$${l.price.toLocaleString()}</div>
//           </td>
//           <td style="padding:14px 16px;text-align:right;">
//             <a href="${SITE_URL}/property/${l.slug}" class="btn btn-outline" style="font-size:11px;padding:10px 18px;">View listing</a>
//           </td>
//         </tr>
//       </table>`).join('')}` : ''

//   const content = `
//     <span class="badge badge-${lead.lead_score}">${scoreLabel}</span>
//     <h1>A new lead just came in</h1>
//     <div class="alert-bar">
//       <p>Research shows that responding within 5 minutes increases conversion by up to 400%. This alert was sent the moment the lead was captured.</p>
//     </div>
//     <div class="rule-accent"></div>
//     <p class="section-title" style="margin-top:0;">Contact Details</p>
//     <table class="data-table">
//       <tr><td class="data-label">Name</td><td class="data-value">${lead.name || 'Not provided'}</td></tr>
//       <tr><td class="data-label">Email</td><td class="data-value">${lead.email ? `<a href="mailto:${lead.email}">${lead.email}</a>` : 'Not provided'}</td></tr>
//       <tr><td class="data-label">Phone</td><td class="data-value">${lead.phone ? `<a href="tel:${lead.phone}">${lead.phone}</a>` : 'Not provided'}</td></tr>
//     </table>
//     <p class="section-title">Enquiry Details</p>
//     <table class="data-table">
//       <tr><td class="data-label">Budget</td><td class="data-value">${budgetText}</td></tr>
//       <tr><td class="data-label">Location</td><td class="data-value">${lead.preferred_location || 'Not specified'}</td></tr>
//       <tr><td class="data-label">Property type</td><td class="data-value">${lead.property_type ? lead.property_type.charAt(0).toUpperCase() + lead.property_type.slice(1) : 'Not specified'}</td></tr>
//       <tr><td class="data-label">Timeline</td><td class="data-value">${lead.timeline || 'Not specified'}</td></tr>
//       <tr><td class="data-label">Looking to</td><td class="data-value">${lead.listing_type === 'rent' ? 'Rent' : lead.listing_type === 'sale' ? 'Buy' : 'Not specified'}</td></tr>
//       <tr><td class="data-label">Source</td><td class="data-value">${lead.source === 'ai_chat' ? 'AI Chat' : lead.source === 'contact_form' ? 'Contact Form' : lead.source || 'Website'}</td></tr>
//     </table>
//     ${lead.message ? `
//     <div class="callout">
//       <div class="callout-label">Their Message</div>
//       <p style="font-style:italic;">&ldquo;${lead.message}&rdquo;</p>
//     </div>` : ''}
//     ${lead.ai_suggested_reply ? `
//     <div class="ai-box">
//       <div class="ai-label">AI &mdash; Suggested Opening Reply</div>
//       <p>${lead.ai_suggested_reply}</p>
//     </div>` : ''}
//     ${matchedHtml}
//     <div class="rule"></div>
//     <p class="section-title">Recommended Next Steps</p>
//     <div class="step"><div class="step-num">1</div><div class="step-text"><strong>Reply immediately</strong> &mdash; send the suggested reply above or call them directly. Speed is your biggest advantage.</div></div>
//     <div class="step"><div class="step-num">2</div><div class="step-text"><strong>Within one hour</strong> &mdash; if no response, follow up with a brief text message.</div></div>
//     <div class="step"><div class="step-num">3</div><div class="step-text"><strong>Tomorrow onward</strong> &mdash; the automated nurture sequence handles follow-ups if no booking has been made.</div></div>
//     <div class="btn-row">
//       <a href="mailto:${lead.email || ''}" class="btn btn-primary">Reply to Lead</a>
//       <a href="${calUrl}" class="btn btn-outline">Share Booking Link</a>
//       <a href="${adminUrl}" class="btn btn-outline">Open Dashboard</a>
//     </div>`

//   await resend.emails.send({
//     from: `${SITE_NAME} <${FROM_EMAIL}>`,
//     to: agentEmail,
//     subject: `${scoreLabel}: ${lead.name || 'New enquiry'} \u2014 ${lead.preferred_location || 'Location TBC'} \u00B7 ${budgetText}`,
//     html: baseTemplate(content, `${lead.lead_score === 'hot' ? 'Hot lead' : 'New lead'} from ${lead.name || 'a visitor'} \u2014 budget ${budgetText}`, false),
//   })
// }

// // ============================================================
// // 2. NURTURE SEQUENCE EMAIL (AI-written body, sent to lead)
// // ============================================================
// export async function sendNurtureEmail({
//   to, subject, leadName, bodyHtml, ctaText, ctaUrl, preheader,
// }: {
//   to: string; subject: string; leadName: string; bodyHtml: string
//   ctaText?: string; ctaUrl?: string; preheader?: string
// }) {
//   if (!process.env.RESEND_API_KEY) return
//   const content = `
//     <h1>Hello, ${leadName}</h1>
//     ${bodyHtml}
//     ${ctaText && ctaUrl ? `<div class="btn-row"><a href="${ctaUrl}" class="btn btn-primary">${ctaText}</a></div>` : ''}
//     <div class="rule"></div>
//     <p style="font-size:12px;color:${BRAND.muted};">You are receiving this because you enquired about a property on ${SITE_NAME}. <a href="${SITE_URL}/unsubscribe" style="color:${BRAND.muted};">Unsubscribe</a></p>`
//   return resend.emails.send({
//     from: `${SITE_NAME} <${FROM_EMAIL}>`, to, subject,
//     html: baseTemplate(content, preheader, true),
//   })
// }

// // ============================================================
// // 3. PROPERTY MATCH ALERT (new listing matches a lead)
// // ============================================================
// export async function sendPropertyMatchEmail({
//   to, leadName, listing, matchReason,
// }: {
//   to: string; leadName: string
//   listing: { title: string; price: number; listing_type: string; bedrooms: number; bathrooms: number; city: string; state: string; slug: string; cover_image?: string; square_footage?: number }
//   matchReason: string
// }) {
//   if (!process.env.RESEND_API_KEY) return
//   const priceText = listing.listing_type === 'rent' ? `$${listing.price.toLocaleString()} / month` : `$${listing.price.toLocaleString()}`
//   const propertyUrl = `${SITE_URL}/property/${listing.slug}`
//   const calUrl = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || `${SITE_URL}/contact`
//   const content = `
//     <span class="badge badge-match">New Match</span>
//     <h1>We found a property for you, ${leadName}</h1>
//     <p>Based on your search criteria, we believe you will want to see this one.</p>
//     <div class="ai-box">
//       <div class="ai-label">Why this matches your search</div>
//       <p>${matchReason}</p>
//     </div>
//     <div class="listing-card">
//       ${listing.cover_image ? `<img src="${listing.cover_image}" alt="${listing.title}" class="listing-img" />` : `<div class="listing-img" style="display:flex;align-items:center;justify-content:center;"><span style="font-family:'Georgia',serif;font-size:13px;letter-spacing:3px;text-transform:uppercase;color:${BRAND.muted};">${SITE_NAME}</span></div>`}
//       <div class="listing-body">
//         <div class="listing-price">${priceText}</div>
//         <div class="listing-title">${listing.title}</div>
//         <div class="listing-meta">${listing.bedrooms} bed &middot; ${listing.bathrooms} bath${listing.square_footage ? ` &middot; ${listing.square_footage.toLocaleString()} sq ft` : ''} &middot; ${listing.city}, ${listing.state}</div>
//         <div class="btn-row" style="margin-top:16px;">
//           <a href="${propertyUrl}" class="btn btn-primary">View Property</a>
//           <a href="${calUrl}" class="btn btn-outline">Book a Viewing</a>
//         </div>
//       </div>
//     </div>
//     <p>Properties at this level do not remain available for long. We recommend booking a viewing at your earliest convenience.</p>
//     <div class="rule"></div>
//     <p style="font-size:12px;color:${BRAND.muted};">You are receiving this because you enquired about properties on ${SITE_NAME}. <a href="${SITE_URL}/unsubscribe" style="color:${BRAND.muted};">Unsubscribe</a></p>`
//   return resend.emails.send({
//     from: `${SITE_NAME} <${FROM_EMAIL}>`, to,
//     subject: `A new listing matches your search \u2014 ${listing.title}`,
//     html: baseTemplate(content, `We just listed a ${listing.bedrooms}-bedroom in ${listing.city} that fits what you described`, true),
//   })
// }

// // ============================================================
// // 4. BOOKING CONFIRMATION
// // ============================================================
// export async function sendBookingConfirmation({
//   to, leadName, dateTime, listingTitle, agentName, agentEmail,
// }: {
//   to: string; leadName: string; dateTime: string
//   listingTitle?: string; agentName?: string; agentEmail?: string
// }) {
//   if (!process.env.RESEND_API_KEY) return
//   const content = `
//     <span class="badge badge-confirmed">Viewing Confirmed</span>
//     <h1>Your viewing is confirmed, ${leadName}</h1>
//     <p>We look forward to showing you the property. Here are your booking details.</p>
//     <div class="rule-accent"></div>
//     <table class="data-table">
//       <tr><td class="data-label">Date &amp; Time</td><td class="data-value" style="font-family:'Georgia',serif;font-size:16px;color:${BRAND.accent};">${dateTime}</td></tr>
//       ${listingTitle ? `<tr><td class="data-label">Property</td><td class="data-value">${listingTitle}</td></tr>` : ''}
//       ${agentName ? `<tr><td class="data-label">Your Agent</td><td class="data-value">${agentName}</td></tr>` : ''}
//       ${agentEmail ? `<tr><td class="data-label">Agent Contact</td><td class="data-value"><a href="mailto:${agentEmail}">${agentEmail}</a></td></tr>` : ''}
//     </table>
//     <div class="callout">
//       <div class="callout-label">Before your visit</div>
//       <p>If you are seriously considering this property, having identification and proof of funds or mortgage pre-approval on hand can significantly speed up the process.</p>
//     </div>
//     <div class="btn-row">
//       <a href="${SITE_URL}/listings" class="btn btn-primary">Browse More Properties</a>
//     </div>
//     <div class="rule"></div>
//     <p style="font-size:12px;color:${BRAND.muted};">Need to reschedule? Reply to this email or contact your agent directly.</p>`
//   return resend.emails.send({
//     from: `${SITE_NAME} <${FROM_EMAIL}>`, to,
//     subject: `Viewing confirmed \u2014 ${dateTime}${listingTitle ? ` \u00B7 ${listingTitle}` : ''}`,
//     html: baseTemplate(content, `Your property viewing is confirmed for ${dateTime}`, true),
//   })
// }

// // ============================================================
// // 5. WEEKLY MARKET REPORT
// // ============================================================
// export async function sendWeeklyMarketReport({
//   to, leadName, city, stats, newListings,
// }: {
//   to: string; leadName: string; city: string
//   stats: { new_listings: number; avg_price: number; price_change: number; days_on_market: number }
//   newListings: { title: string; price: number; slug: string; listing_type: string }[]
// }) {
//   if (!process.env.RESEND_API_KEY) return
//   const priceChangeColor   = stats.price_change >= 0 ? BRAND.success : BRAND.danger
//   const priceChangeSuffix  = stats.price_change >= 0 ? 'up' : 'down'
//   const content = `
//     <span class="badge badge-new">Market Report</span>
//     <h1>${city} \u2014 Weekly Market Briefing</h1>
//     <p>Hello ${leadName}, here is a summary of what happened in the <strong>${city}</strong> real estate market this week.</p>
//     <div class="rule-accent"></div>
//     <table class="stats-grid" cellpadding="0" cellspacing="0">
//       <tr>
//         <td><span class="stat-num">${stats.new_listings}</span><span class="stat-label">New Listings</span></td>
//         <td><span class="stat-num">$${Math.round(stats.avg_price / 1000)}K</span><span class="stat-label">Average Price</span></td>
//       </tr>
//       <tr>
//         <td><span class="stat-num" style="color:${priceChangeColor};">${Math.abs(stats.price_change)}%</span><span class="stat-label">Prices ${priceChangeSuffix} this week</span></td>
//         <td><span class="stat-num">${stats.days_on_market}</span><span class="stat-label">Avg. Days on Market</span></td>
//       </tr>
//     </table>
//     ${newListings.length > 0 ? `
//     <p class="section-title">New This Week in ${city}</p>
//     ${newListings.slice(0, 3).map(l => `
//       <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;border:1px solid ${BRAND.border};">
//         <tr>
//           <td style="padding:14px 16px;">
//             <div style="font-family:-apple-system,'Helvetica Neue',Arial,sans-serif;font-size:14px;color:${BRAND.dark};font-weight:600;">${l.title}</div>
//             <div style="font-family:'Georgia',serif;font-size:16px;color:${BRAND.accent};margin-top:3px;">$${l.price.toLocaleString()}${l.listing_type === 'rent' ? ' / mo' : ''}</div>
//           </td>
//           <td style="padding:14px 16px;text-align:right;">
//             <a href="${SITE_URL}/property/${l.slug}" class="btn btn-outline" style="font-size:11px;padding:10px 18px;">View</a>
//           </td>
//         </tr>
//       </table>`).join('')}` : ''}
//     <div class="btn-row">
//       <a href="${SITE_URL}/listings?city=${encodeURIComponent(city)}" class="btn btn-primary">Browse All ${city} Listings</a>
//     </div>
//     <div class="rule"></div>
//     <p style="font-size:12px;color:${BRAND.muted};">You are receiving this weekly update because you searched for properties in ${city} on ${SITE_NAME}. <a href="${SITE_URL}/unsubscribe" style="color:${BRAND.muted};">Unsubscribe</a></p>`
//   return resend.emails.send({
//     from: `${SITE_NAME} <${FROM_EMAIL}>`, to,
//     subject: `${city} Market Report \u2014 ${stats.new_listings} new listings this week`,
//     html: baseTemplate(content, `${stats.new_listings} new listings in ${city} \u00B7 Avg. $${Math.round(stats.avg_price / 1000)}K`, true),
//   })
// }

// // ============================================================
// // 6. LEAD CONFIRMATION (sent to visitor after enquiry)
// // ============================================================
// export async function sendLeadConfirmation({
//   to, leadName, source, budget_max, preferred_location, property_type, message, listing_title,
// }: {
//   to: string; leadName: string; source: string
//   budget_max?: number | null; preferred_location?: string | null
//   property_type?: string | null; message?: string | null; listing_title?: string | null
// }) {
//   if (!process.env.RESEND_API_KEY) return
//   const sourceLabel =
//     source === 'ai_chat'       ? 'chatting with our AI assistant'
//     : source === 'contact_form'  ? 'submitting the contact form'
//     : source === 'contact_page'  ? 'reaching out on our contact page'
//     : 'getting in touch'
//   const summaryRows = [
//     preferred_location && `<tr><td class="data-label">Location</td><td class="data-value">${preferred_location}</td></tr>`,
//     property_type      && `<tr><td class="data-label">Property type</td><td class="data-value">${property_type.charAt(0).toUpperCase() + property_type.slice(1)}</td></tr>`,
//     budget_max         && `<tr><td class="data-label">Budget</td><td class="data-value">Up to $${budget_max.toLocaleString()}</td></tr>`,
//     listing_title      && `<tr><td class="data-label">Enquiry about</td><td class="data-value">${listing_title}</td></tr>`,
//     message            && `<tr><td class="data-label">Your message</td><td class="data-value" style="font-style:italic;">&ldquo;${message.slice(0, 120)}${message.length > 120 ? '&hellip;' : ''}&rdquo;</td></tr>`,
//   ].filter(Boolean).join('')
//   const content = `
//     <span class="badge badge-new">Enquiry Received</span>
//     <h1>Thank you, ${leadName}</h1>
//     <p>We have received your enquiry. Thank you for ${sourceLabel} &mdash; one of our agents will review your requirements and be in touch within <strong>24 hours</strong>.</p>
//     ${summaryRows ? `
//     <div class="rule-accent"></div>
//     <p class="section-title" style="margin-top:0;">Your Enquiry Summary</p>
//     <table class="data-table">${summaryRows}</table>` : ''}
//     <div class="success-bar">
//       <p>While you wait, feel free to <a href="${SITE_URL}/listings" style="color:${BRAND.success};font-weight:600;">browse our current listings</a> &mdash; new properties are added regularly.</p>
//     </div>
//     <div class="btn-row">
//       <a href="${SITE_URL}/listings" class="btn btn-primary">Browse Listings</a>
//       <a href="${SITE_URL}/contact" class="btn btn-outline">Contact Us</a>
//     </div>
//     <div class="rule"></div>
//     <p style="font-size:12px;color:${BRAND.muted};">You are receiving this because you enquired on ${SITE_NAME}. If this was not you, please disregard this email.</p>`
//   return resend.emails.send({
//     from: `${SITE_NAME} <${FROM_EMAIL}>`, to,
//     subject: `We received your message \u2014 we will be in touch soon`,
//     html: baseTemplate(content, 'We have received your enquiry and will be in touch within 24 hours', true),
//   })
// }
