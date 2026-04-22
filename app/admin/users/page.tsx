import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Users | Admin | Arogya' }

interface SearchParams {
  page?: string
  search?: string
  role?: string
}

interface Props {
  searchParams: Promise<SearchParams>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams
  const page = parseInt(params.page ?? '1')
  const search = params.search ?? ''
  const roleFilter = params.role ?? ''
  const PER_PAGE = 25
  const offset = (page - 1) * PER_PAGE

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  let query = supabase
    .from('profiles')
    .select('id, name, gender, state, role, onboarding_complete, created_at, updated_at', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + PER_PAGE - 1)

  if (search) query = query.or(`name.ilike.%${search}%`)
  if (roleFilter) query = query.eq('role', roleFilter)

  const { data: users, count } = await query
  const totalPages = Math.ceil((count ?? 0) / PER_PAGE)

  const roleColors: Record<string, string> = {
    user: 'badge-info', admin: 'badge-warning', superadmin: 'badge-error'
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Users</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{count ?? 0} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-2xl p-4 mb-5 flex flex-wrap gap-3 items-center">
        <form className="flex flex-wrap gap-3 flex-1" method="get">
          <input name="search" defaultValue={search} placeholder="Search by name..."
                 className="input-field text-sm flex-1 min-w-48" style={{ padding: '8px 14px' }} />
          <select name="role" defaultValue={roleFilter} className="input-field text-sm" style={{ padding: '8px 14px', width: 'auto' }}>
            <option value="">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
          </select>
          <button type="submit" className="btn-brand text-sm px-4 py-2">Filter</button>
          {(search || roleFilter) && (
            <Link href="/admin/users" className="text-sm px-4 py-2 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Gender', 'State', 'Role', 'Onboarded', 'Joined', 'Last Active'].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user, i) => (
                <tr key={user.id} style={{ borderBottom: i < (users?.length ?? 0) - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm"
                           style={{ background: 'var(--gradient-saffron)' }}>
                        {user.name?.charAt(0) ?? '?'}
                      </div>
                      <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{user.gender ?? '—'}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{user.state ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${roleColors[user.role] ?? 'badge-info'} capitalize text-xs`}>{user.role}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${user.onboarding_complete ? 'badge-success' : 'badge-warning'} text-xs`}>
                      {user.onboarding_complete ? '✓' : '⏳'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {new Date(user.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                    {user.updated_at ? new Date(user.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Page {page} of {totalPages} · {count} users
            </span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/admin/users?page=${page - 1}&search=${search}&role=${roleFilter}`}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  ← Prev
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/admin/users?page=${page + 1}&search=${search}&role=${roleFilter}`}
                      className="text-xs px-3 py-1.5 rounded-lg transition-all btn-brand">
                  Next →
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
