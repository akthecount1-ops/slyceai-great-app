'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, RefreshCw, Trash2, Stethoscope, X, Paperclip, Heart, Pill, FileText, Check, Wind, Droplets, Activity, Upload } from 'lucide-react'
import ChatAttachMenu from '@/components/app/ChatAttachMenu'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

function getGreeting(name: string) {
  const h = new Date().getHours()
  const time = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
  return `${time}, ${name}`
}

const SUGGESTED = [
  'Analyse my recent vitals',
  'Check for medicine interactions',
  'Ayurvedic tips for better sleep',
  'Diet plan for diabetes',
  'Explain my lab report simply',
  'Signs I should see a doctor',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [userName, setUserName] = useState('there')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [sessionId, setSessionId] = useState<string>('')

  // Health context for empty-state cards
  const [vitalsCtx, setVitalsCtx] = useState<{
    bp_systolic: number|null; bp_diastolic: number|null;
    pulse: number|null; oxygen: number|null; blood_sugar: number|null;
    recorded_at: string;
  } | null>(null)
  const [medsCtx, setMedsCtx] = useState<Array<{medicine_name:string; dose:string|null; frequency:string|null}>>([])
  const [vitalsShared,   setVitalsShared  ] = useState(false)
  const [medsShared,     setMedsShared    ] = useState(false)
  const [contextSent,    setContextSent   ] = useState(false)
  const reportInputRef = useRef<HTMLInputElement>(null)
  
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const supabase = createClient()

  useEffect(() => {
    let sid = new URLSearchParams(window.location.search).get('session')
    if (!sid) {
      sid = crypto.randomUUID()
      window.history.replaceState({}, '', `/chat?session=${sid}`)
    }
    setSessionId(sid)
    loadData(sid)
  }, [])
  
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [input])

  const loadData = async (sid: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [historyRes, profileRes, vitalsRes, medRes] = await Promise.all([
      supabase.from('chat_history').select('*')
        .eq('user_id', user.id).eq('session_id', sid)
        .order('created_at', { ascending: true }).limit(60),
      supabase.from('profiles').select('name').eq('id', user.id).single(),
      supabase.from('vitals')
        .select('bp_systolic,bp_diastolic,pulse,oxygen,blood_sugar,recorded_at')
        .eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1).single(),
      supabase.from('medicines')
        .select('medicine_name,dose,frequency')
        .eq('user_id', user.id).eq('is_active', true),
    ])
    if (historyRes.data) setMessages(historyRes.data as Message[])
    if (profileRes.data?.name) setUserName(profileRes.data.name.split(' ')[0])
    if (vitalsRes.data) setVitalsCtx(vitalsRes.data as typeof vitalsCtx)
    if (medRes.data) setMedsCtx(medRes.data as typeof medsCtx)
    setLoadingHistory(false)
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    if (!text || loading) return
    if (!sessionId) { console.warn('[Chat] sessionId not set'); return }

    // Prepend health context to the very first message of a new session
    let finalText = text
    if (messages.length === 0 && !contextSent && (vitalsShared || medsShared)) {
      let prefix = ''
      if (vitalsShared && vitalsCtx) {
        const d = new Date(vitalsCtx.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        prefix += `[My vitals as of ${d} — BP: ${vitalsCtx.bp_systolic ?? '—'}/${vitalsCtx.bp_diastolic ?? '—'} mmHg, Pulse: ${vitalsCtx.pulse ?? '—'} bpm, O₂: ${vitalsCtx.oxygen ?? '—'}%, Sugar: ${vitalsCtx.blood_sugar ?? '—'} mg/dL]\n`
      }
      if (medsShared && medsCtx.length > 0) {
        const list = medsCtx.map(m => `${m.medicine_name}${m.dose ? ` (${m.dose})` : ''}`).join(', ')
        prefix += `[Active medications: ${list}]\n`
      }
      if (prefix) finalText = prefix + '\n' + text
      setContextSent(true)
    }

    setInput('')
    setAttachedFile(null)
    setLoading(true)
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: finalText, created_at: new Date().toISOString() }
    setMessages(p => [...p, userMsg])
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalText, sessionId }),
      })
      const data = await res.json()
      setMessages(p => [...p, {
        id: (Date.now() + 1).toString(), role: 'assistant',
        content: data.content ?? data.error ?? 'Unable to process your request.',
        created_at: new Date().toISOString(),
      }])
    } catch {
      setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Connection error. Please try again.', created_at: new Date().toISOString() }])
    } finally { setLoading(false) }
  }, [input, loading, sessionId, messages.length, contextSent, vitalsShared, medsShared, vitalsCtx, medsCtx])

  const clearChat = async () => {
    if (!confirm('Clear your entire chat history?')) return
    setLoading(true)
    await fetch(`/api/chat?sessionId=${sessionId}`, { method: 'DELETE' })
    setMessages([])
    setLoading(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleFileSelect = (file: File) => {
    setAttachedFile(file)
    setInput(`[Attached: ${file.name}] Please review this medical report and explain the key findings in plain language.`)
    textareaRef.current?.focus()
  }

  const handleInjectText = (text: string) => {
    setInput(text)
    textareaRef.current?.focus()
  }

  const isEmpty = !loadingHistory && messages.length === 0

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - var(--header-height))',
      width: '100%',
    }}>
      {/* ── Scrollable message area ─────────────────── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}
        className="chat-scroll-area">
        <style>{`
          .chat-scroll-area { scrollbar-width: none; }
          .chat-scroll-area::-webkit-scrollbar { display: none; }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes msgIn { from { opacity:0;transform:translateY(6px) } to { opacity:1;transform:translateY(0) } }
          @keyframes typingDot { 0%,100%{opacity:.3;transform:scale(0.85)} 50%{opacity:1;transform:scale(1)} }
        `}</style>

        {/* Loading */}
        {loadingHistory && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RefreshCw size={18} style={{ color: '#9a9690', animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* ── EMPTY STATE — rich context + greeting ── */}
        {isEmpty && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '0 20px 60px',
            animation: 'greetIn 0.45s ease',
          }}>
            <style>{`
              @keyframes greetIn { from { opacity:0;transform:translateY(14px) } to { opacity:1;transform:translateY(0) } }
              @keyframes cardIn { from { opacity:0;transform:translateY(10px) } to { opacity:1;transform:translateY(0) } }
            `}</style>

            {/* Hidden file input for report upload */}
            <input ref={reportInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) { handleFileSelect(f) } e.target.value = '' }}
            />

            {/* Greeting */}
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Stethoscope size={20} strokeWidth={1.5} style={{ color: '#0d9488' }} />
                </div>
                <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 34px)', fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.025em', margin: 0 }}>
                  {getGreeting(userName)}
                </h1>
              </div>
              <p style={{ fontSize: '15px', color: '#7a7571', margin: 0, fontWeight: 400 }}>
                Share your health context for a personalised response
              </p>
            </div>

            {/* ── Context Cards ── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', maxWidth: '680px', width: '100%', marginBottom: '28px' }}>

              {/* Vitals Card */}
              <div style={{
                flex: '1 1 190px', minWidth: '170px', maxWidth: '220px',
                borderRadius: '14px', padding: '16px',
                background: vitalsShared ? 'rgba(13,148,136,0.07)' : '#ffffff',
                border: `1.5px solid ${vitalsShared ? '#0d9488' : '#e2ddd7'}`,
                boxShadow: vitalsShared ? '0 0 0 3px rgba(13,148,136,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.18s', animation: 'cardIn 0.4s ease',
                cursor: 'default',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#fff1f2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Heart size={14} strokeWidth={1.75} style={{ color: '#be123c' }} />
                    </div>
                    <div>
                      <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1a1a1a' }}>Vitals</div>
                      <div style={{ fontSize: '10.5px', color: '#9a9690' }}>optional</div>
                    </div>
                  </div>
                  <button onClick={() => vitalsCtx && setVitalsShared(v => !v)}
                    disabled={!vitalsCtx}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: vitalsCtx ? 'pointer' : 'not-allowed',
                      background: vitalsShared ? '#0d9488' : '#f0ede8', color: vitalsShared ? '#fff' : '#5a5652',
                      fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit',
                    }}>
                    {vitalsShared ? <><Check size={10} /> Shared</> : 'Share'}
                  </button>
                </div>
                {vitalsCtx ? (
                  <div style={{ fontSize: '11.5px', color: '#5a5652', lineHeight: 1.6 }}>
                    <div>BP <strong style={{ color: '#1a1a1a' }}>{vitalsCtx.bp_systolic}/{vitalsCtx.bp_diastolic}</strong> mmHg</div>
                    <div>Pulse <strong style={{ color: '#1a1a1a' }}>{vitalsCtx.pulse}</strong> bpm · O₂ <strong style={{ color: '#1a1a1a' }}>{vitalsCtx.oxygen}%</strong></div>
                    <div>Sugar <strong style={{ color: '#1a1a1a' }}>{vitalsCtx.blood_sugar}</strong> mg/dL</div>
                  </div>
                ) : (
                  <p style={{ fontSize: '11.5px', color: '#b5b0a8', margin: 0 }}>No vitals recorded yet</p>
                )}
              </div>

              {/* Medicines Card */}
              <div style={{
                flex: '1 1 190px', minWidth: '170px', maxWidth: '220px',
                borderRadius: '14px', padding: '16px',
                background: medsShared ? 'rgba(13,148,136,0.07)' : '#ffffff',
                border: `1.5px solid ${medsShared ? '#0d9488' : '#e2ddd7'}`,
                boxShadow: medsShared ? '0 0 0 3px rgba(13,148,136,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.18s', animation: 'cardIn 0.5s ease',
                cursor: 'default',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Pill size={14} strokeWidth={1.75} style={{ color: '#16a34a' }} />
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1a1a1a' }}>Medicines</div>
                  </div>
                  <button onClick={() => medsCtx.length > 0 && setMedsShared(v => !v)}
                    disabled={medsCtx.length === 0}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: medsCtx.length > 0 ? 'pointer' : 'not-allowed',
                      background: medsShared ? '#0d9488' : '#f0ede8', color: medsShared ? '#fff' : '#5a5652',
                      fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit',
                    }}>
                    {medsShared ? <><Check size={10} /> Shared</> : 'Share'}
                  </button>
                </div>
                {medsCtx.length > 0 ? (
                  <div style={{ fontSize: '11.5px', color: '#5a5652', lineHeight: 1.6 }}>
                    <div><strong style={{ color: '#1a1a1a' }}>{medsCtx.length}</strong> active medication{medsCtx.length !== 1 ? 's' : ''}</div>
                    <div style={{ color: '#9a9690', marginTop: '2px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                      {medsCtx.slice(0, 2).map(m => m.medicine_name).join(', ')}{medsCtx.length > 2 ? ` +${medsCtx.length - 2} more` : ''}
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '11.5px', color: '#b5b0a8', margin: 0 }}>No active medications</p>
                )}
              </div>

              {/* Upload Report Card */}
              <div style={{
                flex: '1 1 190px', minWidth: '170px', maxWidth: '220px',
                borderRadius: '14px', padding: '16px',
                background: attachedFile ? 'rgba(13,148,136,0.07)' : '#ffffff',
                border: `1.5px solid ${attachedFile ? '#0d9488' : '#e2ddd7'}`,
                boxShadow: attachedFile ? '0 0 0 3px rgba(13,148,136,0.08)' : '0 1px 4px rgba(0,0,0,0.06)',
                transition: 'all 0.18s', animation: 'cardIn 0.6s ease',
                cursor: 'default',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileText size={14} strokeWidth={1.75} style={{ color: '#2563eb' }} />
                    </div>
                    <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1a1a1a' }}>Report</div>
                  </div>
                  <button onClick={() => attachedFile ? (setAttachedFile(null), setInput('')) : reportInputRef.current?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px',
                      padding: '4px 10px', borderRadius: '20px', border: 'none', cursor: 'pointer',
                      background: attachedFile ? '#0d9488' : '#f0ede8', color: attachedFile ? '#fff' : '#5a5652',
                      fontSize: '11px', fontWeight: 600, transition: 'all 0.15s', fontFamily: 'inherit',
                    }}>
                    {attachedFile ? <><Check size={10} /> Attached</> : <><Upload size={10} /> Upload</>}
                  </button>
                </div>
                {attachedFile ? (
                  <div style={{ fontSize: '11.5px', color: '#5a5652', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                    <strong style={{ color: '#1a1a1a' }}>{attachedFile.name}</strong>
                  </div>
                ) : (
                  <p style={{ fontSize: '11.5px', color: '#b5b0a8', margin: 0 }}>Lab report, prescription or scan</p>
                )}
              </div>
            </div>

            {/* Suggested prompts */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center', maxWidth: '600px' }}>
              {SUGGESTED.map(q => (
                <button key={q} onClick={() => sendMessage(q)} style={{
                  padding: '9px 18px', borderRadius: '100px',
                  border: '1px solid #d9d5ce', background: 'rgba(255,255,255,0.7)',
                  color: '#3d3d3d', fontSize: '13.5px', fontWeight: 450,
                  cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'inherit',
                  backdropFilter: 'blur(4px)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.color = '#0d7a72' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = '#d9d5ce'; e.currentTarget.style.color = '#3d3d3d' }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}


        {/* ── MESSAGES ── */}
        {!loadingHistory && messages.length > 0 && (
          <div style={{
            flex: 1, width: '100%', maxWidth: '760px', margin: '0 auto',
            padding: '40px 28px 24px',
            display: 'flex', flexDirection: 'column',
          }}>

            {/* Clear button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '24px' }}>
              <button onClick={clearChat} disabled={loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px', borderRadius: '8px', border: 'none',
                  background: 'transparent', color: '#c4bfb7',
                  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                  transition: 'all 0.15s', fontFamily: 'inherit',
                }}
                onMouseEnter={e => { e.currentTarget.style.color = '#dc2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#c4bfb7'; e.currentTarget.style.background = 'transparent' }}
              >
                <Trash2 size={12} />
                Clear
              </button>
            </div>

            {messages.map(msg => (
              <div key={msg.id} id={`msg-${msg.id}`} style={{ animation: 'msgIn 0.22s ease', marginBottom: '32px' }}>

                {msg.role === 'user' ? (
                  /* ── User message: right-aligned bubble ── */
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{
                      maxWidth: '72%',
                      padding: '12px 18px',
                      borderRadius: '20px 4px 20px 20px',
                      background: '#1a1a1a',
                      color: '#f0eeeb',
                      fontSize: '15px', lineHeight: 1.7, fontWeight: 400,
                    }}>
                      {msg.content.split('\n').map((line, i) => (
                        <p key={i} style={{ margin: i > 0 ? '4px 0 0' : 0 }}>{line}</p>
                      ))}
                      <div style={{ fontSize: '10.5px', marginTop: '6px', opacity: 0.4, textAlign: 'right' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* ── AI message: avatar + plain text, no bubble ── */
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: '#1a1a1a', color: '#0d9488', marginTop: '2px',
                    }}>
                      <Stethoscope size={15} strokeWidth={1.75} />
                    </div>
                    <div style={{ flex: 1, paddingTop: '4px' }}>
                      <div style={{ fontSize: '15px', lineHeight: 1.8, color: '#1a1a1a', fontWeight: 400 }}>
                        {msg.content.split('\n').map((line, i) => (
                          line.trim() ? <p key={i} style={{ margin: i > 0 ? '8px 0 0' : 0 }}>{line}</p> : <br key={i} />
                        ))}
                      </div>
                      <div style={{ fontSize: '10.5px', marginTop: '8px', color: '#c4bfb7' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '32px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: '#1a1a1a', color: '#0d9488', flexShrink: 0,
                }}>
                  <Stethoscope size={15} strokeWidth={1.75} />
                </div>
                <div style={{ paddingTop: '10px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      background: '#c4bfb7',
                      animation: `typingDot 1.3s ${i * 0.22}s infinite ease-in-out`,
                    }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {/* ── INPUT ZONE ─────────────────────────────── */}
      <div style={{
        flexShrink: 0,
        padding: '8px 28px 20px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{ width: '100%', maxWidth: '760px' }}>

          {/* Attached file chip */}
          {attachedFile && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '5px 12px', borderRadius: '8px', marginBottom: '8px',
              background: '#e6faf8', border: '1px solid #99d6d0',
              fontSize: '12.5px', fontWeight: 500, color: '#0d7a72',
            }}>
              <Paperclip size={12} />
              {attachedFile.name}
              <button onClick={() => { setAttachedFile(null); setInput('') }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0d7a72', display: 'flex', padding: 0, lineHeight: 1 }}>
                <X size={12} />
              </button>
            </div>
          )}

          {/* Input card — Claude style */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #d9d5ce',
            boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
            onFocusCapture={e => {
              (e.currentTarget as HTMLDivElement).style.borderColor = '#0d9488'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1), 0 2px 12px rgba(0,0,0,0.07)'
            }}
            onBlurCapture={e => {
              ;(e.currentTarget as HTMLDivElement).style.borderColor = '#d9d5ce'
              ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.07)'
            }}
          >
            {/* Textarea */}
            <textarea ref={textareaRef} id="chat-input"
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Message Arogya AI…"
              rows={1}
              style={{
                display: 'block', width: '100%',
                padding: '16px 20px 4px',
                background: 'transparent', border: 'none', outline: 'none',
                resize: 'none', fontSize: '15px', lineHeight: 1.65,
                fontFamily: 'inherit', color: '#1a1a1a',
                minHeight: '52px', maxHeight: '180px', overflowY: 'auto',
              }}
            />

            {/* Bottom toolbar */}
            <div style={{
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 14px 12px',
            }}>
              <ChatAttachMenu onInjectText={handleInjectText} onFileSelect={handleFileSelect} />

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {input.length > 0 && (
                  <span style={{ fontSize: '11px', color: '#c4bfb7', fontWeight: 400 }}>
                    {input.length}
                  </span>
                )}
                {/* Send */}
                <button id="chat-send-btn" onClick={() => sendMessage()}
                  disabled={loading || !input.trim()}
                  style={{
                    width: '34px', height: '34px', borderRadius: '10px', border: 'none',
                    background: input.trim() && !loading ? '#0d9488' : '#e8e4dd',
                    color: input.trim() && !loading ? '#ffffff' : '#9a9690',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s', flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (input.trim() && !loading) {
                      e.currentTarget.style.background = '#0b7a70'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (input.trim() && !loading) {
                      e.currentTarget.style.background = '#0d9488'
                      e.currentTarget.style.transform = 'scale(1)'
                    }
                  }}
                >
                  <Send size={15} strokeWidth={2} style={{ transform: 'translateX(1px)' }} />
                </button>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <p style={{
            textAlign: 'center', fontSize: '11.5px', color: '#b5b0a8',
            margin: '10px 0 0', fontWeight: 400, lineHeight: 1.5,
          }}>
            Arogya AI provides general health information. Always consult a qualified physician for medical decisions.
          </p>
        </div>
      </div>
    </div>
  )
}
