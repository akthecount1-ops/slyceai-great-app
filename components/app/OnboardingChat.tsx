'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, SkipForward, Check } from 'lucide-react'

// ─── Types ─────────────────────────────────────────────────────────────────
interface OBProfile {
  patient_id: string
  name: string | null
  age: number | null
  gender: string | null
  weight_kg: number | null
  height_cm: number | null
  chat_ready: number
  onboarding_complete: number
  medical_history: { known_diseases: string[]; past_surgeries: string[]; allergies: string[]; family_history: string[] } | null
  latest_vitals: { blood_pressure: string | null; pulse: number | null; spo2: number | null; blood_sugar: number | null } | null
  active_medications: Array<{ medicine_name: string; dose: string | null; frequency: string | null; since: string | null }>
  onboarding: { current_step: number; step_1_done: number; step_2_done: number; step_3_done: number; step_4_done: number; step_5_done: number; step_6_done: number; step_7_done: number } | null
}
interface Msg { id: string; role: 'ai' | 'user'; text: string }

// ─── Static data ────────────────────────────────────────────────────────────
const CONDITIONS = ['Diabetes Type 2','Hypertension','Hypothyroidism','PCOD/PCOS','Asthma','Anemia','Anxiety','Arthritis','Heart Disease','Kidney Disease','Migraine','Obesity','Osteoporosis','Depression','Fatty Liver','High Cholesterol']
const SYMPTOMS   = ['Fever','Headache','Dizziness','Cough','Chest Pain','Fatigue','Nausea','Vomiting','Stomach Pain','Back Pain','Joint Pain','Skin Rash','Swelling','Insomnia','Weight Loss','Palpitations','Breathlessness','Constipation','Diarrhea','Eye Pain']
const SEVERITIES = ['Mild','Moderate','Severe'] as const

const STEP_LABELS = ['Vitals','Basic Info','Conditions','Medicines','Past Issues','Current Symptoms','Done']

// ─── Parsers ─────────────────────────────────────────────────────────────────
function parseVitals(t: string) {
  const tl    = t.toLowerCase()
  const bp    = tl.match(/bp[:\s]*(\d+)[/\s]+(\d+)/)
  const pulse = tl.match(/pulse[:\s]*(\d+)/)
  const spo2  = tl.match(/sp?o2[:\s]*(\d+)/)
  const sugar = tl.match(/sugar[:\s]*(\d+)/)
  if (!bp && !pulse && !spo2 && !sugar) return null
  return { blood_pressure: bp?`${bp[1]}/${bp[2]}`:null, pulse: pulse?+pulse[1]:null, spo2: spo2?+spo2[1]:null, blood_sugar: sugar?+sugar[1]:null }
}

function parseDemographics(t: string) {
  const age  = t.match(/\b(\d{1,3})\s*(?:years?|yr|y\/o)\b/i)
  const wt   = t.match(/\b(\d{2,3}(?:\.\d)?)\s*(?:kg|kgs|kilos?)\b/i)
  const ht   = t.match(/\b(\d{3}(?:\.\d)?)\s*(?:cm)\b/i)
  const male = /\b(?:male|man|boy)\b/i.test(t)
  const fem  = /\b(?:female|woman|girl)\b/i.test(t)
  return { age: age?+age[1]:null, weight_kg: wt?+wt[1]:null, height_cm: ht?+ht[1]:null, gender: male?'male':fem?'female':null }
}

function parseMeds(t: string) {
  return t.split(/\n|;/).map(l => l.trim()).filter(Boolean).map(line => {
    const dose  = line.match(/\b(\d+\s*(?:mg|ml|mcg|iu|g))\b/i)
    const freq  = line.match(/\b(once|twice|thrice|\d+\s*times?)\s*(?:a\s*)?(?:daily|day)?\b/i)
    const since = line.match(/\bsince\s+(\d{4}|\d+\s*(?:month|week|year)s?\s*ago)/i)
    return { name: line.split(/\d/)[0].trim() || line, dose: dose?.[1]??'', frequency: freq?.[1]??'', since: since?.[1]??'' }
  })
}

