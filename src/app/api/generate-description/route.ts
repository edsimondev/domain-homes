/**
 * /api/generate-description
 *
 * Server-side API route that generates a property description using AI.
 * Runs on the server so secret API keys (GROQ, GEMINI, OPENROUTER) are
 * available via process.env — they are never exposed to the browser.
 *
 * Cascade order:
 *   1. Groq       → llama-3.3-70b-versatile  (fastest, generous free tier)
 *   2. Gemini     → gemini-1.5-flash          (reliable free tier)
 *   3. OpenRouter → llama-3.3-70b-instruct    (last resort)
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, bedrooms, bathrooms, sqft, city, price, type, amenities } = body

    if (!title || !city) {
      return NextResponse.json(
        { error: 'Missing required fields: title and city are required' },
        { status: 400 }
      )
    }

    const prompt = `Write a compelling, professional real estate listing description for:
Title: ${title}
Location: ${city}
Bedrooms: ${bedrooms ?? 0}, Bathrooms: ${bathrooms ?? 0}
${sqft ? `Square Footage: ${sqft} sq ft` : ''}
${price ? `Price: $${Number(price).toLocaleString()}` : ''}
Type: ${type ?? 'property'}
${amenities?.length ? `Amenities: ${(amenities as string[]).join(', ')}` : ''}

Write 3 short paragraphs. Highlight lifestyle, key features, and the neighborhood appeal. Keep it under 200 words. Plain text only, no markdown, no bullet points.`

    // ── Provider 1: Groq ──────────────────────────────────────────────────────
    const groqKey = process.env.GROQ_API_KEY
    if (groqKey) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 400,
            temperature: 0.7,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const text = data.choices?.[0]?.message?.content?.trim()
          if (text) {
            console.log('[generate-description] ✓ Groq')
            return NextResponse.json({ description: text })
          }
        } else {
          console.warn('[generate-description] Groq failed:', res.status, await res.text())
        }
      } catch (err) {
        console.warn('[generate-description] Groq error:', (err as Error).message)
      }
    }

    // ── Provider 2: Gemini ────────────────────────────────────────────────────
    // Uses gemini-1.5-flash — works reliably on a free API key from aistudio.google.com
    // gemini-2.5-flash requires billing enabled on Google Cloud (causes 400 errors on free keys)
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
        const result = await model.generateContent(prompt)
        const text = result.response.text()?.trim()
        if (text) {
          console.log('[generate-description] ✓ Gemini')
          return NextResponse.json({ description: text })
        }
      } catch (err) {
        console.warn('[generate-description] Gemini error:', (err as Error).message)
      }
    }

    // ── Provider 3: OpenRouter ────────────────────────────────────────────────
    const orKey = process.env.OPENROUTER_API_KEY
    if (orKey) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${orKey}`,
            'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
            'X-Title': 'Domaine Real Estate',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.3-70b-instruct:free',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 400,
            temperature: 0.7,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          const text = data.choices?.[0]?.message?.content?.trim()
          if (text) {
            console.log('[generate-description] ✓ OpenRouter')
            return NextResponse.json({ description: text })
          }
        } else {
          console.warn('[generate-description] OpenRouter failed:', res.status, await res.text())
        }
      } catch (err) {
        console.warn('[generate-description] OpenRouter error:', (err as Error).message)
      }
    }

    return NextResponse.json(
      { error: 'All AI providers failed. Check your API keys in .env.local' },
      { status: 502 }
    )
  } catch (err: any) {
    console.error('[generate-description] Unexpected error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}


// /**
//  * /api/generate-description
//  *
//  * Server-side API route that generates a property description using AI.
//  * Runs on the server so secret API keys (GROQ, GEMINI, OPENROUTER) are
//  * available via process.env — they are never exposed to the browser.
//  *
//  * Cascade order:
//  *   1. Groq       → llama-3.3-70b-versatile  (fastest, generous free tier)
//  *   2. Gemini     → gemini-1.5-flash          (reliable free tier)
//  *   3. OpenRouter → llama-3.3-70b-instruct    (last resort)
//  */

