'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, X, FileText } from 'lucide-react'
import LogVitalsModal from '@/components/app/LogVitalsModal'
import AddMedicineModal from '@/components/app/AddMedicineModal'
import AddSymptomModal from '@/components/app/AddSymptomModal'
import HealthJournalModal from '@/components/app/HealthJournalModal'
import UploadReportModal from '@/components/app/UploadReportModal'

/* ─── Types ─────────────────────────────────────────────── */
interface DashVitals {
  bp_systolic: number | null
  bp_diastolic: number | null
  pulse: number | null
  oxygen: number | null
  blood_sugar: number | null
  recorded_at: string | null
}
interface MedItem { id: string; medicine_name: string; dose: string | null; time_of_day: string[] | null; taken: boolean }
interface SymptomEntry { id: string; symptoms: string[] | null; notes: string | null; journal_date: string }
interface JournalEntry { id: string; notes: string | null; journal_date: string }
interface Profile {
  name: string | null
  onboarding_complete: boolean
  date_of_birth: string | null
  gender: string | null
  weight?: number | null
  height?: number | null
}

/* ─── Badge helpers ──────────────────────────────────────── */
function badge(label: string, variant: 'green' | 'amber' | 'red') {
  const styles: Record<string, React.CSSProperties> = {
    green: { background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', border: '0.5px solid var(--accent)' },
    amber: { background: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)', border: '0.5px solid var(--badge-amber-text)' },
    red:   { background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', border: '0.5px solid var(--badge-red-text)' },
  }
  return (
    <span style={{
      fontSize: '10px', padding: '2px 7px', borderRadius: '4px',
      fontWeight: 600, ...styles[variant],
    }}>{label}</span>
  )
}

function getBpStatus(sys: number | null, dia: number | null): 'green' | 'amber' | 'red' {
  if (!sys) return 'amber'
  if (sys < 120 && (dia ?? 0) < 80) return 'green'
  if (sys < 140) return 'amber'
  return 'red'
}

function getPulseStatus(p: number | null): 'green' | 'amber' | 'red' {
  if (!p) return 'amber'
  if (p >= 60 && p <= 90) return 'green'
  if (p > 90 && p <= 100) return 'amber'
  return 'red'
}

function getSugarStatus(s: number | null): 'green' | 'amber' | 'red' {
  if (!s) return 'amber'
  if (s < 100) return 'green'
  if (s < 140) return 'amber'
  return 'red'
}

/* ─── Onboarding Modal ───────────────────────────────────── */
type Step = 1 | 2 | 3 | 4

interface OnboardingModalProps {
  step: Step
  onClose: () => void
  onComplete: () => void
  onSkip: () => void
  onNext: (nextStep: Step) => void
  userId: string
  supabase: ReturnType<typeof createClient>
}

function OnboardingModal({ step, onClose, onComplete, onSkip, onNext, userId, supabase }: OnboardingModalProps) {
  const [saving, setSaving] = useState(false)
  // Step 1 — Account (already done if we're on dashboard)
  // Step 2 — Body measurements + vitals
  const [weight, setWeight]       = useState('')
  const [height, setHeight]       = useState('')
  const [bloodGroup, setBloodGroup] = useState('')
  const [age, setAge]             = useState('')
  const [bp, setBp]               = useState('')
  const [pulse, setPulse]         = useState('')
  const [spo2, setSpo2]           = useState('')
  const [sugar, setSugar]         = useState('')
  // Step 3 — Conditions + medicines
  const [conditions, setConditions] = useState<string[]>([])
  const [condInput, setCondInput]   = useState('')
  const [medName, setMedName]       = useState('')
  const [medDose, setMedDose]       = useState('')
  // Step 4 — Symptoms
  const [symptoms, setSymptoms]   = useState<string[]>([])
  const COMMON_SYMPTOMS = ['Fatigue', 'Headache', 'Nausea', 'Dizziness', 'Back pain', 'Chest pain', 'Shortness of breath', 'Muscle weakness', 'Fever', 'Cough']

  const saveStep2 = async () => {
    setSaving(true)
    try {
      const updates: Record<string, unknown> = { id: userId, updated_at: new Date().toISOString() }
      if (weight) updates.weight = parseFloat(weight)
      if (height) updates.height = parseFloat(height)
      await supabase.from('profiles').upsert(updates)

      if (bp || pulse || spo2 || sugar) {
        const bpParts = bp.split('/')
        await supabase.from('vitals').insert({
          user_id: userId,
          bp_systolic: bpParts[0] ? parseInt(bpParts[0]) : null,
          bp_diastolic: bpParts[1] ? parseInt(bpParts[1]) : null,
          pulse: pulse ? parseInt(pulse) : null,
          oxygen: spo2 ? parseFloat(spo2) : null,
          blood_sugar: sugar ? parseFloat(sugar) : null,
          recorded_at: new Date().toISOString(),
        })
      }
    } finally { setSaving(false) }
    onNext(3)
  }

  const saveStep3 = async () => {
    setSaving(true)
    try {
      if (medName) {
        await supabase.from('medicines').insert({
          user_id: userId,
          medicine_name: medName,
          dose: medDose || null,
          is_active: true,
        })
      }
    } finally { setSaving(false) }
    onNext(4)
  }

  const saveStep4 = async () => {
    setSaving(true)
    try {
      if (symptoms.length > 0) {
        await supabase.from('symptom_journal').insert({
          user_id: userId,
          symptoms,
          journal_date: new Date().toISOString().split('T')[0],
          notes: conditions.join(', ') || null,
        })
      }
      await supabase.from('profiles').upsert({
        id: userId,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
    } finally { setSaving(false) }
    onComplete()
  }

  const titles: Record<Step, string> = {
    1: 'Account created',
    2: 'Body measurements',
    3: 'Conditions & medicines',
    4: 'Current symptoms',
  }
  const subs: Record<Step, string> = {
    1: 'Your account is set up.',
    2: 'This helps Slyceai personalise diet, dosage context, and health scores for you.',
    3: 'Tell us about any conditions you manage and medicines you take.',
    4: 'What symptoms are you currently experiencing?',
  }

  const pill = (label: string, active: boolean, onClick: () => void) => (
    <button key={label} onClick={onClick} style={{
      fontSize: '12px', padding: '5px 12px', borderRadius: '20px',
      border: active ? '0.5px solid var(--accent)' : '0.5px solid var(--border)',
      background: active ? 'var(--badge-green-bg)' : 'var(--bg-secondary)',
      color: active ? 'var(--badge-green-text)' : 'var(--text-secondary)',
      cursor: 'pointer', transition: 'all 0.12s',
    }}>{label}</button>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: '12px',
        border: '0.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
        padding: '24px', width: '460px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>Step {step} of 4</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', padding: '4px' }}>
            <X size={16} />
          </button>
        </div>
        <h2 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{titles[step]}</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.5 }}>{subs[step]}</p>

        {/* Step 1 — just info */}
        {step === 1 && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>✓</div>
            <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: 1.6 }}>
              Great! Your account is ready. Let&apos;s fill in a few health details to personalise your experience.
            </p>
          </div>
        )}

        {/* Step 2 — measurements + vitals */}
        {step === 2 && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
              {[
                { label: 'Weight (kg)', val: weight, set: setWeight, type: 'number', ph: 'e.g. 72', req: true },
                { label: 'Height (cm)', val: height, set: setHeight, type: 'number', ph: 'e.g. 175', req: true },
                { label: 'Age', val: age, set: setAge, type: 'number', ph: 'e.g. 28', req: false },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                    {f.label} {f.req && <span style={{ color: '#d97706' }}>required</span>}
                  </label>
                  <input
                    type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                    placeholder={f.ph}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '0.5px solid var(--border)', fontSize: '13px', outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                  />
                </div>
              ))}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Blood group <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
                <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)}
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '0.5px solid var(--border)', fontSize: '13px', outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit' }}>
                  <option value="">Select</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(g => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '8px', marginTop: '10px' }}>Current vitals <span style={{ color: 'var(--text-muted)' }}>(optional — fill if you have a reading)</span></p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Blood pressure', val: bp, set: setBp, ph: 'e.g. 120/80', type: 'text' },
                { label: 'Pulse (bpm)', val: pulse, set: setPulse, ph: 'e.g. 78', type: 'number' },
                { label: 'SpO2 (%)', val: spo2, set: setSpo2, ph: 'e.g. 98', type: 'number' },
                { label: 'Blood sugar (mg/dL)', val: sugar, set: setSugar, ph: 'e.g. 95', type: 'number' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>{f.label}</label>
                  <input
                    type={f.type} value={f.val} onChange={e => f.set(e.target.value)}
                    placeholder={f.ph}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '0.5px solid var(--border)', fontSize: '13px', outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 3 — conditions + medicines */}
        {step === 3 && (
          <>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Known conditions</p>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <input
                type="text" value={condInput}
                onChange={e => setCondInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && condInput.trim()) { setConditions(p => [...p, condInput.trim()]); setCondInput('') } }}
                placeholder="Type and press Enter"
                style={{ flex: 1, padding: '7px 10px', borderRadius: '6px', border: '0.5px solid var(--border)', fontSize: '13px', outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit' }}
              />
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
              {conditions.map(c => (
                <span key={c} style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '20px', background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', border: '0.5px solid var(--accent)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {c}
                  <button onClick={() => setConditions(p => p.filter(x => x !== c))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--badge-green-text)', lineHeight: 1, fontSize: '14px' }}>×</button>
                </span>
              ))}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>Add a medicine <span style={{ color: 'var(--text-muted)' }}>(optional)</span></p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Medicine name</label>
                <input type="text" value={medName} onChange={e => setMedName(e.target.value)} placeholder="e.g. Metformin"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '0.5px solid var(--border)', fontSize: '13px', outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Dose</label>
                <input type="text" value={medDose} onChange={e => setMedDose(e.target.value)} placeholder="e.g. 500mg morning"
                  style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '0.5px solid var(--border)', fontSize: '13px', outline: 'none', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit' }} />
              </div>
            </div>
          </>
        )}

        {/* Step 4 — symptoms */}
        {step === 4 && (
          <>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {COMMON_SYMPTOMS.map(s => pill(s, symptoms.includes(s), () =>
                setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])
              ))}
            </div>
            {symptoms.length > 0 && (
              <p style={{ fontSize: '12px', color: 'var(--badge-green-text)', marginTop: '12px' }}>
                {symptoms.length} symptom{symptoms.length > 1 ? 's' : ''} selected
              </p>
            )}
          </>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onSkip} style={{
            background: 'transparent', border: '0.5px solid var(--border)',
            padding: '7px 14px', borderRadius: '6px', fontSize: '12px',
            cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit',
          }}>Skip</button>
          {step < 4 ? (
            <button disabled={saving}
              onClick={step === 1 ? () => onNext(2) : step === 2 ? saveStep2 : saveStep3}
              style={{
                background: 'var(--accent)', border: 'none', padding: '7px 14px',
                borderRadius: '6px', fontSize: '12px', cursor: saving ? 'wait' : 'pointer',
                color: 'var(--bg-card)', fontWeight: 500, fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1,
              }}>
              {saving ? 'Saving…' : 'Save & continue →'}
            </button>
          ) : (
            <button disabled={saving} onClick={saveStep4} style={{
              background: 'var(--accent)', border: 'none', padding: '7px 14px',
              borderRadius: '6px', fontSize: '12px', cursor: saving ? 'wait' : 'pointer',
              color: 'var(--bg-card)', fontWeight: 500, fontFamily: 'inherit',
              opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving…' : 'Complete setup ✓'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [profile,    setProfile   ] = useState<Profile | null>(null)
  const [vitals,     setVitals    ] = useState<DashVitals | null>(null)
  const [medicines,  setMedicines ] = useState<MedItem[]>([])
  const [symptoms,   setSymptoms  ] = useState<SymptomEntry | null>(null)
  const [journals,   setJournals  ] = useState<JournalEntry[]>([])
  const [userId,     setUserId    ] = useState<string>('')
  const [loading,    setLoading   ] = useState(true)
  const [insight,    setInsight   ] = useState<string>('')

  // Onboarding state
  const [onboardStep,    setOnboardStep   ] = useState<Step | null>(null)
  const [onboardDone,    setOnboardDone   ] = useState(false)
  const [completedSteps, setCompletedSteps] = useState<number[]>([1]) // step 1 (account) always done

  // Modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false)
  const [showMedicineModal, setShowMedicineModal] = useState(false)
  const [showSymptomModal, setShowSymptomModal] = useState(false)
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [showUploadReportModal, setShowUploadReportModal] = useState(false)

  /* ── Load all dashboard data ─────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)

    const todayStr = new Date().toISOString().split('T')[0]

    const [profileRes, vitalsRes, medsRes, symptomRes, journalRes] = await Promise.all([
      supabase.from('profiles').select('name, onboarding_complete, date_of_birth, gender').eq('id', user.id).single(),
      supabase.from('vitals').select('bp_systolic, bp_diastolic, pulse, oxygen, blood_sugar, recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1).single(),
      supabase.from('medicines').select('id, medicine_name, dose, time_of_day').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(5),
      supabase.from('symptom_journal').select('id, symptoms, notes, journal_date').eq('user_id', user.id).order('journal_date', { ascending: false }).limit(1).single(),
      supabase.from('symptom_journal').select('id, notes, journal_date').eq('user_id', user.id).order('journal_date', { ascending: false }).limit(2),
    ])

    if (profileRes.data) {
      setProfile(profileRes.data as Profile)
      setOnboardDone(!!profileRes.data.onboarding_complete)
    }
    if (vitalsRes.data) setVitals(vitalsRes.data as DashVitals)
    
    // Get medicine logs for today
    const medIds = medsRes.data?.map(m => m.id) ?? []
    const logsRes = medIds.length > 0
      ? await supabase.from('medicine_logs').select('medicine_id, taken').eq('user_id', user.id).eq('log_date', todayStr).in('medicine_id', medIds)
      : { data: [] }
    const logsMap = new Map((logsRes.data ?? []).map(l => [l.medicine_id, l.taken]))
    setMedicines((medsRes.data ?? []).map(m => ({ ...m, taken: logsMap.get(m.id) ?? false })))
    
    if (symptomRes.data) setSymptoms(symptomRes.data as SymptomEntry)
    setJournals((journalRes.data ?? []) as JournalEntry[])

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  /* ── Fetch AI daily insight ──────────────────────── */
  useEffect(() => {
    const fetchInsight = async () => {
      try {
        const res = await fetch('/api/dashboard-insights', { cache: 'no-store' })
        const data = await res.json()
        setInsight(data?.feeling ?? data?.health_tip ?? '')
      } catch { /* ignore */ }
    }
    fetchInsight()
  }, [])

  /* ── Toggle medicine taken ───────────────────────── */
  const toggleMed = async (med: MedItem) => {
    const todayStr = new Date().toISOString().split('T')[0]
    const newTaken = !med.taken
    setMedicines(prev => prev.map(m => m.id === med.id ? { ...m, taken: newTaken } : m))
    await supabase.from('medicine_logs').upsert({
      medicine_id: med.id, user_id: userId, log_date: todayStr, taken: newTaken,
    }, { onConflict: 'medicine_id,user_id,log_date' })
  }

  /* ── Onboarding helpers ──────────────────────────── */
  const handleOnboardSkip = () => {
    setOnboardStep(prev => {
      if (!prev) return null
      const next = (prev + 1) as Step
      if (next > 4) { setOnboardDone(true); return null }
      setCompletedSteps(p => [...new Set([...p, prev])])
      return null // just close modal, let them re-open
    })
  }
  const handleOnboardNext = (next: Step) => {
    setCompletedSteps(p => [...new Set([...p, onboardStep ?? 1])])
    setOnboardStep(next)
  }
  const handleOnboardComplete = () => {
    setCompletedSteps([1, 2, 3, 4])
    setOnboardDone(true)
    setOnboardStep(null)
    loadData()
  }

  /* ── Computed values ─────────────────────────────── */
  const healthScore = Math.min(
    (completedSteps.length / 4) * 30 +
    (vitals ? 30 : 0) +
    (medicines.length > 0 ? 20 : 0) +
    (medicines.filter(m => m.taken).length / Math.max(medicines.length, 1)) * 20,
    100
  ) || (onboardDone ? 60 : 10)

  const scoreColor = healthScore >= 70 ? 'var(--accent)' : healthScore >= 40 ? '#BA7517' : 'var(--badge-red-text)'
  const bpDisplay = vitals?.bp_systolic
    ? `${vitals.bp_systolic}/${vitals.bp_diastolic ?? '?'}`
    : '—'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  /* ── Style helpers ───────────────────────────────── */
  const card: React.CSSProperties = {
    background: 'var(--bg-card)',
    border: '0.5px solid var(--border)',
    borderRadius: '10px',
    padding: '14px 16px',
  }
  const cardHeader: React.CSSProperties = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px',
  }
  const cardTitle: React.CSSProperties = {
    fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)',
  }
  const cardLink: React.CSSProperties = {
    fontSize: '11px', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'none',
  }
  const stepDot = (n: number): React.CSSProperties => ({
    width: '20px', height: '20px', borderRadius: '50%',
    border: completedSteps.includes(n) ? 'none' : onboardStep === n ? '1.5px solid var(--accent)' : '0.5px solid var(--border)',
    background: completedSteps.includes(n) ? 'var(--accent)' : 'transparent',
    color: completedSteps.includes(n) ? 'var(--bg-card)' : onboardStep === n ? 'var(--accent)' : 'var(--text-muted)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '10px', fontWeight: 600, flexShrink: 0,
  })
  const stepLine = (n: number): React.CSSProperties => ({
    width: '16px', height: '0.5px',
    background: completedSteps.includes(n) ? 'var(--accent)' : 'var(--border)',
  })

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading dashboard…</div>
      </div>
    )
  }

  const firstName = profile?.name?.split(' ')[0] ?? 'there'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', display: 'flex', flexDirection: 'column' }}>

      {/* ── Onboarding Banner ─────────────────────────────────── */}
      {!onboardDone && (
        <div style={{
          background: 'var(--bg-card)',
          borderBottom: '0.5px solid var(--border)',
          padding: '14px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0, gap: '16px', flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
              Complete your health profile
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
              Takes 2 minutes — helps Slyceai give you accurate, personalised answers
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Step indicators */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {([1, 2, 3, 4] as Step[]).map((n, i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={stepDot(n)}>
                    {completedSteps.includes(n) ? '✓' : n}
                  </div>
                  {i < 3 && <div style={stepLine(n)} />}
                </div>
              ))}
            </div>
            <button
              onClick={() => setOnboardStep(completedSteps.length >= 4 ? 1 : (Math.min(completedSteps.length + 1, 4)) as Step)}
              style={{
                background: 'var(--accent)', color: 'var(--bg-card)', border: 'none',
                padding: '8px 16px', borderRadius: '6px',
                fontSize: '13px', cursor: 'pointer', fontWeight: 500,
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}>
              Continue setup
            </button>
          </div>
        </div>
      )}

      {/* ── Dash Content ─────────────────────────────────────── */}
      <div className="dash-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>



        {/* ── Row 1: 4 Metric Cards ───────────────────────────── */}
        <div className="grid-4col" style={{ gap: '12px' }}>
          {/* Health Score */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Health score</span>
              {badge(healthScore >= 70 ? 'Good' : healthScore >= 40 ? 'Low' : 'Poor', healthScore >= 70 ? 'green' : healthScore >= 40 ? 'amber' : 'red')}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 500, color: scoreColor, lineHeight: 1 }}>{Math.round(healthScore)}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{onboardDone ? `out of 100` : 'Complete profile to improve'}</div>
          </div>

          {/* Blood Pressure */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Blood pressure</span>
              {badge(getBpStatus(vitals?.bp_systolic ?? null, vitals?.bp_diastolic ?? null) === 'green' ? 'Normal' : getBpStatus(vitals?.bp_systolic ?? null, vitals?.bp_diastolic ?? null) === 'amber' ? 'Elevated' : 'High', getBpStatus(vitals?.bp_systolic ?? null, vitals?.bp_diastolic ?? null))}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>
              {vitals?.bp_systolic ?? '—'}
              {vitals?.bp_systolic && <span style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>/{vitals.bp_diastolic ?? '?'}</span>}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{vitals ? 'mmHg · logged today' : 'No reading yet'}</div>
          </div>

          {/* Pulse */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Pulse</span>
              {badge(getPulseStatus(vitals?.pulse ?? null) === 'green' ? 'Normal' : getPulseStatus(vitals?.pulse ?? null) === 'amber' ? 'High-normal' : 'High', getPulseStatus(vitals?.pulse ?? null))}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{vitals?.pulse ?? '—'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>bpm{vitals?.pulse ? ' · monitoring' : ' · log vitals'}</div>
          </div>

          {/* Blood Sugar */}
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Blood sugar</span>
              {badge(getSugarStatus(vitals?.blood_sugar ?? null) === 'green' ? 'Normal' : getSugarStatus(vitals?.blood_sugar ?? null) === 'amber' ? 'Elevated' : 'High', getSugarStatus(vitals?.blood_sugar ?? null))}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>{vitals?.blood_sugar ?? '—'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>mg/dL{vitals?.blood_sugar ? ' · fasting' : ' · no data'}</div>
          </div>
        </div>

        {/* ── Row 2: Vitals detail (left) + Medicines (right) ─── */}
        <div className="grid-2col" style={{ gap: '12px' }}>

          {/* Today's vitals detail */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={cardTitle}>Today&apos;s vitals</span>
              <button 
                onClick={() => setShowVitalsModal(true)} 
                style={{ ...cardLink, background: 'none', border: 'none', padding: 0 }}
              >
                + Log vitals
              </button>
            </div>
            {/* Tabs (visual) */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '0.5px solid var(--border)', marginBottom: '12px' }}>
              {['Today', '7 days', '30 days'].map((t, i) => (
                <div key={t} style={{
                  fontSize: '12px', padding: '5px 12px', cursor: 'pointer',
                  color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                  borderBottom: i === 0 ? '2px solid var(--accent)' : '2px solid transparent',
                  fontWeight: i === 0 ? 500 : 400, marginBottom: '-0.5px',
                }}>{t}</div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { name: 'SpO2', val: vitals?.oxygen ? `${vitals.oxygen}` : '99', unit: '%' },
                { name: 'Temperature', val: '—', unit: '' },
                { name: 'Weight', val: profile?.weight ? `${profile.weight}` : '—', unit: 'kg' },
                { name: 'Blood group', val: '—', unit: '' },
              ].map(v => (
                <div key={v.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '7px 10px', background: 'var(--bg-secondary)', borderRadius: '6px',
                }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{v.name}</span>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {v.val}<span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '2px' }}>{v.unit}</span>
                  </span>
                </div>
              ))}
            </div>
            {/* Insight box */}
            <div style={{
              marginTop: '10px', background: 'var(--badge-green-bg)', border: '1px solid var(--accent)',
              borderRadius: '6px', padding: '10px 14px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-dark)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Slyceai insight
              </div>
              <div style={{ fontSize: '12px', color: 'var(--insight-text)', lineHeight: 1.5 }}>
                {insight || (vitals
                  ? 'Your pulse is at the high end of normal. Gentle walks and hydration can help. Consider logging temperature today.'
                  : 'Log your vitals to get personalised health insights from Slyceai.')}
              </div>
            </div>
          </div>

          {/* Medicines today */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={cardTitle}>Medicines today</span>
              <button 
                onClick={() => setShowMedicineModal(true)} 
                style={{ ...cardLink, background: 'none', border: 'none', padding: 0 }}
              >
                + Add
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {medicines.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '22px', marginBottom: '6px' }}>💊</div>
                  <div style={{ fontSize: '12px' }}>No medicines added yet</div>
                  <a href="/medicines" style={{ fontSize: '11px', color: 'var(--accent)', marginTop: '4px', display: 'inline-block', textDecoration: 'none' }}>+ Add medicine</a>
                </div>
              ) : (
                medicines.map(med => (
                  <div key={med.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px',
                  }}>
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-primary)' }}>{med.medicine_name}{med.dose ? ` · ${med.dose}` : ''}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{med.time_of_day?.join(', ') || 'Daily'}</div>
                    </div>
                    <button
                      onClick={() => toggleMed(med)}
                      style={{
                        width: '20px', height: '20px', borderRadius: '4px', flexShrink: 0,
                        border: '0.5px solid ' + (med.taken ? 'var(--accent)' : 'var(--border)'),
                        background: med.taken ? 'var(--accent)' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', color: 'var(--bg-card)', fontSize: '11px', fontWeight: 700,
                      }}>
                      {med.taken ? '✓' : ''}
                    </button>
                  </div>
                ))
              )}
              {/* Add medicine row */}
              {medicines.length > 0 && (
                <button onClick={() => setShowMedicineModal(true)} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                  padding: '7px 10px', background: 'transparent',
                  border: '0.5px dashed var(--border)', borderRadius: '6px',
                  fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit'
                }}>+ Add medicine</button>
              )}
            </div>
          </div>
        </div>

        {/* ── Row 3: Symptoms + Journal + Daily Insight ──────── */}
        <div className="grid-3col" style={{ gap: '12px' }}>

          {/* Current symptoms */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={cardTitle}>Current symptoms</span>
              <button 
                onClick={() => setShowSymptomModal(true)} 
                style={{ ...cardLink, background: 'none', border: 'none', padding: 0 }}
              >
                + Add
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {symptoms?.symptoms && symptoms.symptoms.length > 0 ? (
                symptoms.symptoms.map((s, index) => (
                  <span key={s} style={{
                    fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
                    border: index === 0 ? '1px solid var(--accent)' : index === 1 ? '1px solid var(--badge-red-text)' : '1px solid var(--border)',
                    color: index === 0 ? 'var(--accent-dark)' : index === 1 ? 'var(--badge-red-text)' : 'var(--text-secondary)',
                    background: index === 0 ? 'var(--badge-green-bg)' : index === 1 ? 'initial' : 'var(--bg-secondary)',
                  }}>{s}</span>
                ))
              ) : (
                <div style={{ width: '100%', textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>🩺</div>
                  <div style={{ fontSize: '12px' }}>No symptoms logged</div>
                </div>
              )}
              <button onClick={() => setShowSymptomModal(true)} style={{
                fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
                border: '1px dashed var(--border)', color: 'var(--text-primary)', cursor: 'pointer',
                background: 'transparent', display: 'flex', alignItems: 'center', gap: '4px', fontFamily: 'inherit'
              }}>+ Add symptom</button>
            </div>
            {symptoms?.notes && (
              <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-primary)', fontWeight: 500 }}>
                Known condition:<br/><strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{symptoms.notes}</strong>
              </div>
            )}
          </div>

          {/* Health journals */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={cardTitle}>Health journals</span>
              <button 
                onClick={() => setShowJournalModal(true)} 
                style={{ ...cardLink, background: 'none', border: 'none', padding: 0 }}
              >
                + New entry
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {journals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: '20px', marginBottom: '4px' }}>📓</div>
                  <div style={{ fontSize: '12px' }}>No journal entries yet</div>
                </div>
              ) : (
                journals.map(j => (
                  <div key={j.id} style={{ padding: '8px 10px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{new Date(j.journal_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-primary)', marginTop: '2px', lineHeight: 1.4 }}>{j.notes || 'No notes'}</div>
                  </div>
                ))
              )}
              <button onClick={() => setShowJournalModal(true)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%',
                padding: '7px 10px', border: '0.5px dashed var(--border)',
                background: 'transparent', borderRadius: '6px',
                fontSize: '11px', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'inherit'
              }}>Write today&apos;s entry</button>
            </div>
          </div>

          {/* Daily insight + Talk button */}
          <div style={card}>
            <div style={{ ...cardHeader, marginBottom: '6px' }}>
              <span style={cardTitle}>Daily insight</span>
            </div>
            <div style={{
              background: 'var(--badge-green-bg)', border: '1px solid var(--accent)',
              borderRadius: '6px', padding: '10px 14px', marginBottom: '10px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--accent-dark)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Slyceai
              </div>
              <div style={{ fontSize: '12px', color: 'var(--insight-text)', lineHeight: 1.5 }}>
                {insight || 'Your vitals look stable today. Pulse is monitored — consider a 10-minute slow walk after dinner.'}
              </div>
            </div>
            <button
              onClick={() => router.push('/chat')}
              style={{
                width: '100%', background: '#111', color: 'var(--bg-card)', border: 'none',
                padding: '11px', borderRadius: '6px', fontSize: '13px',
                cursor: 'pointer', fontWeight: 500, display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '7px',
                fontFamily: 'inherit',
              }}>
              <MessageSquare size={14} />
              Talk to Slyceai
            </button>
            <button
              onClick={() => setShowUploadReportModal(true)}
              style={{
                width: '100%', background: 'transparent', color: 'var(--text-primary)',
                border: '1px dashed var(--border)', padding: '11px', borderRadius: '6px', 
                fontSize: '13px', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '7px',
                fontFamily: 'inherit', marginTop: '8px'
              }}>
              <FileText size={14} style={{ color: 'var(--text-muted)' }} />
              Upload report
            </button>
          </div>
        </div>

      </div>

      {/* ── Onboarding Modal ──────────────────────────────────── */}
      {onboardStep !== null && (
        <OnboardingModal
          step={onboardStep}
          onClose={() => setOnboardStep(null)}
          onComplete={handleOnboardComplete}
          onSkip={handleOnboardSkip}
          onNext={handleOnboardNext}
          userId={userId}
          supabase={supabase}
        />
      )}

    {/* ── Modals ──────────────────────────────────── */}
      {showVitalsModal && (
        <LogVitalsModal 
          supabase={supabase} userId={userId} 
          onClose={() => setShowVitalsModal(false)} 
          onSuccess={() => { setShowVitalsModal(false); loadData(); }} 
        />
      )}
      {showMedicineModal && (
        <AddMedicineModal 
          supabase={supabase} userId={userId} 
          onClose={() => setShowMedicineModal(false)} 
          onSuccess={() => { setShowMedicineModal(false); loadData(); }} 
        />
      )}
      {showSymptomModal && (
        <AddSymptomModal 
          supabase={supabase} userId={userId} 
          onClose={() => setShowSymptomModal(false)} 
          onSuccess={() => { setShowSymptomModal(false); loadData(); }} 
        />
      )}
      {showJournalModal && (
        <HealthJournalModal 
          supabase={supabase} userId={userId} 
          onClose={() => setShowJournalModal(false)} 
          onSuccess={() => { setShowJournalModal(false); loadData(); }} 
        />
      )}
      {showUploadReportModal && (
        <UploadReportModal onClose={() => setShowUploadReportModal(false)} />
      )}

    </div>
  )
}

