'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import OnboardingChat from '@/components/app/OnboardingChat'
import ChatMain from '@/components/app/ChatMain'

export default function ChatPage() {
  const [status, setStatus] = useState<'loading' | 'onboarding' | 'ready'>('loading')

  useEffect(() => {
    // If opening a specific past session from history, skip all checks
    const params = new URLSearchParams(window.location.search)
    if (params.get('session')) {
      setStatus('ready')
      return
    }

    // ✅ Check onboarding_complete directly from Supabase profiles — persistent source of truth
    // (NOT the local SQLite db which resets on server restart)
    const supabase = createClient()
    const checkOnboarding = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setStatus('onboarding'); return }

        const { data } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single()

        setStatus(data?.onboarding_complete ? 'ready' : 'onboarding')
      } catch {
        setStatus('onboarding')
      }
    }
    checkOnboarding()
  }, [])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - var(--header-height))' }}>
        <div style={{ width: 26, height: 26, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  if (status === 'onboarding') {
    return <OnboardingChat onComplete={() => setStatus('ready')} />
  }

  return <ChatMain />
}
