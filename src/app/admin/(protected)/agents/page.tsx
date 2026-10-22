import { createClient } from '@/lib/supabase/server'
import Image from 'next/image'
import Link from 'next/link'
import { RiAddLine, RiEditLine } from 'react-icons/ri'
import AgentDeleteButton from './AgentDeleteButton'

export default async function AdminAgentsPage() {
  const supabase = await createClient()
  const { data: agents } = await supabase
    .from('agents')
    .select('id, name, email, phone, photo_url, specialties, is_active, created_at')
    .order('created_at', { ascending: false })

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#372308]">Agents</h1>
          <p className="text-[#8a7968] text-sm mt-1">{agents?.length || 0} total agents</p>
        </div>
        <Link href="/admin/agents/new" className="flex items-center gap-2 bg-[#372308] hover:bg-[#1e1200] text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
          <RiAddLine size={16} /> Add Agent
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {!agents?.length && (
          <div className="col-span-full text-center py-16 text-[#372308]/35">
            No agents yet. <Link href="/admin/agents/new" className="text-[#372308] hover:underline">Add your first agent</Link>
          </div>
        )}
        {agents?.map(agent => (
          <div key={agent.id} className="bg-[#F5F0E8] rounded-2xl border border-[#372308]/6 overflow-hidden hover:shadow-card transition-all">
            <div className="relative h-36 bg-gradient-to-br from-brand-50 to-brand-100">
              {agent.photo_url ? (
                <Image src={agent.photo_url} alt={agent.name} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="font-display text-5xl font-bold text-brand-300">{agent.name.charAt(0)}</span>
                </div>
              )}
              <span className={`absolute top-3 right-3 text-xs px-2 py-1 rounded-full font-medium ${agent.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-[#E8E0D0] text-[#8a7968]'}`}>
                {agent.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <div className="p-4">
              <p className="font-semibold text-[#372308]">{agent.name}</p>
              <p className="text-xs text-[#372308]/35 mb-2">{agent.email}</p>
              {agent.specialties?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {agent.specialties.slice(0, 2).map((s: string) => (
                    <span key={s} className="text-xs bg-[#F0D5A0]/20 text-[#372308] px-2 py-0.5 rounded-full">{s}</span>
                  ))}
                </div>
              )}
              <div className="flex gap-2 pt-3 border-t border-[#372308]/6">
                <Link href={`/admin/agents/${agent.id}/edit`} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium text-[#372308]/60 hover:text-[#372308] border border-[#372308]/10 hover:border-[#372308]/15 py-2 rounded-lg transition-colors">
                  <RiEditLine size={13} /> Edit
                </Link>
                <AgentDeleteButton agentId={agent.id} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
