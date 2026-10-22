'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RiMailLine, RiLockLine, RiLoader4Line, RiEyeLine, RiEyeOffLine } from 'react-icons/ri'
import { createClient } from '@/lib/supabase/client'
import DomaineLogo from '@/components/ui/Logo'
import toast from 'react-hot-toast'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await createClient().auth.signInWithPassword({ email, password })
    if (error) { toast.error(error.message); setLoading(false) }
    else { toast.success('Welcome back!'); router.push('/admin'); router.refresh() }
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <DomaineLogo variant="dark" size="lg" showWordmark={false} />
          </div>
          <h1 className="font-black text-[#372308] text-3xl tracking-tight mb-1">Domaine</h1>
          <p className="text-[#8a7968] text-sm">Sign in to your admin panel</p>
        </div>
        <div className="bg-[#F5F0E8] border border-[#372308]/10 rounded-2xl p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#372308]/50 uppercase tracking-wider mb-2">Email</label>
              <div className="relative">
                <RiMailLine className="absolute left-4 top-1/2 -translate-y-1/2 text-[#372308]/30" size={15} />
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="admin@domaine.co" required className="input-field pl-10" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#372308]/50 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <RiLockLine className="absolute left-4 top-1/2 -translate-y-1/2 text-[#372308]/30" size={15} />
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input-field pl-10 pr-10" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-[#372308]/30 hover:text-[#372308]/60">
                  {showPass ? <RiEyeOffLine size={15} /> : <RiEyeLine size={15} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-2 bg-[#372308] hover:bg-[#5a3a14] text-[#F5F0E8] font-semibold py-3.5 rounded-xl transition-colors mt-2 disabled:opacity-50">
              {loading ? <RiLoader4Line className="animate-spin" size={17} /> : 'Sign In'}
            </button>
          </form>
        </div>
        <p className="text-center text-xs text-[#372308]/25 mt-6">Domaine Admin · Secure Access</p>
      </div>
    </div>
  )
}
