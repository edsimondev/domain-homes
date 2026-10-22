'use client'

import { useState } from 'react'
import {
  RiCheckLine,
  RiCloseLine,
  RiFileCopyLine,
  RiExternalLinkLine,
  RiShieldCheckLine,
  RiRobot2Line,
  RiMailSendLine,
  RiDatabase2Line,
  RiTelegramLine,
  RiGoogleLine,
} from 'react-icons/ri'
import toast from 'react-hot-toast'

// These are public env vars — safe to expose. Secret keys are NEVER sent to the client.
const SITE_NAME  = process.env.NEXT_PUBLIC_SITE_NAME  || 'Domaine'
const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL   || ''
const CAL_URL    = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || ''

interface EnvGroup {
  label: string
  icon: React.ElementType
  color: string
  vars: { key: string; description: string; required: boolean; link?: string }[]
}

const ENV_GROUPS: EnvGroup[] = [
  {
    label: 'Database & Auth',
    icon: RiDatabase2Line,
    color: 'bg-blue-50 text-blue-600',
    vars: [
      { key: 'NEXT_PUBLIC_SUPABASE_URL',      description: 'Your Supabase project URL',      required: true,  link: 'https://supabase.com/dashboard' },
      { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anonymous public key',  required: true,  link: 'https://supabase.com/dashboard' },
      { key: 'SUPABASE_SERVICE_ROLE_KEY',      description: 'Supabase service role (secret)', required: true,  link: 'https://supabase.com/dashboard' },
    ],
  },
  {
    label: 'Email',
    icon: RiMailSendLine,
    color: 'bg-purple-50 text-purple-600',
    vars: [
      { key: 'PLUNK_API_KEY',              description: 'Plunk API key — primary email provider, free, no domain needed', required: false, link: 'https://useplunk.com' },
      { key: 'PLUNK_FROM_EMAIL',           description: 'From address for Plunk (e.g. hello@yourdomain.com)',             required: false, link: 'https://useplunk.com' },
      { key: 'RESEND_API_KEY',             description: 'Resend fallback — used if PLUNK_API_KEY is not set',             required: false, link: 'https://resend.com/api-keys' },
      { key: 'RESEND_FROM_EMAIL',          description: 'Verified sender address for Resend',                             required: false, link: 'https://resend.com/domains' },
      { key: 'AGENT_NOTIFICATION_EMAIL',   description: 'Email address that receives all lead alerts',                    required: true },
    ],
  },
  {
    label: 'AI Providers',
    icon: RiRobot2Line,
    color: 'bg-amber-50 text-amber-600',
    vars: [
      { key: 'GROQ_API_KEY',       description: 'Groq — fastest AI, primary provider',        required: false, link: 'https://console.groq.com' },
      { key: 'GEMINI_API_KEY',     description: 'Google Gemini — secondary AI fallback',      required: false, link: 'https://aistudio.google.com' },
      { key: 'OPENROUTER_API_KEY', description: 'OpenRouter — last-resort AI fallback',       required: false, link: 'https://openrouter.ai/keys' },
    ],
  },
  {
    label: 'Telegram Alerts',
    icon: RiTelegramLine,
    color: 'bg-sky-50 text-sky-600',
    vars: [
      { key: 'TELEGRAM_BOT_TOKEN', description: 'Bot token from @BotFather',                  required: false, link: 'https://t.me/BotFather' },
      { key: 'TELEGRAM_CHAT_ID',   description: 'Your chat ID (visit /getUpdates to find it)', required: false },
    ],
  },
  {
    label: 'Integrations',
    icon: RiGoogleLine,
    color: 'bg-emerald-50 text-emerald-600',
    vars: [
      { key: 'GOOGLE_SHEETS_WEBHOOK_URL',     description: 'Zapier/Make webhook to mirror leads to Google Sheets', required: false },
      { key: 'NEXT_PUBLIC_CAL_BOOKING_URL',   description: 'Cal.com or Calendly booking URL for agent scheduling',  required: false, link: 'https://cal.com' },
      { key: 'CRON_SECRET',                   description: 'Secret key for securing the /api/automation/cron route', required: false },
    ],
  },
  {
    label: 'Site Config',
    icon: RiShieldCheckLine,
    color: 'bg-[#F0E6D3] text-[#5C3D1E]',
    vars: [
      { key: 'NEXT_PUBLIC_SITE_NAME', description: 'Your site/brand name',     required: false },
      { key: 'NEXT_PUBLIC_SITE_URL',  description: 'Full public URL (no trailing slash)', required: true },
    ],
  },
]

export default function SettingsPage() {
  const [copied, setCopied] = useState<string | null>(null)

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key)
      toast.success('Copied')
      setTimeout(() => setCopied(null), 2000)
    })
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="font-display text-2xl font-bold text-[#372308]">Settings</h1>
        <p className="text-[#8a7968] text-sm mt-1">Environment variables and system configuration reference</p>
      </div>

      {/* Site info summary */}
      <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 mb-6">
        <h2 className="font-semibold text-[#372308] text-sm mb-4">Current Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Site Name',    value: SITE_NAME },
            { label: 'Site URL',     value: SITE_URL || '(not set)' },
            { label: 'Booking URL',  value: CAL_URL  || '(not set)' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-start gap-2">
              <span className="text-xs text-[#8a7968] min-w-24 pt-0.5">{label}</span>
              <span className="text-xs font-medium text-[#372308] break-all">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How to update notice */}
      <div className="bg-[#F0E6D3] border border-[#E8DDD0] rounded-2xl p-5 mb-8">
        <h3 className="font-semibold text-[#372308] text-sm mb-2">How to update environment variables</h3>
        <div className="space-y-1.5 text-sm text-[#5C3D1E]">
          <p><strong>Local development:</strong> Edit your <code className="bg-[#E8DDD0] px-1.5 py-0.5 rounded text-xs">.env.local</code> file in the project root, then restart the dev server.</p>
          <p><strong>Production (Vercel):</strong> Go to your Vercel project → Settings → Environment Variables → add or update each key.</p>
          <p><strong>Important:</strong> Never commit secret keys to Git. Only <code className="bg-[#E8DDD0] px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_</code> variables are safe to expose publicly.</p>
        </div>
      </div>

      {/* Env var groups */}
      <div className="space-y-6">
        {ENV_GROUPS.map(group => (
          <div key={group.label} className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#372308]/6">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${group.color}`}>
                <group.icon size={15} />
              </div>
              <h2 className="font-semibold text-[#372308] text-sm">{group.label}</h2>
            </div>
            <div className="divide-y divide-[#372308]/4">
              {group.vars.map(v => (
                <div key={v.key} className="px-5 py-3.5 flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <code className="text-xs font-mono bg-[#E8DDD0] text-[#372308] px-2 py-0.5 rounded">{v.key}</code>
                      {v.required
                        ? <span className="text-xs text-red-600 font-medium">Required</span>
                        : <span className="text-xs text-[#8a7968]">Optional</span>
                      }
                    </div>
                    <p className="text-xs text-[#8a7968] mt-1">{v.description}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => copy(v.key, v.key)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-[#372308] hover:bg-[#F0D5A0]/20 transition-colors"
                      title="Copy variable name"
                    >
                      {copied === v.key
                        ? <RiCheckLine size={13} className="text-emerald-600" />
                        : <RiFileCopyLine size={13} />
                      }
                    </button>
                    {v.link && (
                      <a
                        href={v.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-[#372308] hover:bg-[#F0D5A0]/20 transition-colors"
                        title="Get this key"
                      >
                        <RiExternalLinkLine size={13} />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Cron setup */}
      <div className="mt-6 bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5">
        <h2 className="font-semibold text-[#372308] text-sm mb-3">Cron Job Setup (Vercel)</h2>
        <p className="text-xs text-[#8a7968] mb-3">
          To enable automated nurture emails and weekly market reports, add this to your <code className="bg-[#E8DDD0] px-1.5 py-0.5 rounded">vercel.json</code>:
        </p>
        <div className="relative">
          <pre className="bg-[#2C1A08] text-[#F0E6D3] text-xs p-4 rounded-xl overflow-x-auto leading-relaxed">{`{
  "crons": [
    {
      "path": "/api/automation/cron",
      "schedule": "0 9 * * *"
    }
  ]
}`}</pre>
          <button
            onClick={() => copy(`{\n  "crons": [\n    {\n      "path": "/api/automation/cron",\n      "schedule": "0 9 * * *"\n    }\n  ]\n}`, 'cron')}
            className="absolute top-3 right-3 text-xs text-[#F0E6D3]/50 hover:text-[#F0E6D3] flex items-center gap-1 transition-colors"
          >
            {copied === 'cron' ? <RiCheckLine size={12} /> : <RiFileCopyLine size={12} />}
            Copy
          </button>
        </div>
        <p className="text-xs text-[#8a7968] mt-2">This runs daily at 9am UTC. Weekly market reports only send on Mondays automatically.</p>
      </div>

      {/* Telegram setup guide */}
      <div className="mt-6 bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5">
        <h2 className="font-semibold text-[#372308] text-sm mb-3">Telegram Bot Setup Guide</h2>
        <ol className="space-y-2">
          {[
            { step: '1', text: 'Open Telegram and search for @BotFather' },
            { step: '2', text: 'Send /newbot — give it a name like "Domaine Alerts" and a username like domaine_leads_bot' },
            { step: '3', text: 'BotFather gives you a Bot Token — copy it to TELEGRAM_BOT_TOKEN' },
            { step: '4', text: 'Start a conversation with your new bot (send it any message)' },
            { step: '5', text: <>Visit: <code className="bg-[#E8DDD0] px-1 rounded text-xs">https://api.telegram.org/bot{'<TOKEN>'}/getUpdates</code> — find the chat id number</> },
            { step: '6', text: 'Copy that number to TELEGRAM_CHAT_ID — you will now receive alerts for every new lead' },
          ].map(({ step, text }) => (
            <li key={step} className="flex gap-3 text-xs text-[#5C3D1E]">
              <span className="w-5 h-5 rounded-full bg-[#E8DDD0] flex items-center justify-center text-[#8a7968] font-semibold shrink-0 text-xs">{step}</span>
              <span className="pt-0.5">{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}


// 'use client'

// import { useState } from 'react'
// import {
//   RiCheckLine,
//   RiCloseLine,
//   RiFileCopyLine,
//   RiExternalLinkLine,
//   RiShieldCheckLine,
//   RiRobot2Line,
//   RiMailSendLine,
//   RiDatabase2Line,
//   RiTelegramLine,
//   RiGoogleLine,
// } from 'react-icons/ri'
// import toast from 'react-hot-toast'

// // These are public env vars — safe to expose. Secret keys are NEVER sent to the client.
// const SITE_NAME  = process.env.NEXT_PUBLIC_SITE_NAME  || 'Domaine'
// const SITE_URL   = process.env.NEXT_PUBLIC_SITE_URL   || ''
// const CAL_URL    = process.env.NEXT_PUBLIC_CAL_BOOKING_URL || ''

// interface EnvGroup {
//   label: string
//   icon: React.ElementType
//   color: string
//   vars: { key: string; description: string; required: boolean; link?: string }[]
// }

// const ENV_GROUPS: EnvGroup[] = [
//   {
//     label: 'Database & Auth',
//     icon: RiDatabase2Line,
//     color: 'bg-blue-50 text-blue-600',
//     vars: [
//       { key: 'NEXT_PUBLIC_SUPABASE_URL',      description: 'Your Supabase project URL',      required: true,  link: 'https://supabase.com/dashboard' },
//       { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', description: 'Supabase anonymous public key',  required: true,  link: 'https://supabase.com/dashboard' },
//       { key: 'SUPABASE_SERVICE_ROLE_KEY',      description: 'Supabase service role (secret)', required: true,  link: 'https://supabase.com/dashboard' },
//     ],
//   },
//   {
//     label: 'Email (Resend)',
//     icon: RiMailSendLine,
//     color: 'bg-purple-50 text-purple-600',
//     vars: [
//       { key: 'RESEND_API_KEY',             description: 'Resend API key — sends all emails',          required: true,  link: 'https://resend.com/api-keys' },
//       { key: 'RESEND_FROM_EMAIL',          description: 'Verified sender address (e.g. hello@yourdomain.com)', required: true,  link: 'https://resend.com/domains' },
//       { key: 'AGENT_NOTIFICATION_EMAIL',   description: 'Agent email that receives lead alerts',       required: true },
//     ],
//   },
//   {
//     label: 'AI Providers',
//     icon: RiRobot2Line,
//     color: 'bg-amber-50 text-amber-600',
//     vars: [
//       { key: 'GROQ_API_KEY',       description: 'Groq — fastest AI, primary provider',        required: false, link: 'https://console.groq.com' },
//       { key: 'GEMINI_API_KEY',     description: 'Google Gemini — secondary AI fallback',      required: false, link: 'https://aistudio.google.com' },
//       { key: 'OPENROUTER_API_KEY', description: 'OpenRouter — last-resort AI fallback',       required: false, link: 'https://openrouter.ai/keys' },
//     ],
//   },
//   {
//     label: 'Telegram Alerts',
//     icon: RiTelegramLine,
//     color: 'bg-sky-50 text-sky-600',
//     vars: [
//       { key: 'TELEGRAM_BOT_TOKEN', description: 'Bot token from @BotFather',                  required: false, link: 'https://t.me/BotFather' },
//       { key: 'TELEGRAM_CHAT_ID',   description: 'Your chat ID (visit /getUpdates to find it)', required: false },
//     ],
//   },
//   {
//     label: 'Integrations',
//     icon: RiGoogleLine,
//     color: 'bg-emerald-50 text-emerald-600',
//     vars: [
//       { key: 'GOOGLE_SHEETS_WEBHOOK_URL',     description: 'Zapier/Make webhook to mirror leads to Google Sheets', required: false },
//       { key: 'NEXT_PUBLIC_CAL_BOOKING_URL',   description: 'Cal.com or Calendly booking URL for agent scheduling',  required: false, link: 'https://cal.com' },
//       { key: 'CRON_SECRET',                   description: 'Secret key for securing the /api/automation/cron route', required: false },
//     ],
//   },
//   {
//     label: 'Site Config',
//     icon: RiShieldCheckLine,
//     color: 'bg-[#F0E6D3] text-[#5C3D1E]',
//     vars: [
//       { key: 'NEXT_PUBLIC_SITE_NAME', description: 'Your site/brand name',     required: false },
//       { key: 'NEXT_PUBLIC_SITE_URL',  description: 'Full public URL (no trailing slash)', required: true },
//     ],
//   },
// ]

// export default function SettingsPage() {
//   const [copied, setCopied] = useState<string | null>(null)

//   const copy = (text: string, key: string) => {
//     navigator.clipboard.writeText(text).then(() => {
//       setCopied(key)
//       toast.success('Copied')
//       setTimeout(() => setCopied(null), 2000)
//     })
//   }

//   return (
//     <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-4xl">
//       <div className="mb-8">
//         <h1 className="font-display text-2xl font-bold text-[#372308]">Settings</h1>
//         <p className="text-[#8a7968] text-sm mt-1">Environment variables and system configuration reference</p>
//       </div>

//       {/* Site info summary */}
//       <div className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5 mb-6">
//         <h2 className="font-semibold text-[#372308] text-sm mb-4">Current Configuration</h2>
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//           {[
//             { label: 'Site Name',    value: SITE_NAME },
//             { label: 'Site URL',     value: SITE_URL || '(not set)' },
//             { label: 'Booking URL',  value: CAL_URL  || '(not set)' },
//           ].map(({ label, value }) => (
//             <div key={label} className="flex items-start gap-2">
//               <span className="text-xs text-[#8a7968] min-w-24 pt-0.5">{label}</span>
//               <span className="text-xs font-medium text-[#372308] break-all">{value}</span>
//             </div>
//           ))}
//         </div>
//       </div>

//       {/* How to update notice */}
//       <div className="bg-[#F0E6D3] border border-[#E8DDD0] rounded-2xl p-5 mb-8">
//         <h3 className="font-semibold text-[#372308] text-sm mb-2">How to update environment variables</h3>
//         <div className="space-y-1.5 text-sm text-[#5C3D1E]">
//           <p><strong>Local development:</strong> Edit your <code className="bg-[#E8DDD0] px-1.5 py-0.5 rounded text-xs">.env.local</code> file in the project root, then restart the dev server.</p>
//           <p><strong>Production (Vercel):</strong> Go to your Vercel project → Settings → Environment Variables → add or update each key.</p>
//           <p><strong>Important:</strong> Never commit secret keys to Git. Only <code className="bg-[#E8DDD0] px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_</code> variables are safe to expose publicly.</p>
//         </div>
//       </div>

//       {/* Env var groups */}
//       <div className="space-y-6">
//         {ENV_GROUPS.map(group => (
//           <div key={group.label} className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden">
//             <div className="flex items-center gap-3 px-5 py-4 border-b border-[#372308]/6">
//               <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${group.color}`}>
//                 <group.icon size={15} />
//               </div>
//               <h2 className="font-semibold text-[#372308] text-sm">{group.label}</h2>
//             </div>
//             <div className="divide-y divide-[#372308]/4">
//               {group.vars.map(v => (
//                 <div key={v.key} className="px-5 py-3.5 flex items-start justify-between gap-4">
//                   <div className="min-w-0 flex-1">
//                     <div className="flex items-center gap-2 flex-wrap">
//                       <code className="text-xs font-mono bg-[#E8DDD0] text-[#372308] px-2 py-0.5 rounded">{v.key}</code>
//                       {v.required
//                         ? <span className="text-xs text-red-600 font-medium">Required</span>
//                         : <span className="text-xs text-[#8a7968]">Optional</span>
//                       }
//                     </div>
//                     <p className="text-xs text-[#8a7968] mt-1">{v.description}</p>
//                   </div>
//                   <div className="flex items-center gap-1 shrink-0">
//                     <button
//                       onClick={() => copy(v.key, v.key)}
//                       className="w-7 h-7 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-[#372308] hover:bg-[#F0D5A0]/20 transition-colors"
//                       title="Copy variable name"
//                     >
//                       {copied === v.key
//                         ? <RiCheckLine size={13} className="text-emerald-600" />
//                         : <RiFileCopyLine size={13} />
//                       }
//                     </button>
//                     {v.link && (
//                       <a
//                         href={v.link}
//                         target="_blank"
//                         rel="noopener noreferrer"
//                         className="w-7 h-7 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-[#372308] hover:bg-[#F0D5A0]/20 transition-colors"
//                         title="Get this key"
//                       >
//                         <RiExternalLinkLine size={13} />
//                       </a>
//                     )}
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </div>
//         ))}
//       </div>

//       {/* Cron setup */}
//       <div className="mt-6 bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5">
//         <h2 className="font-semibold text-[#372308] text-sm mb-3">Cron Job Setup (Vercel)</h2>
//         <p className="text-xs text-[#8a7968] mb-3">
//           To enable automated nurture emails and weekly market reports, add this to your <code className="bg-[#E8DDD0] px-1.5 py-0.5 rounded">vercel.json</code>:
//         </p>
//         <div className="relative">
//           <pre className="bg-[#2C1A08] text-[#F0E6D3] text-xs p-4 rounded-xl overflow-x-auto leading-relaxed">{`{
//   "crons": [
//     {
//       "path": "/api/automation/cron",
//       "schedule": "0 9 * * *"
//     }
//   ]
// }`}</pre>
//           <button
//             onClick={() => copy(`{\n  "crons": [\n    {\n      "path": "/api/automation/cron",\n      "schedule": "0 9 * * *"\n    }\n  ]\n}`, 'cron')}
//             className="absolute top-3 right-3 text-xs text-[#F0E6D3]/50 hover:text-[#F0E6D3] flex items-center gap-1 transition-colors"
//           >
//             {copied === 'cron' ? <RiCheckLine size={12} /> : <RiFileCopyLine size={12} />}
//             Copy
//           </button>
//         </div>
//         <p className="text-xs text-[#8a7968] mt-2">This runs daily at 9am UTC. Weekly market reports only send on Mondays automatically.</p>
//       </div>

//       {/* Telegram setup guide */}
//       <div className="mt-6 bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 p-5">
//         <h2 className="font-semibold text-[#372308] text-sm mb-3">Telegram Bot Setup Guide</h2>
//         <ol className="space-y-2">
//           {[
//             { step: '1', text: 'Open Telegram and search for @BotFather' },
//             { step: '2', text: 'Send /newbot — give it a name like "Domaine Alerts" and a username like domaine_leads_bot' },
//             { step: '3', text: 'BotFather gives you a Bot Token — copy it to TELEGRAM_BOT_TOKEN' },
//             { step: '4', text: 'Start a conversation with your new bot (send it any message)' },
//             { step: '5', text: <>Visit: <code className="bg-[#E8DDD0] px-1 rounded text-xs">https://api.telegram.org/bot{'<TOKEN>'}/getUpdates</code> — find the chat id number</> },
//             { step: '6', text: 'Copy that number to TELEGRAM_CHAT_ID — you will now receive alerts for every new lead' },
//           ].map(({ step, text }) => (
//             <li key={step} className="flex gap-3 text-xs text-[#5C3D1E]">
//               <span className="w-5 h-5 rounded-full bg-[#E8DDD0] flex items-center justify-center text-[#8a7968] font-semibold shrink-0 text-xs">{step}</span>
//               <span className="pt-0.5">{text}</span>
//             </li>
//           ))}
//         </ol>
//       </div>
//     </div>
//   )
// }
