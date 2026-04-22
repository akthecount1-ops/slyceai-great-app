import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dataset | Admin | Arogya' }

export default async function AdminDatasetPage() {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: contributions, count } = await supabase
    .from('dataset_contributions')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('contributed_at', { ascending: false })
    .limit(50)

  const bothVerified = contributions?.filter((c) => c.both_verified).length ?? 0
  const avgQuality = contributions?.length
    ? Math.round(contributions.reduce((a, b) => a + (b.quality_score ?? 0), 0) / contributions.length)
    : 0

  // Condition breakdown
  const catCount: Record<string, { count: number; totalRecovery: number }> = {}
  contributions?.forEach((c) => {
    const cat = c.condition_name ?? 'Unknown'
    if (!catCount[cat]) catCount[cat] = { count: 0, totalRecovery: 0 }
    catCount[cat].count++
    const outcome = c.outcome_summary as Record<string, number> | null
    catCount[cat].totalRecovery += outcome?.recovery_percentage ?? 0
  })
  const catTable = Object.entries(catCount)
    .map(([name, { count, totalRecovery }]) => ({
      name, count, avgRecovery: Math.round(totalRecovery / count)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>India Health AI Dataset</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Anonymised, verified health journey data — the foundation of India&apos;s health AI
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Contributions', value: count ?? 0, color: 'var(--arogya-saffron)' },
          { label: 'Both Verified', value: bothVerified, color: 'var(--arogya-green)' },
          { label: 'Avg Quality Score', value: avgQuality, color: 'var(--color-oxygen)' },
          { label: 'Verification Rate', value: `${count ? Math.round((bothVerified / count) * 100) : 0}%`, color: '#a855f7' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Condition Breakdown */}
      <div className="glass-card rounded-2xl overflow-hidden mb-6">
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Condition Breakdown</h2>
          <a href="/api/admin/export/dataset?format=csv"
             className="text-xs px-3 py-1.5 rounded-xl font-medium transition-all"
             style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: 'var(--arogya-green)' }}>
            ⬇ Export CSV
          </a>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['Condition', 'Contributions', 'Avg Recovery %'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {catTable.map((row, i) => (
                <tr key={row.name} style={{ borderBottom: i < catTable.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{row.name}</td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--arogya-saffron)' }}>{row.count}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full rounded-full" style={{ width: `${row.avgRecovery}%`, background: 'var(--gradient-green)' }} />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--arogya-green)' }}>{row.avgRecovery}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Note */}
      <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(34,197,94,0.05)', border: '1px solid rgba(34,197,94,0.15)', color: 'var(--text-secondary)' }}>
        🔒 All data in this dataset is fully anonymised. No patient names, emails, or identifiable information is stored or exportable. Contributions require patient consent.
      </div>
    </div>
  )
}
