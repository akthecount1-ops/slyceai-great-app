'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, X, FileText, ChevronLeft } from 'lucide-react'
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
  onboarding_complete: number | null
  date_of_birth: string | null
  gender: string | null
  weight_kg?: number | null
  height_cm?: number | null
}

/* ─── Badge helpers ──────────────────────────────────────── */
function badge(label: string, variant: 'green' | 'amber' | 'red') {
  const styles: Record<string, React.CSSProperties> = {
    green: { background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', border: '0.5px solid var(--accent)' },
    amber: { background: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)', border: '0.5px solid var(--badge-amber-text)' },
    red: { background: 'var(--badge-red-bg)', color: 'var(--badge-red-text)', border: '0.5px solid var(--badge-red-text)' },
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

/* ─── Toast ──────────────────────────────────────────────── */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <div style={{
      position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
      background: 'var(--text-primary)', color: 'var(--bg-card)',
      padding: '12px 24px', borderRadius: 12, fontSize: 13.5, fontWeight: 500,
      boxShadow: '0 8px 32px rgba(0,0,0,0.22)', zIndex: 9999,
      animation: 'toastIn 0.3s ease',
    }}>
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      ✅ {message}
    </div>
  )
}

/* ─── Chip helper ────────────────────────────────────────── */
function Chip({ label, active, onToggle }: { label: string; active: boolean; onToggle: () => void }) {
  return (
    <button onClick={onToggle} style={{
      padding: '5px 13px', borderRadius: 100, fontSize: 12.5, fontWeight: 500,
      fontFamily: 'inherit',
      border: `1.5px solid ${active ? 'var(--accent)' : 'var(--border)'}`,
      background: active ? 'rgba(13,148,136,0.08)' : 'var(--bg-secondary)',
      color: active ? '#0b7a70' : 'var(--text-secondary)',
      cursor: 'pointer', transition: 'all 0.12s',
    }}>
      {label}
    </button>
  )
}

/* ─── Onboarding Modal ───────────────────────────────────── */
type OBStep = 1 | 2 | 3 | 4

const KNOWN_CONDITIONS = [
  'Diabetes Type 2', 'Hypertension', 'Hypothyroidism', 'PCOD/PCOS', 'Asthma',
  'Anemia', 'Anxiety', 'Depression', 'Arthritis', 'Heart disease',
  'Kidney disease', 'Liver disease', 'Thyroid disorder', 'High Cholesterol',
  'Migraine', 'Obesity', 'Osteoporosis',
]

const COMMON_SYMPTOMS = [
  'Fatigue', 'Headache', 'Dizziness', 'Cough', 'Chest Pain', 'Nausea',
  'Vomiting', 'Back Pain', 'Joint Pain', 'Fever', 'Shortness of breath',
  'Palpitations', 'Insomnia', 'Skin rash', 'Swelling', 'Weakness',
]

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
const GENDERS = ['Male', 'Female', 'Other']

interface MedRow { name: string; dose: string; frequency: string }

interface OnboardingModalProps {
  initialStep: OBStep
  userId: string
  supabase: ReturnType<typeof createClient>
  onClose: () => void
  onComplete: () => void
}

function OnboardingModal({ initialStep, userId, supabase, onClose, onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState<OBStep>(initialStep)
  const [saving, setSaving] = useState(false)

  // Step 1 — Basic Info
  const [fullName, setFullName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [phone, setPhone] = useState('')

  // Step 2 — Body Measurements
  const [weight, setWeight] = useState('')
  const [height, setHeight] = useState('')
  const [bloodGroup, setBloodGroup] = useState('')

  // Step 3 — Medicines
  const [medRows, setMedRows] = useState<MedRow[]>([{ name: '', dose: '', frequency: '' }])

  // Step 4 — Conditions + Symptoms
  const [conditions, setConditions] = useState<string[]>([])
  const [condFreeText, setCondFreeText] = useState('')
  const [symptoms, setSymptoms] = useState<string[]>([])

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 11px', borderRadius: '7px',
    border: '0.5px solid var(--border)', fontSize: '13px', outline: 'none',
    background: 'var(--bg-page)', color: 'var(--text-primary)',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '11px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px', fontWeight: 500,
  }

  const saveStep1 = async () => {
    if (!fullName.trim() || !dob || !gender) return
    setSaving(true)
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        name: fullName.trim(),
        date_of_birth: dob,
        gender: gender.toLowerCase(),
        ...(phone ? { phone } : {}),
        updated_at: new Date().toISOString(),
      })
    } finally { setSaving(false) }
    setStep(2)
  }

  const saveStep2 = async () => {
    if (!weight || !height) return
    setSaving(true)
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        weight_kg: parseFloat(weight),
        height_cm: parseFloat(height),
        ...(bloodGroup ? { blood_group: bloodGroup } : {}),
        updated_at: new Date().toISOString(),
      })
    } finally { setSaving(false) }
    setStep(3)
  }

  const saveStep3 = async () => {
    setSaving(true)
    try {
      const validMeds = medRows.filter(r => r.name.trim())
      if (validMeds.length > 0) {
        await supabase.from('medicines').insert(
          validMeds.map(m => ({
            user_id: userId,
            medicine_name: m.name.trim(),
            dose: m.dose.trim() || null,
            time_of_day: m.frequency ? [m.frequency.trim()] : null,
            is_active: true,
          }))
        )
      }
    } finally { setSaving(false) }
    setStep(4)
  }

  const saveStep4 = async () => {
    setSaving(true)
    try {
      // Save conditions by combining with existing medical history
      const allConditions = [...conditions]
      if (condFreeText.trim()) {
        allConditions.push(...condFreeText.split(',').map(s => s.trim()).filter(Boolean))
      }

      if (symptoms.length > 0) {
        await supabase.from('symptom_journal').insert({
          user_id: userId,
          symptoms,
          notes: allConditions.length > 0 ? allConditions.join(', ') : null,
          journal_date: new Date().toISOString().split('T')[0],
        })
      } else if (allConditions.length > 0) {
        // Save conditions even if no symptoms
        await supabase.from('symptom_journal').insert({
          user_id: userId,
          symptoms: [],
          notes: allConditions.join(', '),
          journal_date: new Date().toISOString().split('T')[0],
        })
      }

      // Mark onboarding complete
      await supabase.from('profiles').upsert({
        id: userId,
        onboarding_complete: 1,
        chat_ready: 1,
        updated_at: new Date().toISOString(),
      })
    } finally { setSaving(false) }
    onComplete()
  }

  const skipStep3 = () => setStep(4)
  const skipStep4 = async () => {
    setSaving(true)
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        onboarding_complete: true,
        updated_at: new Date().toISOString(),
      })
    } finally { setSaving(false) }
    onComplete()
  }

  const titles: Record<OBStep, string> = {
    1: 'Basic information',
    2: 'Body measurements',
    3: 'Current medicines',
    4: 'Conditions & symptoms',
  }

  const step1Valid = fullName.trim() && dob && gender
  const step2Valid = weight && height

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    // NO onClick on backdrop — modal cannot be closed by clicking outside
    >
      <div style={{
        background: 'var(--bg-card)', borderRadius: '14px',
        border: '0.5px solid var(--border)', boxShadow: '0 12px 48px rgba(0,0,0,0.18)',
        padding: '28px', width: '500px', maxWidth: '96vw', maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '6px' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 500 }}>
              Step {step} of 4
            </p>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{titles[step]}</h2>
          </div>
          {/* Step indicator dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingTop: 2 }}>
            {([1, 2, 3, 4] as OBStep[]).map(n => (
              <div key={n} style={{
                width: n === step ? 18 : 8, height: 8, borderRadius: 100,
                background: n < step ? 'var(--accent)' : n === step ? 'var(--accent)' : 'var(--border)',
                opacity: n < step ? 0.5 : 1, transition: 'all 0.25s',
              }} />
            ))}
          </div>
        </div>

        <div style={{ borderTop: '0.5px solid var(--border)', marginBottom: '20px', paddingTop: '0px' }} />

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Full name <span style={{ color: '#d97706' }}>*</span></label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="e.g. Priya Sharma" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Date of birth <span style={{ color: '#d97706' }}>*</span></label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Gender <span style={{ color: '#d97706' }}>*</span></label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {GENDERS.map(g => (
                  <button key={g} onClick={() => setGender(g)} style={{
                    padding: '7px 20px', borderRadius: 100, fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                    border: `1.5px solid ${gender === g ? 'var(--accent)' : 'var(--border)'}`,
                    background: gender === g ? 'rgba(13,148,136,0.08)' : 'var(--bg-secondary)',
                    color: gender === g ? '#0b7a70' : 'var(--text-secondary)',
                    fontWeight: gender === g ? 600 : 400, transition: 'all 0.12s',
                  }}>{g}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Phone <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="e.g. 9876543210" style={inputStyle} />
            </div>
          </div>
        )}

        {/* ── Step 2: Body Measurements ── */}
        {step === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={labelStyle}>Weight (kg) <span style={{ color: '#d97706' }}>*</span></label>
                <input type="number" value={weight} onChange={e => setWeight(e.target.value)}
                  placeholder="e.g. 68" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Height (cm) <span style={{ color: '#d97706' }}>*</span></label>
                <input type="number" value={height} onChange={e => setHeight(e.target.value)}
                  placeholder="e.g. 168" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Blood group <span style={{ color: 'var(--text-muted)' }}>optional</span></label>
              <select value={bloodGroup} onChange={e => setBloodGroup(e.target.value)} style={inputStyle}>
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              This helps Slyceai personalise diet, dosage, and health scores.
            </p>
          </div>
        )}

        {/* ── Step 3: Medicines ── */}
        {step === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>
              Add medicines you currently take. Slyceai will check for interactions.
            </p>
            {medRows.map((row, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, alignItems: 'end' }}>
                <div>
                  {i === 0 && <label style={labelStyle}>Medicine name</label>}
                  <input type="text" value={row.name} onChange={e => {
                    const rows = [...medRows]; rows[i] = { ...rows[i], name: e.target.value }; setMedRows(rows)
                  }} placeholder="e.g. Metformin" style={inputStyle} />
                </div>
                <div>
                  {i === 0 && <label style={labelStyle}>Dose</label>}
                  <input type="text" value={row.dose} onChange={e => {
                    const rows = [...medRows]; rows[i] = { ...rows[i], dose: e.target.value }; setMedRows(rows)
                  }} placeholder="500mg" style={inputStyle} />
                </div>
                <div>
                  {i === 0 && <label style={labelStyle}>Frequency</label>}
                  <input type="text" value={row.frequency} onChange={e => {
                    const rows = [...medRows]; rows[i] = { ...rows[i], frequency: e.target.value }; setMedRows(rows)
                  }} placeholder="Twice daily" style={inputStyle} />
                </div>
                <button onClick={() => {
                  if (medRows.length === 1) { setMedRows([{ name: '', dose: '', frequency: '' }]) }
                  else { setMedRows(medRows.filter((_, idx) => idx !== i)) }
                }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '8px 4px', alignSelf: 'end' }}>
                  <X size={14} />
                </button>
              </div>
            ))}
            <button onClick={() => setMedRows([...medRows, { name: '', dose: '', frequency: '' }])} style={{
              background: 'transparent', border: '0.5px dashed var(--border)', borderRadius: 7,
              padding: '8px', fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer',
              fontFamily: 'inherit', width: '100%',
            }}>+ Add another medicine</button>
          </div>
        )}

        {/* ── Step 4: Conditions + Symptoms ── */}
        {step === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>Known conditions</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {KNOWN_CONDITIONS.map(c => (
                  <Chip key={c} label={c} active={conditions.includes(c)}
                    onToggle={() => setConditions(p => p.includes(c) ? p.filter(x => x !== c) : [...p, c])} />
                ))}
              </div>
              <input type="text" value={condFreeText} onChange={e => setCondFreeText(e.target.value)}
                placeholder="Other conditions (comma separated)" style={inputStyle} />
            </div>
            <div>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 8px' }}>Current symptoms</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {COMMON_SYMPTOMS.map(s => (
                  <Chip key={s} label={s} active={symptoms.includes(s)}
                    onToggle={() => setSymptoms(p => p.includes(s) ? p.filter(x => x !== s) : [...p, s])} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 24, alignItems: 'center' }}>
          {/* Back button */}
          <div>
            {step > 1 && (
              <button onClick={() => setStep((step - 1) as OBStep)} style={{
                background: 'transparent', border: '0.5px solid var(--border)',
                padding: '8px 14px', borderRadius: '7px', fontSize: '12.5px',
                cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                <ChevronLeft size={13} /> Back
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {/* Skip (steps 3 & 4 only) */}
            {(step === 3 || step === 4) && (
              <button onClick={step === 3 ? skipStep3 : skipStep4} disabled={saving} style={{
                background: 'transparent', border: '0.5px solid var(--border)',
                padding: '8px 14px', borderRadius: '7px', fontSize: '12.5px',
                cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit',
              }}>Skip for now</button>
            )}

            {/* Dismiss/close (only steps 1-4, sets dismissed flag) */}
            <button onClick={onClose} style={{
              background: 'transparent', border: '0.5px solid var(--border)',
              padding: '8px 14px', borderRadius: '7px', fontSize: '12.5px',
              cursor: 'pointer', color: 'var(--text-secondary)', fontFamily: 'inherit',
            }}>Later</button>

            {/* Next / Complete */}
            {step < 4 ? (
              <button
                disabled={saving || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)}
                onClick={step === 1 ? saveStep1 : step === 2 ? saveStep2 : saveStep3}
                style={{
                  background: 'var(--accent)', border: 'none', padding: '8px 18px',
                  borderRadius: '7px', fontSize: '12.5px', cursor: saving ? 'wait' : 'pointer',
                  color: 'var(--bg-card)', fontWeight: 600, fontFamily: 'inherit',
                  opacity: (saving || (step === 1 && !step1Valid) || (step === 2 && !step2Valid)) ? 0.55 : 1,
                  transition: 'opacity 0.15s',
                }}>
                {saving ? 'Saving…' : 'Save & continue →'}
              </button>
            ) : (
              <button disabled={saving} onClick={saveStep4} style={{
                background: 'var(--accent)', border: 'none', padding: '8px 18px',
                borderRadius: '7px', fontSize: '12.5px', cursor: saving ? 'wait' : 'pointer',
                color: 'var(--bg-card)', fontWeight: 600, fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? 'Saving…' : 'Complete setup ✓'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter()
  const [supabase] = useState(() => createClient())

  const [profile, setProfile] = useState<Profile | null>(null)
  const [vitals, setVitals] = useState<DashVitals | null>(null)
  const [medicines, setMedicines] = useState<MedItem[]>([])
  const [symptoms, setSymptoms] = useState<SymptomEntry | null>(null)
  const [journals, setJournals] = useState<JournalEntry[]>([])
  const [userId, setUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [insight, setInsight] = useState<string>('')

  // Onboarding state
  const [onboardStep, setOnboardStep] = useState<OBStep | null>(null)
  const [onboardDone, setOnboardDone] = useState(false)
  const autoOpenRef = useRef(false)

  // Vitals nudge state
  const [showVitalsNudge, setShowVitalsNudge] = useState(false)

  // Toast
  const [toast, setToast] = useState<string | null>(null)

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
      supabase.from('profiles').select('name, onboarding_complete, date_of_birth, gender, weight_kg, height_cm').eq('id', user.id).single(),
      supabase.from('vitals').select('bp_systolic, bp_diastolic, pulse, oxygen, blood_sugar, recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1).single(),
      supabase.from('medicines').select('id, medicine_name, dose, time_of_day').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }).limit(5),
      supabase.from('symptom_journal').select('id, symptoms, notes, journal_date').eq('user_id', user.id).order('journal_date', { ascending: false }).limit(1).single(),
      supabase.from('symptom_journal').select('id, notes, journal_date').eq('user_id', user.id).order('journal_date', { ascending: false }).limit(2),
    ])

    const profileData = profileRes.data as Profile | null
    if (profileData) {
      setProfile(profileData)
      const done = profileData.onboarding_complete === 1
      setOnboardDone(done)

      // Auto-open logic: if not complete and haven't auto-shown in this browser
      if (!done && !autoOpenRef.current) {
        autoOpenRef.current = true
        const dismissKey = `onboarding_dismissed_${user.id}`
        if (!localStorage.getItem(dismissKey)) {
          setOnboardStep(1)
        }
      }
    }

    if (vitalsRes.data) {
      setVitals(vitalsRes.data as DashVitals)
      // Vitals nudge: check if >= 2 days old
      const lastVitalsDate = new Date(vitalsRes.data.recorded_at!)
      const daysSince = (Date.now() - lastVitalsDate.getTime()) / (1000 * 60 * 60 * 24)
      const nudgeDismissKey = `vitals_nudge_${todayStr}`
      if (daysSince >= 2 && !localStorage.getItem(nudgeDismissKey)) {
        setShowVitalsNudge(true)
      }
    }

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

  /* ── Onboarding handlers ─────────────────────────── */
  const handleOnboardClose = () => {
    if (userId) {
      localStorage.setItem(`onboarding_dismissed_${userId}`, 'true')
    }
    setOnboardStep(null)
  }

  const handleOnboardComplete = () => {
    setOnboardDone(true)
    setOnboardStep(null)
    setToast('Profile complete! Slyceai now knows your health context.')
    loadData()
  }

  /* ── Computed values ─────────────────────────────── */
  const healthScore = Math.min(
    (onboardDone ? 30 : 10) +
    (vitals ? 30 : 0) +
    (medicines.length > 0 ? 20 : 0) +
    (medicines.filter(m => m.taken).length / Math.max(medicines.length, 1)) * 20,
    100
  )
  const boostedScore = Math.min(Math.round(healthScore + 15), 100)
  const scoreColor = boostedScore >= 70 ? 'var(--accent)' : boostedScore >= 40 ? '#BA7517' : 'var(--badge-red-text)'
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

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading dashboard…</div>
      </div>
    )
  }

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
          <button
            onClick={() => setOnboardStep(1)}
            style={{
              background: 'var(--accent)', color: 'var(--bg-card)', border: 'none',
              padding: '8px 16px', borderRadius: '6px',
              fontSize: '13px', cursor: 'pointer', fontWeight: 500,
              fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
            Continue setup
          </button>
        </div>
      )}

      {/* ── Vitals Nudge Card ─────────────────────────────────── */}
      {showVitalsNudge && onboardDone && (
        <div style={{
          margin: '12px 24px 0', background: 'var(--badge-green-bg)',
          border: '1px solid var(--accent)', borderRadius: '10px',
          padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 3 }}>Vitals reminder</div>
            <div style={{ fontSize: '13px', color: 'var(--insight-text)' }}>
              Time for a quick vitals check — it only takes a minute.
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <button onClick={() => setShowVitalsModal(true)} style={{
              background: 'var(--accent)', color: 'var(--bg-card)', border: 'none',
              padding: '7px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
              fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>+ Log vitals</button>
            <button onClick={() => {
              const today = new Date().toISOString().split('T')[0]
              localStorage.setItem(`vitals_nudge_${today}`, 'dismissed')
              setShowVitalsNudge(false)
            }} style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--accent)', display: 'flex', padding: 4,
            }}>
              <X size={14} />
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
              {badge(boostedScore >= 70 ? 'Good' : boostedScore >= 40 ? 'Low' : 'Poor', boostedScore >= 70 ? 'green' : boostedScore >= 40 ? 'amber' : 'red')}
            </div>
            <div style={{ fontSize: '28px', fontWeight: 500, color: scoreColor, lineHeight: 1 }}>{boostedScore}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>{onboardDone ? `You are doing good!` : 'Complete profile to improve'}</div>
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
                { name: 'SpO2', val: vitals?.oxygen ? `${vitals.oxygen}` : '—', unit: '%' },
                { name: 'Temperature', val: '—', unit: '' },
                { name: 'Weight', val: profile?.weight_kg ? `${profile.weight_kg}` : '—', unit: 'kg' },
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
                Known condition:<br /><strong style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{symptoms.notes}</strong>
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
              onClick={() => router.push('/chat?context=dashboard')}
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
          initialStep={onboardStep}
          userId={userId}
          supabase={supabase}
          onClose={handleOnboardClose}
          onComplete={handleOnboardComplete}
        />
      )}

      {/* ── Modals ──────────────────────────────────── */}
      {showVitalsModal && (
        <LogVitalsModal
          supabase={supabase} userId={userId}
          onClose={() => setShowVitalsModal(false)}
          onSuccess={() => { setShowVitalsModal(false); setShowVitalsNudge(false); loadData(); }}
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

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}

    </div>
  )
}
