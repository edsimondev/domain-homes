import { GoogleGenerativeAI } from '@google/generative-ai'
import type { Lead, Listing } from '@/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// ============================================================
// GENERATE AI SUGGESTED REPLY FOR AGENT
// Uses Groq → Gemini → OpenRouter cascade so it never silently fails
// ============================================================
export async function generateSuggestedReply(lead: Lead): Promise<string> {
  const prompt = `You are a professional real estate agent. Write a SHORT, warm, personalized first reply to a new lead.

Lead details:
- Name: ${lead.name || 'there'}
- Budget: ${lead.budget_max ? `$${lead.budget_max.toLocaleString()}` : 'not specified'}
- Looking for: ${lead.property_type || 'property'} in ${lead.preferred_location || 'your area'}
- Timeline: ${lead.timeline || 'not specified'}
- Source: ${lead.source}
- Message: ${lead.message || 'none'}

Rules:
- Max 3 sentences
- Mention at least one specific detail they provided
- End with a clear next step (schedule a call, book a viewing, ask one question)
- Sound human and warm, not robotic
- Do NOT mention AI or automation
- Plain text only, no markdown`

  // Provider 1: Groq (fastest)
  try {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('No GROQ_API_KEY')
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      }),
    })
    if (!res.ok) throw new Error(`Groq ${res.status}`)
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content?.trim()
    if (text) { console.log('[SuggestedReply] via Groq'); return text }
  } catch (err) {
    console.warn('[SuggestedReply] Groq failed:', (err as Error).message)
  }

  // Provider 2: Gemini (free tier)
  try {
    const geminiKey = process.env.GEMINI_API_KEY
    if (!geminiKey) throw new Error('No GEMINI_API_KEY')
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
    const result = await model.generateContent(prompt)
    const text = result.response.text().trim()
    if (text) { console.log('[SuggestedReply] via Gemini'); return text }
  } catch (err) {
    console.warn('[SuggestedReply] Gemini failed:', (err as Error).message)
  }

  // Provider 3: OpenRouter (last resort) — tries two free models
  const orKey = process.env.OPENROUTER_API_KEY
  if (orKey) {
    const orModels = [
      'meta-llama/llama-3.3-70b-instruct:free',
      'mistralai/mistral-7b-instruct:free',
    ]
    for (const orModel of orModels) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${orKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
          },
          body: JSON.stringify({
            model: orModel,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.7,
          }),
        })
        if (res.status === 429) { console.warn(`[SuggestedReply] OpenRouter ${orModel} rate limited, trying next`); continue }
        if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
        const data = await res.json()
        const text = data.choices?.[0]?.message?.content?.trim()
        if (text) { console.log(`[SuggestedReply] via OpenRouter (${orModel})`); return text }
      } catch (err) {
        console.warn(`[SuggestedReply] OpenRouter ${orModel} failed:`, (err as Error).message)
      }
    }
  }

  // Graceful fallback — better than nothing
  const firstName = lead.name?.split(' ')[0] || 'there'
  return `Hi ${firstName}, thank you for reaching out! I'd love to help you find the perfect ${lead.property_type || 'property'}${lead.preferred_location ? ` in ${lead.preferred_location}` : ''}. When would be a good time for a quick call to discuss your requirements?`
}

// ============================================================
// GENERATE PROPERTY MATCH REASON
// ============================================================
export async function generateMatchReason(lead: Lead, listing: Listing): Promise<string> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  const prompt = `Write 2 sentences explaining why this property is a great match for this buyer. Be specific and compelling.

Buyer preferences:
- Budget: ${lead.budget_max ? `$${lead.budget_max.toLocaleString()}` : 'flexible'}
- Location: ${lead.preferred_location || 'flexible'}
- Property type: ${lead.property_type || 'any'}
- Timeline: ${lead.timeline || 'not specified'}

Property:
- Title: ${listing.title}
- Price: $${listing.price.toLocaleString()} ${listing.listing_type === 'rent' ? '/month' : ''}
- Type: ${listing.property_type}
- Location: ${listing.city}, ${listing.state}
- Bedrooms: ${listing.bedrooms}, Bathrooms: ${listing.bathrooms}
${listing.amenities?.length ? `- Amenities: ${listing.amenities.join(', ')}` : ''}

Rules:
- Reference specific details from BOTH the buyer preferences AND the property
- Sound like a knowledgeable agent, not a robot
- Plain text only, no markdown, no bullet points`

  const result = await model.generateContent(prompt)
  return result.response.text().trim()
}

