import { NextRequest, NextResponse } from "next/server";
import { processChat } from "@/lib/ai";
import { runInstantLeadAlert } from "@/lib/automation";
import { sendLeadConfirmation } from "@/lib/email/templates";
import { sendLeadTelegramAlert } from "@/lib/telegram";
import { createAdminClient } from "@/lib/supabase/server";
import type { ConversationMessage } from "@/types";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, session_id, listing_context } = body;

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const sid = session_id || uuidv4();
    const supabase = await createAdminClient();

    // Fetch existing conversation
    let conversationId: string | null = null;
    let existingMessages: ConversationMessage[] = [];

    const { data: existingConv } = await supabase
      .from("conversations")
      .select("*")
      .eq("session_id", sid)
      .single();

    if (existingConv) {
      conversationId = existingConv.id;
      existingMessages = existingConv.messages || [];
    }

    // Process with hybrid AI (Groq → Gemini → OpenRouter)
    const { reply, leadData, leadScore } = await processChat(
      existingMessages,
      message,
      listing_context,
    );

    // Append messages
    const updatedMessages: ConversationMessage[] = [
      ...existingMessages,
      { role: "user", content: message, timestamp: new Date().toISOString() },
      {
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      },
    ];

    // Upsert conversation
    if (conversationId) {
      await supabase
        .from("conversations")
        .update({
          messages: updatedMessages,
          lead_data: leadData,
          lead_score: leadScore,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);
    } else {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({
          session_id: sid,
          messages: updatedMessages,
          lead_data: leadData,
          lead_score: leadScore,
        })
        .select("id")
        .single();
      conversationId = newConv?.id || null;
    }

    // Save/update lead only when we have contact info (email OR phone)
    // Don't save on name alone — wait until we have a way to reach them
    if (leadData?.email || leadData?.phone) {
      // Check if lead already exists for this session
      const { data: existingLead } = await supabase
        .from("leads")
        .select("id, email")
        .eq("conversation_id", conversationId)
        .single();

      const leadPayload = {
        name: leadData.name || "Anonymous",
        email: leadData.email,
        phone: leadData.phone,
        budget_min: leadData.budget_min,
        budget_max: leadData.budget_max,
        preferred_location: leadData.preferred_location,
        property_type: leadData.property_type,
        timeline: leadData.timeline,
        lead_score: leadScore,
        source: "ai_chat",
        conversation_id: conversationId,
      };

      if (existingLead) {
        // Lead exists — update it
        // If email was just captured for the first time, send confirmation
        const emailJustCaptured = !existingLead.email && leadData.email;
        await supabase
          .from("leads")
          .update(leadPayload)
          .eq("id", existingLead.id);

        if (emailJustCaptured && leadData.email) {
          sendLeadConfirmation({
            to: leadData.email,
            leadName: (leadData.name || "there").split(" ")[0],
            source: "ai_chat",
            budget_max: leadData.budget_max,
            preferred_location: leadData.preferred_location,
            property_type: leadData.property_type,
          }).catch(console.error);
        }
      } else {
        // Brand new lead — save and fire all alerts
        const { data: newLead } = await supabase
          .from("leads")
          .insert(leadPayload)
          .select()
          .single();

        if (newLead) {
          // 🔥 Agent alert
          runInstantLeadAlert(newLead).catch(console.error);

          // ✅ Confirmation to the lead (only if we have their email)
          if (newLead.email) {
            sendLeadConfirmation({
              to: newLead.email,
              leadName: (newLead.name || "there").split(" ")[0],
              source: "ai_chat",
              budget_max: newLead.budget_max,
              preferred_location: newLead.preferred_location,
              property_type: newLead.property_type,
            }).catch(console.error);
          }

          // 📊 MAKE.COM WEBHOOK — fires when chat captures a lead
          const makeWebhookUrl =
            process.env.MAKE_LEAD_WEBHOOK_URL ||
            "https://hook.eu1.make.com/5ldoq65rty8cxrk3yvjackofrlxijjo6";
          fetch(makeWebhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: newLead.id,
              name: newLead.name || "",
              first_name: (newLead.name || "").split(" ")[0],
              email: newLead.email || "",
              phone: newLead.phone || "",
              lead_score: newLead.lead_score || "cold",
              lead_score_label:
                newLead.lead_score === "hot"
                  ? "HOT LEAD"
                  : newLead.lead_score === "warm"
                    ? "WARM LEAD"
                    : "NEW LEAD",
              source: "ai_chat",
              source_label: "AI Chat",
              budget_min: newLead.budget_min || "",
              budget_max: newLead.budget_max || "",
              budget_text: newLead.budget_max
                ? `$${Number(newLead.budget_max).toLocaleString()}`
                : "Not specified",
              preferred_location: newLead.preferred_location || "",
              property_type: newLead.property_type || "",
              timeline: newLead.timeline || "",
              listing_type: newLead.listing_type || "",
              message: newLead.message || "",
              listing_title: "",
              created_at: newLead.created_at,
              site_name: process.env.NEXT_PUBLIC_SITE_NAME || "Domaine",
              site_url: process.env.NEXT_PUBLIC_SITE_URL || "",
              admin_url: `${process.env.NEXT_PUBLIC_SITE_URL}/admin/leads`,
              booking_url:
                process.env.NEXT_PUBLIC_CAL_BOOKING_URL ||
                `${process.env.NEXT_PUBLIC_SITE_URL}/contact`,
            }),
          }).catch((err) =>
            console.warn("[Make.com] Chat webhook failed:", err.message),
          );

          // 📣 TELEGRAM ALERT — fires for ALL leads (hot, warm, cold)
          sendLeadTelegramAlert(newLead);
        }
      }
    }

    return NextResponse.json({
      reply,
      session_id: sid,
      lead_score: leadScore,
    });
  } catch (error: any) {
    console.error("[Chat API]", error);
    return NextResponse.json({ error: "Chat unavailable" }, { status: 500 });
  }
}

