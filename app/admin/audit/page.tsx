import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audit Log | Admin | Arogya' }

interface SearchParams { page?: string; action?: string }
interface Props { searchParams: Promise<SearchParams> }

export default async function AdminAuditPage({ searchParams }: Props) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const actionFilter = params.action ?? ''
  const PER_PAGE = 30
  const offset = (page - 1) * PER_PAGE

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabase
    .from('admin_audit_log')
    .select('id, admin_id, action, target_table, target_id, details, created_at, profiles(name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PER_PAGE - 1)

  if (actionFilter) query = query.ilike('action', `%${actionFilter}%`)

  const { data: logs, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Audit Log</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Complete history of all admin actions — {count ?? 0} entries
        </p>
      </div>

      {/* Filter */}
      <div className="glass-card rounded-2xl p-4 mb-5">
        <form method="get" className="flex gap-3">
          <input name="action" defaultValue={actionFilter} placeholder="Filter by action..."
                 className="input-field text-sm flex-1" style={{ padding: '8px 14px' }} />
          <button type="submit" className="btn-brand text-sm px-4 py-2">Filter</button>
          {actionFilter && (
            <a href="/admin/audit" className="text-sm px-4 py-2 rounded-xl flex items-center"
               style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>Clear</a>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['Timestamp', 'Admin', 'Action', 'Table', 'Target ID', 'Details'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(logs ?? []).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No audit entries found</td></tr>
              ) : (logs ?? []).map((log, i) => {
                const profile = (log as Record<string, unknown>).profiles as { name?: string } | null
                return (
                  <tr key={log.id} style={{ borderBottom: i < (logs?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                    <td className="px-4 py-2.5 text-xs whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(log.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {profile?.name ?? log.admin_id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="badge badge-saffron text-xs">{log.action}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{log.target_table ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs font-mono max-w-[120px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {log.target_id ? log.target_id.slice(0, 12) + '...' : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-xs max-w-[200px] truncate" style={{ color: 'var(--text-secondary)' }}>
                      {log.details ? JSON.stringify(log.details).slice(0, 60) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {count} entries
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <a href={`/admin/audit?page=${page - 1}&action=${actionFilter}`}
                   className="text-xs px-3 py-1.5 rounded-lg"
                   style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  ← Prev
                </a>
              )}
              {page < totalPages && (
                <a href={`/admin/audit?page=${page + 1}&action=${actionFilter}`}
                   className="text-xs px-3 py-1.5 rounded-lg btn-brand">
                  Next →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