// ============================================================
// GENERATE NURTURE SEQUENCE EMAILS
// ============================================================
export interface NurtureEmailContent {
  subject: string
  bodyHtml: string
  ctaText: string
  preheader: string
}

export async function generateNurtureEmail(
  lead: Lead,
  sequenceStep: number,
  totalSteps: number,
  customContext?: string
): Promise<NurtureEmailContent> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  const stepContexts: Record<number, string> = {
    1: 'This is a follow-up 24 hours after initial inquiry. They haven\'t responded yet. Be helpful, share 1-2 property recommendations.',
    2: 'This is a week later. They still haven\'t responded. Share a market insight or tip relevant to their search area and budget.',
    3: 'This is 2 weeks later. Gently check in. Ask if their needs have changed. Be low pressure.',
    4: 'This is 1 month later. Share new listings that match their criteria. Create mild urgency without being pushy.',
    5: 'This is 2 months later. Final check-in. Ask if they found something or if timeline changed. Keep door open.',
  }

  const stepContext = stepContexts[sequenceStep] || 'Check in and provide value. Keep it short and relevant.'

  const prompt = `You are writing a nurture email from a real estate agent to a lead who enquired but hasn't booked yet.

Context for this email (step ${sequenceStep} of ${totalSteps}):
${stepContext}
${customContext ? `Additional context: ${customContext}` : ''}

Lead details:
- Name: ${lead.name || 'there'}
- Budget: ${lead.budget_max ? `Up to $${lead.budget_max.toLocaleString()}` : 'not specified'}
- Looking in: ${lead.preferred_location || 'your area'}
- Property type: ${lead.property_type || 'any property'}
- Timeline: ${lead.timeline || 'not specified'}

Return ONLY valid JSON (no markdown, no backticks):
{
  "subject": "email subject line (compelling, personalized, under 60 chars)",
  "preheader": "email preheader text (under 100 chars)",
  "bodyHtml": "2-3 short paragraphs of HTML (use <p> tags only, no headings). Personalized, warm, adds value. Max 120 words total.",
  "ctaText": "CTA button text (under 6 words)"
}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    return JSON.parse(text)
  } catch {
    // Fallback
    return {
      subject: `Still looking for your perfect home, ${lead.name?.split(' ')[0] || 'there'}?`,
      preheader: `We have new properties matching your search in ${lead.preferred_location || 'your area'}`,
      bodyHtml: `<p>Hi ${lead.name?.split(' ')[0] || 'there'}, just checking in to see if you're still in the market for a ${lead.property_type || 'property'} in ${lead.preferred_location || 'your area'}.</p><p>We've had some new listings come in that might interest you. I'd love to help you find the right fit — feel free to reply or book a quick call.</p>`,
      ctaText: 'Browse New Listings',
    }
  }
}

// ============================================================
// GENERATE LISTING CONTENT SUITE (all 4 pieces)
// ============================================================
export interface ListingContentSuite {
  description: string
  instagram_caption: string
  facebook_post: string
  email_newsletter: string
  meta_description: string
}

