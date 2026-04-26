'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ChatMain from '@/components/app/ChatMain'
import { Stethoscope } from 'lucide-react'

/** isOnboardingComplete — returns true only if all required fields are present */
function isCompletedFlag(value: unknown): boolean {
  return value === true || value === 1
}

export default function ChatPage() {
  const [status, setStatus] = useState<'loading' | 'gated' | 'ready'>('loading')
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setStatus('gated'); return }
        const { data } = await supabase
          .from('profiles')
          .select('name, date_of_birth, gender, weight_kg, height_cm, onboarding_complete')
          .eq('id', user.id)
          .single()
        const complete = isCompletedFlag((data as Record<string, unknown> | null)?.onboarding_complete)
        setStatus(complete ? 'ready' : 'gated')
      } catch {
        setStatus('gated')
      }
    }
    check()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - var(--header-height))' }}>
        <div style={{ width: 26, height: 26, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (status === 'gated') {
    return <ChatGate onComplete={() => router.push('/dashboard')} />
  }

  return <ChatMain onboardingComplete={true} />
}

function ChatGate({ onComplete }: { onComplete: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100dvh - var(--header-height))',
      background: 'var(--bg-page)', padding: '24px',
    }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
      `}</style>
      <div style={{
        maxWidth: 420, width: '100%', textAlign: 'center',
        animation: 'fadeUp 0.4s ease',
      }}>
        {/* Icon */}
        <div style={{
          width: 72, height: 72, borderRadius: 20,
          background: 'var(--text-primary)', margin: '0 auto 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(13,148,136,0.2)',
        }}>
          <Stethoscope size={32} strokeWidth={1.5} style={{ color: 'var(--accent)' }} />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)',
          letterSpacing: '-0.025em', margin: '0 0 12px',
        }}>
          Complete your profile first
        </h1>

        {/* Description */}
        <p style={{
          fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: 1.7,
          margin: '0 0 8px',
        }}>
          Slyceai needs to know a few things about you before answering your health
          questions accurately.
        </p>
        <p style={{
          fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <span style={{
            display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent)', animation: 'pulse 2s infinite',
          }} />
          This takes less than 2 minutes
        </p>

        {/* CTA */}
        <button
          onClick={onComplete}
          style={{
            width: '100%', background: 'var(--accent)', color: 'var(--bg-card)',
            border: 'none', padding: '14px 28px', borderRadius: '10px',
            fontSize: '15px', fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', letterSpacing: '-0.01em',
            boxShadow: '0 4px 16px rgba(13,148,136,0.3)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0b7a70'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'translateY(0)' }}
        >
          Complete profile →
        </button>

        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '16px' }}>
          You&apos;ll be taken to your dashboard where the setup will open automatically.
        </p>
      </div>
    </div>
  )
}
