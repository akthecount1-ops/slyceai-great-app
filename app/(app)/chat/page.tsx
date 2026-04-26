'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import ChatMain from '@/components/app/ChatMain'

export default function ChatPage() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    const check = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) { setOnboardingComplete(false); return }
        const { data } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('id', user.id)
          .single()
        setOnboardingComplete(!!data?.onboarding_complete)
      } catch {
        setOnboardingComplete(false)
      }
    }
    check()
  }, [])

  if (onboardingComplete === null) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100dvh - var(--header-height))' }}>
        <div style={{ width: 26, height: 26, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  return <ChatMain onboardingComplete={onboardingComplete} />
}