// import { NextRequest, NextResponse } from 'next/server'
// import { processChat } from '@/lib/ai'
// import { runInstantLeadAlert } from '@/lib/automation'
// import { sendLeadConfirmation } from '@/lib/email/templates'
// import { sendLeadTelegramAlert } from '@/lib/telegram'
// import { createAdminClient } from '@/lib/supabase/server'
// import type { ConversationMessage } from '@/types'
// import { v4 as uuidv4 } from 'uuid'

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { message, session_id, listing_context } = body

//     if (!message) {
//       return NextResponse.json({ error: 'Message required' }, { status: 400 })
//     }

//     const sid = session_id || uuidv4()
//     const supabase = await createAdminClient()

//     // Fetch existing conversation
//     let conversationId: string | null = null
//     let existingMessages: ConversationMessage[] = []

//     const { data: existingConv } = await supabase
//       .from('conversations')
//       .select('*')
//       .eq('session_id', sid)
//       .single()

//     if (existingConv) {
//       conversationId = existingConv.id
//       existingMessages = existingConv.messages || []
//     }

//     // Process with hybrid AI (Groq → Gemini → OpenRouter)
//     const { reply, leadData, leadScore } = await processChat(
//       existingMessages,
//       message,
//       listing_context
//     )

//     // Append messages
//     const updatedMessages: ConversationMessage[] = [
//       ...existingMessages,
//       { role: 'user', content: message, timestamp: new Date().toISOString() },
//       { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
//     ]

//     // Upsert conversation
//     if (conversationId) {
//       await supabase
//         .from('conversations')
//         .update({
//           messages: updatedMessages,
//           lead_data: leadData,
//           lead_score: leadScore,
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', conversationId)
//     } else {
//       const { data: newConv } = await supabase
//         .from('conversations')
//         .insert({
//           session_id: sid,
//           messages: updatedMessages,
//           lead_data: leadData,
//           lead_score: leadScore,
//         })
//         .select('id')
//         .single()
//       conversationId = newConv?.id || null
//     }

//     // Save/update lead only when we have contact info (email OR phone)
//     // Don't save on name alone — wait until we have a way to reach them
//     if (leadData?.email || leadData?.phone) {

//       // Check if lead already exists for this session
//       const { data: existingLead } = await supabase
//         .from('leads')
//         .select('id, email')
//         .eq('conversation_id', conversationId)
//         .single()

//       const leadPayload = {
//         name: leadData.name || 'Anonymous',
//         email: leadData.email,
//         phone: leadData.phone,
//         budget_min: leadData.budget_min,
//         budget_max: leadData.budget_max,
//         preferred_location: leadData.preferred_location,
//         property_type: leadData.property_type,
//         timeline: leadData.timeline,
//         lead_score: leadScore,
//         source: 'ai_chat',
//         conversation_id: conversationId,
//       }

//       if (existingLead) {
//         // Lead exists — update it
//         // If email was just captured for the first time, send confirmation
//         const emailJustCaptured = !existingLead.email && leadData.email
//         await supabase.from('leads').update(leadPayload).eq('id', existingLead.id)

