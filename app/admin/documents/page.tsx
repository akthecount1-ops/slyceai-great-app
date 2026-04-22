import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Documents | Admin | Arogya' }

export default async function AdminDocumentsPage() {
  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: docs, count }, { data: storageData }] = await Promise.all([
    supabase
      .from('documents')
      .select('id, filename, file_type, file_size, document_category, ai_analysis, created_at, user_id, profiles(name)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(50),
    supabase.storage.from('documents').list('', { sortBy: { column: 'created_at', order: 'desc' } })
  ])

  const totalSize = docs?.reduce((a, b) => a + (b.file_size ?? 0), 0) ?? 0
  const withAI = docs?.filter((d) => d.ai_analysis).length ?? 0

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Documents</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Medical documents uploaded by users
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Documents', value: count ?? 0, color: 'var(--arogya-saffron)' },
          { label: 'With AI Analysis', value: withAI, color: 'var(--arogya-green)' },
          { label: 'Total Storage', value: `${(totalSize / 1024 / 1024).toFixed(1)} MB`, color: 'var(--color-oxygen)' },
          { label: 'Avg File Size', value: count ? `${Math.round(totalSize / count / 1024)} KB` : '—', color: '#a855f7' },
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
                {['Filename', 'User', 'Category', 'Type', 'Size', 'AI Analysis', 'Uploaded'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(docs ?? []).map((doc, i) => {
                const profile = (doc as Record<string, unknown>).profiles as { name?: string } | null
                return (
                  <tr key={doc.id} style={{ borderBottom: i < (docs?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                    <td className="px-4 py-2.5 max-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span>{doc.file_type?.includes('pdf') ? '📄' : '🖼️'}</span>
                        <span className="truncate text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{doc.filename}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {profile?.name ?? doc.user_id?.slice(0, 8)}
                    </td>
                    <td className="px-4 py-2.5">
                      {doc.document_category ? <span className="badge badge-info text-xs">{doc.document_category}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td className="px-4 py-2.5 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>{doc.file_type ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {doc.file_size ? `${Math.round(doc.file_size / 1024)} KB` : '—'}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`badge ${doc.ai_analysis ? 'badge-success' : 'badge-warning'} text-xs`}>
                        {doc.ai_analysis ? '✅ Done' : '⏳ Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--text-muted)' }}>
                      {new Date(doc.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
