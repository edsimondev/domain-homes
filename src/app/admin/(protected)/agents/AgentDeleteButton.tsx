'use client'
import { useState } from 'react'
import { RiDeleteBinLine, RiLoader4Line } from 'react-icons/ri'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function AgentDeleteButton({ agentId }: { agentId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const handleDelete = async () => {
    if (!confirm('Delete this agent?')) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('agents').delete().eq('id', agentId)
    if (error) { toast.error('Failed to delete'); setLoading(false) }
    else { toast.success('Agent deleted'); router.refresh() }
  }
  return (
    <button onClick={handleDelete} disabled={loading} className="flex items-center justify-center gap-1.5 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 py-2 px-3 rounded-lg transition-colors disabled:opacity-40">
      {loading ? <RiLoader4Line className="animate-spin" size={13} /> : <RiDeleteBinLine size={13} />}
    </button>
  )
}
