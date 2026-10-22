import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { runNurtureStep } from "@/lib/automation";

// POST /api/automation/nurture
// Actions: enroll | process | cancel
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}))
  const { action } = body

  // Nurture queue processing disabled — handled via Make.com
  if (action === 'process') {
    return NextResponse.json({
      success: true,
      processed: 0,
      message: 'Nurture processing is now handled via Make.com.',
    })
  }

  try {
    const supabase = await createAdminClient();

    // ── ENROLL LEADS INTO A SEQUENCE ──────────────────────────
    if (action === "enroll") {
      const { sequence_id, lead_ids } = body;
      if (!sequence_id || !lead_ids?.length) {
        return NextResponse.json(
          { error: "sequence_id and lead_ids required" },
          { status: 400 },
        );
      }

      const { data: sequence } = await supabase
        .from("nurture_sequences")
        .select("*")
        .eq("id", sequence_id)
        .single();

      if (!sequence)
        return NextResponse.json(
          { error: "Sequence not found" },
          { status: 404 },
        );

      const delayDays: number[] = sequence.delay_days || [1, 7, 14, 30, 60];
      const enrolled: string[] = [];
      const skipped: string[] = [];

      for (const lead_id of lead_ids) {
        // Check if already enrolled
        const { data: existing } = await supabase
          .from("nurture_enrollments")
          .select("id, status")
          .eq("sequence_id", sequence_id)
          .eq("lead_id", lead_id)
          .single();

        if (existing && existing.status === "active") {
          skipped.push(lead_id);
          continue;
        }

        // Create enrollment
        await supabase.from("nurture_enrollments").upsert(
          {
            sequence_id,
            lead_id,
            status: "active",
            enrolled_at: new Date().toISOString(),
          },
          { onConflict: "sequence_id,lead_id" },
        );

        // Schedule all steps
        const queueItems = delayDays
          .slice(0, sequence.steps_count)
          .map((days, idx) => ({
            sequence_id,
            lead_id,
            step_number: idx + 1,
            total_steps: sequence.steps_count,
            status: "pending",
            scheduled_for: new Date(
              Date.now() + days * 24 * 60 * 60 * 1000,
            ).toISOString(),
          }));

        await supabase.from("nurture_queue").upsert(queueItems, {
          onConflict: "sequence_id,lead_id,step_number",
        });

        enrolled.push(lead_id);
      }

      // Update enrollment count on sequence
      await supabase
        .from("nurture_sequences")
        .update({ total_enrolled: sequence.total_enrolled + enrolled.length })
        .eq("id", sequence_id);

      return NextResponse.json({
        success: true,
        enrolled: enrolled.length,
        skipped: skipped.length,
      });
    }

    // ── PROCESS PENDING QUEUE ITEMS (called by cron or manual run) ──────────
    if (action === "process") {
      const now = new Date().toISOString();
      const { data: dueItems } = await supabase
        .from("nurture_queue")
        .select("*, lead:leads(name, email)")
        .eq("status", "pending")
        .lte("scheduled_for", now)
        .limit(50);

      if (!dueItems?.length) {
        return NextResponse.json({
          success: true,
          processed: 0,
          message: "No items due yet — emails are scheduled for future dates",
        });
      }

      let processed = 0;
      let failed = 0;
      const recipients: string[] = [];

      for (const item of dueItems) {
        try {
          await runNurtureStep(item);
          processed++;
          if ((item as any).lead?.name)
            recipients.push((item as any).lead.name);
        } catch {
          failed++;
        }
        await new Promise((r) => setTimeout(r, 300));
      }

      // Log to automation_logs so activity log shows this run
      await supabase.from("automation_logs").insert({
        automation_type: "nurture",
        status: failed > 0 ? "partial" : "success",
        metadata: {
          processed,
          failed,
          recipients: recipients.slice(0, 5).join(", ") || "none",
          triggered_by: "manual",
        },
      });

      return NextResponse.json({
        success: true,
        processed,
        failed,
        recipients,
      });
    }

    // ── CANCEL ENROLLMENT ─────────────────────────────────────
    if (action === "cancel") {
      const { sequence_id, lead_id } = body;

      await supabase
        .from("nurture_enrollments")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("sequence_id", sequence_id)
        .eq("lead_id", lead_id);

      await supabase
        .from("nurture_queue")
        .update({ status: "cancelled" })
        .eq("sequence_id", sequence_id)
        .eq("lead_id", lead_id)
        .eq("status", "pending");

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error: any) {
    console.error("[Nurture API]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET /api/automation/nurture?sequence_id=xxx
// Get stats for a sequence
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sequence_id = searchParams.get("sequence_id");
  const supabase = await createAdminClient();

  if (sequence_id) {
    const [{ data: stats }, { data: queue }] = await Promise.all([
      supabase
        .from("nurture_enrollments")
        .select("status")
        .eq("sequence_id", sequence_id),
      supabase
        .from("nurture_queue")
        .select(
          "status, step_number, scheduled_for, sent_at, lead:leads(name, email, lead_score)",
        )
        .eq("sequence_id", sequence_id)
        .order("scheduled_for"),
    ]);

    return NextResponse.json({ stats, queue });
  }

  const { data: sequences } = await supabase
    .from("nurture_sequences")
    .select("*")
    .order("created_at", { ascending: false });

  return NextResponse.json({ sequences });
}

// import { NextRequest, NextResponse } from 'next/server'
// import { createAdminClient } from '@/lib/supabase/server'
// import { runNurtureStep } from '@/lib/automation'

// // POST /api/automation/nurture
// // Actions: enroll | process | cancel
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { action } = body

//     const supabase = await createAdminClient()

//     // ── ENROLL LEADS INTO A SEQUENCE ──────────────────────────
//     if (action === 'enroll') {
//       const { sequence_id, lead_ids } = body
//       if (!sequence_id || !lead_ids?.length) {
//         return NextResponse.json({ error: 'sequence_id and lead_ids required' }, { status: 400 })
//       }

//       const { data: sequence } = await supabase
//         .from('nurture_sequences')
//         .select('*')
//         .eq('id', sequence_id)
//         .single()

//       if (!sequence) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })

//       const delayDays: number[] = sequence.delay_days || [1, 7, 14, 30, 60]
//       const enrolled: string[] = []
//       const skipped: string[] = []

//       for (const lead_id of lead_ids) {
//         // Check if already enrolled
//         const { data: existing } = await supabase
//           .from('nurture_enrollments')
//           .select('id, status')
//           .eq('sequence_id', sequence_id)
//           .eq('lead_id', lead_id)
//           .single()

//         if (existing && existing.status === 'active') {
//           skipped.push(lead_id)
//           continue
//         }

//         // Create enrollment
//         await supabase.from('nurture_enrollments').upsert({
//           sequence_id,
//           lead_id,
//           status: 'active',
//           enrolled_at: new Date().toISOString(),
//         }, { onConflict: 'sequence_id,lead_id' })

//         // Schedule all steps
//         const queueItems = delayDays.slice(0, sequence.steps_count).map((days, idx) => ({
//           sequence_id,
//           lead_id,
//           step_number: idx + 1,
//           total_steps: sequence.steps_count,
//           status: 'pending',
//           scheduled_for: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
//         }))

//         await supabase.from('nurture_queue').upsert(queueItems, {
//           onConflict: 'sequence_id,lead_id,step_number',
//         })

//         enrolled.push(lead_id)
//       }

//       // Update enrollment count on sequence
//       await supabase
//         .from('nurture_sequences')
//         .update({ total_enrolled: sequence.total_enrolled + enrolled.length })
//         .eq('id', sequence_id)

//       return NextResponse.json({
//         success: true,
//         enrolled: enrolled.length,
//         skipped: skipped.length,
//       })
//     }

//     // ── PROCESS PENDING QUEUE ITEMS (called by cron) ──────────
//     if (action === 'process') {
//       const now = new Date().toISOString()
//       const { data: dueItems } = await supabase
//         .from('nurture_queue')
//         .select('*')
//         .eq('status', 'pending')
//         .lte('scheduled_for', now)
//         .limit(50) // Process max 50 at a time

//       if (!dueItems?.length) {
//         return NextResponse.json({ success: true, processed: 0, message: 'No items due' })
//       }

//       let processed = 0
//       for (const item of dueItems) {
//         await runNurtureStep(item)
//         processed++
//         await new Promise(r => setTimeout(r, 300)) // Rate limit
//       }

//       return NextResponse.json({ success: true, processed })
//     }

//     // ── CANCEL ENROLLMENT ─────────────────────────────────────
//     if (action === 'cancel') {
//       const { sequence_id, lead_id } = body

//       await supabase
//         .from('nurture_enrollments')
//         .update({ status: 'cancelled', completed_at: new Date().toISOString() })
//         .eq('sequence_id', sequence_id)
//         .eq('lead_id', lead_id)

//       await supabase
//         .from('nurture_queue')
//         .update({ status: 'cancelled' })
//         .eq('sequence_id', sequence_id)
//         .eq('lead_id', lead_id)
//         .eq('status', 'pending')

//       return NextResponse.json({ success: true })
//     }

//     return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
//   } catch (error: any) {
//     console.error('[Nurture API]', error)
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }

// // GET /api/automation/nurture?sequence_id=xxx
// // Get stats for a sequence
// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url)
//   const sequence_id = searchParams.get('sequence_id')
//   const supabase = await createAdminClient()

//   if (sequence_id) {
//     const [{ data: stats }, { data: queue }] = await Promise.all([
//       supabase
//         .from('nurture_enrollments')
//         .select('status')
//         .eq('sequence_id', sequence_id),
//       supabase
//         .from('nurture_queue')
//         .select('status, step_number, scheduled_for, sent_at, lead:leads(name, email, lead_score)')
//         .eq('sequence_id', sequence_id)
//         .order('scheduled_for'),
//     ])

//     return NextResponse.json({ stats, queue })
//   }

//   const { data: sequences } = await supabase
//     .from('nurture_sequences')
//     .select('*')
//     .order('created_at', { ascending: false })

//   return NextResponse.json({ sequences })
// }


// import { NextRequest, NextResponse } from "next/server";
// import { createAdminClient } from "@/lib/supabase/server";
// import { runNurtureStep } from "@/lib/automation";

// // POST /api/automation/nurture
// // Actions: enroll | process | cancel
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();
//     const { action } = body;

//     const supabase = await createAdminClient();

//     // ── ENROLL LEADS INTO A SEQUENCE ──────────────────────────
//     if (action === "enroll") {
//       const { sequence_id, lead_ids } = body;
//       if (!sequence_id || !lead_ids?.length) {
//         return NextResponse.json(
//           { error: "sequence_id and lead_ids required" },
//           { status: 400 },
//         );
//       }

//       const { data: sequence } = await supabase
//         .from("nurture_sequences")
//         .select("*")
//         .eq("id", sequence_id)
//         .single();

//       if (!sequence)
//         return NextResponse.json(
//           { error: "Sequence not found" },
//           { status: 404 },
//         );

//       const delayDays: number[] = sequence.delay_days || [1, 7, 14, 30, 60];
//       const enrolled: string[] = [];
//       const skipped: string[] = [];

//       for (const lead_id of lead_ids) {
//         // Check if already enrolled
//         const { data: existing } = await supabase
//           .from("nurture_enrollments")
//           .select("id, status")
//           .eq("sequence_id", sequence_id)
//           .eq("lead_id", lead_id)
//           .single();

//         if (existing && existing.status === "active") {
//           skipped.push(lead_id);
//           continue;
//         }

//         // Create enrollment
//         await supabase.from("nurture_enrollments").upsert(
//           {
//             sequence_id,
//             lead_id,
//             status: "active",
//             enrolled_at: new Date().toISOString(),
//           },
//           { onConflict: "sequence_id,lead_id" },
//         );

//         // Schedule all steps
//         const queueItems = delayDays
//           .slice(0, sequence.steps_count)
//           .map((days, idx) => ({
//             sequence_id,
//             lead_id,
//             step_number: idx + 1,
//             total_steps: sequence.steps_count,
//             status: "pending",
//             scheduled_for: new Date(
//               Date.now() + days * 24 * 60 * 60 * 1000,
//             ).toISOString(),
//           }));

//         await supabase.from("nurture_queue").upsert(queueItems, {
//           onConflict: "sequence_id,lead_id,step_number",
//         });

//         enrolled.push(lead_id);
//       }

//       // Update enrollment count on sequence
//       await supabase
//         .from("nurture_sequences")
//         .update({ total_enrolled: sequence.total_enrolled + enrolled.length })
//         .eq("id", sequence_id);

//       return NextResponse.json({
//         success: true,
//         enrolled: enrolled.length,
//         skipped: skipped.length,
//       });
//     }

//     // ── PROCESS PENDING QUEUE ITEMS (called by cron or manual run) ──────────
//     if (action === "process") {
//       const now = new Date().toISOString();
//       const { data: dueItems } = await supabase
//         .from("nurture_queue")
//         .select("*, lead:leads(name, email)")
//         .eq("status", "pending")
//         .lte("scheduled_for", now)
//         .limit(50);

//       if (!dueItems?.length) {
//         return NextResponse.json({
//           success: true,
//           processed: 0,
//           message: "No items due yet — emails are scheduled for future dates",
//         });
//       }

//       let processed = 0;
//       let failed = 0;
//       const recipients: string[] = [];

//       for (const item of dueItems) {
//         try {
//           await runNurtureStep(item);
//           processed++;
//           if ((item as any).lead?.name)
//             recipients.push((item as any).lead.name);
//         } catch {
//           failed++;
//         }
//         await new Promise((r) => setTimeout(r, 300));
//       }

//       // Log to automation_logs so activity log shows this run
//       await supabase.from("automation_logs").insert({
//         automation_type: "nurture",
//         status: failed > 0 ? "partial" : "success",
//         metadata: {
//           processed,
//           failed,
//           recipients: recipients.slice(0, 5).join(", ") || "none",
//           triggered_by: "manual",
//         },
//       });

//       return NextResponse.json({
//         success: true,
//         processed,
//         failed,
//         recipients,
//       });
//     }

//     // ── CANCEL ENROLLMENT ─────────────────────────────────────
//     if (action === "cancel") {
//       const { sequence_id, lead_id } = body;

//       await supabase
//         .from("nurture_enrollments")
//         .update({ status: "cancelled", completed_at: new Date().toISOString() })
//         .eq("sequence_id", sequence_id)
//         .eq("lead_id", lead_id);

//       await supabase
//         .from("nurture_queue")
//         .update({ status: "cancelled" })
//         .eq("sequence_id", sequence_id)
//         .eq("lead_id", lead_id)
//         .eq("status", "pending");

//       return NextResponse.json({ success: true });
//     }

//     return NextResponse.json({ error: "Invalid action" }, { status: 400 });
//   } catch (error: any) {
//     console.error("[Nurture API]", error);
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// // GET /api/automation/nurture?sequence_id=xxx
// // Get stats for a sequence
// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const sequence_id = searchParams.get("sequence_id");
//   const supabase = await createAdminClient();

//   if (sequence_id) {
//     const [{ data: stats }, { data: queue }] = await Promise.all([
//       supabase
//         .from("nurture_enrollments")
//         .select("status")
//         .eq("sequence_id", sequence_id),
//       supabase
//         .from("nurture_queue")
//         .select(
//           "status, step_number, scheduled_for, sent_at, lead:leads(name, email, lead_score)",
//         )
//         .eq("sequence_id", sequence_id)
//         .order("scheduled_for"),
//     ]);

//     return NextResponse.json({ stats, queue });
//   }

//   const { data: sequences } = await supabase
//     .from("nurture_sequences")
//     .select("*")
//     .order("created_at", { ascending: false });

//   return NextResponse.json({ sequences });
// }

// import { NextRequest, NextResponse } from 'next/server'
// import { createAdminClient } from '@/lib/supabase/server'
// import { runNurtureStep } from '@/lib/automation'

// // POST /api/automation/nurture
// // Actions: enroll | process | cancel
// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json()
//     const { action } = body

//     const supabase = await createAdminClient()

//     // ── ENROLL LEADS INTO A SEQUENCE ──────────────────────────
//     if (action === 'enroll') {
//       const { sequence_id, lead_ids } = body
//       if (!sequence_id || !lead_ids?.length) {
//         return NextResponse.json({ error: 'sequence_id and lead_ids required' }, { status: 400 })
//       }

//       const { data: sequence } = await supabase
//         .from('nurture_sequences')
//         .select('*')
//         .eq('id', sequence_id)
//         .single()

//       if (!sequence) return NextResponse.json({ error: 'Sequence not found' }, { status: 404 })

//       const delayDays: number[] = sequence.delay_days || [1, 7, 14, 30, 60]
//       const enrolled: string[] = []
//       const skipped: string[] = []

//       for (const lead_id of lead_ids) {
//         // Check if already enrolled
//         const { data: existing } = await supabase
//           .from('nurture_enrollments')
//           .select('id, status')
//           .eq('sequence_id', sequence_id)
//           .eq('lead_id', lead_id)
//           .single()

//         if (existing && existing.status === 'active') {
//           skipped.push(lead_id)
//           continue
//         }

//         // Create enrollment
//         await supabase.from('nurture_enrollments').upsert({
//           sequence_id,
//           lead_id,
//           status: 'active',
//           enrolled_at: new Date().toISOString(),
//         }, { onConflict: 'sequence_id,lead_id' })

//         // Schedule all steps
//         const queueItems = delayDays.slice(0, sequence.steps_count).map((days, idx) => ({
//           sequence_id,
//           lead_id,
//           step_number: idx + 1,
//           total_steps: sequence.steps_count,
//           status: 'pending',
//           scheduled_for: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
//         }))

//         await supabase.from('nurture_queue').upsert(queueItems, {
//           onConflict: 'sequence_id,lead_id,step_number',
//         })

//         enrolled.push(lead_id)
//       }

//       // Update enrollment count on sequence
//       await supabase
//         .from('nurture_sequences')
//         .update({ total_enrolled: sequence.total_enrolled + enrolled.length })
//         .eq('id', sequence_id)

//       return NextResponse.json({
//         success: true,
//         enrolled: enrolled.length,
//         skipped: skipped.length,
//       })
//     }

//     // ── PROCESS PENDING QUEUE ITEMS (called by cron) ──────────
//     if (action === 'process') {
//       const now = new Date().toISOString()
//       const { data: dueItems } = await supabase
//         .from('nurture_queue')
//         .select('*')
//         .eq('status', 'pending')
//         .lte('scheduled_for', now)
//         .limit(50) // Process max 50 at a time

//       if (!dueItems?.length) {
//         return NextResponse.json({ success: true, processed: 0, message: 'No items due' })
//       }

//       let processed = 0
//       for (const item of dueItems) {
//         await runNurtureStep(item)
//         processed++
//         await new Promise(r => setTimeout(r, 300)) // Rate limit
//       }

//       return NextResponse.json({ success: true, processed })
//     }

//     // ── CANCEL ENROLLMENT ─────────────────────────────────────
//     if (action === 'cancel') {
//       const { sequence_id, lead_id } = body

//       await supabase
//         .from('nurture_enrollments')
//         .update({ status: 'cancelled', completed_at: new Date().toISOString() })
//         .eq('sequence_id', sequence_id)
//         .eq('lead_id', lead_id)

//       await supabase
//         .from('nurture_queue')
//         .update({ status: 'cancelled' })
//         .eq('sequence_id', sequence_id)
//         .eq('lead_id', lead_id)
//         .eq('status', 'pending')

//       return NextResponse.json({ success: true })
//     }

//     return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
//   } catch (error: any) {
//     console.error('[Nurture API]', error)
//     return NextResponse.json({ error: error.message }, { status: 500 })
//   }
// }

// // GET /api/automation/nurture?sequence_id=xxx
// // Get stats for a sequence
// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url)
//   const sequence_id = searchParams.get('sequence_id')
//   const supabase = await createAdminClient()

//   if (sequence_id) {
//     const [{ data: stats }, { data: queue }] = await Promise.all([
//       supabase
//         .from('nurture_enrollments')
//         .select('status')
//         .eq('sequence_id', sequence_id),
//       supabase
//         .from('nurture_queue')
//         .select('status, step_number, scheduled_for, sent_at, lead:leads(name, email, lead_score)')
//         .eq('sequence_id', sequence_id)
//         .order('scheduled_for'),
//     ])

//     return NextResponse.json({ stats, queue })
//   }

//   const { data: sequences } = await supabase
//     .from('nurture_sequences')
//     .select('*')
//     .order('created_at', { ascending: false })

//   return NextResponse.json({ sequences })
// }
