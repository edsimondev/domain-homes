/**
 * lib/ai.ts — Triple-Fallback AI Engine
 *
 * Priority:
 *   1. Groq        → llama-3.3-70b-versatile             (fastest, generous free tier)
 *   2. Gemini      → gemini-2.5-flash                    (Google fallback, free tier)
 *   3. OpenRouter  → llama-3.3-70b-instruct:free         (last resort, always free)
 *
 * Drop this file into src/lib/ai.ts.
 * Update route.ts import: from '@/lib/gemini' → from '@/lib/ai'
 * You can delete gemini.ts afterwards (or keep it, nothing imports it).
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { ConversationMessage, Lead, LeadScore } from '@/types'

// ─── Shared system prompt ─────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Alex, a professional real estate assistant for Domaine. You are warm, knowledgeable, and helpful.

Your goals:
1. Engage visitors naturally in conversation about real estate
2. Understand their needs by asking qualifying questions (one at a time, naturally)
3. Extract these key data points conversationally:
   - Full name
   - Contact info (email or phone)
   - Budget range
   - Preferred location/neighborhood
   - Property type (house, apartment, condo, villa, etc.)
   - Timeline (how soon they want to buy/rent)
   - Whether buying or renting
4. Recommend specific listings if you know their preferences
5. Encourage them to schedule a viewing or speak to an agent

Qualification rules:
- HOT lead: Has budget + timeline within 3 months + specific location + ready contact info
- WARM lead: Has 2-3 criteria but no urgency
- COLD lead: Just browsing, vague or no criteria

IMPORTANT: Be natural, never robotic. Don't ask all questions at once. Respond in 1-3 sentences max per turn. Always be helpful and move the conversation forward.

CONTACT COLLECTION RULES — these are strict:
- You MUST collect an email address before ending any conversation or promising an agent will contact them.
- Email is the minimum required. Phone is a bonus but not mandatory.
- If someone is not comfortable giving their phone number, say "No problem! An email works perfectly." and ask for email instead.
- If someone tries to wrap up without giving any contact info, say "I'd love to have one of our agents follow up with you — what's the best email to reach you on?"
- NEVER say "an agent will get back to you" unless you already have their email or phone in the current conversation.
- If you have their name but no contact info yet, always ask: "Great [name]! Just so our agent can reach you — what's your email address?"

RESPONSE FORMAT — always reply with ONLY this JSON object, no preamble, no markdown fences:
{
  "reply": "<your conversational response — plain text, no markdown>",
  "lead": {
    "name": "<string or null>",
    "email": "<string or null>",
    "phone": "<string or null>",
    "budget_min": <number or null>,
    "budget_max": <number or null>,
    "preferred_location": "<string or null>",
    "property_type": "<house|apartment|condo|villa|townhouse|land|commercial or null>",
    "timeline": "<string or null>",
    "listing_type": "<sale|rent or null>"
  }
}`

// ─── Shared response parser ───────────────────────────────────────────────────

function parseAIResponse(raw: string): { reply: string; leadData: Partial<Lead> } {
  // Strip markdown fences if present
  let clean = raw.replace(/```json|```/g, '').trim()

  // If the model prepended plain text before the JSON, extract just the JSON block
  const jsonStart = clean.indexOf('{')
  const jsonEnd = clean.lastIndexOf('}')
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    clean = clean.slice(jsonStart, jsonEnd + 1)
  }

  try {
    const parsed = JSON.parse(clean)
    return {
      reply: parsed.reply ?? raw,
      leadData: parsed.lead ?? {},
    }
  } catch {
    // Model didn't follow JSON format at all — use raw text as reply
    return { reply: raw, leadData: {} }
  }
}

// ─── Provider 1: Groq ─────────────────────────────────────────────────────────

async function groqChat(
  messages: ConversationMessage[],
  userMessage: string,
  systemPrompt: string
): Promise<{ reply: string; leadData: Partial<Lead> }> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not set')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 512,
      response_format: { type: 'json_object' },
    }),
  })

  if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return parseAIResponse(data.choices?.[0]?.message?.content ?? '')
}

// ─── Provider 2: Gemini ───────────────────────────────────────────────────────

async function geminiChat(
  messages: ConversationMessage[],
  userMessage: string,
  systemPrompt: string
): Promise<{ reply: string; leadData: Partial<Lead> }> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const genAI = new GoogleGenerativeAI(apiKey)

  // gemini-2.5-flash: best free-tier model as of 2026
  // 10 RPM / 250 RPD — do NOT use 1.5 (deprecated) or 2.0-flash (shutting down June 2026)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

  const history = messages.map(msg => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }))

  const chat = model.startChat({
    history,
    systemInstruction: {
      role: 'system',
      parts: [{ text: systemPrompt }],
    },
  })

  const result = await chat.sendMessage(userMessage)
  return parseAIResponse(result.response.text())
}

// ─── Provider 3: OpenRouter ───────────────────────────────────────────────────

async function openRouterChat(
  messages: ConversationMessage[],
  userMessage: string,
  systemPrompt: string,
  model = 'meta-llama/llama-3.3-70b-instruct:free'
): Promise<{ reply: string; leadData: Partial<Lead> }> {
  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
      'X-Title': 'Domaine Real Estate',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
        })),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 512,
    }),
  })

  if (res.status === 429) throw new Error('OpenRouter 429: rate limited')
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return parseAIResponse(data.choices?.[0]?.message?.content ?? '')
}

// ─── Lead scoring (unified — see lib/scoring.ts) ─────────────────────────────
import { scoreLead } from '@/lib/scoring'

// ─── Public API ───────────────────────────────────────────────────────────────

export async function processChat(
  messages: ConversationMessage[],
  userMessage: string,
  listingContext?: string
): Promise<{ reply: string; leadData: Partial<Lead>; leadScore: LeadScore }> {
  const systemPrompt =
    SYSTEM_PROMPT + (listingContext ? `\n\nCurrent listing context: ${listingContext}` : '')

  let reply = ''
  let leadData: Partial<Lead> = {}

  const providers = [
    { name: 'Groq',       fn: () => groqChat(messages, userMessage, systemPrompt) },
    { name: 'Gemini',     fn: () => geminiChat(messages, userMessage, systemPrompt) },
    { name: 'OpenRouter (llama)', fn: () => openRouterChat(messages, userMessage, systemPrompt) },
    { name: 'OpenRouter (mistral)', fn: () => openRouterChat(messages, userMessage, systemPrompt, 'mistralai/mistral-7b-instruct:free') },
  ]

  for (const provider of providers) {
    try {
      ;({ reply, leadData } = await provider.fn())
      console.log(`[AI] Responded via ${provider.name}`)
      break
    } catch (err) {
      console.warn(`[AI] ${provider.name} failed:`, (err as Error).message)
    }
  }

  if (!reply) throw new Error('All AI providers failed')

  return { reply, leadData, leadScore: scoreLead(leadData) }
}

// ─── Listing description (also uses cascade) ──────────────────────────────────

export async function generateListingDescription(data: {
  title: string
  bedrooms: number
  bathrooms: number
  sqft?: number
  city: string
  price: number
  type: string
  amenities?: string[]
}): Promise<string> {
  const prompt = `Write a compelling, professional real estate listing description for:
Title: ${data.title}
Location: ${data.city}
Bedrooms: ${data.bedrooms}, Bathrooms: ${data.bathrooms}
${data.sqft ? `Square Footage: ${data.sqft} sq ft` : ''}
Price: $${data.price.toLocaleString()}
Type: ${data.type}
${data.amenities?.length ? `Amenities: ${data.amenities.join(', ')}` : ''}

Write 3 short paragraphs. Highlight lifestyle, key features, and neighborhood. Keep it under 200 words. No markdown.`

  // Try Groq first
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('No key')
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      }),
    })
    if (!res.ok) throw new Error(`Groq ${res.status}`)
    const d = await res.json()
    return d.choices?.[0]?.message?.content ?? ''
  } catch {
    // Gemini fallback
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
      const result = await model.generateContent(prompt)
      return result.response.text()
    } catch {
      // OpenRouter last resort
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
        },
        body: JSON.stringify({
          model: 'meta-llama/llama-3.3-70b-instruct:free',
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 400,
        }),
      })
      const d = await res.json()
      return d.choices?.[0]?.message?.content ?? ''
    }
  }
}


// /**
//  * lib/ai.ts — Triple-Fallback AI Engine
//  *
//  * Priority:
//  *   1. Groq        → llama-3.3-70b-versatile             (fastest, generous free tier)
//  *   2. Gemini      → gemini-2.5-flash                    (Google fallback, free tier)
//  *   3. OpenRouter  → llama-3.3-70b-instruct:free         (last resort, always free)
//  *
//  * Drop this file into src/lib/ai.ts.
//  * Update route.ts import: from '@/lib/gemini' → from '@/lib/ai'
//  * You can delete gemini.ts afterwards (or keep it, nothing imports it).
//  */

