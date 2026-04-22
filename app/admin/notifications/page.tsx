'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
  profiles?: { name: string }
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ title: '', message: '', type: 'info', target: 'all' })
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*, profiles(name)')
      .order('created_at', { ascending: false })
      .limit(50)
    setNotifications((data as Notification[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)

    if (form.target === 'all') {
      // Get all user IDs
      const { data: users } = await supabase.from('profiles').select('id')
      const rows = users?.map((u) => ({
        user_id: u.id,
        title: form.title,
        message: form.message,
        type: form.type,
      })) ?? []
      if (rows.length > 0) {
        await supabase.from('notifications').insert(rows)
      }
    }

    setForm({ title: '', message: '', type: 'info', target: 'all' })
    setShowForm(false)
    await load()
    setSending(false)
  }

  const typeColors: Record<string, string> = {
    info: 'badge-info', success: 'badge-success', warning: 'badge-warning', alert: 'badge-error'
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Notifications</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Send platform-wide and targeted notifications to users</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-brand">📣 Send Notification</button>
      </div>

      {/* Send Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.8)' }}>
          <div className="glass-card rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Send Notification</h3>
            <form onSubmit={handleSend} className="flex flex-col gap-3">
              <input required className="input-field" placeholder="Notification title *"
                     value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              <textarea required className="input-field resize-none" rows={3} placeholder="Message..."
                        value={form.message} onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))} />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <select className="input-field" value={form.type} onChange={(e) => setForm((p) => ({ ...p, type: e.target.value }))}>
                    <option value="info">ℹ️ Info</option>
                    <option value="success">✅ Success</option>
                    <option value="warning">⚠️ Warning</option>
                    <option value="alert">🚨 Alert</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Target</label>
                  <select className="input-field" value={form.target} onChange={(e) => setForm((p) => ({ ...p, target: e.target.value }))}>
                    <option value="all">🌐 All Users</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <button type="button" onClick={() => setShowForm(false)}
                        className="flex-1 py-2 rounded-xl text-sm"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                  Cancel
                </button>
                <button type="submit" disabled={sending} className="btn-brand flex-1 py-2 text-sm disabled:opacity-50">
                  {sending ? 'Sending...' : '📣 Send Now'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Recent Notifications ({notifications.length})</h2>
        </div>
        {notifications.length === 0 ? (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>No notifications sent yet.</div>
        ) : (
          <div className="flex flex-col">
            {notifications.map((n, i) => (
              <div key={n.id} className="flex items-start gap-3 px-5 py-4"
                   style={{ borderBottom: i < notifications.length - 1 ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{n.title}</span>
                    <span className={`badge ${typeColors[n.type] ?? 'badge-info'} text-xs`}>{n.type}</span>
                    {!n.is_read && <span className="badge badge-warning text-xs">Unread</span>}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{n.message}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    To: {n.profiles?.name ?? n.user_id.slice(0, 8)} · {new Date(n.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