export async function generateListingContentSuite(listing: {
  title: string
  price: number
  listing_type: string
  property_type: string
  bedrooms: number
  bathrooms: number
  square_footage?: number
  city: string
  state: string
  address: string
  amenities?: string[]
  year_built?: number
  features?: string[]
}): Promise<ListingContentSuite> {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })

  const priceFormatted = listing.listing_type === 'rent'
    ? `$${listing.price.toLocaleString()}/mo`
    : `$${listing.price.toLocaleString()}`

  const prompt = `You are a top real estate copywriter. Generate all marketing content for this listing.

Property:
- Title: ${listing.title}
- Price: ${priceFormatted}
- Type: ${listing.property_type} for ${listing.listing_type}
- Specs: ${listing.bedrooms} bed, ${listing.bathrooms} bath${listing.square_footage ? `, ${listing.square_footage.toLocaleString()} sqft` : ''}
- Location: ${listing.address}, ${listing.city}, ${listing.state}
${listing.year_built ? `- Year Built: ${listing.year_built}` : ''}
${listing.amenities?.length ? `- Amenities: ${listing.amenities.join(', ')}` : ''}
${listing.features?.length ? `- Features: ${listing.features.join(', ')}` : ''}

Return ONLY valid JSON (no markdown, no backticks):
{
  "description": "3 engaging paragraphs for the website listing. Highlight lifestyle, key features, neighborhood. 150-200 words. No markdown.",
  "instagram_caption": "Instagram caption with emojis, key details, and 8-10 relevant hashtags. 80-120 words. Include price. End with a CTA like 'DM to book a viewing'.",
  "facebook_post": "Facebook post. More conversational than Instagram. Include key details, price, and a question to drive engagement. 80-100 words. No hashtags.",
  "email_newsletter": "Email newsletter blurb for this listing. 60-80 words. Compelling subject line included as first line starting with 'Subject: '. Then the body. Professional tone.",
  "meta_description": "SEO meta description. Under 155 characters. Include location, key specs, price."
}`

  try {
    const result = await model.generateContent(prompt)
    const text = result.response.text().replace(/```json|```/g, '').trim()
    return JSON.parse(text)
  } catch (e) {
    return {
      description: `Welcome to ${listing.title}, a stunning ${listing.property_type} located in the heart of ${listing.city}, ${listing.state}. This beautifully appointed home offers ${listing.bedrooms} spacious bedrooms and ${listing.bathrooms} bathrooms across ${listing.square_footage?.toLocaleString() || 'generous'} square feet of living space.\n\nThe property features ${listing.amenities?.slice(0, 3).join(', ') || 'premium finishes throughout'}, making it perfect for those who appreciate quality and comfort. Located in one of ${listing.city}'s most sought-after neighborhoods, you'll enjoy easy access to top schools, dining, and entertainment.\n\nPriced at ${priceFormatted}, this exceptional property won't last long. Schedule your private viewing today.`,
      instagram_caption: `🏠 Just Listed! ${listing.title}\n\n✨ ${listing.bedrooms} bed · ${listing.bathrooms} bath${listing.square_footage ? ` · ${listing.square_footage.toLocaleString()} sqft` : ''}\n📍 ${listing.city}, ${listing.state}\n💰 ${priceFormatted}\n\nDM or comment 'INFO' to book a private viewing!\n\n#RealEstate #${listing.city.replace(/\s/g, '')}RealEstate #HomesForSale #JustListed #DreamHome #PropertyForSale #LuxuryHomes #NewListing`,
      facebook_post: `🏡 New Listing Alert! We just listed this gorgeous ${listing.property_type} in ${listing.city}, ${listing.state}.\n\n${listing.bedrooms} bedrooms · ${listing.bathrooms} bathrooms · ${priceFormatted}\n\nAre you or someone you know looking for a home in ${listing.city}? Drop a comment or send us a message — we'd love to set up a viewing!`,
      email_newsletter: `Subject: Just Listed — ${listing.title} · ${priceFormatted}\n\nWe're excited to share our newest listing in ${listing.city}! This ${listing.bedrooms}-bedroom ${listing.property_type} is priced at ${priceFormatted} and features ${listing.amenities?.slice(0, 2).join(' and ') || 'premium finishes throughout'}. Click below to view full details and schedule a private tour.`,
      meta_description: `${listing.bedrooms}BR ${listing.property_type} for ${listing.listing_type} in ${listing.city}, ${listing.state}. ${priceFormatted}. ${listing.square_footage ? `${listing.square_footage.toLocaleString()} sqft.` : ''} ${listing.amenities?.slice(0, 2).join(', ') || ''}.`.slice(0, 155),
    }
  }
}

