/**
 * /api/automation/cron
 *
 * Nurture sequence disabled — automation handled via Make.com.
 * This route is kept as a stub so existing cron-job.org setups
 * don't return 404 errors.
 */
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Nurture automation is handled via Make.com. This endpoint is disabled.',
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'Nurture automation is handled via Make.com. This endpoint is disabled.',
    timestamp: new Date().toISOString(),
  })
}


// import { NextRequest, NextResponse } from "next/server";
// import { runWeeklyMarketReport } from "@/lib/automation";
// import { createAdminClient } from "@/lib/supabase/server";
// import { runNurtureStep } from "@/lib/automation";

// async function runCron(job: string | null) {
//   const supabase = await createAdminClient();
//   const results: Record<string, any> = {};

//   // ── JOB: PROCESS NURTURE QUEUE ────────────────────────────
//   if (!job || job === "nurture") {
//     const now = new Date().toISOString();
//     const { data: dueItems } = await supabase
//       .from("nurture_queue")
//       .select("*, lead:leads(name, email)")
//       .eq("status", "pending")
//       .lte("scheduled_for", now)
//       .limit(100);

//     let nurtureProcessed = 0;
//     let nurtureFailed = 0;
//     const recipients: string[] = [];

//     for (const item of dueItems || []) {
//       try {
//         await runNurtureStep(item);
//         nurtureProcessed++;
//         if (item.lead?.name) recipients.push(item.lead.name);
//       } catch {
//         nurtureFailed++;
//       }
//       await new Promise((r) => setTimeout(r, 300));
//     }

//     results.nurture = {
//       processed: nurtureProcessed,
//       failed: nurtureFailed,
//       recipients: recipients.slice(0, 5).join(", ") || "none",
//     };

//     await supabase.from("automation_logs").insert({
//       automation_type: "nurture",
//       status: nurtureFailed > 0 ? "partial" : "success",
//       metadata: results.nurture,
//     });
//   }

//   // ── JOB: WEEKLY MARKET REPORTS (run on Mondays) ───────────
//   const isMonday = new Date().getDay() === 1;
//   if (!job || job === "market_report") {
//     if (isMonday || job === "market_report") {
//       const { data: cities } = await supabase
//         .from("leads")
//         .select("preferred_location")
//         .not("preferred_location", "is", null)
//         .not("email", "is", null);

//       const uniqueCities = [
//         ...new Set(
//           (cities || [])
//             .map((l: any) => l.preferred_location?.trim())
//             .filter(Boolean),
//         ),
//       ] as string[];

//       let reportsSent = 0;
//       for (const city of uniqueCities.slice(0, 10)) {
//         const { sent } = await runWeeklyMarketReport(city);
//         reportsSent += sent;
//         await new Promise((r) => setTimeout(r, 500));
//       }

//       results.market_reports = {
//         cities: uniqueCities.length,
//         emails_sent: reportsSent,
//       };
//     }
//   }

//   return results;
// }

// // GET /api/automation/cron
// // Called by Vercel Cron (no auth header — Vercel cron uses GET)
// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const job = searchParams.get("job");

//   // Vercel cron calls are verified by Vercel internally
//   // For manual calls from browser/dashboard, we accept GET freely
//   try {
//     const results = await runCron(job);
//     return NextResponse.json({
//       success: true,
//       results,
//       timestamp: new Date().toISOString(),
//     });
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// // POST /api/automation/cron
// // Called manually from admin dashboard with secret header
// export async function POST(request: NextRequest) {
//   const authHeader = request.headers.get("authorization");
//   const cronSecret = process.env.CRON_SECRET || "domaine-cron-secret";

//   if (authHeader !== `Bearer ${cronSecret}`) {
//     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
//   }

//   const { job } = await request.json().catch(() => ({ job: null }));

//   try {
//     const results = await runCron(job);
//     return NextResponse.json({
//       success: true,
//       results,
//       timestamp: new Date().toISOString(),
//     });
//   } catch (err: any) {
//     return NextResponse.json({ error: err.message }, { status: 500 });
//   }
// }

// import { NextRequest, NextResponse } from 'next/server'
// import { runWeeklyMarketReport } from '@/lib/automation'
// import { createAdminClient } from '@/lib/supabase/server'
// import { runNurtureStep } from '@/lib/automation'

// // POST /api/automation/cron
// // Called by Vercel Cron or external scheduler
// // Vercel cron: add to vercel.json (see README)
// export async function POST(request: NextRequest) {
//   // Basic security — check for secret header
//   const authHeader = request.headers.get('authorization')
//   const cronSecret = process.env.CRON_SECRET || 'domaine-cron-secret'

//   if (authHeader !== `Bearer ${cronSecret}`) {
//     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
//   }

//   const { job } = await request.json()
//   const supabase = await createAdminClient()
//   const results: Record<string, any> = {}

//   // ── JOB: PROCESS NURTURE QUEUE ────────────────────────────
//   if (!job || job === 'nurture') {
//     const now = new Date().toISOString()
//     const { data: dueItems } = await supabase
//       .from('nurture_queue')
//       .select('*')
//       .eq('status', 'pending')
//       .lte('scheduled_for', now)
//       .limit(100)

//     let nurtureProcessed = 0
//     let nurtureFailed = 0

//     for (const item of dueItems || []) {
//       try {
//         await runNurtureStep(item)
//         nurtureProcessed++
//       } catch {
//         nurtureFailed++
//       }
//       await new Promise(r => setTimeout(r, 300))
//     }

//     results.nurture = { processed: nurtureProcessed, failed: nurtureFailed }

//     await supabase.from('automation_logs').insert({
//       automation_type: 'nurture',
//       status: nurtureFailed > 0 ? 'partial' : 'success',
//       metadata: results.nurture,
//     })
//   }

//   // ── JOB: WEEKLY MARKET REPORTS (run on Mondays) ───────────
//   const isMonday = new Date().getDay() === 1
//   if (!job || (job === 'market_report' && isMonday)) {
//     // Get all unique cities from leads
//     const { data: cities } = await supabase
//       .from('leads')
//       .select('preferred_location')
//       .not('preferred_location', 'is', null)
//       .not('email', 'is', null)

//     const uniqueCities = [...new Set(
//       (cities || [])
//         .map((l: any) => l.preferred_location?.trim())
//         .filter(Boolean)
//     )] as string[]

//     let reportsSent = 0
//     for (const city of uniqueCities.slice(0, 10)) { // Max 10 cities per run
//       const { sent } = await runWeeklyMarketReport(city)
//       reportsSent += sent
//       await new Promise(r => setTimeout(r, 500))
//     }

//     results.market_reports = { cities: uniqueCities.length, emails_sent: reportsSent }
//   }

//   return NextResponse.json({ success: true, results, timestamp: new Date().toISOString() })
// }

// // GET /api/automation/cron — manual trigger from admin dashboard
// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url)
//   const job = searchParams.get('job')

//   // Create a POST request internally
//   return POST(new NextRequest(request.url, {
//     method: 'POST',
//     headers: {
//       'authorization': `Bearer ${process.env.CRON_SECRET || 'domaine-cron-secret'}`,
//       'content-type': 'application/json',
//     },
//     body: JSON.stringify({ job }),
//   }))
// }