//         if (emailJustCaptured && leadData.email) {
//           sendLeadConfirmation({
//             to: leadData.email,
//             leadName: (leadData.name || 'there').split(' ')[0],
//             source: 'ai_chat',
//             budget_max: leadData.budget_max,
//             preferred_location: leadData.preferred_location,
//             property_type: leadData.property_type,
//           }).catch(console.error)
//         }
//       } else {
//         // Brand new lead — save and fire all alerts
//         const { data: newLead } = await supabase
//           .from('leads')
//           .insert(leadPayload)
//           .select()
//           .single()

//         if (newLead) {
//           // 🔥 Agent alert
//           runInstantLeadAlert(newLead).catch(console.error)

//           // ✅ Confirmation to the lead (only if we have their email)
//           if (newLead.email) {
//             sendLeadConfirmation({
//               to: newLead.email,
//               leadName: (newLead.name || 'there').split(' ')[0],
//               source: 'ai_chat',
//               budget_max: newLead.budget_max,
//               preferred_location: newLead.preferred_location,
//               property_type: newLead.property_type,
//             }).catch(console.error)
//           }

//           // 📊 Google Sheets mirror
//           // Mirror lead to Google Sheets (via Apps Script — no Make.com needed)
//     if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
//       fetch(`${process.env.NEXT_PUBLIC_SITE_URL}/api/sheets`, {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//                 name: newLead.name,
//                 email: newLead.email || '',
//                 phone: newLead.phone || '',
//                 lead_score: newLead.lead_score,
//                 source: 'ai_chat',
//                 budget_max: newLead.budget_max || '',
//                 preferred_location: newLead.preferred_location || '',
//                 property_type: newLead.property_type || '',
//                 listing_title: '',
//                 message: '',
//                 created_at: newLead.created_at,
//               }),
//       }).catch(console.error)
//     }

//           // 📣 TELEGRAM ALERT — fires for ALL leads (hot, warm, cold)
//           sendLeadTelegramAlert(newLead)
//         }
//       }
//     }

//     return NextResponse.json({
//       reply,
//       session_id: sid,
//       lead_score: leadScore,
//     })
//   } catch (error: any) {
//     console.error('[Chat API]', error)
//     return NextResponse.json({ error: 'Chat unavailable' }, { status: 500 })
//   }
// }

// import { NextRequest, NextResponse } from 'next/server'
// import { processChat } from '@/lib/ai'
// import { runInstantLeadAlert } from '@/lib/automation'
// import { sendLeadConfirmation } from '@/lib/email/templates'
// import { sendLeadTelegramAlert } from '@/lib/telegram'
// import { createAdminClient } from '@/lib/supabase/server'
// import type { ConversationMessage } from '@/types'
// import { v4 as uuidv4 } from 'uuid'

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { message, session_id, listing_context } = body

//     if (!message) {
//       return NextResponse.json({ error: 'Message required' }, { status: 400 })
//     }

//     const sid = session_id || uuidv4()
//     const supabase = await createAdminClient()

//     // Fetch existing conversation
//     let conversationId: string | null = null
//     let existingMessages: ConversationMessage[] = []

//     const { data: existingConv } = await supabase
//       .from('conversations')
//       .select('*')
//       .eq('session_id', sid)
//       .single()

//     if (existingConv) {
//       conversationId = existingConv.id
//       existingMessages = existingConv.messages || []
//     }

//     // Process with hybrid AI (Groq → Gemini → OpenRouter)
//     const { reply, leadData, leadScore } = await processChat(
//       existingMessages,
//       message,
//       listing_context
//     )

//     // Append messages
//     const updatedMessages: ConversationMessage[] = [
//       ...existingMessages,
//       { role: 'user', content: message, timestamp: new Date().toISOString() },
//       { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
//     ]

//     // Upsert conversation
//     if (conversationId) {
//       await supabase
//         .from('conversations')
//         .update({
//           messages: updatedMessages,
//           lead_data: leadData,
//           lead_score: leadScore,
//           updated_at: new Date().toISOString(),
//         })
//         .eq('id', conversationId)
//     } else {
//       const { data: newConv } = await supabase
//         .from('conversations')
//         .insert({
//           session_id: sid,
//           messages: updatedMessages,
//           lead_data: leadData,
//           lead_score: leadScore,
//         })
//         .select('id')
//         .single()
//       conversationId = newConv?.id || null
//     }

//     // Save/update lead only when we have contact info (email OR phone)
//     // Don't save on name alone — wait until we have a way to reach them
//     if (leadData?.email || leadData?.phone) {

