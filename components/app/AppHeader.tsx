'use client'

import Link from 'next/link'
import { Heart, Wind, Activity, Stethoscope, Droplets } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface LatestVital {
  bp_systolic: number | null
  bp_diastolic: number | null
  pulse: number | null
  oxygen: number | null
  blood_sugar: number | null
}

export default function AppHeader({ children }: { children?: React.ReactNode }) {
  const [vital, setVital] = useState<LatestVital | null>(null)
  const [userName, setUserName] = useState('U')
  const supabase = createClient()

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    // Load Vitals
    const { data: vData } = await supabase
      .from('vitals')
      .select('bp_systolic,bp_diastolic,pulse,oxygen,blood_sugar')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(1)
      .single()
    if (vData) setVital(vData as LatestVital)
      
    // Load Profile
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

  const vitalsChips = [
    {
      key: 'bp',
      icon: <Heart size={14} />,
      label: 'BP',
      value: vital?.bp_systolic && vital?.bp_diastolic ? `${vital.bp_systolic}/${vital.bp_diastolic}` : '—',
      unit: 'mmHg',
      bg: '#fff1f2', color: '#be123c', border: '#fecdd3',
      alert: vital?.bp_systolic ? vital.bp_systolic > 140 || vital.bp_systolic < 90 : false,
    },
    {
      key: 'pulse',
      icon: <Activity size={14} />,
      label: 'Pulse',
      value: vital?.pulse ?? '—',
      unit: 'bpm',
      bg: '#ecfdf5', color: '#059669', border: '#a7f3d0',
      alert: vital?.pulse ? vital.pulse > 100 || vital.pulse < 50 : false,
    },
    {
      key: 'o2',
      icon: <Wind size={14} />,
      label: 'O₂',
      value: vital?.oxygen ? `${vital.oxygen}` : '—',
      unit: '%',
      bg: '#e0f2fe', color: '#0369a1', border: '#bae6fd',
      alert: vital?.oxygen ? vital.oxygen < 95 : false,
    },
    {
      key: 'sugar',
      icon: <Droplets size={14} />,
      label: 'Sugar',
      value: vital?.blood_sugar ?? '—',
      unit: 'mg/dL',
      bg: '#f5f3ff', color: '#5b21b6', border: '#ddd6fe',
      alert: vital?.blood_sugar ? vital.blood_sugar > 140 : false,
    },
  ]

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

      {/* Divider */}
      <div className="w-px h-6 bg-slate-200 shrink-0 mx-1 md:mx-2" />

      {/* ── Vitals Chips — show all on desktop, first 2 on mobile ── */}
      <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
        {vitalsChips.map((chip, idx) => (
          <Link
            key={chip.key}
            href="/vitals"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border shrink-0 hover:border-teal-300 transition-all group ${idx >= 2 ? 'hidden md:flex' : ''}`}
            style={{
              background: chip.bg,
              borderColor: chip.alert ? '#ef4444' : chip.border,
              textDecoration: 'none',
            }}
          >
            <span className="group-hover:scale-110 transition-transform" style={{ color: chip.alert ? '#ef4444' : chip.color }}>{chip.icon}</span>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--medical-navy)' }}>
              {chip.value}
            </span>
            {chip.alert && <span className="animate-pulse">⚠️</span>}
          </Link>
        ))}
      </div>

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
