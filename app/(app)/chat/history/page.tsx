'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Clock, MessageSquare, ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react'

interface ChatSession {
  session_id: string
  content: string
  created_at: string
}

const PAGE_SIZE = 10

export default function ChatHistoryPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')

  useEffect(() => {
    fetchSessions()
  }, [page, search])

  const fetchSessions = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    let query = supabase
      .from('chat_history')
      .select('session_id, content, created_at', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .order('created_at', { ascending: false })

    if (search) {
      query = query.ilike('content', `%${search}%`)
    }

    const { data, count, error } = await query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) {
      console.error(error)
    } else if (data) {
      // Get unique sessions (Supabase doesn't support distinct easily on range)
      // Usually we'd use a postgres function or a separate sessions table
      // But for now we'll filter unique sessions in memory if needed, or assume first user message is session start
      const unique = []
      const seen = new Set()
      for (const item of data) {
        if (!seen.has(item.session_id)) {
          seen.add(item.session_id)
          unique.push(item)
        }
      }
      setSessions(unique)
      setTotalCount(count ?? 0)
    }
    setLoading(false)
  }

  const handleDelete = async (sid: string) => {
    if (!confirm('Are you sure you want to delete this chat?')) return
    const { error } = await supabase.from('chat_history').delete().eq('session_id', sid)
    if (!error) {
      fetchSessions()
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <div style={{ padding: '40px 24px', maxWidth: '800px', margin: '0 auto', minHeight: '100vh' }}>
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>Chat History</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Review and continue your past conversations with Arogya AI.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search chats..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              style={{
                padding: '8px 12px 8px 36px',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                background: 'var(--bg-card)',
                fontSize: '14px',
                width: '240px',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading history...</div>
        ) : sessions.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <MessageSquare size={32} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
            <p>No chat history found.</p>
          </div>
        ) : (
          <div>
            {sessions.map((session) => (
              <div 
                key={session.session_id}
                onClick={() => router.push(`/chat?session=${session.session_id}`)}
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.1s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1, overflow: 'hidden' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Clock size={18} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {session.content || 'Untitled Chat'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {new Date(session.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDelete(session.session_id); }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '8px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    transition: 'all 0.1s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--badge-red-bg)'; e.currentTarget.style.color = 'var(--badge-red-text)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {totalCount > PAGE_SIZE && (
          <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-secondary)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Showing {page * PAGE_SIZE + 1} to {Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button 
                disabled={page === 0}
                onClick={() => setPage(p => p - 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: page === 0 ? 'not-allowed' : 'pointer',
                  opacity: page === 0 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '13px'
                }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <button 
                disabled={page >= totalPages - 1}
                onClick={() => setPage(p => p + 1)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-card)',
                  cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                  opacity: page >= totalPages - 1 ? 0.5 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '13px'
                }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
