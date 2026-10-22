import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/admin/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role)) redirect('/admin/login')

  return (
    <div className="flex h-screen bg-[#F5F0E8] overflow-hidden">
      <AdminSidebar user={{ email: user.email!, ...profile }} />
      <main className="flex-1 overflow-y-auto min-w-0 bg-[#F5F0E8]">
        {children}
      </main>
    </div>
  )
}
