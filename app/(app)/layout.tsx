import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayoutWrapper from '@/components/app/AppLayoutWrapper'
import HealthTourPopup from '@/components/app/HealthTourPopup'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | Arogya' },
}

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Check onboarding
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_complete, name')
    .eq('id', user.id)
    .single()

  if (!profile?.onboarding_complete) redirect('/onboarding')

  return (
    <AppLayoutWrapper>
      {children}
      <HealthTourPopup />
    </AppLayoutWrapper>
  )
}
