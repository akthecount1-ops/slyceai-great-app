import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { getUserStats, getAIUsageStats } from '@/lib/admin/stats'
import { RegistrationChart, ConditionChart } from '@/components/admin/AdminCharts'

export const metadata: Metadata = { title: 'Admin Overview | Arogya' }

const COLORS = ['#f97316', '#22c55e', '#3b82f6', '#a855f7', '#f59e0b', '#ec4899']

export default async function AdminOverviewPage() {
  const stats = await getUserStats()
  const aiStats = await getAIUsageStats()

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // Registrations over last 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
  const { data: regData } = await supabase
    .from('profiles')
    .select('created_at')
    .gte('created_at', ninetyDaysAgo)
    .order('created_at', { ascending: true })

  // Group by date
  const regByDay: Record<string, number> = {}
  regData?.forEach((r) => {
    const d = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    regByDay[d] = (regByDay[d] ?? 0) + 1
  })
  const regChart = Object.entries(regByDay).slice(-30).map(([date, count]) => ({ date, count }))

  // Condition categories
  const { data: journeyData } = await supabase.from('health_journeys').select('condition_category')
  const catCount: Record<string, number> = {}
  journeyData?.forEach((j) => {
    const cat = j.condition_category ?? 'Other'
    catCount[cat] = (catCount[cat] ?? 0) + 1
  })
  const catChart = Object.entries(catCount).map(([name, value]) => ({ name, value }))

  // Recent audit activity
  const { data: recentActivity } = await supabase
    .from('admin_audit_log')
    .select('action, target_table, created_at')
    .order('created_at', { ascending: false })
    .limit(10)

  const KPI_CARDS = [
    { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'var(--arogya-saffron)' },
    { label: 'Active (30d)', value: stats.activeUsers, icon: '✅', color: 'var(--arogya-green)' },
    { label: 'Vitals Logged', value: stats.totalVitals, icon: '🩺', color: 'var(--color-bp)' },
    { label: 'Documents', value: stats.totalDocuments, icon: '📄', color: 'var(--color-oxygen)' },
    { label: 'Verified Journeys', value: stats.verifiedJourneys, icon: '🏥', color: 'var(--color-oxygen)' },
    { label: 'Dataset Entries', value: stats.datasetContributions, icon: '🗄️', color: '#a855f7' },
    { label: 'AI Calls Today', value: aiStats.totalCallsToday, icon: '🤖', color: 'var(--arogya-saffron)' },
    { label: 'Est. Cost (month)', value: `$${aiStats.estimatedCost}`, icon: '💰', color: '#f59e0b' },
  ]

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Platform Overview</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Real-time metrics across the Arogya health platform
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {KPI_CARDS.map((card) => (
          <div key={card.label} className="stat-card">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xl">{card.icon}</span>
            </div>
            <div className="text-2xl font-bold" style={{ color: card.color }}>{card.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RegistrationChart data={regChart} />
        <ConditionChart data={catChart} />
      </div>

      {/* Recent Audit Activity */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Admin Activity</h2>
        </div>
        {(recentActivity?.length ?? 0) === 0 ? (
          <div className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No recent admin activity</div>
        ) : (
          <div className="flex flex-col">
            {recentActivity?.map((entry, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3"
                   style={{ borderBottom: i < (recentActivity.length - 1) ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                <div className="flex items-center gap-3">
                  <span className="text-lg">📋</span>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{entry.action}</div>
                    {entry.target_table && (
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Table: {entry.target_table}</div>
                    )}
                  </div>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {new Date(entry.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
