'use client'

import Link from 'next/link'
import { Stethoscope } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AppHeader({ children }: { children?: React.ReactNode }) {
  const [userName, setUserName] = useState('U')
  const [supabase] = useState(() => createClient())

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: pData } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', user.id)
      .single()
    if (pData?.name) setUserName(pData.name.charAt(0).toUpperCase())
  }

  useEffect(() => {
    loadData()
    const handleProfileUpdate = () => loadData()
    window.addEventListener('profile-updated', handleProfileUpdate)
    return () => window.removeEventListener('profile-updated', handleProfileUpdate)
  }, [supabase])

  return (
    <header
      className="w-full h-full flex items-center gap-4 px-6 border-b"
      style={{
        background: 'rgba(239,236,230,0.92)',
        backdropFilter: 'blur(12px)',
        borderColor: 'var(--border)',
        WebkitBackdropFilter: 'blur(12px)',
      }}
    >
      {children}

      {/* Page title */}
      <div className="flex items-center gap-2 mr-2 shrink-0">
        <Stethoscope size={20} style={{ color: 'var(--medical-teal)' }} />
        <span className="hidden lg:inline" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--medical-navy)', letterSpacing: '-0.01em' }}>
          Arogya
        </span>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* ── Profile Avatar ── */}
      <Link href="/profile" className="shrink-0 ml-1">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black hover:ring-4 hover:ring-teal-100 transition-all border-2 border-white shadow-sm"
          style={{ background: 'var(--medical-navy)', fontSize: '13px' }}
        >
          {userName}
        </div>
      </Link>
    </header>
  )
}
