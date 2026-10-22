'use client'

import { useState } from 'react'
import { RiDeleteBinLine, RiLoader4Line } from 'react-icons/ri'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function BlogDeleteButton({ postId }: { postId: string }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return
    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.from('blog_posts').delete().eq('id', postId)
    if (error) {
      toast.error('Failed to delete')
      setLoading(false)
    } else {
      toast.success('Post deleted')
      router.refresh()
    }
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40">
      {loading ? <RiLoader4Line className="animate-spin" size={15} /> : <RiDeleteBinLine size={15} />}
    </button>
  )
}