// import { GoogleGenerativeAI } from '@google/generative-ai'
// import type { ConversationMessage, Lead, LeadScore } from '@/types'

// // ─── Shared system prompt ─────────────────────────────────────────────────────

// const SYSTEM_PROMPT = `You are Alex, a professional real estate assistant for Domaine. You are warm, knowledgeable, and helpful.

// Your goals:
// 1. Engage visitors naturally in conversation about real estate
// 2. Understand their needs by asking qualifying questions (one at a time, naturally)
// 3. Extract these key data points conversationally:
//    - Full name
//    - Contact info (email or phone)
//    - Budget range
//    - Preferred location/neighborhood
//    - Property type (house, apartment, condo, villa, etc.)
//    - Timeline (how soon they want to buy/rent)
//    - Whether buying or renting
// 4. Recommend specific listings if you know their preferences
// 5. Encourage them to schedule a viewing or speak to an agent

// Qualification rules:
// - HOT lead: Has budget + timeline within 3 months + specific location + ready contact info
// - WARM lead: Has 2-3 criteria but no urgency
// - COLD lead: Just browsing, vague or no criteria

// IMPORTANT: Be natural, never robotic. Don't ask all questions at once. Respond in 1-3 sentences max per turn. Always be helpful and move the conversation forward.

// When you have enough info, say you'll connect them with an agent and ask for their contact details if not already provided.

