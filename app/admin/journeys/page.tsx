import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { getJourneyStats } from '@/lib/admin/stats'

export const metadata: Metadata = { title: 'Health Journeys | Admin | Arogya' }

export default async function AdminJourneysPage() {
  const journeyStats = await getJourneyStats()

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: journeys } = await supabase
    .from('health_journeys')
    .select('id, title, condition_name, condition_category, current_status, recovery_percentage, patient_verified, doctor_verified, consent_given, created_at, user_id')
    .order('created_at', { ascending: false })
    .limit(50)

  const statusColors: Record<string, string> = {
    active: 'badge-info', recovered: 'badge-success', managing: 'badge-warning', relapsed: 'badge-error'
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Health Journeys</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          {journeyStats.total} total journeys · {journeyStats.bothVerified} fully verified
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: journeyStats.total, color: 'var(--arogya-saffron)' },
          { label: 'Both Verified', value: journeyStats.bothVerified, color: 'var(--arogya-green)' },
          { label: 'Active', value: journeyStats.statusDist['active'] ?? 0, color: 'var(--color-oxygen)' },
          { label: 'Recovered', value: journeyStats.statusDist['recovered'] ?? 0, color: '#a855f7' },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</div>
            <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['Title', 'Condition', 'Category', 'Status', 'Recovery', 'Patient ✓', 'Doctor ✓', 'Dataset', 'Created'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(journeys ?? []).map((j, i) => (
                <tr key={j.id} style={{ borderBottom: i < (journeys?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <td className="px-4 py-3 max-w-[200px]">
                    <div className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>{j.title}</div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-secondary)' }}>{j.condition_name}</td>
                  <td className="px-4 py-3">
                    <span className="badge badge-saffron text-xs">{j.condition_category ?? '—'}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusColors[j.current_status] ?? 'badge-info'} capitalize text-xs`}>{j.current_status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full" style={{ background: 'var(--bg-elevated)' }}>
                        <div className="h-full rounded-full" style={{ width: `${j.recovery_percentage}%`, background: 'var(--gradient-green)' }} />
                      </div>
                      <span className="text-xs" style={{ color: 'var(--arogya-green)' }}>{j.recovery_percentage}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-base">
                    {j.patient_verified ? '✅' : '⏳'}
                  </td>
                  <td className="px-4 py-3 text-center text-base">
                    {j.doctor_verified ? '✅' : '⏳'}
                  </td>
                  <td className="px-4 py-3 text-center text-base">
                    {j.consent_given ? '📊' : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(j.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
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
