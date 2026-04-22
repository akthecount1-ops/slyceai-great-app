'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Stethoscope, LogOut, User,
  SquarePen, Search, X, MessageSquare, LayoutDashboard, Trash2,
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'

interface RecentChat { id: string; session_id: string; content: string; created_at: string }

const INFO_ITEMS = [
  { href: '/blog',    label: 'Health Blog',       emoji: '📰' },
  { href: '/terms',   label: 'Terms & Conditions', emoji: '📄' },
  { href: '/privacy', label: 'Privacy Policy',     emoji: '🔒' },
]

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
  const supabase  = createClient()

  const [recentChats,    setRecentChats   ] = useState<RecentChat[]>([])
  const [filtered,       setFiltered      ] = useState<RecentChat[]>([])
  const [query,          setQuery         ] = useState('')
  const [userName,       setUserName      ] = useState('')
  const [initials,       setInitials      ] = useState('U')
  const [deletingId,     setDeletingId    ] = useState<string | null>(null)
  const [hoveredId,      setHoveredId     ] = useState<string | null>(null)
  const [loadingHistory, setLoadingHistory] = useState(true)
  // Track which session is currently open in the chat page
  const [activeSession,  setActiveSession ] = useState<string | null>(null)

  const searchRef   = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Keep a ref so the realtime callback always sees latest chats
  const recentChatsRef = useRef<RecentChat[]>([])
  const userIdRef      = useRef<string | null>(null)

  // ── Sync activeSession from URL whenever pathname changes ────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setActiveSession(params.get('session'))
  }, [pathname])

  // ── Initial data load ────────────────────────────────────────
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    const init = async () => {
      setLoadingHistory(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoadingHistory(false); return }
      userIdRef.current = user.id

      const [chatsRes, profileRes] = await Promise.all([
        supabase.from('chat_history')
          .select('id,session_id,content,created_at')
          .eq('user_id', user.id)
          .eq('role', 'user')
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('profiles').select('name').eq('id', user.id).single(),
      ])

      if (chatsRes.data) {
        const sessions = new Map<string, RecentChat>()
        for (const msg of chatsRes.data as RecentChat[]) {
          if (msg.session_id && !sessions.has(msg.session_id)) {
            sessions.set(msg.session_id, msg)
          }
        }
        const uniqueChats = Array.from(sessions.values())
        recentChatsRef.current = uniqueChats
        setRecentChats(uniqueChats)
        setFiltered(uniqueChats)
      }

      if (profileRes.data?.name) {
        const n = profileRes.data.name
        setUserName(n)
        setInitials(n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2))
      }

      setLoadingHistory(false)

      // ── Supabase Realtime: watch for new user messages ───────
      channel = supabase
        .channel('chat-history-sidebar')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'chat_history',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const row = payload.new as RecentChat & { role: string }
            // Only track user messages as session titles
            if (row.role !== 'user') return
            // Add to top if this session_id isn't already listed
            const current = recentChatsRef.current
            if (current.some(c => c.session_id === row.session_id)) return
            const newEntry: RecentChat = {
              id: row.id,
              session_id: row.session_id,
              content: row.content,
              created_at: row.created_at,
            }
            const updated = [newEntry, ...current]
            recentChatsRef.current = updated
            setRecentChats(updated)
            setFiltered(prev => {
              // If there's an active query, only add if it matches
              if (query && !row.content.toLowerCase().includes(query.toLowerCase())) return prev
              return [newEntry, ...prev]
            })
          }
        )
        .subscribe()
    }

    init()

    return () => {
      if (channel) supabase.removeChannel(channel)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = (val: string) => {
    setQuery(val)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      if (!val.trim()) return setFiltered(recentChatsRef.current)
      const q = val.toLowerCase()
      setFiltered(recentChatsRef.current.filter(c => c.content.toLowerCase().includes(q)))
    }, 180)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
    router.refresh()
  }

  const handleDeleteChat = async (chat: RecentChat, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeletingId(chat.id)
    await fetch(`/api/chat?sessionId=${chat.session_id}`, { method: 'DELETE' })

    const updated = recentChatsRef.current.filter(c => c.session_id !== chat.session_id)
    recentChatsRef.current = updated
    setRecentChats(updated)
    setFiltered(query ? updated.filter(c => c.content.toLowerCase().includes(query.toLowerCase())) : updated)
    setDeletingId(null)

    // If we just deleted the currently active session, go to /chat (new session)
    if (chat.session_id === activeSession) {
      window.location.href = '/chat'
    }
  }

  const handleNewChat = () => {
    window.location.href = '/chat'
  }

  const go = (href: string) => {
    router.push(href)
    if (onMobileClose) onMobileClose()
  }

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href + '/'))
  const truncate  = (s: string, n = 34) => s.length > n ? s.slice(0, n).trimEnd() + '…' : s

  const navLink = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: '8px',
    padding: '7px 10px', borderRadius: '8px',
    background: active ? 'rgba(0,0,0,0.08)' : 'transparent',
    color: active ? '#1a1a1a' : '#5a5652',
    fontWeight: active ? 600 : 450,
    fontSize: '14px', textDecoration: 'none',
    transition: 'background 0.12s, color 0.12s',
    lineHeight: 1.4,
    cursor: 'pointer', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit',
  })

  // "New Chat" is only visually active when on /chat but NO session exists in the URL
  // (i.e. the chat page just opened, before first message)
  const newChatActive = pathname === '/chat' && !activeSession

  return (
    <aside style={{
      width: '100%', height: '100%',
      display: 'flex', flexDirection: 'column',
      background: 'var(--bg-sidebar, #e8e4dd)',
      borderRight: '1px solid var(--border)',
      overflow: 'hidden',
    }}>

      {/* ── Header ─────────────────────────────────── */}
      <div style={{
        padding: '16px 14px 12px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <Link href="/dashboard"
          style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
          onClick={() => { if (onMobileClose) onMobileClose() }}
        >
          <div style={{
            width: '28px', height: '28px', borderRadius: '7px',
            background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Stethoscope size={14} strokeWidth={1.75} style={{ color: '#0d9488' }} />
          </div>
          <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.01em' }}>
            Slyceai
          </span>
        </Link>

        {/* New chat pen icon — always a plain action button, never "active" */}
        <button id="new-chat-btn" title="New chat" onClick={handleNewChat}
          style={{
            width: '30px', height: '30px', borderRadius: '7px', border: 'none',
            background: 'transparent', color: '#7a7571', display: 'flex',
            alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.07)'; e.currentTarget.style.color = '#1a1a1a' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#7a7571' }}
        >
          <SquarePen size={16} strokeWidth={1.75} />
        </button>
      </div>

      {/* ── Search ──────────────────────────────────── */}
      <div style={{ padding: '0 10px 10px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '7px 11px', borderRadius: '9px',
          background: 'rgba(255,255,255,0.55)', border: '1px solid rgba(0,0,0,0.1)',
          transition: 'border-color 0.15s',
        }}
          onFocusCapture={e => (e.currentTarget.style.borderColor = 'rgba(13,148,136,0.5)')}
          onBlurCapture={e  => (e.currentTarget.style.borderColor = 'rgba(0,0,0,0.1)')}
        >
          <Search size={13} style={{ color: '#9a9690', flexShrink: 0 }} />
          <input ref={searchRef} id="chat-search" type="text" value={query}
            onChange={e => handleSearch(e.target.value)}
            placeholder="Search chats…"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontSize: '13px', color: '#1a1a1a', fontFamily: 'inherit', fontWeight: 400,
            }}
          />
          {query && (
            <button onClick={() => { setQuery(''); setFiltered(recentChatsRef.current); searchRef.current?.focus() }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9a9690', display: 'flex', padding: 0 }}>
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      {/* ── Scrollable nav ──────────────────────────── */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>

        {/* Dashboard */}
        <Link href="/dashboard"
          onClick={() => { if (onMobileClose) onMobileClose() }}
          style={navLink(isActive('/dashboard'))}
          onMouseEnter={e => { if (!isActive('/dashboard')) { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#1a1a1a' } }}
          onMouseLeave={e => { if (!isActive('/dashboard')) { e.currentTarget.style.background = 'transparent';        e.currentTarget.style.color = '#5a5652' } }}
        >
          <LayoutDashboard size={15} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.7 }} />
          Dashboard
        </Link>

        {/* New chat — active only when on /chat with no session yet */}
        <button onClick={handleNewChat}
          style={navLink(newChatActive)}
          onMouseEnter={e => { if (!newChatActive) { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#1a1a1a' } }}
          onMouseLeave={e => { if (!newChatActive) { e.currentTarget.style.background = 'transparent';      e.currentTarget.style.color = '#5a5652' } }}
        >
          <MessageSquare size={15} strokeWidth={1.75} style={{ flexShrink: 0, opacity: 0.7 }} />
          New chat
        </button>

        {/* ── Recents ── */}
        <div style={{ marginTop: '16px' }}>
          {/* Section header */}
          {(loadingHistory || filtered.length > 0) && (
            <p style={{
              fontSize: '11px', fontWeight: 600, color: '#9a9690',
              textTransform: 'uppercase', letterSpacing: '0.07em',
              padding: '0 10px', margin: '0 0 4px',
            }}>
              {query ? 'Results' : 'Recents'}
            </p>
          )}

          {/* Skeleton during initial load */}
          {loadingHistory && <ChatSkeleton />}

          {/* Chat items */}
          {!loadingHistory && filtered.map(chat => {
            const isCurrentSession = chat.session_id === activeSession
            return (
              <div key={chat.id}
                style={{ position: 'relative' }}
                onMouseEnter={() => setHoveredId(chat.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  onClick={() => {
                    window.location.href = `/chat?session=${chat.session_id}`
                    if (onMobileClose) onMobileClose()
                  }}
                  title={chat.content}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '6px 32px 6px 10px', borderRadius: '8px',
                    fontSize: '13.5px', fontWeight: isCurrentSession ? 600 : 400,
                    background: isCurrentSession
                      ? 'rgba(13,148,136,0.1)'
                      : hoveredId === chat.id ? 'rgba(0,0,0,0.05)' : 'transparent',
                    border: isCurrentSession ? '1px solid rgba(13,148,136,0.2)' : '1px solid transparent',
                    color: isCurrentSession ? '#0d7a72' : hoveredId === chat.id ? '#1a1a1a' : '#5a5652',
                    cursor: 'pointer', fontFamily: 'inherit',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                    lineHeight: 1.45, transition: 'background 0.1s, color 0.1s, border-color 0.1s',
                  }}
                >
                  {truncate(chat.content)}
                </button>

                {/* Per-chat delete — shows on hover */}
                {hoveredId === chat.id && (
                  <button
                    onClick={e => handleDeleteChat(chat, e)}
                    disabled={deletingId === chat.id}
                    title="Delete this chat"
                    style={{
                      position: 'absolute', right: '6px', top: '50%',
                      transform: 'translateY(-50%)',
                      width: '22px', height: '22px', borderRadius: '5px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      color: '#9a9690', padding: 0, transition: 'all 0.12s',
                      opacity: deletingId === chat.id ? 0.4 : 1,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.1)'; e.currentTarget.style.color = '#dc2626' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9a9690' }}
                  >
                    <Trash2 size={13} strokeWidth={1.75} />
                  </button>
                )}
              </div>
            )
          })}

          {!loadingHistory && query && filtered.length === 0 && (
            <p style={{ fontSize: '13px', color: '#9a9690', padding: '20px 10px', textAlign: 'center' }}>
              No matching chats
            </p>
          )}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: '1px', background: 'rgba(0,0,0,0.08)', margin: '14px 4px' }} />

        {/* Info links */}
        {INFO_ITEMS.map(item => (
          <Link key={item.href} href={item.href}
            onClick={() => { if (onMobileClose) onMobileClose() }}
            style={navLink(isActive(item.href))}
            onMouseEnter={e => { if (!isActive(item.href)) { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#1a1a1a' } }}
            onMouseLeave={e => { if (!isActive(item.href)) { e.currentTarget.style.background = 'transparent';       e.currentTarget.style.color = '#5a5652' } }}
          >
            <span style={{ fontSize: '15px', lineHeight: 1, flexShrink: 0 }}>{item.emoji}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* ── Profile + Sign out ───────────────────────── */}
      <div style={{
        padding: '10px 10px 16px',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        flexShrink: 0,
      }}>
        <Link href="/profile"
          onClick={() => { if (onMobileClose) onMobileClose() }}
          style={{ ...navLink(isActive('/profile')), marginBottom: '2px' }}
          onMouseEnter={e => { if (!isActive('/profile')) { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#1a1a1a' } }}
          onMouseLeave={e => { if (!isActive('/profile')) { e.currentTarget.style.background = 'transparent';       e.currentTarget.style.color = '#5a5652' } }}
        >
          <div style={{
            width: '26px', height: '26px', borderRadius: '50%',
            background: '#1a1a1a', color: '#0d9488',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '10.5px', fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {userName || 'Profile'}
          </span>
          <User size={13} style={{ color: '#9a9690', flexShrink: 0 }} />
        </Link>

        <button onClick={handleLogout} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          padding: '7px 10px', borderRadius: '8px', width: '100%',
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: '#9a9690', fontSize: '13.5px', fontWeight: 450,
          fontFamily: 'inherit', textAlign: 'left', transition: 'all 0.12s',
        }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(220,38,38,0.07)'; e.currentTarget.style.color = '#c53030' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#9a9690' }}
        >
          <LogOut size={14} strokeWidth={1.75} style={{ flexShrink: 0 }} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