// RESPONSE FORMAT — always reply with ONLY this JSON object, no preamble, no markdown fences:
// {
//   "reply": "<your conversational response — plain text, no markdown>",
//   "lead": {
//     "name": "<string or null>",
//     "email": "<string or null>",
//     "phone": "<string or null>",
//     "budget_min": <number or null>,
//     "budget_max": <number or null>,
//     "preferred_location": "<string or null>",
//     "property_type": "<house|apartment|condo|villa|townhouse|land|commercial or null>",
//     "timeline": "<string or null>",
//     "listing_type": "<sale|rent or null>"
//   }
// }`

// // ─── Shared response parser ───────────────────────────────────────────────────

// function parseAIResponse(raw: string): { reply: string; leadData: Partial<Lead> } {
//   try {
//     const clean = raw.replace(/```json|```/g, '').trim()
//     const parsed = JSON.parse(clean)
//     return {
//       reply: parsed.reply ?? raw,
//       leadData: parsed.lead ?? {},
//     }
//   } catch {
//     // Model didn't follow JSON format — use raw text as reply
//     return { reply: raw, leadData: {} }
//   }
// }

// // ─── Provider 1: Groq ─────────────────────────────────────────────────────────

// async function groqChat(
//   messages: ConversationMessage[],
//   userMessage: string,
//   systemPrompt: string
// ): Promise<{ reply: string; leadData: Partial<Lead> }> {
//   const apiKey = process.env.GROQ_API_KEY
//   if (!apiKey) throw new Error('GROQ_API_KEY not set')

//   const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${apiKey}`,
//     },
//     body: JSON.stringify({
//       model: 'llama-3.3-70b-versatile',
//       messages: [
//         { role: 'system', content: systemPrompt },
//         ...messages.map(m => ({
//           role: m.role === 'user' ? 'user' : 'assistant',
//           content: m.content,
//         })),
//         { role: 'user', content: userMessage },
//       ],
//       temperature: 0.7,
//       max_tokens: 512,
//     }),
//   })

//   if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`)
//   const data = await res.json()
//   return parseAIResponse(data.choices?.[0]?.message?.content ?? '')
// }

// // ─── Provider 2: Gemini ───────────────────────────────────────────────────────

// async function geminiChat(
//   messages: ConversationMessage[],
//   userMessage: string,
//   systemPrompt: string
// ): Promise<{ reply: string; leadData: Partial<Lead> }> {
//   const apiKey = process.env.GEMINI_API_KEY
//   if (!apiKey) throw new Error('GEMINI_API_KEY not set')

//   const genAI = new GoogleGenerativeAI(apiKey)

//   // gemini-2.5-flash: best free-tier model as of 2026
//   // 10 RPM / 250 RPD — do NOT use 1.5 (deprecated) or 2.0-flash (shutting down June 2026)
//   const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

//   const history = messages.map(msg => ({
//     role: msg.role === 'user' ? 'user' : 'model',
//     parts: [{ text: msg.content }],
//   }))

//   const chat = model.startChat({
//     history,
//     systemInstruction: {
//       role: 'system',
//       parts: [{ text: systemPrompt }],
//     },
//   })

//   const result = await chat.sendMessage(userMessage)
//   return parseAIResponse(result.response.text())
// }

// // ─── Provider 3: OpenRouter ───────────────────────────────────────────────────

// async function openRouterChat(
//   messages: ConversationMessage[],
//   userMessage: string,
//   systemPrompt: string
// ): Promise<{ reply: string; leadData: Partial<Lead> }> {
//   const apiKey = process.env.OPENROUTER_API_KEY
//   if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

//   const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${apiKey}`,
//       'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
//       'X-Title': 'Domaine Real Estate',
//     },
//     body: JSON.stringify({
//       model: 'meta-llama/llama-3.3-70b-instruct:free',
//       messages: [
//         { role: 'system', content: systemPrompt },
//         ...messages.map(m => ({
//           role: m.role === 'user' ? 'user' : 'assistant',
//           content: m.content,
//         })),
//         { role: 'user', content: userMessage },
//       ],
//       temperature: 0.7,
//       max_tokens: 512,
//     }),
//   })

//   if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
//   const data = await res.json()
//   return parseAIResponse(data.choices?.[0]?.message?.content ?? '')
// }

// // ─── Lead scoring ─────────────────────────────────────────────────────────────

// function scoreLeadData(data: Partial<Lead>): LeadScore {
//   let score = 0
//   if (data.name) score += 1
//   if (data.email || data.phone) score += 2
//   if (data.budget_min || data.budget_max) score += 2
//   if (data.preferred_location) score += 1
//   if (data.property_type) score += 1
//   if (data.timeline) {
//     const t = data.timeline.toLowerCase()
//     if (
//       t.includes('asap') ||
//       t.includes('immediately') ||
//       t.includes('1 month') ||
//       t.includes('month')
//     )
//       score += 3
//     else if (t.includes('3 month') || t.includes('soon')) score += 2
//     else score += 1
//   }
//   if (score >= 7) return 'hot'
//   if (score >= 4) return 'warm'
//   return 'cold'
// }

