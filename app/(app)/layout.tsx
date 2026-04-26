import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AppLayoutWrapper from '@/components/app/AppLayoutWrapper'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s | Arogya' },
}

export const dynamic = 'force-dynamic'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // We no longer redirect to /onboarding — the dashboard shows the onboarding banner instead
  // The onboarding steps are surfaced as a modal overlay on the dashboard

  return (
    <AppLayoutWrapper>
      {children}
    </AppLayoutWrapper>
  )
}
