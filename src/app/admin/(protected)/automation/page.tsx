import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  RiRobot2Line,
  RiMailSendLine,
  RiSearchEyeLine,
  RiBarChart2Line,
  RiFlashlightLine,
  RiCheckDoubleLine,
  RiTimeLine,
  RiErrorWarningLine,
} from "react-icons/ri";
import AutomationActions from "./AutomationActions";

export default async function AutomationPage() {
  const supabase = await createClient();

  const [
    { data: sequences },
    { data: pendingQueue },
    { data: recentLogs },
    { data: pendingMatches },
    { count: totalLeads },
  ] = await Promise.all([
    supabase.from("nurture_sequences").select("*").order("created_at"),
    supabase
      .from("nurture_queue")
      .select(
        "id, scheduled_for, lead:leads(name), sequence:nurture_sequences(name)",
      )
      .eq("status", "pending")
      .order("scheduled_for")
      .limit(8),
    supabase
      .from("automation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("listing_lead_matches")
      .select("listing_id, listing:listings(title)", { count: "exact" })
      .eq("status", "pending")
      .limit(5),
    supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .not("email", "is", null),
  ]);

  const logStatusIcon = (status: string) => {
    if (status === "success")
      return <RiCheckDoubleLine className="text-emerald-500" size={14} />;
    if (status === "failed")
      return <RiErrorWarningLine className="text-red-500" size={14} />;
    return <RiTimeLine className="text-amber-500" size={14} />;
  };

  const automationTypeLabel: Record<string, string> = {
    lead_alert: "Lead Alert",
    nurture: "Nurture Email",
    match_engine: "Property Match",
    market_report: "Market Report",
    content_suite: "Content Suite",
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#372308]">
            Automation Hub
          </h1>
          <p className="text-[#8a7968] text-sm mt-1">
            Your AI-powered revenue engine — running 24/7
          </p>
        </div>
        <AutomationActions />
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Auto Lead Alerts",
            desc: "Fires on every new lead",
            icon: RiFlashlightLine,
            status: "Active",
            color: "text-[#372308] bg-[#F0D5A0]/20",
            statusColor: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Nurture Sequences",
            desc: `${sequences?.filter((s) => s.is_active).length || 0} active sequences`,
            icon: RiMailSendLine,
            status: `${pendingQueue?.length || 0} queued`,
            color: "text-purple-600 bg-purple-50",
            statusColor: "bg-purple-50 text-purple-700",
          },
          {
            label: "Match Engine",
            desc: `${pendingMatches?.length || 0} unnotified matches`,
            icon: RiSearchEyeLine,
            status: "Ready",
            color: "text-emerald-600 bg-emerald-50",
            statusColor: "bg-emerald-50 text-emerald-700",
          },
          {
            label: "Market Reports",
            desc: `${totalLeads || 0} leads subscribed`,
            icon: RiBarChart2Line,
            status: "Monday auto-send",
            color: "text-gold-600 bg-[#F0D5A0]/10",
            statusColor: "bg-amber-50 text-amber-700",
          },
        ].map((card) => (
          <div
            key={card.label}
            className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5"
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}
              >
                <card.icon size={18} />
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.statusColor}`}
              >
                {card.status}
              </span>
            </div>
            <p className="font-semibold text-[#372308] text-sm">{card.label}</p>
            <p className="text-xs text-[#372308]/35 mt-0.5">{card.desc}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Nurture sequences */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div>
                <h2 className="font-semibold text-[#372308] text-sm">
                  Nurture Sequences
                </h2>
                <p className="text-xs text-[#372308]/35 mt-0.5">
                  AI-personalized follow-up campaigns
                </p>
              </div>
              <Link
                href="/admin/nurture"
                className="text-xs text-[#372308] font-medium hover:underline"
              >
                Manage →
              </Link>
            </div>
            <div className="divide-y divide-gray-50">
              {!sequences?.length && (
                <p className="text-center py-8 text-[#372308]/35 text-sm">
                  No sequences yet
                </p>
              )}
              {sequences?.map((seq) => (
                <div
                  key={seq.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-2 h-2 rounded-full shrink-0 ${seq.is_active ? "bg-emerald-400" : "bg-gray-300"}`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#372308] truncate">
                        {seq.name}
                      </p>
                      <p className="text-xs text-[#372308]/35">
                        {seq.steps_count} steps · {seq.total_enrolled} enrolled
                        · triggers on {seq.trigger_type}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/admin/nurture?seq=${seq.id}`}
                    className="text-xs text-[#372308] border border-[#372308]/15 hover:bg-[#F0D5A0]/20 px-2.5 py-1 rounded-lg transition-colors shrink-0"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming queue */}
          {pendingQueue && pendingQueue.length > 0 && (
            <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-50">
                <h2 className="font-semibold text-[#372308] text-sm">
                  Upcoming Emails
                </h2>
                <p className="text-xs text-[#372308]/35 mt-0.5">
                  Scheduled nurture queue
                </p>
              </div>
              <div className="divide-y divide-gray-50">
                {pendingQueue.map((item: any) => (
                  <div
                    key={item.id}
                    className="px-5 py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-sm text-[#372308]">
                        {(item.lead as any)?.name || "Unknown lead"}
                      </p>
                      <p className="text-xs text-[#372308]/35">
                        {(item.sequence as any)?.name}
                      </p>
                    </div>
                    <p className="text-xs text-[#8a7968] shrink-0">
                      {new Date(item.scheduled_for).toLocaleDateString(
                        "en-US",
                        {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        },
                      )}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity log */}
        <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-50">
            <h2 className="font-semibold text-[#372308] text-sm">
              Activity Log
            </h2>
            <p className="text-xs text-[#372308]/35 mt-0.5">
              Recent automation runs
            </p>
          </div>
          <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
            {!recentLogs?.length && (
              <p className="text-center py-8 text-[#372308]/35 text-sm">
                No activity yet
              </p>
            )}
            {recentLogs?.map((log) => {
              const meta = log.metadata || {};
              const processed = meta.processed ?? 0;
              const failed = meta.failed ?? 0;
              const recipients =
                meta.recipients && meta.recipients !== "none"
                  ? meta.recipients
                  : null;
              const triggeredBy =
                meta.triggered_by === "manual" ? " · manual run" : "";
              return (
                <div
                  key={log.id}
                  className="px-5 py-3 flex items-start gap-2.5"
                >
                  <div className="mt-0.5 shrink-0">
                    {logStatusIcon(log.status)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-[#372308]">
                      {automationTypeLabel[log.automation_type] ||
                        log.automation_type}
                      {triggeredBy && (
                        <span className="text-[#372308]/35 font-normal">
                          {triggeredBy}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-[#372308]/50">
                      {processed} sent · {failed} failed
                      {recipients && (
                        <span className="text-[#372308]/35">
                          {" "}
                          · {recipients}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-300 mt-0.5">
                      {new Date(log.created_at).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// import { createClient } from '@/lib/supabase/server'
// import Link from 'next/link'
// import {
//   RiRobot2Line,
//   RiMailSendLine,
//   RiSearchEyeLine,
//   RiBarChart2Line,
//   RiFlashlightLine,
//   RiCheckDoubleLine,
//   RiTimeLine,
//   RiErrorWarningLine,
// } from 'react-icons/ri'
// import AutomationActions from './AutomationActions'

// export default async function AutomationPage() {
//   const supabase = await createClient()

//   const [
//     { data: sequences },
//     { data: pendingQueue },
//     { data: recentLogs },
//     { data: pendingMatches },
//     { count: totalLeads },
//   ] = await Promise.all([
//     supabase.from('nurture_sequences').select('*').order('created_at'),
//     supabase.from('nurture_queue').select('id, scheduled_for, lead:leads(name), sequence:nurture_sequences(name)').eq('status', 'pending').order('scheduled_for').limit(8),
//     supabase.from('automation_logs').select('*').order('created_at', { ascending: false }).limit(12),
//     supabase.from('listing_lead_matches').select('listing_id, listing:listings(title)', { count: 'exact' }).eq('status', 'pending').limit(5),
//     supabase.from('leads').select('*', { count: 'exact', head: true }).not('email', 'is', null),
//   ])

//   const logStatusIcon = (status: string) => {
//     if (status === 'success') return <RiCheckDoubleLine className="text-emerald-500" size={14} />
//     if (status === 'failed') return <RiErrorWarningLine className="text-red-500" size={14} />
//     return <RiTimeLine className="text-amber-500" size={14} />
//   }

//   const automationTypeLabel: Record<string, string> = {
//     lead_alert: '⚡ Lead Alert',
//     nurture: '💌 Nurture Email',
//     match_engine: '🏠 Property Match',
//     market_report: '📊 Market Report',
//     content_suite: '✨ Content Suite',
//   }

//   return (
//     <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
//       {/* Header */}
//       <div className="flex items-start justify-between mb-8">
//         <div>
//           <h1 className="font-display text-2xl font-bold text-[#372308]">Automation Hub</h1>
//           <p className="text-[#8a7968] text-sm mt-1">Your AI-powered revenue engine — running 24/7</p>
//         </div>
//         <AutomationActions />
//       </div>

//       {/* Status cards */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
//         {[
//           {
//             label: 'Auto Lead Alerts',
//             desc: 'Fires on every new lead',
//             icon: RiFlashlightLine,
//             status: 'Active',
//             color: 'text-[#372308] bg-[#F0D5A0]/20',
//             statusColor: 'bg-emerald-50 text-emerald-700',
//           },
//           {
//             label: 'Nurture Sequences',
//             desc: `${sequences?.filter(s => s.is_active).length || 0} active sequences`,
//             icon: RiMailSendLine,
//             status: `${pendingQueue?.length || 0} queued`,
//             color: 'text-purple-600 bg-purple-50',
//             statusColor: 'bg-purple-50 text-purple-700',
//           },
//           {
//             label: 'Match Engine',
//             desc: `${pendingMatches?.length || 0} unnotified matches`,
//             icon: RiSearchEyeLine,
//             status: 'Ready',
//             color: 'text-emerald-600 bg-emerald-50',
//             statusColor: 'bg-emerald-50 text-emerald-700',
//           },
//           {
//             label: 'Market Reports',
//             desc: `${totalLeads || 0} leads subscribed`,
//             icon: RiBarChart2Line,
//             status: 'Monday auto-send',
//             color: 'text-gold-600 bg-[#F0D5A0]/10',
//             statusColor: 'bg-amber-50 text-amber-700',
//           },
//         ].map(card => (
//           <div key={card.label} className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5">
//             <div className="flex items-start justify-between mb-3">
//               <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
//                 <card.icon size={18} />
//               </div>
//               <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${card.statusColor}`}>
//                 {card.status}
//               </span>
//             </div>
//             <p className="font-semibold text-[#372308] text-sm">{card.label}</p>
//             <p className="text-xs text-[#372308]/35 mt-0.5">{card.desc}</p>
//           </div>
//         ))}
//       </div>