// // ─── Public API ───────────────────────────────────────────────────────────────

// export async function processChat(
//   messages: ConversationMessage[],
//   userMessage: string,
//   listingContext?: string
// ): Promise<{ reply: string; leadData: Partial<Lead>; leadScore: LeadScore }> {
//   const systemPrompt =
//     SYSTEM_PROMPT + (listingContext ? `\n\nCurrent listing context: ${listingContext}` : '')

//   let reply = ''
//   let leadData: Partial<Lead> = {}

//   const providers = [
//     { name: 'Groq',       fn: () => groqChat(messages, userMessage, systemPrompt) },
//     { name: 'Gemini',     fn: () => geminiChat(messages, userMessage, systemPrompt) },
//     { name: 'OpenRouter', fn: () => openRouterChat(messages, userMessage, systemPrompt) },
//   ]

//   for (const provider of providers) {
//     try {
//       ;({ reply, leadData } = await provider.fn())
//       console.log(`[AI] Responded via ${provider.name}`)
//       break
//     } catch (err) {
//       console.warn(`[AI] ${provider.name} failed:`, (err as Error).message)
//     }
//   }

//   if (!reply) throw new Error('All AI providers failed')

//   return { reply, leadData, leadScore: scoreLeadData(leadData) }
// }

// // ─── Listing description (also uses cascade) ──────────────────────────────────

// export async function generateListingDescription(data: {
//   title: string
//   bedrooms: number
//   bathrooms: number
//   sqft?: number
//   city: string
//   price: number
//   type: string
//   amenities?: string[]
// }): Promise<string> {
//   const prompt = `Write a compelling, professional real estate listing description for:
// Title: ${data.title}
// Location: ${data.city}
// Bedrooms: ${data.bedrooms}, Bathrooms: ${data.bathrooms}
// ${data.sqft ? `Square Footage: ${data.sqft} sq ft` : ''}
// Price: $${data.price.toLocaleString()}
// Type: ${data.type}
// ${data.amenities?.length ? `Amenities: ${data.amenities.join(', ')}` : ''}

// Write 3 short paragraphs. Highlight lifestyle, key features, and neighborhood. Keep it under 200 words. No markdown.`

//   // Try Groq first
//   try {
//     const apiKey = process.env.GROQ_API_KEY
//     if (!apiKey) throw new Error('No key')
//     const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
//       body: JSON.stringify({
//         model: 'llama-3.3-70b-versatile',
//         messages: [{ role: 'user', content: prompt }],
//         max_tokens: 400,
//       }),
//     })
//     if (!res.ok) throw new Error(`Groq ${res.status}`)
//     const d = await res.json()
//     return d.choices?.[0]?.message?.content ?? ''
//   } catch {
//     // Gemini fallback
//     try {
//       const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
//       const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
//       const result = await model.generateContent(prompt)
//       return result.response.text()
//     } catch {
//       // OpenRouter last resort
//       const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
//           'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
//         },
//         body: JSON.stringify({
//           model: 'meta-llama/llama-3.3-70b-instruct:free',
//           messages: [{ role: 'user', content: prompt }],
//           max_tokens: 400,
//         }),
//       })
//       const d = await res.json()
//       return d.choices?.[0]?.message?.content ?? ''
//     }
//   }
// }



// /**
//  * lib/ai.ts — Triple-Fallback AI Engine
//  *
//  * Priority:
//  *   1. Groq        → llama-3.3-70b-versatile             (fastest, generous free tier)
//  *   2. Gemini      → gemini-2.5-flash                    (Google fallback, free tier)
//  *   3. OpenRouter  → llama-3.3-70b-instruct:free         (last resort, always free)
//  *
//  * Drop this file into src/lib/ai.ts.
//  * Update route.ts import: from '@/lib/gemini' → from '@/lib/ai'
//  * You can delete gemini.ts afterwards (or keep it, nothing imports it).
//  */

// import { GoogleGenerativeAI } from '@google/generative-ai'
// import type { ConversationMessage, Lead, LeadScore } from '@/types'

// // ─── Shared system prompt ─────────────────────────────────────────────────────

// const SYSTEM_PROMPT = `You are Alex, a professional real estate assistant for Domaine. You are warm, knowledgeable, and helpful.

// Your goals:
// 1. Engage visitors naturally in conversation about real estate
// 2. Understand their needs by asking qualifying questions (one at a time, naturally)
// 3. Extract these key data points conversationally:
//    - Full name
//    - Contact info (email or phone)
//    - Budget range
//    - Preferred location/neighborhood
//    - Property type (house, apartment, condo, villa, etc.)
//    - Timeline (how soon they want to buy/rent)
//    - Whether buying or renting
// 4. Recommend specific listings if you know their preferences
// 5. Encourage them to schedule a viewing or speak to an agent

// Qualification rules:
// - HOT lead: Has budget + timeline within 3 months + specific location + ready contact info
// - WARM lead: Has 2-3 criteria but no urgency
// - COLD lead: Just browsing, vague or no criteria

