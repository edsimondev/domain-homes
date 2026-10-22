'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  RiDashboardLine, RiBuilding2Line, RiGroupLine, RiNewspaperLine,
  RiUserVoiceLine, RiLineChartLine, RiSettings4Line, RiLogoutBoxLine,
  RiMenu3Line, RiCloseLine, RiRobot2Line, RiMailSendLine, RiBarChart2Line,
} from 'react-icons/ri'
import DomaineLogo from '@/components/ui/Logo'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/admin', label: 'Dashboard', icon: RiDashboardLine, exact: true },
  { href: '/admin/listings', label: 'Listings', icon: RiBuilding2Line },
  { href: '/admin/agents', label: 'Agents', icon: RiGroupLine },
  { href: '/admin/leads', label: 'Leads', icon: RiUserVoiceLine },
  { href: '/admin/analytics', label: 'Analytics', icon: RiBarChart2Line },
  // { href: '/admin/automation', label: 'Automation', icon: RiRobot2Line, badge: 'AI' },
  // { href: '/admin/nurture', label: 'Nurture', icon: RiMailSendLine },
  { href: '/admin/blog', label: 'Blog', icon: RiNewspaperLine },
  { href: '/admin/testimonials', label: 'Reviews', icon: RiLineChartLine },
  { href: '/admin/settings', label: 'Settings', icon: RiSettings4Line },
]

interface Props { user: { email: string; full_name?: string; role: string } }

export default function AdminSidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href)

  const handleLogout = async () => {
    await createClient().auth.signOut()
    router.push('/admin/login')
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#F5F0E8]/6">
        <Link href="/">
          <DomaineLogo variant="light" size="sm" />
        </Link>
        <p className="text-xs text-[#F5F0E8]/20 mt-1.5 pl-9">Admin Panel</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon, exact, badge }: any) => {
          const active = isActive(href, exact)
          return (
            <Link key={href} href={href} onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active
                  ? 'bg-[#F0D5A0]/12 text-[#F0D5A0]'
                  : 'text-[#F5F0E8]/40 hover:text-[#F5F0E8] hover:bg-[#F5F0E8]/5'
              }`}
            >
              <Icon size={16} />
              {label}
              {badge && (
                <span className="ml-auto text-xs bg-[#F0D5A0] text-[#372308] px-1.5 py-0.5 rounded-full font-semibold">
                  {badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      <div className="border-t border-[#F5F0E8]/6 p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-[#F0D5A0] flex items-center justify-center text-[#372308] text-xs font-black">
            {(user.full_name || user.email).charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[#F5F0E8] truncate">{user.full_name || 'Admin'}</p>
            <p className="text-xs text-[#F5F0E8]/30 truncate">{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout}
          className="flex items-center gap-2 w-full text-xs text-[#F5F0E8]/30 hover:text-[#F5F0E8]/60 px-2 py-2 rounded-lg hover:bg-[#F5F0E8]/5 transition-all">
          <RiLogoutBoxLine size={13} /> Sign out
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-[#1e1200] border-b border-[#F5F0E8]/6 px-5 py-3.5 flex items-center justify-between">
        <Link href="/">
          <DomaineLogo variant="light" size="sm" showWordmark={false} />
        </Link>
        <button onClick={() => setMobileOpen(v => !v)} className="text-[#F5F0E8]/50 hover:text-[#F5F0E8]">
          {mobileOpen ? <RiCloseLine size={20} /> : <RiMenu3Line size={20} />}
        </button>
      </div>

      {mobileOpen && <div className="lg:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)} />}

      <div className={`lg:hidden fixed top-12 left-0 bottom-0 z-30 w-60 bg-[#1e1200] shadow-2xl transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <SidebarContent />
      </div>

      <aside className="hidden lg:flex w-56 xl:w-60 bg-[#1e1200] flex-col shrink-0">
        <SidebarContent />
      </aside>
    </>
  )
}