// ============================================================
// FIND MATCHING LEADS FOR A LISTING
// ============================================================
export function scoreLeadListingMatch(lead: Lead, listing: Listing): number {
  let score = 0

  // Budget match
  if (lead.budget_max && listing.price <= lead.budget_max) score += 3
  if (lead.budget_min && listing.price >= lead.budget_min) score += 1

  // Location match
  if (lead.preferred_location && listing.city) {
    const loc = lead.preferred_location.toLowerCase()
    const city = listing.city.toLowerCase()
    const state = listing.state?.toLowerCase() || ''
    if (city.includes(loc) || loc.includes(city) || state.includes(loc)) score += 3
  }

  // Property type match
  if (lead.property_type && listing.property_type === lead.property_type) score += 2

  // Listing type match (sale/rent)
  if (listing.listing_type === 'sale' && lead.timeline) score += 1

  return score
}


// import { GoogleGenerativeAI } from '@google/generative-ai'
// import type { Lead, Listing } from '@/types'

// const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

// // ============================================================
// // GENERATE AI SUGGESTED REPLY FOR AGENT
// // Uses Groq → Gemini → OpenRouter cascade so it never silently fails
// // ============================================================
// export async function generateSuggestedReply(lead: Lead): Promise<string> {
//   const prompt = `You are a professional real estate agent. Write a SHORT, warm, personalized first reply to a new lead.

// Lead details:
// - Name: ${lead.name || 'there'}
// - Budget: ${lead.budget_max ? `$${lead.budget_max.toLocaleString()}` : 'not specified'}
// - Looking for: ${lead.property_type || 'property'} in ${lead.preferred_location || 'your area'}
// - Timeline: ${lead.timeline || 'not specified'}
// - Source: ${lead.source}
// - Message: ${lead.message || 'none'}

// Rules:
// - Max 3 sentences
// - Mention at least one specific detail they provided
// - End with a clear next step (schedule a call, book a viewing, ask one question)
// - Sound human and warm, not robotic
// - Do NOT mention AI or automation
// - Plain text only, no markdown`

//   // Provider 1: Groq (fastest)
//   try {
//     const groqKey = process.env.GROQ_API_KEY
//     if (!groqKey) throw new Error('No GROQ_API_KEY')
//     const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
//       body: JSON.stringify({
//         model: 'llama-3.3-70b-versatile',
//         messages: [{ role: 'user', content: prompt }],
//         max_tokens: 200,
//         temperature: 0.7,
//       }),
//     })
//     if (!res.ok) throw new Error(`Groq ${res.status}`)
//     const data = await res.json()
//     const text = data.choices?.[0]?.message?.content?.trim()
//     if (text) { console.log('[SuggestedReply] via Groq'); return text }
//   } catch (err) {
//     console.warn('[SuggestedReply] Groq failed:', (err as Error).message)
//   }

//   // Provider 2: Gemini (free tier)
//   try {
//     const geminiKey = process.env.GEMINI_API_KEY
//     if (!geminiKey) throw new Error('No GEMINI_API_KEY')
//     const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
//     const result = await model.generateContent(prompt)
//     const text = result.response.text().trim()
//     if (text) { console.log('[SuggestedReply] via Gemini'); return text }
//   } catch (err) {
//     console.warn('[SuggestedReply] Gemini failed:', (err as Error).message)
//   }