// IMPORTANT: Be natural, never robotic. Don't ask all questions at once. Respond in 1-3 sentences max per turn. Always be helpful and move the conversation forward.

// CONTACT COLLECTION RULES — these are strict:
// - You MUST collect an email address before ending any conversation or promising an agent will contact them.
// - Email is the minimum required. Phone is a bonus but not mandatory.
// - If someone is not comfortable giving their phone number, say "No problem! An email works perfectly." and ask for email instead.
// - If someone tries to wrap up without giving any contact info, say "I'd love to have one of our agents follow up with you — what's the best email to reach you on?"
// - NEVER say "an agent will get back to you" unless you already have their email or phone in the current conversation.
// - If you have their name but no contact info yet, always ask: "Great [name]! Just so our agent can reach you — what's your email address?"

// RESPONSE FORMAT — always reply with ONLY this JSON object, no preamble, no markdown fences:
// {
//   "reply": "<your conversational response — plain text, no markdown>",
//   "lead": {
//     "name": "<string or null>",
//     "email": "<string or null>",
//     "phone": "<string or null>",
//     "budget_min": <number or null>,
//     "budget_max": <number or null>,
//     "preferred_location": "<string or null>",
//     "property_type": "<house|apartment|condo|villa|townhouse|land|commercial or null>",
//     "timeline": "<string or null>",
//     "listing_type": "<sale|rent or null>"
//   }
// }`

// // ─── Shared response parser ───────────────────────────────────────────────────

// function parseAIResponse(raw: string): { reply: string; leadData: Partial<Lead> } {
//   // Strip markdown fences if present
//   let clean = raw.replace(/```json|```/g, '').trim()

//   // If the model prepended plain text before the JSON, extract just the JSON block
//   const jsonStart = clean.indexOf('{')
//   const jsonEnd = clean.lastIndexOf('}')
//   if (jsonStart > 0 && jsonEnd > jsonStart) {
//     clean = clean.slice(jsonStart, jsonEnd + 1)
//   }

//   try {
//     const parsed = JSON.parse(clean)
//     return {
//       reply: parsed.reply ?? raw,
//       leadData: parsed.lead ?? {},
//     }
//   } catch {
//     // Model didn't follow JSON format at all — use raw text as reply
//     return { reply: raw, leadData: {} }
//   }
// }

// // ─── Provider 1: Groq ─────────────────────────────────────────────────────────

// async function groqChat(
//   messages: ConversationMessage[],
//   userMessage: string,
//   systemPrompt: string
// ): Promise<{ reply: string; leadData: Partial<Lead> }> {
//   const apiKey = process.env.GROQ_API_KEY
//   if (!apiKey) throw new Error('GROQ_API_KEY not set')

//   const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${apiKey}`,
//     },
//     body: JSON.stringify({
//       model: 'llama-3.3-70b-versatile',
//       messages: [
//         { role: 'system', content: systemPrompt },
//         ...messages.map(m => ({
//           role: m.role === 'user' ? 'user' : 'assistant',
//           content: m.content,
//         })),
//         { role: 'user', content: userMessage },
//       ],
//       temperature: 0.7,
//       max_tokens: 512,
//       response_format: { type: 'json_object' },
//     }),
//   })

//   if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`)
//   const data = await res.json()
//   return parseAIResponse(data.choices?.[0]?.message?.content ?? '')
// }

// // ─── Provider 2: Gemini ───────────────────────────────────────────────────────

// async function geminiChat(
//   messages: ConversationMessage[],
//   userMessage: string,
//   systemPrompt: string
// ): Promise<{ reply: string; leadData: Partial<Lead> }> {
//   const apiKey = process.env.GEMINI_API_KEY
//   if (!apiKey) throw new Error('GEMINI_API_KEY not set')

//   const genAI = new GoogleGenerativeAI(apiKey)

//   // gemini-2.5-flash: best free-tier model as of 2026
//   // 10 RPM / 250 RPD — do NOT use 1.5 (deprecated) or 2.0-flash (shutting down June 2026)
//   const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

//   const history = messages.map(msg => ({
//     role: msg.role === 'user' ? 'user' : 'model',
//     parts: [{ text: msg.content }],
//   }))

//   const chat = model.startChat({
//     history,
//     systemInstruction: {
//       role: 'system',
//       parts: [{ text: systemPrompt }],
//     },
//   })

//   const result = await chat.sendMessage(userMessage)
//   return parseAIResponse(result.response.text())
// }

// // ─── Provider 3: OpenRouter ───────────────────────────────────────────────────

// async function openRouterChat(
//   messages: ConversationMessage[],
//   userMessage: string,
//   systemPrompt: string
// ): Promise<{ reply: string; leadData: Partial<Lead> }> {
//   const apiKey = process.env.OPENROUTER_API_KEY
//   if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

