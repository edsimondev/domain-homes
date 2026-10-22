import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import AgentForm from '../../AgentForm'

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function EditAgentPage({ params }: PageProps) {
  const { id } = await params

  const supabase = await createClient()

  const { data: agent, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !agent) notFound()

  return (
    <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8 max-w-2xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-[#372308]">
          Edit Agent
        </h1>
        <p className="text-[#8a7968] text-sm mt-1">{agent.name}</p>
      </div>

      <AgentForm agent={agent} />
    </div>
  )
}