// ─── API calls ───────────────────────────────────────────────────────────────
async function callPatient(body: Record<string, unknown>) {
  const r = await fetch('/api/arogya/patient', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  return r.json()
}

// ─── Prompt per step ─────────────────────────────────────────────────────────
function buildPrompt(step: number, name: string | null): string {
  const n = name ? name.split(' ')[0] : 'there'
  switch (step) {
    case 1: return `Hi ${n}! I'm **Slyceai**, your health assistant on Arogya. I'll ask you a few quick questions so I can give you truly personalised advice — you won't need to repeat yourself.\n\nFirst: would you like to share your current vitals? Blood pressure, pulse, SpO₂, blood sugar. Type them naturally — *"BP 120/80, pulse 78"* — or just say **skip**.`
    case 2: return `Thanks! Now tell me a little about yourself.\n\nPlease share your **gender**, **age**, **weight** (kg), and **height** (cm). Example: *"Female, 28 years, 62 kg, 163 cm"*`
    case 3: return `Do you have any known health conditions?\n\nTap the chips below or type them — I'll remember these so I never ask again.`
    case 4: return `Are you taking any medicines or supplements right now?\n\nShare them like: *"Metformin 500mg twice daily"* or list one per line. Type **none** if you're not on any.`
    case 5: return `Have you had any recurring or past health issues?\n\nTap the chips or describe them. This helps me understand your health history fully.`
    case 6: return `Almost done! What's bothering you today?\n\nDescribe your symptoms, how long you've had them, and pick the severity below.`
    case 7: return `✅ Your health profile is ready, ${n}!\n\nI now have full context — your vitals, conditions, medicines, and current symptoms. Ask me anything and I'll give you personalised guidance right away.`
    default: return `Hi ${n}! Let's get started.`
  }
}

// ─── Chip component ──────────────────────────────────────────────────────────
function Chip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      padding: '5px 13px', borderRadius: 100, fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
      border: `1.5px solid ${active ? 'var(--accent)' : '#e2dde8'}`,
      background: active ? 'rgba(13,148,136,0.08)' : 'var(--bg-card)',
      color: active ? '#0b7a70' : '#5a5652',
      cursor: 'pointer', transition: 'all 0.12s',
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
      {active && <Check size={11} strokeWidth={2.5} />}
      {label}
    </button>
  )
}

// ─── AI bubble — Claude style: no bubble, just avatar + text ─────────────────
function AiBubble({ text }: { text: string }) {
  const parts = text.split('\n').filter(l => l !== undefined)
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {/* Small monogram avatar */}
      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
        <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>S</span>
      </div>
      <div style={{ flex: 1, fontSize: 15, lineHeight: 1.75, color: 'var(--text-primary)', paddingTop: 3 }}>
        {parts.map((l, i) => {
          if (!l.trim()) return <div key={i} style={{ height: 6 }} />
          // Bold **text**
          const html = l.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')
          return <p key={i} style={{ margin: 0, marginTop: i > 0 ? 6 : 0 }} dangerouslySetInnerHTML={{ __html: html }} />
        })}
      </div>
    </div>
  )
}