//   const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json',
//       Authorization: `Bearer ${apiKey}`,
//       'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
//       'X-Title': 'Domaine Real Estate',
//     },
//     body: JSON.stringify({
//       model: 'meta-llama/llama-3.3-70b-instruct:free',
//       messages: [
//         { role: 'system', content: systemPrompt },
//         ...messages.map(m => ({
//           role: m.role === 'user' ? 'user' : 'assistant',
//           content: m.content,
//         })),
//         { role: 'user', content: userMessage },
//       ],
//       temperature: 0.7,
//       max_tokens: 512,
//     }),
//   })

//   if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
//   const data = await res.json()
//   return parseAIResponse(data.choices?.[0]?.message?.content ?? '')
// }

// // ─── Lead scoring (unified — see lib/scoring.ts) ─────────────────────────────
// import { scoreLead } from '@/lib/scoring'

// // ─── Public API ───────────────────────────────────────────────────────────────

// export async function processChat(
//   messages: ConversationMessage[],
//   userMessage: string,
//   listingContext?: string
// ): Promise<{ reply: string; leadData: Partial<Lead>; leadScore: LeadScore }> {
//   const systemPrompt =
//     SYSTEM_PROMPT + (listingContext ? `\n\nCurrent listing context: ${listingContext}` : '')

//   let reply = ''
//   let leadData: Partial<Lead> = {}

//   const providers = [
//     { name: 'Groq',       fn: () => groqChat(messages, userMessage, systemPrompt) },
//     { name: 'Gemini',     fn: () => geminiChat(messages, userMessage, systemPrompt) },
//     { name: 'OpenRouter', fn: () => openRouterChat(messages, userMessage, systemPrompt) },
//   ]

//   for (const provider of providers) {
//     try {
//       ;({ reply, leadData } = await provider.fn())
//       console.log(`[AI] Responded via ${provider.name}`)
//       break
//     } catch (err) {
//       console.warn(`[AI] ${provider.name} failed:`, (err as Error).message)
//     }
//   }

//   if (!reply) throw new Error('All AI providers failed')

//   return { reply, leadData, leadScore: scoreLead(leadData) }
// }

// // ─── Listing description (also uses cascade) ──────────────────────────────────

// export async function generateListingDescription(data: {
//   title: string
//   bedrooms: number
//   bathrooms: number
//   sqft?: number
//   city: string
//   price: number
//   type: string
//   amenities?: string[]
// }): Promise<string> {
//   const prompt = `Write a compelling, professional real estate listing description for:
// Title: ${data.title}
// Location: ${data.city}
// Bedrooms: ${data.bedrooms}, Bathrooms: ${data.bathrooms}
// ${data.sqft ? `Square Footage: ${data.sqft} sq ft` : ''}
// Price: $${data.price.toLocaleString()}
// Type: ${data.type}
// ${data.amenities?.length ? `Amenities: ${data.amenities.join(', ')}` : ''}

// Write 3 short paragraphs. Highlight lifestyle, key features, and neighborhood. Keep it under 200 words. No markdown.`

//   // Try Groq first
//   try {
//     const apiKey = process.env.GROQ_API_KEY
//     if (!apiKey) throw new Error('No key')
//     const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
//       body: JSON.stringify({
//         model: 'llama-3.3-70b-versatile',
//         messages: [{ role: 'user', content: prompt }],
//         max_tokens: 400,
//       }),
//     })
//     if (!res.ok) throw new Error(`Groq ${res.status}`)
//     const d = await res.json()
//     return d.choices?.[0]?.message?.content ?? ''
//   } catch {
//     // Gemini fallback
//     try {
//       const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
//       const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
//       const result = await model.generateContent(prompt)
//       return result.response.text()
//     } catch {
//       // OpenRouter last resort
//       const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
//           'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
//         },
//         body: JSON.stringify({
//           model: 'meta-llama/llama-3.3-70b-instruct:free',
//           messages: [{ role: 'user', content: prompt }],
//           max_tokens: 400,
//         }),
//       })
//       const d = await res.json()
//       return d.choices?.[0]?.message?.content ?? ''
//     }
//   }
// }


// // /**
// //  * lib/ai.ts — Triple-Fallback AI Engine
// //  *
// //  * Priority:
// //  *   1. Groq        → llama-3.3-70b-versatile             (fastest, generous free tier)
// //  *   2. Gemini      → gemini-2.5-flash                    (Google fallback, free tier)
// //  *   3. OpenRouter  → llama-3.3-70b-instruct:free         (last resort, always free)
// //  *
// //  * Drop this file into src/lib/ai.ts.
// //  * Update route.ts import: from '@/lib/gemini' → from '@/lib/ai'
// //  * You can delete gemini.ts afterwards (or keep it, nothing imports it).
// //  */

// // import { GoogleGenerativeAI } from '@google/generative-ai'
// // import type { ConversationMessage, Lead, LeadScore } from '@/types'

// // // ─── Shared system prompt ─────────────────────────────────────────────────────

// // const SYSTEM_PROMPT = `You are Alex, a professional real estate assistant for Domaine. You are warm, knowledgeable, and helpful.