//       <div className="grid lg:grid-cols-3 gap-6">
//         {/* Nurture sequences */}
//         <div className="lg:col-span-2 space-y-6">
//           <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
//             <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
//               <div>
//                 <h2 className="font-semibold text-[#372308] text-sm">Nurture Sequences</h2>
//                 <p className="text-xs text-[#372308]/35 mt-0.5">AI-personalized follow-up campaigns</p>
//               </div>
//               <Link href="/admin/nurture" className="text-xs text-[#372308] font-medium hover:underline">
//                 Manage →
//               </Link>
//             </div>
//             <div className="divide-y divide-gray-50">
//               {!sequences?.length && (
//                 <p className="text-center py-8 text-[#372308]/35 text-sm">No sequences yet</p>
//               )}
//               {sequences?.map(seq => (
//                 <div key={seq.id} className="px-5 py-3.5 flex items-center justify-between gap-3">
//                   <div className="flex items-center gap-3 min-w-0">
//                     <div className={`w-2 h-2 rounded-full shrink-0 ${seq.is_active ? 'bg-emerald-400' : 'bg-gray-300'}`} />
//                     <div className="min-w-0">
//                       <p className="text-sm font-medium text-[#372308] truncate">{seq.name}</p>
//                       <p className="text-xs text-[#372308]/35">
//                         {seq.steps_count} steps · {seq.total_enrolled} enrolled · triggers on {seq.trigger_type}
//                       </p>
//                     </div>
//                   </div>
//                   <Link
//                     href={`/admin/nurture?seq=${seq.id}`}
//                     className="text-xs text-[#372308] border border-[#372308]/15 hover:bg-[#F0D5A0]/20 px-2.5 py-1 rounded-lg transition-colors shrink-0"
//                   >
//                     View
//                   </Link>
//                 </div>
//               ))}
//             </div>
//           </div>

