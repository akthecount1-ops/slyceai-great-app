'use client'

import { useState, useEffect } from 'react'
import OnboardingChat from '@/components/app/OnboardingChat'
import ChatMain from '@/components/app/ChatMain'

export default function ChatPage() {
  const [status, setStatus] = useState<'loading' | 'onboarding' | 'ready'>('loading')

  const checkStatus = () => {
    fetch('/api/arogya/patient')
      .then(r => r.json())
      .then(({ profile }) => {
        setStatus(profile?.chat_ready ? 'ready' : 'onboarding')
      })
      .catch(() => setStatus('onboarding'))
  }

  useEffect(() => { checkStatus() }, [])

  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 'calc(100vh - var(--header-height))' }}>
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