//   // Provider 3: OpenRouter (last resort)
//   try {
//     const orKey = process.env.OPENROUTER_API_KEY
//     if (!orKey) throw new Error('No OPENROUTER_API_KEY')
//     const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//         Authorization: `Bearer ${orKey}`,
//         'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
//       },
//       body: JSON.stringify({
//         model: 'meta-llama/llama-3.3-70b-instruct:free',
//         messages: [{ role: 'user', content: prompt }],
//         max_tokens: 200,
//         temperature: 0.7,
//       }),
//     })
//     if (!res.ok) throw new Error(`OpenRouter ${res.status}`)
//     const data = await res.json()
//     const text = data.choices?.[0]?.message?.content?.trim()
//     if (text) { console.log('[SuggestedReply] via OpenRouter'); return text }
//   } catch (err) {
//     console.warn('[SuggestedReply] OpenRouter failed:', (err as Error).message)
//   }

//   // Graceful fallback — better than nothing
//   const firstName = lead.name?.split(' ')[0] || 'there'
//   return `Hi ${firstName}, thank you for reaching out! I'd love to help you find the perfect ${lead.property_type || 'property'}${lead.preferred_location ? ` in ${lead.preferred_location}` : ''}. When would be a good time for a quick call to discuss your requirements?`
// }

// // ============================================================
// // GENERATE PROPERTY MATCH REASON
// // ============================================================
// export async function generateMatchReason(lead: Lead, listing: Listing): Promise<string> {
//   const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

//   const prompt = `Write 2 sentences explaining why this property is a great match for this buyer. Be specific and compelling.

// Buyer preferences:
// - Budget: ${lead.budget_max ? `$${lead.budget_max.toLocaleString()}` : 'flexible'}
// - Location: ${lead.preferred_location || 'flexible'}
// - Property type: ${lead.property_type || 'any'}
// - Timeline: ${lead.timeline || 'not specified'}

// Property:
// - Title: ${listing.title}
// - Price: $${listing.price.toLocaleString()} ${listing.listing_type === 'rent' ? '/month' : ''}
// - Type: ${listing.property_type}
// - Location: ${listing.city}, ${listing.state}
// - Bedrooms: ${listing.bedrooms}, Bathrooms: ${listing.bathrooms}
// ${listing.amenities?.length ? `- Amenities: ${listing.amenities.join(', ')}` : ''}

// Rules:
// - Reference specific details from BOTH the buyer preferences AND the property
// - Sound like a knowledgeable agent, not a robot
// - Plain text only, no markdown, no bullet points`

//   const result = await model.generateContent(prompt)
//   return result.response.text().trim()
// }

// // ============================================================
// // GENERATE NURTURE SEQUENCE EMAILS
// // ============================================================
// export interface NurtureEmailContent {
//   subject: string
//   bodyHtml: string
//   ctaText: string
//   preheader: string
// }

// export async function generateNurtureEmail(
//   lead: Lead,
//   sequenceStep: number,
//   totalSteps: number,
//   customContext?: string
// ): Promise<NurtureEmailContent> {
//   const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

//   const stepContexts: Record<number, string> = {
//     1: 'This is a follow-up 24 hours after initial inquiry. They haven\'t responded yet. Be helpful, share 1-2 property recommendations.',
//     2: 'This is a week later. They still haven\'t responded. Share a market insight or tip relevant to their search area and budget.',
//     3: 'This is 2 weeks later. Gently check in. Ask if their needs have changed. Be low pressure.',
//     4: 'This is 1 month later. Share new listings that match their criteria. Create mild urgency without being pushy.',
//     5: 'This is 2 months later. Final check-in. Ask if they found something or if timeline changed. Keep door open.',
//   }

//   const stepContext = stepContexts[sequenceStep] || 'Check in and provide value. Keep it short and relevant.'

//   const prompt = `You are writing a nurture email from a real estate agent to a lead who enquired but hasn't booked yet.