// ─── User bubble ─────────────────────────────────────────────────────────────
function UserBubble({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{
        maxWidth: '76%', padding: '10px 16px',
        background: '#f0ede8', borderRadius: '18px 4px 18px 18px',
        fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-primary)',
      }}>
        {text.split('\n').map((l, i) => <p key={i} style={{ margin: i > 0 ? '3px 0 0' : 0 }}>{l}</p>)}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function OnboardingChat({ onComplete }: { onComplete: () => void }) {
  const [msgs,    setMsgs]    = useState<Msg[]>([])
  const [input,   setInput]   = useState('')
  const [step,    setStep]    = useState(1)
  const [busy,    setBusy]    = useState(false)
  const [profile, setProfile] = useState<OBProfile | null>(null)

  // Chip selections
  const [conditions, setConditions]   = useState<string[]>([])
  const [pastSx,     setPastSx]       = useState<string[]>([])
  const [currSx,     setCurrSx]       = useState<string[]>([])
  const [severity,   setSeverity]     = useState<string>('Mild')

  const bottomRef = useRef<HTMLDivElement>(null)
  const taRef     = useRef<HTMLTextAreaElement>(null)
  const initRef   = useRef(false)  // ← prevents double-fire in StrictMode

  // ── Load & resume ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true

    fetch('/api/arogya/patient')
      .then(r => r.json())
      .then(({ profile: p }: { profile: OBProfile }) => {
        setProfile(p)
        if (p?.chat_ready) { onComplete(); return }

        const resumeStep = p?.onboarding?.current_step ?? 1
        const clampedStep = Math.min(Math.max(resumeStep, 1), 6)
        setStep(clampedStep)
        setConditions(p?.medical_history?.known_diseases ?? [])
        setPastSx([])

        addAi(buildPrompt(clampedStep, p?.name ?? null))
      })
      .catch(() => addAi(buildPrompt(1, null)))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, busy])

  useEffect(() => {
    if (!taRef.current) return
    taRef.current.style.height = 'auto'
    taRef.current.style.height = Math.min(taRef.current.scrollHeight, 140) + 'px'
  }, [input])

  const addAi   = (text: string) => setMsgs(p => [...p, { id: `ai-${Date.now()}`,   role: 'ai',   text }])
  const addUser = (text: string) => setMsgs(p => [...p, { id: `u-${Date.now()+1}`, role: 'user', text }])

  // ── Advance step ────────────────────────────────────────────────────────────
  const advance = useCallback(async (displayText: string, apiCall?: () => Promise<void>) => {
    addUser(displayText)
    setBusy(true)
    try {
      if (apiCall) await apiCall()
      await callPatient({ action: 'mark_step', step })
    } catch (e) { console.error(e) }

    const nextStep = step + 1
    setStep(nextStep)
    setInput('')

    setTimeout(() => {
      if (nextStep === 7) {
        addAi(buildPrompt(7, profile?.name ?? null))
        callPatient({ action: 'complete_onboarding' }).then(() => {
          setTimeout(onComplete, 1800)
        })
      } else {
        addAi(buildPrompt(nextStep, profile?.name ?? null))
      }
      setBusy(false)
    }, 350)
  }, [step, profile, onComplete])

  // ── Send handler ─────────────────────────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()

    if (step === 1) {
      const vitals = parseVitals(text)
      const isSkip = !text || /skip|no|none/i.test(text)
      await advance(isSkip ? 'Skip' : text, isSkip || !vitals ? undefined : () => callPatient({ action: 'add_vitals', ...vitals }))

    } else if (step === 2) {
      if (!text) return
      const demo = parseDemographics(text)
      await advance(text, () => callPatient({ action: 'update_patient', ...demo }))

    } else if (step === 3) {
      const typed  = text ? text.split(/,|\n/).map(s => s.trim()).filter(Boolean) : []
      const all    = [...new Set([...conditions, ...typed])]
      await advance(all.length ? all.join(', ') : 'None', () =>
        callPatient({ action: 'set_medical_history', known_diseases: all }))

    } else if (step === 4) {
      const isNone = !text || /^(no|none|nothing|nope)$/i.test(text)
      await advance(isNone ? 'None' : text, isNone ? undefined : () =>
        callPatient({ action: 'add_medications', medications: parseMeds(text) }))

    } else if (step === 5) {
      const typed = text ? text.split(/,|\n/).map(s => s.trim()).filter(Boolean) : []
      const all   = [...new Set([...pastSx, ...typed])]
      await advance(all.length ? all.join(', ') : 'None', all.length === 0 ? undefined : () =>
        callPatient({ action: 'add_symptoms', symptoms: all, type: 'past' }))

    } else if (step === 6) {
      const typed    = text ? text.split(/,|\n/).map(s => s.trim()).filter(Boolean) : []
      const allCurr  = [...new Set([...currSx, ...typed])]
      const dur      = text.match(/\b(\d+\s*(?:day|week|month|hour)s?)\b/i)?.[1] ?? null
      const display  = allCurr.join(', ') || text || 'Described symptoms'
      await advance(display, () =>
        callPatient({ action: 'add_symptoms', symptoms: allCurr, type: 'current', severity: severity.toLowerCase(), duration: dur }))
    }
  }, [input, step, conditions, pastSx, currSx, severity, advance])

  const handleSkip = useCallback(() => {
    setInput('')
    advance('Skip')
  }, [advance])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const isDone    = step >= 7
  const showChips3 = step === 3 && !busy
  const showChips5 = step === 5 && !busy
  const showChips6 = step === 6 && !busy
  const showSkip   = step >= 1 && step <= 5

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - var(--header-height))',
      background: 'var(--bg-primary)',
      fontFamily: 'inherit',
    }}>
      {/* ── Minimal step bar ── */}
      <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {STEP_LABELS.slice(0, 6).map((_, i) => (
            <div key={i} style={{
              height: 3, width: i < step - 1 ? 32 : 20, borderRadius: 100,
              background: i < step - 1 ? 'var(--accent)' : i === step - 1 ? 'var(--accent)' : 'var(--border)',
              opacity: i === step - 1 ? 1 : i < step - 1 ? 0.7 : 0.35,
              transition: 'all 0.3s',
            }} />
          ))}
        </div>
        <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 500 }}>
          {step <= 6 ? `${step} of 6 — ${STEP_LABELS[step - 1]}` : 'Profile complete'}
        </span>
      </div>

      {/* ── Messages ── */}
      <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20, padding: '28px 24px 16px', maxWidth: 740, width: '100%', margin: '0 auto', alignSelf: 'stretch' }}>
        <style>{`
          @keyframes msgIn { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
          @keyframes dotPulse { 0%,80%,100%{transform:scale(0.6);opacity:0.4} 40%{transform:scale(1);opacity:1} }
        `}</style>

        {msgs.map(m => (
          <div key={m.id} style={{ animation: 'msgIn 0.2s ease' }}>
            {m.role === 'ai' ? <AiBubble text={m.text} /> : <UserBubble text={m.text} />}
          </div>
        ))}

        {/* Typing dots */}
        {busy && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700 }}>S</span>
            </div>
            <div style={{ display: 'flex', gap: 5, paddingTop: 10 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#c4bfb7', animation: `dotPulse 1.4s ${i * 0.2}s infinite ease-in-out` }} />)}
            </div>
          </div>
        )}

        {/* Condition chips (step 3) */}
        {showChips3 && (
          <div style={{ marginLeft: 40, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {CONDITIONS.map(c => <Chip key={c} label={c} active={conditions.includes(c)} onToggle={() => setConditions(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])} />)}
          </div>
        )}

        {/* Past symptom chips (step 5) */}
        {showChips5 && (
          <div style={{ marginLeft: 40, display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {SYMPTOMS.map(s => <Chip key={s} label={s} active={pastSx.includes(s)} onToggle={() => setPastSx(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} />)}
          </div>
        )}

        {/* Current symptom chips + severity (step 6) */}
        {showChips6 && (
          <div style={{ marginLeft: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {SYMPTOMS.map(s => <Chip key={s} label={s} active={currSx.includes(s)} onToggle={() => setCurrSx(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} />)}
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--text-muted)', fontWeight: 600, marginRight: 4 }}>Severity:</span>
              {SEVERITIES.map(sv => (
                <button key={sv} onClick={() => setSeverity(sv)} style={{
                  padding: '5px 14px', borderRadius: 100, fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
                  border: `1.5px solid ${severity === sv ? (sv==='Mild'?'#16a34a':sv==='Moderate'?'#d97706':'#dc2626') : 'var(--border)'}`,
                  background: severity === sv ? (sv==='Mild'?'rgba(22,163,74,0.08)':sv==='Moderate'?'rgba(217,119,6,0.08)':'rgba(220,38,38,0.08)') : 'var(--bg-card)',
                  color: severity === sv ? (sv==='Mild'?'#15803d':sv==='Moderate'?'#b45309':'#b91c1c') : 'var(--text-muted)',
                  transition: 'all 0.12s',
                }}>{sv}</button>
              ))}
            </div>
          </div>
        )}

        {/* Completion badge */}
        {isDone && !busy && (
          <div style={{ marginLeft: 40 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 18px', borderRadius: 100, background: 'rgba(13,148,136,0.08)', border: '1.5px solid rgba(13,148,136,0.2)', fontSize: 13.5, fontWeight: 600, color: '#0b7a70' }}>
              <Check size={15} /> Opening your health assistant…
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input zone ── */}
      {!isDone && (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '12px 24px 20px' }}>
          <div style={{ maxWidth: 740, margin: '0 auto', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            {/* Textarea */}
            <div style={{ flex: 1, background: 'var(--bg-card)', border: '1.5px solid var(--border)', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.05)', transition: 'border-color 0.15s' }}
              onFocusCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--accent)'}
              onBlurCapture={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'}
            >
              <textarea
                ref={taRef} rows={1} value={input}
                onChange={e => setInput(e.target.value)} onKeyDown={handleKey} disabled={busy}
                placeholder={
                  step === 1 ? 'e.g. BP 120/80, pulse 78, spo2 98 — or "skip"' :
                  step === 2 ? 'e.g. Female, 28 years, 62 kg, 163 cm' :
                  step === 3 ? 'Type conditions or tap chips above…' :
                  step === 4 ? 'e.g. Metformin 500mg twice daily, or "none"' :
                  step === 5 ? 'Type past issues or tap chips…' :
                  'Describe how you feel today…'
                }
                style={{
                  display: 'block', width: '100%', padding: '13px 16px',
                  background: 'transparent', border: 'none', outline: 'none',
                  resize: 'none', fontFamily: 'inherit', fontSize: 14.5, color: 'var(--text-primary)',
                  minHeight: 48, maxHeight: 140, overflowY: 'auto', lineHeight: 1.6,
                }}
              />
            </div>

            {/* Skip */}
            {showSkip && (
              <button onClick={handleSkip} disabled={busy} title="Skip this step" style={{
                width: 40, height: 40, borderRadius: 11, border: '1.5px solid var(--border)',
                background: 'var(--bg-card)', color: '#c4bfb7', cursor: busy ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.12s', flexShrink: 0,
              }}
                onMouseEnter={e => { if (!busy) { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = '#c4bfb7' }}
              >
                <SkipForward size={15} />
              </button>
            )}

            {/* Send */}
            <button onClick={handleSend} disabled={busy} style={{
              width: 40, height: 40, borderRadius: 11, border: 'none',
              background: busy ? 'var(--border)' : 'var(--accent)',
              color: busy ? 'var(--text-muted)' : 'var(--bg-card)',
              cursor: busy ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.12s', flexShrink: 0,
            }}
              onMouseEnter={e => { if (!busy) e.currentTarget.style.background = '#0b7a70' }}
              onMouseLeave={e => { if (!busy) e.currentTarget.style.background = 'var(--accent)' }}
            >
              <Send size={15} strokeWidth={2} style={{ transform: 'translateX(1px)' }} />
            </button>
          </div>
          <p style={{ maxWidth: 740, margin: '8px auto 0', textAlign: 'center', fontSize: 11.5, color: '#b5b0a8' }}>
            Your health data is stored privately and only used to personalise your assistant.
          </p>
        </div>
      )}
    </div>
  )
}