// // Your goals:
// // 1. Engage visitors naturally in conversation about real estate
// // 2. Understand their needs by asking qualifying questions (one at a time, naturally)
// // 3. Extract these key data points conversationally:
// //    - Full name
// //    - Contact info (email or phone)
// //    - Budget range
// //    - Preferred location/neighborhood
// //    - Property type (house, apartment, condo, villa, etc.)
// //    - Timeline (how soon they want to buy/rent)
// //    - Whether buying or renting
// // 4. Recommend specific listings if you know their preferences
// // 5. Encourage them to schedule a viewing or speak to an agent

// // Qualification rules:
// // - HOT lead: Has budget + timeline within 3 months + specific location + ready contact info
// // - WARM lead: Has 2-3 criteria but no urgency
// // - COLD lead: Just browsing, vague or no criteria

// // IMPORTANT: Be natural, never robotic. Don't ask all questions at once. Respond in 1-3 sentences max per turn. Always be helpful and move the conversation forward.

// // When you have enough info, say you'll connect them with an agent and ask for their contact details if not already provided.

// // RESPONSE FORMAT — always reply with ONLY this JSON object, no preamble, no markdown fences:
// // {
// //   "reply": "<your conversational response — plain text, no markdown>",
// //   "lead": {
// //     "name": "<string or null>",
// //     "email": "<string or null>",
// //     "phone": "<string or null>",
// //     "budget_min": <number or null>,
// //     "budget_max": <number or null>,
// //     "preferred_location": "<string or null>",
// //     "property_type": "<house|apartment|condo|villa|townhouse|land|commercial or null>",
// //     "timeline": "<string or null>",
// //     "listing_type": "<sale|rent or null>"
// //   }
// // }`

// // // ─── Shared response parser ───────────────────────────────────────────────────

// // function parseAIResponse(raw: string): { reply: string; leadData: Partial<Lead> } {
// //   try {
// //     const clean = raw.replace(/```json|```/g, '').trim()
// //     const parsed = JSON.parse(clean)
// //     return {
// //       reply: parsed.reply ?? raw,
// //       leadData: parsed.lead ?? {},
// //     }
// //   } catch {
// //     // Model didn't follow JSON format — use raw text as reply
// //     return { reply: raw, leadData: {} }
// //   }
// // }

// // // ─── Provider 1: Groq ─────────────────────────────────────────────────────────

// // async function groqChat(
// //   messages: ConversationMessage[],
// //   userMessage: string,
// //   systemPrompt: string
// // ): Promise<{ reply: string; leadData: Partial<Lead> }> {
// //   const apiKey = process.env.GROQ_API_KEY
// //   if (!apiKey) throw new Error('GROQ_API_KEY not set')

// //   const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// //     method: 'POST',
// //     headers: {
// //       'Content-Type': 'application/json',
// //       Authorization: `Bearer ${apiKey}`,
// //     },
// //     body: JSON.stringify({
// //       model: 'llama-3.3-70b-versatile',
// //       messages: [
// //         { role: 'system', content: systemPrompt },
// //         ...messages.map(m => ({
// //           role: m.role === 'user' ? 'user' : 'assistant',
// //           content: m.content,
// //         })),
// //         { role: 'user', content: userMessage },
// //       ],
// //       temperature: 0.7,
// //       max_tokens: 512,
// //     }),
// //   })

// //   if (!res.ok) throw new Error(`Groq ${res.status}: ${await res.text()}`)
// //   const data = await res.json()
// //   return parseAIResponse(data.choices?.[0]?.message?.content ?? '')
// // }

// // // ─── Provider 2: Gemini ───────────────────────────────────────────────────────

// // async function geminiChat(
// //   messages: ConversationMessage[],
// //   userMessage: string,
// //   systemPrompt: string
// // ): Promise<{ reply: string; leadData: Partial<Lead> }> {
// //   const apiKey = process.env.GEMINI_API_KEY
// //   if (!apiKey) throw new Error('GEMINI_API_KEY not set')

// //   const genAI = new GoogleGenerativeAI(apiKey)

// //   // gemini-2.5-flash: best free-tier model as of 2026
// //   // 10 RPM / 250 RPD — do NOT use 1.5 (deprecated) or 2.0-flash (shutting down June 2026)
// //   const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

// //   const history = messages.map(msg => ({
// //     role: msg.role === 'user' ? 'user' : 'model',
// //     parts: [{ text: msg.content }],
// //   }))

// //   const chat = model.startChat({
// //     history,
// //     systemInstruction: {
// //       role: 'system',
// //       parts: [{ text: systemPrompt }],
// //     },
// //   })

// //   const result = await chat.sendMessage(userMessage)
// //   return parseAIResponse(result.response.text())
// // }

// // // ─── Provider 3: OpenRouter ───────────────────────────────────────────────────

// // async function openRouterChat(
// //   messages: ConversationMessage[],
// //   userMessage: string,
// //   systemPrompt: string
// // ): Promise<{ reply: string; leadData: Partial<Lead> }> {
// //   const apiKey = process.env.OPENROUTER_API_KEY
// //   if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

