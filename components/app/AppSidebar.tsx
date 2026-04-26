'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Stethoscope, LogOut, User, LayoutGrid, PlusCircle, Plus, FileText,
  MoreVertical, Star, Trash2, Edit2, FolderPlus, Check, X
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface RecentChat { id: string; session_id: string; content: string; created_at: string; is_starred?: boolean; session_title?: string | null }

// ── Skeleton loader for chat items ─────────────────────────────
function ChatSkeleton() {
  return (
    <div style={{ padding: '0 4px' }}>
      {[80, 60, 72, 50, 65].map((w, i) => (
        <div key={i} style={{
          height: '30px', marginBottom: '2px', borderRadius: '8px',
          padding: '0 10px', display: 'flex', alignItems: 'center',
        }}>
          <div style={{
            height: '11px', width: `${w}%`, borderRadius: '6px',
            background: 'linear-gradient(90deg, rgba(0,0,0,0.07) 25%, rgba(0,0,0,0.13) 50%, rgba(0,0,0,0.07) 75%)',
            backgroundSize: '200% 100%',
            animation: `shimmer 1.4s ${i * 0.12}s infinite linear`,
          }} />
        </div>
      ))}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  )
}

export default function AppSidebar({ onMobileClose }: { onMobileClose?: () => void }) {
  const pathname  = usePathname()
  const router    = useRouter()
  const [supabase] = useState(() => createClient())

  const [recentChats,    setRecentChats   ] = useState<RecentChat[]>([])
  const [userName,       setUserName      ] = useState('')
  const [initials,       setInitials      ] = useState('U')
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [activeSession,  setActiveSession ] = useState<string | null>(null)
  
  const [menuOpen,        setMenuOpen      ] = useState<string | null>(null) // session_id
  const [renamingSession, setRenamingSession] = useState<string | null>(null) // session_id
  const [newName,         setNewName        ] = useState('')
  
  const recentChatsRef = useRef<RecentChat[]>([])
  const userIdRef      = useRef<string | null>(null)

  // ── Sync activeSession from URL whenever pathname changes ────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setActiveSession(params.get('session'))
  }, [pathname])

  // ── Initial data load ────────────────────────────────────────
  useEffect(() => {
    let active = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      if (!active) return
      setLoadingHistory(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingHistory(false); return }
      userIdRef.current = user.id

      let { data: chatsData, error: chatsError } = await supabase.from('chat_history')
        .select('id,session_id,content,created_at,is_starred,session_title')
        .eq('user_id', user.id)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .range(0, 50)

      // Fallback if columns are missing
      if (chatsError) {
        console.warn('Metadata columns might be missing, falling back to basic query:', chatsError.message)
        const fallback = await supabase.from('chat_history')
          .select('id,session_id,content,created_at')
          .eq('user_id', user.id)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .range(0, 50)
        chatsData = fallback.data as any
      }

      if (chatsData) {
        const sessions = new Map<string, RecentChat>()
        for (const msg of chatsData as RecentChat[]) {
          if (msg.session_id && !sessions.has(msg.session_id)) {
            sessions.set(msg.session_id, msg)
          }
        }
        const uniqueChats = Array.from(sessions.values())
        recentChatsRef.current = uniqueChats
        setRecentChats(uniqueChats)
      }

      const { data: pData } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      if (pData?.name) {
        const n = pData.name
        setUserName(n)
        setInitials(n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2))
      }
      
      setLoadingHistory(false)

      if (!active) return

      const channelName = `chat-history-sidebar-${Math.random().toString(36).slice(2, 9)}`
      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'chat_history', filter: `user_id=eq.${user.id}` },
          (payload) => {
            if (!active) return
            const row = payload.new as RecentChat & { role: string }
            if (row.role !== 'user') return
            const current = recentChatsRef.current
            if (current.some(c => c.session_id === row.session_id)) return
            const newEntry: RecentChat = { id: row.id, session_id: row.session_id, content: row.content, created_at: row.created_at }
            const updated = [newEntry, ...current]
            recentChatsRef.current = updated
            setRecentChats(updated)
          }
        )
        .subscribe()
    }

    init()

    return () => {
      active = false
      if (channel) supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const go = (href: string) => {
    router.push(href)
    if (onMobileClose) onMobileClose()
  }

  const handleStar = async (sid: string, currentStatus: boolean) => {
    setRecentChats(prev => prev.map(c => c.session_id === sid ? { ...c, is_starred: !currentStatus } : c))
    await supabase.from('chat_history').update({ is_starred: !currentStatus }).eq('session_id', sid)
    setMenuOpen(null)
  }

  const handleDelete = async (sid: string) => {
    if (!confirm('Delete this chat?')) return
    setRecentChats(prev => prev.filter(c => c.session_id !== sid))
    await supabase.from('chat_history').delete().eq('session_id', sid)
    if (activeSession === sid) router.push('/chat')
    setMenuOpen(null)
  }

  const startRename = (chat: RecentChat) => {
    setRenamingSession(chat.session_id)
    setNewName(chat.session_title || chat.content)
    setMenuOpen(null)
  }

  const submitRename = async (sid: string) => {
    if (!newName.trim()) { setRenamingSession(null); return }
    setRecentChats(prev => prev.map(c => c.session_id === sid ? { ...c, session_title: newName.trim() } : c))
    await supabase.from('chat_history').update({ session_title: newName.trim() }).eq('session_id', sid)
    setRenamingSession(null)
  }

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
  const truncate  = (s: string, n = 30) => s.length > n ? s.slice(0, n).trimEnd() + '…' : s

  const navItem = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 16px',
    background: active ? 'var(--bg-page)' : 'transparent',
    color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
    fontWeight: active ? 500 : 400,
    fontSize: '13px', textDecoration: 'none',
    cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left',
    fontFamily: 'inherit', lineHeight: 1.4,
    borderRight: active ? '2px solid var(--accent)' : '2px solid transparent',
    transition: 'background 0.1s, color 0.1s',
    borderRadius: 0,
  })

  const menuItem: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '8px 12px', width: '100%', border: 'none',
    background: 'transparent', cursor: 'pointer', fontSize: '13px',
    color: 'var(--text-primary)', textAlign: 'left', borderRadius: '6px',
    fontFamily: 'inherit', transition: 'background 0.1s'
  }

  return (
    <aside style={{
      width: 'var(--sidebar-width)', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-card)',
      borderRight: '0.5px solid var(--border)',
      overflow: 'hidden',
      flexShrink: 0,
    }}>

      {/* ── Logo ─────────────────────────────────── */}
      <div style={{
        padding: '20px 16px 16px',
        borderBottom: '0.5px solid var(--border)',
        marginBottom: '8px', flexShrink: 0,
      }}>
        <Link href="/dashboard" style={{ textDecoration: 'none' }}
          onClick={() => { if (onMobileClose) onMobileClose() }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '26px', height: '26px', borderRadius: '6px',
              background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Stethoscope size={13} strokeWidth={1.75} style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>Arogya</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '1px' }}>Your health companion</div>
            </div>
          </div>
        </Link>
      </div>

      {/* ── Primary Nav ──────────────────────────── */}
      <nav style={{ flexShrink: 0 }}>
        {/* Dashboard */}
        <Link href="/dashboard"
          onClick={() => { if (onMobileClose) onMobileClose() }}
          style={navItem(isActive('/dashboard'))}
          onMouseEnter={e => { if (!isActive('/dashboard')) { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
          onMouseLeave={e => { if (!isActive('/dashboard')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5a5652' } }}
        >
          <LayoutGrid size={15} strokeWidth={1.75} style={{ opacity: 0.75, flexShrink: 0 }} />
          Dashboard
        </Link>

        {/* New Chat */}
        <Link href="/chat"
          onClick={() => { if (onMobileClose) onMobileClose() }}
          style={navItem(isActive('/chat'))}
          onMouseEnter={e => { if (!isActive('/chat')) { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
          onMouseLeave={e => { if (!isActive('/chat')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5a5652' } }}
        >
          <PlusCircle size={15} strokeWidth={1.75} style={{ opacity: 0.75, flexShrink: 0 }} />
          New Chat
        </Link>

        {/* My profile */}
        <Link href="/profile"
          onClick={() => { if (onMobileClose) onMobileClose() }}
          style={navItem(isActive('/profile'))}
          onMouseEnter={e => { if (!isActive('/profile')) { e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; e.currentTarget.style.color = 'var(--text-primary)' } }}
          onMouseLeave={e => { if (!isActive('/profile')) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5a5652' } }}
        >
          <User size={15} strokeWidth={1.75} style={{ opacity: 0.75, flexShrink: 0 }} />
          My profile
        </Link>
      </nav>

      {/* ── Quick Links ──────────────────────────────── */}
      <div style={{ padding: '24px 16px 8px' }}>
        <p style={{
          fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 10px',
        }}>
          Quick Links
        </p>
        <button onClick={() => go('/vitals')} style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit'
        }}>
          <Plus size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          Log vitals
        </button>
        <button onClick={() => go('/reports')} style={{
          display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', marginTop: '8px',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-primary)', fontSize: '13px', fontWeight: 500, fontFamily: 'inherit'
        }}>
          <FileText size={16} strokeWidth={1.5} style={{ color: 'var(--text-muted)' }} />
          Upload report
        </button>
      </div>

      {/* ── Divider ──────────────────────────────── */}
      <div style={{ height: '0.5px', background: 'var(--border)', margin: '8px 16px' }} />

      {/* ── Recent chats section ──────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 8px' }}>
        {(loadingHistory || recentChats.length > 0) && (
          <p style={{
            fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)',
            textTransform: 'uppercase', letterSpacing: '0.07em',
            padding: '0 16px', margin: '0 0 4px',
          }}>
            Recents
          </p>
        )}

        {loadingHistory && <ChatSkeleton />}

        {!loadingHistory && recentChats.slice(0, 6).map(chat => {
          const isCurrentSession = chat.session_id === activeSession
          const isMenuOpen = menuOpen === chat.session_id
          const isRenaming = renamingSession === chat.session_id
          const displayTitle = chat.session_title || chat.content

          return (
            <div key={chat.session_id} style={{ position: 'relative', padding: '0 8px' }}>
              {isRenaming ? (
                <div style={{ padding: '4px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <input
                    autoFocus
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') submitRename(chat.session_id); if (e.key === 'Escape') setRenamingSession(null) }}
                    style={{
                      flex: 1, fontSize: '12px', padding: '4px 8px', borderRadius: '4px',
                      border: '1px solid var(--accent)', background: 'var(--bg-page)',
                      outline: 'none', color: 'var(--text-primary)'
                    }}
                  />
                  <button onClick={() => submitRename(chat.session_id)} style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--accent)' }}><Check size={14}/></button>
                  <button onClick={() => setRenamingSession(null)} style={{ padding: '4px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={14}/></button>
                </div>
              ) : (
                <div 
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '6px 12px', borderRadius: '8px',
                    background: isCurrentSession ? 'var(--bg-page)' : 'transparent',
                    cursor: 'pointer', transition: 'all 0.15s',
                    groupHeader: 'true' // marker
                  }}
                  onMouseEnter={e => { 
                    if (!isCurrentSession) e.currentTarget.style.background = 'rgba(0,0,0,0.035)'
                    const moreBtn = e.currentTarget.querySelector('.more-btn') as HTMLElement
                    if (moreBtn) moreBtn.style.opacity = '1'
                  }}
                  onMouseLeave={e => { 
                    if (!isCurrentSession) e.currentTarget.style.background = 'transparent'
                    const moreBtn = e.currentTarget.querySelector('.more-btn') as HTMLElement
                    if (moreBtn && menuOpen !== chat.session_id) moreBtn.style.opacity = '0'
                  }}
                  onClick={() => { window.location.href = `/chat?session=${chat.session_id}` }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', flex: 1 }}>
                    {chat.is_starred && <Star size={10} fill="var(--accent)" stroke="var(--accent)" style={{ flexShrink: 0 }} />}
                    <span style={{
                      fontSize: '13px', fontWeight: isCurrentSession ? 500 : 400,
                      color: isCurrentSession ? 'var(--text-primary)' : 'var(--text-secondary)',
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                    }}>
                      {truncate(displayTitle, 30)}
                    </span>
                  </div>
                  
                  <button
                    className="more-btn"
                    onClick={(e) => { e.stopPropagation(); setMenuOpen(isMenuOpen ? null : chat.session_id) }}
                    style={{
                      opacity: isMenuOpen ? 1 : 0, padding: '4px', border: 'none', background: 'transparent',
                      cursor: 'pointer', color: 'var(--text-muted)', transition: 'opacity 0.15s'
                    }}
                  >
                    <MoreVertical size={14} />
                  </button>
                </div>
              )}

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', inset: 0, zIndex: 10 }} 
                    onClick={() => setMenuOpen(null)} 
                  />
                  <div style={{
                    position: 'absolute', top: '34px', right: '12px', width: '160px',
                    background: 'var(--bg-card)', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
                    border: '0.5px solid var(--border)', zIndex: 11, padding: '4px'
                  }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleStar(chat.session_id, !!chat.is_starred) }}
                      style={menuItem}
                    >
                      <Star size={14} style={{ opacity: 0.7 }} fill={chat.is_starred ? 'currentColor' : 'none'} />
                      {chat.is_starred ? 'Unstar' : 'Star'}
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); startRename(chat) }}
                      style={menuItem}
                    >
                      <Edit2 size={14} style={{ opacity: 0.7 }} />
                      Rename
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(null) }}
                      style={menuItem}
                    >
                      <FolderPlus size={14} style={{ opacity: 0.7 }} />
                      Add to project
                    </button>
                    <div style={{ height: '0.5px', background: 'var(--border)', margin: '4px' }} />
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDelete(chat.session_id) }}
                      style={{ ...menuItem, color: '#dc2626' }}
                    >
                      <Trash2 size={14} style={{ opacity: 0.7 }} />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {!loadingHistory && recentChats.length > 6 && (
          <Link href="/chat/history"
            onClick={() => { if (onMobileClose) onMobileClose() }}
            style={{
              display: 'block', padding: '8px 20px',
              fontSize: '12px', fontWeight: 500, color: 'var(--accent)',
              textDecoration: 'none', transition: 'opacity 0.1s'
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            See all chats
          </Link>
        )}

        {!loadingHistory && recentChats.length === 0 && (
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '12px 16px' }}>
            No recent chats yet
          </p>
        )}
      </div>

      {/* ── Sign out ─────────────────────────────── */}
      <div style={{
        padding: '8px 0 16px',
        borderTop: '0.5px solid var(--border)',
        flexShrink: 0,
      }}>
        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '9px 16px', width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 400,
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--badge-red-bg)'; e.currentTarget.style.color = 'var(--badge-red-text)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
        >
          <LogOut size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
