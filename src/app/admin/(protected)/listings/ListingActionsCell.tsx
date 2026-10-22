'use client'

import Link from 'next/link'
import { useState } from 'react'
import { RiEditLine, RiDeleteBinLine, RiLoader4Line } from 'react-icons/ri'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function ListingActionsCell({ listingId }: { listingId: string }) {
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleDelete = async () => {
    if (!confirm('Delete this listing? This cannot be undone.')) return
    setDeleting(true)
    const { error } = await supabase.from('listings').delete().eq('id', listingId)
    if (error) {
      toast.error('Failed to delete listing')
      setDeleting(false)
    } else {
      toast.success('Listing deleted')
      router.refresh()
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link
        href={`/admin/listings/${listingId}/edit`}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-[#372308] hover:bg-[#F0D5A0]/20 transition-colors"
      >
        <RiEditLine size={15} />
      </Link>
      <button
        onClick={handleDelete}
        disabled={deleting}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-[#372308]/35 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-40"
      >
        {deleting ? <RiLoader4Line className="animate-spin" size={15} /> : <RiDeleteBinLine size={15} />}
      </button>
    </div>
  )
}