// //   const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
// //     method: 'POST',
// //     headers: {
// //       'Content-Type': 'application/json',
// //       Authorization: `Bearer ${apiKey}`,
// //       'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
// //       'X-Title': 'Domaine Real Estate',
// //     },
// //     body: JSON.stringify({
// //       model: 'meta-llama/llama-3.3-70b-instruct:free',
// //       messages: [
// //         { role: 'system', content: systemPrompt },
// //         ...messages.map(m => ({
// //           role: m.role === 'user' ? 'user' : 'assistant',
// //           content: m.content,
// //         })),
// //         { role: 'user', content: userMessage },
// //       ],
// //       temperature: 0.7,
// //       max_tokens: 512,
// //     }),
// //   })

// //   if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`)
// //   const data = await res.json()
// //   return parseAIResponse(data.choices?.[0]?.message?.content ?? '')
// // }

// // // ─── Lead scoring ─────────────────────────────────────────────────────────────

// // function scoreLeadData(data: Partial<Lead>): LeadScore {
// //   let score = 0
// //   if (data.name) score += 1
// //   if (data.email || data.phone) score += 2
// //   if (data.budget_min || data.budget_max) score += 2
// //   if (data.preferred_location) score += 1
// //   if (data.property_type) score += 1
// //   if (data.timeline) {
// //     const t = data.timeline.toLowerCase()
// //     if (
// //       t.includes('asap') ||
// //       t.includes('immediately') ||
// //       t.includes('1 month') ||
// //       t.includes('month')
// //     )
// //       score += 3
// //     else if (t.includes('3 month') || t.includes('soon')) score += 2
// //     else score += 1
// //   }
// //   if (score >= 7) return 'hot'
// //   if (score >= 4) return 'warm'
// //   return 'cold'
// // }

// // // ─── Public API ───────────────────────────────────────────────────────────────

// // export async function processChat(
// //   messages: ConversationMessage[],
// //   userMessage: string,
// //   listingContext?: string
// // ): Promise<{ reply: string; leadData: Partial<Lead>; leadScore: LeadScore }> {
// //   const systemPrompt =
// //     SYSTEM_PROMPT + (listingContext ? `\n\nCurrent listing context: ${listingContext}` : '')

// //   let reply = ''
// //   let leadData: Partial<Lead> = {}

// //   const providers = [
// //     { name: 'Groq',       fn: () => groqChat(messages, userMessage, systemPrompt) },
// //     { name: 'Gemini',     fn: () => geminiChat(messages, userMessage, systemPrompt) },
// //     { name: 'OpenRouter', fn: () => openRouterChat(messages, userMessage, systemPrompt) },
// //   ]

// //   for (const provider of providers) {
// //     try {
// //       ;({ reply, leadData } = await provider.fn())
// //       console.log(`[AI] Responded via ${provider.name}`)
// //       break
// //     } catch (err) {
// //       console.warn(`[AI] ${provider.name} failed:`, (err as Error).message)
// //     }
// //   }

// //   if (!reply) throw new Error('All AI providers failed')

// //   return { reply, leadData, leadScore: scoreLeadData(leadData) }
// // }

// // // ─── Listing description (also uses cascade) ──────────────────────────────────

// // export async function generateListingDescription(data: {
// //   title: string
// //   bedrooms: number
// //   bathrooms: number
// //   sqft?: number
// //   city: string
// //   price: number
// //   type: string
// //   amenities?: string[]
// // }): Promise<string> {
// //   const prompt = `Write a compelling, professional real estate listing description for:
// // Title: ${data.title}
// // Location: ${data.city}
// // Bedrooms: ${data.bedrooms}, Bathrooms: ${data.bathrooms}
// // ${data.sqft ? `Square Footage: ${data.sqft} sq ft` : ''}
// // Price: $${data.price.toLocaleString()}
// // Type: ${data.type}
// // ${data.amenities?.length ? `Amenities: ${data.amenities.join(', ')}` : ''}

// // Write 3 short paragraphs. Highlight lifestyle, key features, and neighborhood. Keep it under 200 words. No markdown.`

// //   // Try Groq first
// //   try {
// //     const apiKey = process.env.GROQ_API_KEY
// //     if (!apiKey) throw new Error('No key')
// //     const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
// //       body: JSON.stringify({
// //         model: 'llama-3.3-70b-versatile',
// //         messages: [{ role: 'user', content: prompt }],
// //         max_tokens: 400,
// //       }),
// //     })
// //     if (!res.ok) throw new Error(`Groq ${res.status}`)
// //     const d = await res.json()
// //     return d.choices?.[0]?.message?.content ?? ''
// //   } catch {
// //     // Gemini fallback
// //     try {
// //       const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
// //       const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
// //       const result = await model.generateContent(prompt)
// //       return result.response.text()
// //     } catch {
// //       // OpenRouter last resort
// //       const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
// //         method: 'POST',
// //         headers: {
// //           'Content-Type': 'application/json',
// //           Authorization: `Bearer ${process.env.OPENROUTER_API_KEY!}`,
// //           'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
// //         },
// //         body: JSON.stringify({
// //           model: 'meta-llama/llama-3.3-70b-instruct:free',
// //           messages: [{ role: 'user', content: prompt }],
// //           max_tokens: 400,
// //         }),
// //       })
// //       const d = await res.json()
// //       return d.choices?.[0]?.message?.content ?? ''
// //     }
// //   }
// // }