// Context for this email (step ${sequenceStep} of ${totalSteps}):
// ${stepContext}
// ${customContext ? `Additional context: ${customContext}` : ''}

// Lead details:
// - Name: ${lead.name || 'there'}
// - Budget: ${lead.budget_max ? `Up to $${lead.budget_max.toLocaleString()}` : 'not specified'}
// - Looking in: ${lead.preferred_location || 'your area'}
// - Property type: ${lead.property_type || 'any property'}
// - Timeline: ${lead.timeline || 'not specified'}

// Return ONLY valid JSON (no markdown, no backticks):
// {
//   "subject": "email subject line (compelling, personalized, under 60 chars)",
//   "preheader": "email preheader text (under 100 chars)",
//   "bodyHtml": "2-3 short paragraphs of HTML (use <p> tags only, no headings). Personalized, warm, adds value. Max 120 words total.",
//   "ctaText": "CTA button text (under 6 words)"
// }`

//   try {
//     const result = await model.generateContent(prompt)
//     const text = result.response.text().replace(/```json|```/g, '').trim()
//     return JSON.parse(text)
//   } catch {
//     // Fallback
//     return {
//       subject: `Still looking for your perfect home, ${lead.name?.split(' ')[0] || 'there'}?`,
//       preheader: `We have new properties matching your search in ${lead.preferred_location || 'your area'}`,
//       bodyHtml: `<p>Hi ${lead.name?.split(' ')[0] || 'there'}, just checking in to see if you're still in the market for a ${lead.property_type || 'property'} in ${lead.preferred_location || 'your area'}.</p><p>We've had some new listings come in that might interest you. I'd love to help you find the right fit — feel free to reply or book a quick call.</p>`,
//       ctaText: 'Browse New Listings',
//     }
//   }
// }

// // ============================================================
// // GENERATE LISTING CONTENT SUITE (all 4 pieces)
// // ============================================================
// export interface ListingContentSuite {
//   description: string
//   instagram_caption: string
//   facebook_post: string
//   email_newsletter: string
//   meta_description: string
// }

// export async function generateListingContentSuite(listing: {
//   title: string
//   price: number
//   listing_type: string
//   property_type: string
//   bedrooms: number
//   bathrooms: number
//   square_footage?: number
//   city: string
//   state: string
//   address: string
//   amenities?: string[]
//   year_built?: number
//   features?: string[]
// }): Promise<ListingContentSuite> {
//   const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' })

//   const priceFormatted = listing.listing_type === 'rent'
//     ? `$${listing.price.toLocaleString()}/mo`
//     : `$${listing.price.toLocaleString()}`

//   const prompt = `You are a top real estate copywriter. Generate all marketing content for this listing.

// Property:
// - Title: ${listing.title}
// - Price: ${priceFormatted}
// - Type: ${listing.property_type} for ${listing.listing_type}
// - Specs: ${listing.bedrooms} bed, ${listing.bathrooms} bath${listing.square_footage ? `, ${listing.square_footage.toLocaleString()} sqft` : ''}
// - Location: ${listing.address}, ${listing.city}, ${listing.state}
// ${listing.year_built ? `- Year Built: ${listing.year_built}` : ''}
// ${listing.amenities?.length ? `- Amenities: ${listing.amenities.join(', ')}` : ''}
// ${listing.features?.length ? `- Features: ${listing.features.join(', ')}` : ''}

// Return ONLY valid JSON (no markdown, no backticks):
// {
//   "description": "3 engaging paragraphs for the website listing. Highlight lifestyle, key features, neighborhood. 150-200 words. No markdown.",
//   "instagram_caption": "Instagram caption with emojis, key details, and 8-10 relevant hashtags. 80-120 words. Include price. End with a CTA like 'DM to book a viewing'.",
//   "facebook_post": "Facebook post. More conversational than Instagram. Include key details, price, and a question to drive engagement. 80-100 words. No hashtags.",
//   "email_newsletter": "Email newsletter blurb for this listing. 60-80 words. Compelling subject line included as first line starting with 'Subject: '. Then the body. Professional tone.",
//   "meta_description": "SEO meta description. Under 155 characters. Include location, key specs, price."
// }`

