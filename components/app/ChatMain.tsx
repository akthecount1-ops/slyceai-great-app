'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Send, RefreshCw, Trash2, Stethoscope, X, Paperclip, Heart, Pill, FileText, Check, Upload, ImageIcon } from 'lucide-react'
import ChatAttachMenu from '@/components/app/ChatAttachMenu'

interface Message { id: string; role: 'user' | 'assistant'; content: string; created_at: string; imagePreview?: string }

const IMAGE_TYPES = ['image/jpeg','image/jpg','image/png','image/webp','image/gif']
const isImageFile = (f: File) => IMAGE_TYPES.includes(f.type)

function getGreeting(name: string) {
  const h = new Date().getHours()
  return `${h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'}, ${name}`
}

const SUGGESTED = [
  'Analyse my recent vitals','Check for medicine interactions',
  'Ayurvedic tips for better sleep','Diet plan for my condition',
  'Explain my lab report simply','Signs I should see a doctor',
]

export default function ChatMain() {
  const [messages, setMessages]       = useState<Message[]>([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [userName, setUserName]       = useState('there')
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null)
  const [sessionId, setSessionId]     = useState('')
  const [vitalsCtx, setVitalsCtx]     = useState<{blood_pressure:string|null;pulse:number|null;spo2:number|null;blood_sugar:number|null;recorded_at:string}|null>(null)
  const [medsCtx, setMedsCtx]         = useState<Array<{medicine_name:string;dose:string|null;frequency:string|null}>>([])
  const [vitalsShared, setVitalsShared] = useState(false)
  const [medsShared, setMedsShared]   = useState(false)
  const [contextSent, setContextSent] = useState(false)
  const reportInputRef = useRef<HTMLInputElement>(null)
  const bottomRef      = useRef<HTMLDivElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const supabase       = createClient()

  const searchParams = useSearchParams()
  const urlSessionId = searchParams.get('session')

  useEffect(() => {
    let sid = urlSessionId
    if (!sid) { 
      sid = crypto.randomUUID()
      window.history.replaceState({}, '', `/chat?session=${sid}`) 
    }
    
    // If session actually changed, reset and load
    if (sid !== sessionId) {
      setSessionId(sid)
      setMessages([])
      setLoadingHistory(true)
      loadData(sid)
    }
  }, [urlSessionId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages, loading])

  useEffect(() => {
    const ta = textareaRef.current; if (!ta) return
    ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 180) + 'px'
  }, [input])

  const REFRESH_EVERY = 7 // sessions

  const loadData = async (sid: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Run history + patient profile + past session count in parallel
      const [histRes, patientRes, sessionCountRes] = await Promise.allSettled([
        supabase.from('chat_history').select('*').eq('user_id', user.id).eq('session_id', sid).order('created_at', { ascending: true }).limit(60),
        fetch('/api/arogya/patient').then(r => r.json()).catch(() => null),
        // Count distinct past sessions (exclude current)
        supabase.from('chat_history').select('session_id', { count: 'exact', head: false }).eq('user_id', user.id).neq('session_id', sid).limit(1000),
      ])

      const histMessages = histRes.status === 'fulfilled' && histRes.value.data ? histRes.value.data as Message[] : []
      setMessages(histMessages)

      let vitalsCtxVal = null
      let medsCtxVal: Array<{medicine_name:string;dose:string|null;frequency:string|null}> = []

      if (patientRes.status === 'fulfilled' && patientRes.value) {
        const profile = patientRes.value.profile
        if (profile) {
          setUserName(profile.name?.split(' ')[0] || 'there')
          if (profile.latest_vitals) { setVitalsCtx(profile.latest_vitals); vitalsCtxVal = profile.latest_vitals }
          if (profile.active_medications) { setMedsCtx(profile.active_medications); medsCtxVal = profile.active_medications }
        }
      }

      // Fallback: load profile name directly from Supabase if patient API failed
      if (patientRes.status === 'rejected' || (patientRes.status === 'fulfilled' && !patientRes.value?.profile)) {
        const { data: pData } = await supabase.from('profiles').select('name').eq('user_id', user.id).single()
        if (pData?.name) setUserName(pData.name.split(' ')[0])
      }

      // ── Periodic refresh trigger ───────────────────────────────────
      // If this is a brand-new empty session AND the user has had prior sessions,
      // check if it's time to ask for a health details refresh (every 7 sessions)
      if (histMessages.length === 0 && sessionCountRes.status === 'fulfilled') {
        const rawData = sessionCountRes.value.data ?? []
        const distinctSessions = new Set(rawData.map((r: { session_id: string }) => r.session_id)).size
        const isRefreshSession = distinctSessions > 0 && distinctSessions % REFRESH_EVERY === 0

        if (isRefreshSession) {
          const vitalsAge = vitalsCtxVal
            ? Math.floor((Date.now() - new Date((vitalsCtxVal as any).recorded_at).getTime()) / (1000 * 60 * 60 * 24))
            : null
          const daysSince = vitalsAge !== null ? ` Your vitals were last logged ${vitalsAge} day${vitalsAge !== 1 ? 's' : ''} ago.` : ''

          const refreshMsg: Message = {
            id: `ai-refresh-${Date.now()}`,
            role: 'assistant',
            content: `Hey! It's been a while since we catchup on your health details.${daysSince} Would you like to share any updated vitals (BP, pulse, SpO₂, blood sugar) or any new symptoms? You can also update everything from the Dashboard.\n\nOr just ask me anything — I'm here to help! 🩺`,
            created_at: new Date().toISOString(),
          }
          setMessages([refreshMsg])
        }
      }

    } catch (err) {
      console.error('Failed to load chat data:', err)
    } finally {
      setLoadingHistory(false)
    }
  }

  const sendMessage = useCallback(async (overrideText?: string) => {
    const text = (overrideText ?? input).trim()
    // Allow sending with just a file and no text
    if ((!text && !attachedFile) || loading || !sessionId) return

    const fileToSend = attachedFile
    const previewUrl = imagePreviewUrl

    setInput(''); setAttachedFile(null); setImagePreviewUrl(null); setLoading(true)

    // ── File upload path ──────────────────────────────────────
    if (fileToSend) {
      const displayContent = text
        ? `[Attached: ${fileToSend.name}]\n${text}`
        : `[Attached: ${fileToSend.name}] Please analyse this ${isImageFile(fileToSend) ? 'image' : 'document'}.`
      const userMsg: Message = {
        id: Date.now().toString(), role: 'user',
        content: displayContent,
        created_at: new Date().toISOString(),
        imagePreview: previewUrl ?? undefined,
      }
      setMessages(p => [...p, userMsg])
      try {
        const fd = new FormData()
        fd.append('file', fileToSend)
        fd.append('message', text)
        fd.append('sessionId', sessionId)
        const res  = await fetch('/api/chat/analyse', { method: 'POST', body: fd })
        const data = await res.json()
        setMessages(p => [...p, { id: (Date.now()+1).toString(), role: 'assistant', content: data.content ?? data.error ?? 'Unable to process.', created_at: new Date().toISOString() }])
      } catch {
        setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Connection error. Please try again.', created_at: new Date().toISOString() }])
      } finally { setLoading(false) }
      return
    }

    // ── Plain text path ───────────────────────────────────────
    let finalText = text
    if (messages.length === 0 && !contextSent && (vitalsShared || medsShared)) {
      let prefix = ''
      if (vitalsShared && vitalsCtx) {
        const d = new Date(vitalsCtx.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        prefix += `[My vitals as of ${d} — BP: ${vitalsCtx.blood_pressure ?? '—'}, Pulse: ${vitalsCtx.pulse ?? '—'} bpm, SpO₂: ${vitalsCtx.spo2 ?? '—'}%, Sugar: ${vitalsCtx.blood_sugar ?? '—'} mg/dL]\n`
      }
      if (medsShared && medsCtx.length > 0) {
        prefix += `[Active medications: ${medsCtx.map(m => `${m.medicine_name}${m.dose ? ` (${m.dose})` : ''}`).join(', ')}]\n`
      }
      if (prefix) finalText = prefix + '\n' + text
      setContextSent(true)
    }
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: finalText, created_at: new Date().toISOString() }
    setMessages(p => [...p, userMsg])
    try {
      const res  = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: finalText, sessionId }) })
      const data = await res.json()
      setMessages(p => [...p, { id: (Date.now()+1).toString(), role: 'assistant', content: data.content ?? data.error ?? 'Unable to process.', created_at: new Date().toISOString() }])
    } catch {
      setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: 'Connection error. Please try again.', created_at: new Date().toISOString() }])
    } finally { setLoading(false) }
  }, [input, attachedFile, imagePreviewUrl, loading, sessionId, messages.length, contextSent, vitalsShared, medsShared, vitalsCtx, medsCtx])

  const clearChat = async () => {
    if (!confirm('Clear your entire chat history?')) return
    setLoading(true)
    await fetch(`/api/chat?sessionId=${sessionId}`, { method: 'DELETE' })
    setMessages([]); setLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }
  const handleFileSelect = (file: File) => {
    setAttachedFile(file)
    // Generate preview URL for images
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file)
      setImagePreviewUrl(url)
    } else {
      setImagePreviewUrl(null)
    }
    setInput('')
    textareaRef.current?.focus()
  }
  const handleInjectText = (text: string) => { setInput(text); textareaRef.current?.focus() }
  const isEmpty = !loadingHistory && messages.length === 0

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100dvh - var(--header-height))', width:'100%' }}>
      <style>{`
        .chat-scroll-area { scrollbar-width:none; }
        .chat-scroll-area::-webkit-scrollbar { display:none; }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes msgIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes typingDot { 0%,100%{opacity:.3;transform:scale(0.85)} 50%{opacity:1;transform:scale(1)} }
        @keyframes greetIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes cardIn { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column' }} className="chat-scroll-area">
        {loadingHistory && (
          <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <RefreshCw size={18} style={{ color:'var(--text-muted)', animation:'spin 1s linear infinite' }} />
          </div>
        )}
        {isEmpty && (
          <div className="chat-greeting-area" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'0 20px 60px', animation:'greetIn 0.45s ease' }}>
            <input ref={reportInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv,.doc,.docx" style={{ display:'none' }} onChange={e => { const f=e.target.files?.[0]; if(f) handleFileSelect(f); e.target.value='' }} />
            <div style={{ textAlign:'center', marginBottom:32 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:40, height:40, borderRadius:12, background:'var(--text-primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <Stethoscope size={20} strokeWidth={1.5} style={{ color:'var(--accent)' }} />
                </div>
                <h1 style={{ fontSize:'clamp(22px,3.5vw,34px)', fontWeight:700, color:'var(--text-primary)', letterSpacing:'-0.025em', margin:0 }}>{getGreeting(userName)}</h1>
              </div>
              <p style={{ fontSize:15, color:'#7a7571', margin:0, fontWeight:400 }}>Share your health context for a personalised response</p>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent:'center', maxWidth:680, width:'100%', marginBottom:28 }}>
              {/* Vitals card */}
              <div style={{ flex:'1 1 190px', minWidth:170, maxWidth:220, borderRadius:14, padding:16, background:vitalsShared?'rgba(13,148,136,0.07)':'var(--bg-card)', border:`1.5px solid ${vitalsShared?'var(--accent)':'var(--border)'}`, boxShadow:vitalsShared?'0 0 0 3px rgba(13,148,136,0.08)':'0 1px 4px rgba(0,0,0,0.06)', transition:'all 0.18s', animation:'cardIn 0.4s ease' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'var(--bg-card)1f2', display:'flex', alignItems:'center', justifyContent:'center' }}><Heart size={14} strokeWidth={1.75} style={{ color:'#be123c' }} /></div>
                    <div><div style={{ fontSize:12.5, fontWeight:700, color:'var(--text-primary)' }}>Vitals</div><div style={{ fontSize:10.5, color:'var(--text-muted)' }}>optional</div></div>
                  </div>
                  <button onClick={() => vitalsCtx && setVitalsShared(v=>!v)} disabled={!vitalsCtx} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:20, border:'none', cursor:vitalsCtx?'pointer':'not-allowed', background:vitalsShared?'var(--accent)':'#f0ede8', color:vitalsShared?'var(--bg-card)':'#5a5652', fontSize:11, fontWeight:600, fontFamily:'inherit' }}>
                    {vitalsShared?<><Check size={10}/> Shared</>:'Share'}
                  </button>
                </div>
                {vitalsCtx?(<div style={{ fontSize:11.5, color:'#5a5652', lineHeight:1.6 }}><div>BP <strong style={{ color:'var(--text-primary)' }}>{vitalsCtx.blood_pressure || '—'}</strong></div><div>Pulse <strong style={{ color:'var(--text-primary)' }}>{vitalsCtx.pulse || '—'}</strong> bpm · SpO₂ <strong style={{ color:'var(--text-primary)' }}>{vitalsCtx.spo2 || '—'}%</strong></div><div>Sugar <strong style={{ color:'var(--text-primary)' }}>{vitalsCtx.blood_sugar || '—'}</strong> mg/dL</div></div>):(<p style={{ fontSize:11.5, color:'#b5b0a8', margin:0 }}>No vitals recorded yet</p>)}
              </div>
              {/* Medicines card */}
              <div style={{ flex:'1 1 190px', minWidth:170, maxWidth:220, borderRadius:14, padding:16, background:medsShared?'rgba(13,148,136,0.07)':'var(--bg-card)', border:`1.5px solid ${medsShared?'var(--accent)':'var(--border)'}`, boxShadow:medsShared?'0 0 0 3px rgba(13,148,136,0.08)':'0 1px 4px rgba(0,0,0,0.06)', transition:'all 0.18s', animation:'cardIn 0.5s ease' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}><Pill size={14} strokeWidth={1.75} style={{ color:'#16a34a' }} /></div>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'var(--text-primary)' }}>Medicines</div>
                  </div>
                  <button onClick={() => medsCtx.length>0 && setMedsShared(v=>!v)} disabled={medsCtx.length===0} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:20, border:'none', cursor:medsCtx.length>0?'pointer':'not-allowed', background:medsShared?'var(--accent)':'#f0ede8', color:medsShared?'var(--bg-card)':'#5a5652', fontSize:11, fontWeight:600, fontFamily:'inherit' }}>
                    {medsShared?<><Check size={10}/> Shared</>:'Share'}
                  </button>
                </div>
                {medsCtx.length>0?(<div style={{ fontSize:11.5, color:'#5a5652', lineHeight:1.6 }}><div><strong style={{ color:'var(--text-primary)' }}>{medsCtx.length}</strong> active medication{medsCtx.length!==1?'s':''}</div><div style={{ color:'var(--text-muted)', marginTop:2, overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}>{medsCtx.slice(0,2).map(m=>m.medicine_name).join(', ')}{medsCtx.length>2?` +${medsCtx.length-2} more`:''}</div></div>):(<p style={{ fontSize:11.5, color:'#b5b0a8', margin:0 }}>No active medications</p>)}
              </div>
              {/* Upload report */}
              <div style={{ flex:'1 1 190px', minWidth:170, maxWidth:220, borderRadius:14, padding:16, background:attachedFile?'rgba(13,148,136,0.07)':'var(--bg-card)', border:`1.5px solid ${attachedFile?'var(--accent)':'var(--border)'}`, boxShadow:attachedFile?'0 0 0 3px rgba(13,148,136,0.08)':'0 1px 4px rgba(0,0,0,0.06)', transition:'all 0.18s', animation:'cardIn 0.6s ease' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <div style={{ width:28, height:28, borderRadius:8, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center' }}><FileText size={14} strokeWidth={1.75} style={{ color:'#2563eb' }} /></div>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'var(--text-primary)' }}>Report</div>
                  </div>
                  <button onClick={() => attachedFile?(setAttachedFile(null),setInput('')):reportInputRef.current?.click()} style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 10px', borderRadius:20, border:'none', cursor:'pointer', background:attachedFile?'var(--accent)':'#f0ede8', color:attachedFile?'var(--bg-card)':'#5a5652', fontSize:11, fontWeight:600, fontFamily:'inherit' }}>
                    {attachedFile?<><Check size={10}/> Attached</>:<><Upload size={10}/> Upload</>}
                  </button>
                </div>
                {attachedFile?(<div style={{ fontSize:11.5, color:'#5a5652', overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis' }}><strong style={{ color:'var(--text-primary)' }}>{attachedFile.name}</strong></div>):(<p style={{ fontSize:11.5, color:'#b5b0a8', margin:0 }}>Lab report, prescription or scan</p>)}
              </div>
            </div>
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', maxWidth:600 }}>
              {SUGGESTED.map(q=>(
                <button key={q} onClick={()=>sendMessage(q)} style={{ padding:'9px 18px', borderRadius:100, border:'1px solid var(--border)', background:'rgba(255,255,255,0.7)', color:'#3d3d3d', fontSize:13.5, fontWeight:450, cursor:'pointer', transition:'all 0.15s', fontFamily:'inherit', backdropFilter:'blur(4px)' }}
                  onMouseEnter={e=>{e.currentTarget.style.background='var(--bg-card)';e.currentTarget.style.borderColor='var(--accent)';e.currentTarget.style.color='#0d7a72'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.7)';e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.color='#3d3d3d'}}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {!loadingHistory && messages.length>0 && (
          <div className="chat-messages-area" style={{ flex:1, width:'100%', maxWidth:760, margin:'0 auto', padding:'40px 28px 24px', display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:24 }}>
              <button onClick={clearChat} disabled={loading} style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, border:'none', background:'transparent', color:'#c4bfb7', fontSize:12, fontWeight:500, cursor:'pointer', fontFamily:'inherit' }}
                onMouseEnter={e=>{e.currentTarget.style.color='#dc2626';e.currentTarget.style.background='rgba(220,38,38,0.06)'}}
                onMouseLeave={e=>{e.currentTarget.style.color='#c4bfb7';e.currentTarget.style.background='transparent'}}>
                <Trash2 size={12}/> Clear
              </button>
            </div>
            {messages.map(msg=>(
              <div key={msg.id} style={{ animation:'msgIn 0.22s ease', marginBottom:32 }}>
                {msg.role==='user'?(
                  <div style={{ display:'flex', justifyContent:'flex-end' }}>
                    <div className="chat-bubble-user" style={{ maxWidth:'72%', padding:'12px 18px', borderRadius:'20px 4px 20px 20px', background:'var(--text-primary)', color:'#f0eeeb', fontSize:15, lineHeight:1.7 }}>
                      {msg.imagePreview && <img src={msg.imagePreview} alt="attachment" style={{ width:'100%', maxWidth:260, borderRadius:10, marginBottom:8, objectFit:'cover', display:'block' }}/>}
                      {msg.content.split('\n').map((l,i)=><p key={i} style={{ margin:i>0?'4px 0 0':0 }}>{l}</p>)}
                      <div style={{ fontSize:10.5, marginTop:6, opacity:0.4, textAlign:'right' }}>{new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                ):(
                  <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
                    <div style={{ width:32, height:32, borderRadius:'50%', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background:'var(--text-primary)', color:'var(--accent)', marginTop:2 }}><Stethoscope size={15} strokeWidth={1.75}/></div>
                    <div style={{ flex:1, paddingTop:4 }}>
                      <div style={{ fontSize:15, lineHeight:1.8, color:'var(--text-primary)' }}>
                        {msg.content.split('\n').map((l,i)=>l.trim()?<p key={i} style={{ margin:i>0?'8px 0 0':0 }}>{l}</p>:<br key={i}/>)}
                      </div>
                      <div style={{ fontSize:10.5, marginTop:8, color:'#c4bfb7' }}>{new Date(msg.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {loading&&(
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:32 }}>
                <div style={{ width:32, height:32, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--text-primary)', color:'var(--accent)', flexShrink:0 }}><Stethoscope size={15} strokeWidth={1.75}/></div>
                <div style={{ paddingTop:10, display:'flex', gap:5, alignItems:'center' }}>
                  {[0,1,2].map(i=><div key={i} style={{ width:7, height:7, borderRadius:'50%', background:'#c4bfb7', animation:`typingDot 1.3s ${i*0.22}s infinite ease-in-out` }}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
        )}
      </div>
      {/* Input zone */}
      <div className="chat-input-wrapper" style={{ flexShrink:0, padding:'8px 28px 20px', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <div style={{ width:'100%', maxWidth:760 }}>
          {attachedFile&&(
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'5px 12px', borderRadius:8, marginBottom:8, background:'#e6faf8', border:'1px solid #99d6d0', fontSize:12.5, fontWeight:500, color:'#0d7a72', maxWidth:'100%' }}>
              {imagePreviewUrl
                ? <img src={imagePreviewUrl} alt="preview" style={{ width:24, height:24, borderRadius:4, objectFit:'cover', flexShrink:0 }}/>
                : isImageFile(attachedFile) ? <ImageIcon size={12}/> : <FileText size={12}/>}
              <span style={{ overflow:'hidden', whiteSpace:'nowrap', textOverflow:'ellipsis', maxWidth:240 }}>{attachedFile.name}</span>
              <span style={{ fontSize:10.5, opacity:0.65, flexShrink:0 }}>({(attachedFile.size/1024).toFixed(0)} KB)</span>
              <button onClick={()=>{setAttachedFile(null);setImagePreviewUrl(null);setInput('')}} style={{ background:'none', border:'none', cursor:'pointer', color:'#0d7a72', display:'flex', padding:0, flexShrink:0 }}><X size={12}/></button>
            </div>
          )}
          <div style={{ background:'var(--bg-card)', borderRadius:16, border:'1px solid var(--border)', boxShadow:'0 2px 12px rgba(0,0,0,0.07)' }}
            onFocusCapture={e=>{(e.currentTarget as HTMLDivElement).style.borderColor='var(--accent)';(e.currentTarget as HTMLDivElement).style.boxShadow='0 0 0 3px rgba(13,148,136,0.1),0 2px 12px rgba(0,0,0,0.07)'}}
            onBlurCapture={e=>{(e.currentTarget as HTMLDivElement).style.borderColor='var(--border)';(e.currentTarget as HTMLDivElement).style.boxShadow='0 2px 12px rgba(0,0,0,0.07)'}}>
            <textarea ref={textareaRef} id="chat-input" value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder="Message Arogya AI…" rows={1}
              style={{ display:'block', width:'100%', padding:'16px 20px 4px', background:'transparent', border:'none', outline:'none', resize:'none', fontSize:15, lineHeight:1.65, fontFamily:'inherit', color:'var(--text-primary)', minHeight:52, maxHeight:180, overflowY:'auto' }}/>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 14px 12px' }}>
              <ChatAttachMenu onInjectText={handleInjectText} onFileSelect={handleFileSelect}/>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                {input.length>0&&<span style={{ fontSize:11, color:'#c4bfb7' }}>{input.length}</span>}
                <button id="chat-send-btn" onClick={()=>sendMessage()} disabled={loading||(!input.trim()&&!attachedFile)}
                  style={{ width:34, height:34, borderRadius:10, border:'none', background:(input.trim()||attachedFile)&&!loading?'var(--accent)':'var(--border)', color:(input.trim()||attachedFile)&&!loading?'var(--bg-card)':'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', cursor:(input.trim()||attachedFile)&&!loading?'pointer':'not-allowed', transition:'all 0.15s', flexShrink:0 }}
                  onMouseEnter={e=>{if((input.trim()||attachedFile)&&!loading){e.currentTarget.style.background='#0b7a70';e.currentTarget.style.transform='scale(1.05)'}}}
                  onMouseLeave={e=>{if((input.trim()||attachedFile)&&!loading){e.currentTarget.style.background='var(--accent)';e.currentTarget.style.transform='scale(1)'}}}>
                  <Send size={15} strokeWidth={2} style={{ transform:'translateX(1px)' }}/>
                </button>
              </div>
            </div>
          </div>
          <p style={{ textAlign:'center', fontSize:11.5, color:'#b5b0a8', margin:'10px 0 0', lineHeight:1.5 }}>
            Arogya AI provides general health information. Always consult a qualified physician for medical decisions.
          </p>
        </div>
      </div>
    </div>
  )
}