//           {/* Upcoming queue */}
//           {pendingQueue && pendingQueue.length > 0 && (
//             <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
//               <div className="px-5 py-4 border-b border-gray-50">
//                 <h2 className="font-semibold text-[#372308] text-sm">Upcoming Emails</h2>
//                 <p className="text-xs text-[#372308]/35 mt-0.5">Scheduled nurture queue</p>
//               </div>
//               <div className="divide-y divide-gray-50">
//                 {pendingQueue.map((item: any) => (
//                   <div key={item.id} className="px-5 py-3 flex items-center justify-between gap-3">
//                     <div>
//                       <p className="text-sm text-[#372308]">{(item.lead as any)?.name || 'Unknown lead'}</p>
//                       <p className="text-xs text-[#372308]/35">{(item.sequence as any)?.name}</p>
//                     </div>
//                     <p className="text-xs text-[#8a7968] shrink-0">
//                       {new Date(item.scheduled_for).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
//                     </p>
//                   </div>
//                 ))}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* Activity log */}
//         <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
//           <div className="px-5 py-4 border-b border-gray-50">
//             <h2 className="font-semibold text-[#372308] text-sm">Activity Log</h2>
//             <p className="text-xs text-[#372308]/35 mt-0.5">Recent automation runs</p>
//           </div>
//           <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
//             {!recentLogs?.length && (
//               <p className="text-center py-8 text-[#372308]/35 text-sm">No activity yet</p>
//             )}
//             {recentLogs?.map(log => (
//               <div key={log.id} className="px-5 py-3 flex items-start gap-2.5">
//                 <div className="mt-0.5 shrink-0">{logStatusIcon(log.status)}</div>
//                 <div className="min-w-0 flex-1">
//                   <p className="text-xs font-medium text-[#372308]">
//                     {automationTypeLabel[log.automation_type] || log.automation_type}
//                   </p>
//                   {log.metadata && Object.keys(log.metadata).length > 0 && (
//                     <p className="text-xs text-[#372308]/35 truncate">
//                       {Object.entries(log.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
//                     </p>
//                   )}
//                   <p className="text-xs text-gray-300 mt-0.5">
//                     {new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
//                   </p>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