//   try {
//     const result = await model.generateContent(prompt)
//     const text = result.response.text().replace(/```json|```/g, '').trim()
//     return JSON.parse(text)
//   } catch (e) {
//     return {
//       description: `Welcome to ${listing.title}, a stunning ${listing.property_type} located in the heart of ${listing.city}, ${listing.state}. This beautifully appointed home offers ${listing.bedrooms} spacious bedrooms and ${listing.bathrooms} bathrooms across ${listing.square_footage?.toLocaleString() || 'generous'} square feet of living space.\n\nThe property features ${listing.amenities?.slice(0, 3).join(', ') || 'premium finishes throughout'}, making it perfect for those who appreciate quality and comfort. Located in one of ${listing.city}'s most sought-after neighborhoods, you'll enjoy easy access to top schools, dining, and entertainment.\n\nPriced at ${priceFormatted}, this exceptional property won't last long. Schedule your private viewing today.`,
//       instagram_caption: `🏠 Just Listed! ${listing.title}\n\n✨ ${listing.bedrooms} bed · ${listing.bathrooms} bath${listing.square_footage ? ` · ${listing.square_footage.toLocaleString()} sqft` : ''}\n📍 ${listing.city}, ${listing.state}\n💰 ${priceFormatted}\n\nDM or comment 'INFO' to book a private viewing!\n\n#RealEstate #${listing.city.replace(/\s/g, '')}RealEstate #HomesForSale #JustListed #DreamHome #PropertyForSale #LuxuryHomes #NewListing`,
//       facebook_post: `🏡 New Listing Alert! We just listed this gorgeous ${listing.property_type} in ${listing.city}, ${listing.state}.\n\n${listing.bedrooms} bedrooms · ${listing.bathrooms} bathrooms · ${priceFormatted}\n\nAre you or someone you know looking for a home in ${listing.city}? Drop a comment or send us a message — we'd love to set up a viewing!`,
//       email_newsletter: `Subject: Just Listed — ${listing.title} · ${priceFormatted}\n\nWe're excited to share our newest listing in ${listing.city}! This ${listing.bedrooms}-bedroom ${listing.property_type} is priced at ${priceFormatted} and features ${listing.amenities?.slice(0, 2).join(' and ') || 'premium finishes throughout'}. Click below to view full details and schedule a private tour.`,
//       meta_description: `${listing.bedrooms}BR ${listing.property_type} for ${listing.listing_type} in ${listing.city}, ${listing.state}. ${priceFormatted}. ${listing.square_footage ? `${listing.square_footage.toLocaleString()} sqft.` : ''} ${listing.amenities?.slice(0, 2).join(', ') || ''}.`.slice(0, 155),
//     }
//   }
// }

// // ============================================================
// // FIND MATCHING LEADS FOR A LISTING
// // ============================================================
// export function scoreLeadListingMatch(lead: Lead, listing: Listing): number {
//   let score = 0

//   // Budget match
//   if (lead.budget_max && listing.price <= lead.budget_max) score += 3
//   if (lead.budget_min && listing.price >= lead.budget_min) score += 1

//   // Location match
//   if (lead.preferred_location && listing.city) {
//     const loc = lead.preferred_location.toLowerCase()
//     const city = listing.city.toLowerCase()
//     const state = listing.state?.toLowerCase() || ''
//     if (city.includes(loc) || loc.includes(city) || state.includes(loc)) score += 3
//   }

//   // Property type match
//   if (lead.property_type && listing.property_type === lead.property_type) score += 2

//   // Listing type match (sale/rent)
//   if (listing.listing_type === 'sale' && lead.timeline) score += 1

//   return score
// }