//       // Check if lead already exists for this session
//       const { data: existingLead } = await supabase
//         .from('leads')
//         .select('id, email')
//         .eq('conversation_id', conversationId)
//         .single()

//       const leadPayload = {
//         name: leadData.name || 'Anonymous',
//         email: leadData.email,
//         phone: leadData.phone,
//         budget_min: leadData.budget_min,
//         budget_max: leadData.budget_max,
//         preferred_location: leadData.preferred_location,
//         property_type: leadData.property_type,
//         timeline: leadData.timeline,
//         lead_score: leadScore,
//         source: 'ai_chat',
//         conversation_id: conversationId,
//       }

//       if (existingLead) {
//         // Lead exists — update it
//         // If email was just captured for the first time, send confirmation
//         const emailJustCaptured = !existingLead.email && leadData.email
//         await supabase.from('leads').update(leadPayload).eq('id', existingLead.id)

//         if (emailJustCaptured && leadData.email) {
//           sendLeadConfirmation({
//             to: leadData.email,
//             leadName: (leadData.name || 'there').split(' ')[0],
//             source: 'ai_chat',
//             budget_max: leadData.budget_max,
//             preferred_location: leadData.preferred_location,
//             property_type: leadData.property_type,
//           }).catch(console.error)
//         }
//       } else {
//         // Brand new lead — save and fire all alerts
//         const { data: newLead } = await supabase
//           .from('leads')
//           .insert(leadPayload)
//           .select()
//           .single()

//         if (newLead) {
//           // 🔥 Agent alert
//           runInstantLeadAlert(newLead).catch(console.error)

//           // ✅ Confirmation to the lead (only if we have their email)
//           if (newLead.email) {
//             sendLeadConfirmation({
//               to: newLead.email,
//               leadName: (newLead.name || 'there').split(' ')[0],
//               source: 'ai_chat',
//               budget_max: newLead.budget_max,
//               preferred_location: newLead.preferred_location,
//               property_type: newLead.property_type,
//             }).catch(console.error)
//           }

//           // 📊 Google Sheets mirror
//           if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
//             fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
//               method: 'POST',
//               headers: { 'Content-Type': 'application/json' },
//               body: JSON.stringify({
//                 name: newLead.name,
//                 email: newLead.email || '',
//                 phone: newLead.phone || '',
//                 lead_score: newLead.lead_score,
//                 source: 'ai_chat',
//                 budget_max: newLead.budget_max || '',
//                 preferred_location: newLead.preferred_location || '',
//                 property_type: newLead.property_type || '',
//                 listing_title: '',
//                 message: '',
//                 created_at: newLead.created_at,
//               }),
//             }).catch(console.error)
//           }

//           // 📣 TELEGRAM ALERT — fires for ALL leads (hot, warm, cold)
//           sendLeadTelegramAlert(newLead)
//         }
//       }
//     }

//     return NextResponse.json({
//       reply,
//       session_id: sid,
//       lead_score: leadScore,
//     })
//   } catch (error: any) {
//     console.error('[Chat API]', error)
//     return NextResponse.json({ error: 'Chat unavailable' }, { status: 500 })
//   }
// }

// // import { NextRequest, NextResponse } from 'next/server'
// // import { processChat } from '@/lib/ai'
// // import { runInstantLeadAlert } from '@/lib/automation'
// // import { sendLeadConfirmation } from '@/lib/email/templates'
// // import { sendLeadTelegramAlert } from '@/lib/telegram'
// // import { createAdminClient } from '@/lib/supabase/server'
// // import type { ConversationMessage } from '@/types'
// // import { v4 as uuidv4 } from 'uuid'

// // export async function POST(request: NextRequest) {
// //   try {
// //     const body = await request.json()
// //     const { message, session_id, listing_context } = body

// //     if (!message) {
// //       return NextResponse.json({ error: 'Message required' }, { status: 400 })
// //     }

// //     const sid = session_id || uuidv4()
// //     const supabase = await createAdminClient()

// //     // Fetch existing conversation
// //     let conversationId: string | null = null
// //     let existingMessages: ConversationMessage[] = []

// //     const { data: existingConv } = await supabase
// //       .from('conversations')
// //       .select('*')
// //       .eq('session_id', sid)
// //       .single()

// //     if (existingConv) {
// //       conversationId = existingConv.id
// //       existingMessages = existingConv.messages || []
// //     }

// //     // Process with hybrid AI (Groq → Gemini → OpenRouter)
// //     const { reply, leadData, leadScore } = await processChat(
// //       existingMessages,
// //       message,
// //       listing_context
// //     )