// import { NextRequest, NextResponse } from 'next/server'
// import { GoogleGenerativeAI } from '@google/generative-ai'

// export async function POST(req: NextRequest) {
//   try {
//     const body = await req.json()
//     const { title, bedrooms, bathrooms, sqft, city, price, type, amenities } = body

//     if (!title || !city) {
//       return NextResponse.json(
//         { error: 'Missing required fields: title and city are required' },
//         { status: 400 }
//       )
//     }

//     const prompt = `Write a compelling, professional real estate listing description for:
// Title: ${title}
// Location: ${city}
// Bedrooms: ${bedrooms ?? 0}, Bathrooms: ${bathrooms ?? 0}
// ${sqft ? `Square Footage: ${sqft} sq ft` : ''}
// ${price ? `Price: $${Number(price).toLocaleString()}` : ''}
// Type: ${type ?? 'property'}
// ${amenities?.length ? `Amenities: ${(amenities as string[]).join(', ')}` : ''}

// Write 3 short paragraphs. Highlight lifestyle, key features, and the neighborhood appeal. Keep it under 200 words. Plain text only, no markdown, no bullet points.`

//     // ── Provider 1: Groq ──────────────────────────────────────────────────────
//     const groqKey = process.env.GROQ_API_KEY
//     if (groqKey) {
//       try {
//         const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${groqKey}`,
//           },
//           body: JSON.stringify({
//             model: 'llama-3.3-70b-versatile',
//             messages: [{ role: 'user', content: prompt }],
//             max_tokens: 400,
//             temperature: 0.7,
//           }),
//         })
//         if (res.ok) {
//           const data = await res.json()
//           const text = data.choices?.[0]?.message?.content?.trim()
//           if (text) {
//             console.log('[generate-description] ✓ Groq')
//             return NextResponse.json({ description: text })
//           }
//         } else {
//           console.warn('[generate-description] Groq failed:', res.status, await res.text())
//         }
//       } catch (err) {
//         console.warn('[generate-description] Groq error:', (err as Error).message)
//       }
//     }

//     // ── Provider 2: Gemini ────────────────────────────────────────────────────
//     // Uses gemini-1.5-flash — works reliably on a free API key from aistudio.google.com
//     // gemini-2.5-flash requires billing enabled on Google Cloud (causes 400 errors on free keys)
//     const geminiKey = process.env.GEMINI_API_KEY
//     if (geminiKey) {
//       try {
//         const genAI = new GoogleGenerativeAI(geminiKey)
//         const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
//         const result = await model.generateContent(prompt)
//         const text = result.response.text()?.trim()
//         if (text) {
//           console.log('[generate-description] ✓ Gemini')
//           return NextResponse.json({ description: text })
//         }
//       } catch (err) {
//         console.warn('[generate-description] Gemini error:', (err as Error).message)
//       }
//     }

//     // ── Provider 3: OpenRouter ────────────────────────────────────────────────
//     const orKey = process.env.OPENROUTER_API_KEY
//     if (orKey) {
//       try {
//         const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${orKey}`,
//             'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
//             'X-Title': 'Domaine Real Estate',
//           },
//           body: JSON.stringify({
//             model: 'meta-llama/llama-3.3-70b-instruct:free',
//             messages: [{ role: 'user', content: prompt }],
//             max_tokens: 400,
//             temperature: 0.7,
//           }),
//         })
//         if (res.ok) {
//           const data = await res.json()
//           const text = data.choices?.[0]?.message?.content?.trim()
//           if (text) {
//             console.log('[generate-description] ✓ OpenRouter')
//             return NextResponse.json({ description: text })
//           }
//         } else {
//           console.warn('[generate-description] OpenRouter failed:', res.status, await res.text())
//         }
//       } catch (err) {
//         console.warn('[generate-description] OpenRouter error:', (err as Error).message)
//       }
//     }

//     return NextResponse.json(
//       { error: 'All AI providers failed. Check your API keys in .env.local' },
//       { status: 502 }
//     )
//   } catch (err: any) {
//     console.error('[generate-description] Unexpected error:', err)
//     return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
//   }
// }
