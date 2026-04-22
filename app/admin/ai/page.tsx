import { getAIUsageStats } from '@/lib/admin/stats'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { AIRankChart, AIFeatureChart } from '@/components/admin/AdminCharts'

export const metadata: Metadata = { title: 'AI Usage | Admin | Arogya' }

export default async function AdminAIPage() {
  const stats = await getAIUsageStats()

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: recentLogs } = await supabase
    .from('api_usage_log')
    .select('feature, model, total_tokens, response_time_ms, status, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: dailyUsage } = await supabase
    .from('api_usage_log')
    .select('created_at, total_tokens')
    .gte('created_at', thirtyDaysAgo)

  // Group by day
  const byDay: Record<string, { calls: number; tokens: number }> = {}
  dailyUsage?.forEach((r) => {
    const d = new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    if (!byDay[d]) byDay[d] = { calls: 0, tokens: 0 }
    byDay[d].calls++
    byDay[d].tokens += r.total_tokens ?? 0
  })
  const dailyChart = Object.entries(byDay).slice(-14).map(([date, v]) => ({ date, ...v }))

  // Feature breakdown
  const featureCount: Record<string, number> = {}
  recentLogs?.forEach((r) => { featureCount[r.feature] = (featureCount[r.feature] ?? 0) + 1 })
  const featureChart = Object.entries(featureCount).map(([name, count]) => ({ name, count }))

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>AI Usage</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Nemotron API usage tracking and cost analysis</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Calls Today', value: stats.totalCallsToday, color: 'var(--arogya-saffron)' },
          { label: 'Tokens Today', value: stats.totalTokensToday.toLocaleString(), color: 'var(--arogya-green)' },
          { label: 'Tokens (Month)', value: (stats.totalTokensMonth / 1000).toFixed(1) + 'K', color: 'var(--color-oxygen)' },
          { label: 'Est. Cost', value: `$${stats.estimatedCost}`, color: '#f59e0b' },
          { label: 'Avg Response', value: `${stats.avgResponseTime}ms`, color: '#a855f7' },
          { label: 'Error Rate', value: `${stats.errorRate}%`, color: stats.errorRate > 5 ? 'var(--color-error)' : 'var(--arogya-green)' },
        ].map((c) => (
          <div key={c.label} className="stat-card">
            <div className="text-xl font-bold" style={{ color: c.color }}>{c.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <AIRankChart data={dailyChart} />
        <AIFeatureChart data={featureChart} />
      </div>

      {/* Recent Calls Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recent API Calls (Last 50)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['Timestamp', 'Feature', 'Model', 'Tokens', 'Response Time', 'Status'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(recentLogs ?? []).map((log, i) => (
                <tr key={i} style={{ borderBottom: i < (recentLogs?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="badge badge-saffron text-xs">{log.feature}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{log.model}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--arogya-green)' }}>{log.total_tokens?.toLocaleString() ?? '—'}</td>
                  <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>{log.response_time_ms ? `${log.response_time_ms}ms` : '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`badge ${log.status === 'success' ? 'badge-success' : 'badge-error'} text-xs`}>
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