// //     // Append messages
// //     const updatedMessages: ConversationMessage[] = [
// //       ...existingMessages,
// //       { role: 'user', content: message, timestamp: new Date().toISOString() },
// //       { role: 'assistant', content: reply, timestamp: new Date().toISOString() },
// //     ]

// //     // Upsert conversation
// //     if (conversationId) {
// //       await supabase
// //         .from('conversations')
// //         .update({
// //           messages: updatedMessages,
// //           lead_data: leadData,
// //           lead_score: leadScore,
// //           updated_at: new Date().toISOString(),
// //         })
// //         .eq('id', conversationId)
// //     } else {
// //       const { data: newConv } = await supabase
// //         .from('conversations')
// //         .insert({
// //           session_id: sid,
// //           messages: updatedMessages,
// //           lead_data: leadData,
// //           lead_score: leadScore,
// //         })
// //         .select('id')
// //         .single()
// //       conversationId = newConv?.id || null
// //     }

// //     // Save/update lead if we have enough data
// //     if (leadData?.email || leadData?.phone || leadData?.name) {

// //       // Check if lead already exists for this session
// //       const { data: existingLead } = await supabase
// //         .from('leads')
// //         .select('id, email')
// //         .eq('conversation_id', conversationId)
// //         .single()

// //       const leadPayload = {
// //         name: leadData.name || 'Anonymous',
// //         email: leadData.email,
// //         phone: leadData.phone,
// //         budget_min: leadData.budget_min,
// //         budget_max: leadData.budget_max,
// //         preferred_location: leadData.preferred_location,
// //         property_type: leadData.property_type,
// //         timeline: leadData.timeline,
// //         lead_score: leadScore,
// //         source: 'ai_chat',
// //         conversation_id: conversationId,
// //       }

// //       if (existingLead) {
// //         // Lead exists — update it
// //         // If email was just captured for the first time, send confirmation
// //         const emailJustCaptured = !existingLead.email && leadData.email
// //         await supabase.from('leads').update(leadPayload).eq('id', existingLead.id)

// //         if (emailJustCaptured && leadData.email) {
// //           sendLeadConfirmation({
// //             to: leadData.email,
// //             leadName: (leadData.name || 'there').split(' ')[0],
// //             source: 'ai_chat',
// //             budget_max: leadData.budget_max,
// //             preferred_location: leadData.preferred_location,
// //             property_type: leadData.property_type,
// //           }).catch(console.error)
// //         }
// //       } else {
// //         // Brand new lead — save and fire all alerts
// //         const { data: newLead } = await supabase
// //           .from('leads')
// //           .insert(leadPayload)
// //           .select()
// //           .single()

// //         if (newLead) {
// //           // 🔥 Agent alert
// //           runInstantLeadAlert(newLead).catch(console.error)

// //           // ✅ Confirmation to the lead (only if we have their email)
// //           if (newLead.email) {
// //             sendLeadConfirmation({
// //               to: newLead.email,
// //               leadName: (newLead.name || 'there').split(' ')[0],
// //               source: 'ai_chat',
// //               budget_max: newLead.budget_max,
// //               preferred_location: newLead.preferred_location,
// //               property_type: newLead.property_type,
// //             }).catch(console.error)
// //           }

// //           // 📊 Google Sheets mirror
// //           if (process.env.GOOGLE_SHEETS_WEBHOOK_URL) {
// //             fetch(process.env.GOOGLE_SHEETS_WEBHOOK_URL, {
// //               method: 'POST',
// //               headers: { 'Content-Type': 'application/json' },
// //               body: JSON.stringify({
// //                 name: newLead.name,
// //                 email: newLead.email || '',
// //                 phone: newLead.phone || '',
// //                 lead_score: newLead.lead_score,
// //                 source: 'ai_chat',
// //                 budget_max: newLead.budget_max || '',
// //                 preferred_location: newLead.preferred_location || '',
// //                 property_type: newLead.property_type || '',
// //                 listing_title: '',
// //                 message: '',
// //                 created_at: newLead.created_at,
// //               }),
// //             }).catch(console.error)
// //           }

// //           // 📣 TELEGRAM ALERT — fires for ALL leads (hot, warm, cold)
// //           sendLeadTelegramAlert(newLead)
// //         }
// //       }
// //     }

// //     return NextResponse.json({
// //       reply,
// //       session_id: sid,
// //       lead_score: leadScore,
// //     })
// //   } catch (error: any) {
// //     console.error('[Chat API]', error)
// //     return NextResponse.json({ error: 'Chat unavailable' }, { status: 500 })
// //   }
// // }
