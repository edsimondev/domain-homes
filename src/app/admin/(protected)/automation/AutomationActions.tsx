"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { RiLoader4Line, RiPlayLine, RiRefreshLine } from "react-icons/ri";
import toast from "react-hot-toast";

export default function AutomationActions() {
  const [processing, setProcessing] = useState(false);
  const router = useRouter();

  // Auto-refresh the page every 60 seconds so the activity log stays current
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60_000);
    return () => clearInterval(interval);
  }, [router]);

  const processQueue = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/automation/nurture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "process" }),
      });
      const data = await res.json();

      if (data.processed === 0) {
        toast(data.message || "No emails due yet — check scheduled dates", {
          icon: "ℹ️",
        });
      } else {
        toast.success(
          `Sent ${data.processed} email${data.processed !== 1 ? "s" : ""}` +
            (data.recipients?.length
              ? ` to ${data.recipients.slice(0, 2).join(", ")}`
              : ""),
        );
      }

      // Refresh the server-rendered page to show updated logs
      router.refresh();
    } catch {
      toast.error("Failed to process queue");
    } finally {
      setProcessing(false);
    }
  };

  const refreshPage = () => router.refresh();

  return (
    <div className="flex gap-2">
      <button
        onClick={refreshPage}
        className="w-9 h-9 flex items-center justify-center rounded-xl text-[#372308]/40 hover:text-[#372308] border border-[#372308]/10 hover:border-[#372308]/20 transition-colors"
        title="Refresh"
      >
        <RiRefreshLine size={15} />
      </button>
      <button
        onClick={processQueue}
        disabled={processing}
        className="flex items-center gap-2 text-sm bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
      >
        {processing ? (
          <RiLoader4Line className="animate-spin" size={15} />
        ) : (
          <RiPlayLine size={15} />
        )}
        {processing ? "Running..." : "Run Queue"}
      </button>
    </div>
  );
}

// 'use client'

// import { useState } from 'react'
// import { RiLoader4Line, RiPlayLine, RiRefreshLine } from 'react-icons/ri'
// import toast from 'react-hot-toast'

// export default function AutomationActions() {
//   const [processing, setProcessing] = useState(false)

//   const processQueue = async () => {
//     setProcessing(true)
//     try {
//       const res = await fetch('/api/automation/nurture', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({ action: 'process' }),
//       })
//       const data = await res.json()
//       toast.success(`Processed ${data.processed} email${data.processed !== 1 ? 's' : ''} from queue`)
//     } catch {
//       toast.error('Failed to process queue')
//     } finally {
//       setProcessing(false)
//     }
//   }

//   return (
//     <div className="flex gap-2">
//       <button
//         onClick={processQueue}
//         disabled={processing}
//         className="flex items-center gap-2 text-sm bg-[#372308] hover:bg-[#1e1200] disabled:bg-gray-300 text-white font-medium px-4 py-2.5 rounded-xl transition-colors"
//       >
//         {processing
//           ? <RiLoader4Line className="animate-spin" size={15} />
//           : <RiPlayLine size={15} />
//         }
//         {processing ? 'Running...' : 'Run Queue'}
//       </button>
//     </div>
//   )
// }
