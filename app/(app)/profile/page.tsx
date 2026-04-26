'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  User, CheckCircle2, ShieldCheck, FileText, Pill, HeartPulse, Activity,
  Calendar, MapPin, Upload, ImageIcon, Plus, Trash2, Check, X, AlertCircle, File
} from 'lucide-react'

// --- Types ---
interface Profile {
  id: string
  name: string | null
  date_of_birth: string | null
  gender: string | null
  weight: number | null
  height: number | null
  blood_group: string | null
  phone: string | null
  created_at: string
}

interface MedicalHistory {
  id: string
  user_id: string
  known_diseases: string[] | null
  past_surgeries: string[] | null
  allergies: string[] | null
  family_history: string[] | null
}

interface Medicine {
  id: string
  user_id: string
  medicine_name: string
  dose: string | null
  frequency: string | null
  time_of_day?: string[] | null
  is_active: boolean
  created_at: string
}

interface Symptom {
  id: string
  user_id: string
  symptoms: string[] | null
  type: 'current' | 'resolved'
  resolved_at: string | null
  journal_date: string
}

interface HealthDoc {
  id: string
  user_id: string
  file_name: string
  file_path: string
  file_type: string
  ai_summary: string | null
  created_at: string
}

interface JourneyEntry {
  id: string
  user_id: string
  title: string
  description: string | null
  event_date: string
  verified: boolean
}

// --- Hooks ---
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [medHistory, setMedHistory] = useState<MedicalHistory | null>(null)
  const [meds, setMeds] = useState<Medicine[]>([])
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [docs, setDocs] = useState<HealthDoc[]>([])
  const [journeys, setJourneys] = useState<JourneyEntry[]>([])

  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [email, setEmail] = useState('')

  const supabase = createClient()

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setUserId(user.id)
    setEmail(user.email ?? '')

    const [prof, hist, medList, sympList, docList, journList] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('medical_history').select('*').eq('user_id', user.id).maybeSingle(),
      supabase.from('medicines').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('symptom_journal').select('*').eq('user_id', user.id).order('journal_date', { ascending: false }),
      supabase.from('health_documents').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('health_journeys').select('*').eq('user_id', user.id).order('event_date', { ascending: false })
    ])

    if (prof.data) setProfile(prof.data)
    if (hist.data) setMedHistory(hist.data)
    else {
      // Init empty medical history if none
      const emptyHist = { user_id: user.id, known_diseases: [], past_surgeries: [], allergies: [], family_history: [] }
      await supabase.from('medical_history').insert(emptyHist)
      setMedHistory({ id: '', ...emptyHist })
    }
    if (medList.data) setMeds(medList.data)
    if (sympList.data) setSymptoms(sympList.data)
    if (docList.data) setDocs(docList.data)
    if (journList.data) setJourneys(journList.data)

    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  // Auto-saver for profile fields
  const updateProfileField = async (field: keyof Profile, value: any) => {
    if (!profile) return
    setProfile({ ...profile, [field]: value })
    await supabase.from('profiles').update({ [field]: value }).eq('id', userId)
  }

  const updateHistoryField = async (field: keyof MedicalHistory, value: any) => {
    if (!medHistory) return
    setMedHistory({ ...medHistory, [field]: value })
    await supabase.from('medical_history').update({ [field]: value }).eq('user_id', userId)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Optimistic UI could go here
    const ext = file.name.split('.').pop()
    const filePath = `${userId}/${Date.now()}.${ext}`
    
    // Upload to bucket
    const { error: uploadError } = await supabase.storage.from('health-documents').upload(filePath, file)
    if (uploadError) { console.error(uploadError); return }

    // Save to DB
    const { data: newDoc } = await supabase.from('health_documents').insert({
      user_id: userId,
      file_name: file.name,
      file_path: filePath,
      file_type: file.type,
      ai_summary: null // Server process will pick this up ideally, or trigger edge function
    }).select().single()

    if (newDoc) {
      setDocs([newDoc, ...docs])
      // Trigger AI Summary Generation
      fetch('/api/v1/documents/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storage_path: filePath, patient_id: userId, doc_id: newDoc.id })
      }).then(() => loadData()) // reload to get summary
    }
  }

  if (loading || !profile) return (
     <div style={{ padding: '40px', display: 'flex', justifyContent: 'center' }}>
       <div style={{ width: 26, height: 26, border: '2.5px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
     </div>
  )

  const initial = profile.name?.charAt(0)?.toUpperCase() ?? 'U'

  // Calculations for Age
  let ageStr = '—'
  if (profile.date_of_birth) {
    const ageDifMs = Date.now() - new Date(profile.date_of_birth).getTime()
    ageStr = Math.abs(new Date(ageDifMs).getUTCFullYear() - 1970).toString() + ' yrs'
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 24px 60px' }}>
      
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '32px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--text-primary)', color: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', fontWeight: 600 }}>
          {initial}
        </div>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>
            <InlineEditText value={profile.name ?? ''} onSave={(val) => updateProfileField('name', val)} placeholder="Your Name" style={{ fontSize: '22px', fontWeight: 600, color: 'var(--text-primary)' }} />
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Member since {new Date(profile.created_at).toLocaleDateString()} · {email}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* ── Section 1: Personal Details ── */}
        <Section title="Personal details" icon={<User size={16} />}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
             <Field label="Age / DOB">
               <input type="date" value={profile.date_of_birth || ''} onChange={e => updateProfileField('date_of_birth', e.target.value)} style={inputStyle} />
             </Field>
             <Field label="Gender">
               <select value={profile.gender || ''} onChange={e => updateProfileField('gender', e.target.value)} style={inputStyle}>
                 <option value="">Select</option>
                 <option value="Male">Male</option>
                 <option value="Female">Female</option>
                 <option value="Other">Other</option>
               </select>
             </Field>
             <Field label="Weight (kg)">
               <input type="number" value={profile.weight || ''} onChange={e => updateProfileField('weight', parseFloat(e.target.value) || null)} style={inputStyle} />
             </Field>
             <Field label="Height (cm)">
               <input type="number" value={profile.height || ''} onChange={e => updateProfileField('height', parseFloat(e.target.value) || null)} style={inputStyle} />
             </Field>
             <Field label="Blood Group">
               <select value={profile.blood_group || ''} onChange={e => updateProfileField('blood_group', e.target.value)} style={inputStyle}>
                 <option value="">Select</option>
                 {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g}>{g}</option>)}
               </select>
             </Field>
             <Field label="Phone">
               <input type="text" value={profile.phone || ''} onChange={e => updateProfileField('phone', e.target.value)} style={inputStyle} placeholder="Phone number" />
             </Field>
          </div>
        </Section>

        {/* ── Section 2: Medical History ── */}
        <Section title="Medical history" icon={<HeartPulse size={16} />}>
          {medHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <ListEditor label="Known diseases" items={medHistory.known_diseases || []} onSave={val => updateHistoryField('known_diseases', val)} isChips />
              <ListEditor label="Past surgeries (with dates ideally)" items={medHistory.past_surgeries || []} onSave={val => updateHistoryField('past_surgeries', val)} />
              <ListEditor label="Allergies" items={medHistory.allergies || []} onSave={val => updateHistoryField('allergies', val)} isChips />
              <ListEditor label="Family history" items={medHistory.family_history || []} onSave={val => updateHistoryField('family_history', val)} />
            </div>
          )}
        </Section>

        {/* ── Section 3: Active Medications ── */}
        <Section title="Active medications" icon={<Pill size={16} />} action={<button style={btnStyle} onClick={() => alert('Add medicine modal here (hooked to /api/medicines)')}><Plus size={14}/> Add medication</button>}>
          {meds.length > 0 ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '8px 4px', fontWeight: 500 }}>Medicine Name</th>
                  <th style={{ padding: '8px 4px', fontWeight: 500 }}>Dose</th>
                  <th style={{ padding: '8px 4px', fontWeight: 500 }}>Frequency</th>
                  <th style={{ padding: '8px 4px', fontWeight: 500 }}>Since</th>
                  <th style={{ padding: '8px 4px', fontWeight: 500, textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {meds.map(m => (
                  <tr key={m.id} style={{ borderBottom: '0.5px solid var(--border)' }}>
                    <td style={{ padding: '10px 4px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.medicine_name}</td>
                    <td style={{ padding: '10px 4px', color: 'var(--text-secondary)' }}>{m.dose || '—'}</td>
                    <td style={{ padding: '10px 4px', color: 'var(--text-secondary)' }}>{m.frequency || '—'}</td>
                    <td style={{ padding: '10px 4px', color: 'var(--text-secondary)' }}>{new Date(m.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '10px 4px', textAlign: 'right' }}>
                      <button onClick={async () => {
                        await supabase.from('medicines').update({ is_active: false }).eq('id', m.id)
                        loadData()
                      }} style={{ background: 'none', border: 'none', color: 'var(--badge-red-text)', fontSize: '12px', cursor: 'pointer' }}>Stop</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No active medications recorded.</p>
          )}
        </Section>

        {/* ── Section 4: Symptoms History ── */}
        <Section title="Symptoms history" icon={<Activity size={16} />}>
           <div style={{ marginBottom: '16px' }}>
             <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>Current</h4>
             <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
               {symptoms.filter(s => s.type === 'current' || !s.type).flatMap(s => s.symptoms || []).map((sym, i) => (
                 <span key={i} style={{ background: 'var(--badge-amber-bg)', color: 'var(--badge-amber-text)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                   {sym}
                   <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit', opacity: 0.7 }} title="Mark resolved" onClick={() => alert('Mark resolved')}><Check size={11}/></button>
                 </span>
               ))}
               {symptoms.filter(s => s.type === 'current' || !s.type).length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>None</span>}
             </div>
           </div>
           <div>
             <h4 style={{ fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>Past / Resolved</h4>
             <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
               {symptoms.filter(s => s.type === 'resolved').flatMap(s => s.symptoms || []).map((sym, i) => (
                 <span key={i} style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)', border: '0.5px solid var(--border)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px' }}>
                   {sym} <span style={{ opacity: 0.6, marginLeft: '4px' }}></span>
                 </span>
               ))}
               {symptoms.filter(s => s.type === 'resolved').length === 0 && <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No resolved symptoms.</span>}
             </div>
           </div>
        </Section>

        {/* ── Section 5: Health Documents ── */}
        <Section title="Health documents" icon={<FileText size={16} />} action={
            <div>
              <input type="file" id="file-upload" style={{ display: 'none' }} accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileUpload} />
              <label htmlFor="file-upload" style={btnStyle}><Upload size={14}/> Upload document</label>
            </div>
        }>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {docs.map(d => (
              <div key={d.id} style={{ display: 'flex', gap: '12px', padding: '12px', border: '0.5px solid var(--border)', borderRadius: '8px', background: 'var(--bg-card)' }}>
                <div style={{ width: 40, height: 40, borderRadius: '8px', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', flexShrink: 0 }}>
                  {d.file_type.includes('image') ? <ImageIcon size={20}/> : <File size={20}/>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{d.file_name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(d.created_at).toLocaleDateString()}</div>
                  {d.ai_summary ? (
                    <div style={{ marginTop: '8px', fontSize: '12.5px', color: 'var(--text-secondary)', background: 'var(--insight-bg)', padding: '8px 12px', borderRadius: '6px', border: '0.5px solid var(--insight-border)' }}>
                      <div style={{ fontSize: '10px', color: 'var(--insight-text)', fontWeight: 600, marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Summary</div>
                      {d.ai_summary}
                    </div>
                  ) : (
                     <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                       <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.5, animation: 'pulse 2s infinite' }} /> Generating summary...
                     </div>
                  )}
                </div>
              </div>
            ))}
            {docs.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No documents uploaded yet.</p>}
          </div>
        </Section>

        {/* ── Section 6: Health Journey ── */}
        <Section title="Health journey" icon={<ShieldCheck size={16} />} action={<button style={btnStyle} onClick={() => alert('Add journey event modal')}><Plus size={14}/> Add journey</button>}>
          <div style={{ position: 'relative', paddingLeft: '14px', borderLeft: '2px solid var(--border)', marginLeft: '8px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {journeys.map(j => (
              <div key={j.id} style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', left: '-20px', top: '2px', width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', border: '2px solid var(--bg-page)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 500 }}>{new Date(j.event_date).toLocaleDateString()}</span>
                  {j.verified && <span style={{ background: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}><CheckCircle2 size={10}/> Verified</span>}
                </div>
                <h4 style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: '0 0 4px' }}>{j.title}</h4>
                {j.description && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>{j.description}</p>}
              </div>
            ))}
            {journeys.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>Timeline is empty.</p>}
          </div>
        </Section>
        
      </div>
    </div>
  )
}

// --- Helper Components ---

function Section({ title, icon, action, children }: { title: string; icon: React.ReactNode; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border)', borderRadius: '10px', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
          <span style={{ color: 'var(--accent)' }}>{icon}</span> {title}
        </h2>
        {action}
      </div>
      {children}
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px', letterSpacing: '0.05em' }}>{label}</label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', borderRadius: '8px',
  border: '0.5px solid var(--border)', fontSize: '13px',
  outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)',
  fontFamily: 'inherit'
}

const btnStyle: React.CSSProperties = {
  background: 'var(--accent)', color: '#fff', border: 'none', padding: '6px 12px',
  borderRadius: '8px', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit'
}

function ListEditor({ label, items, onSave, isChips = false }: { label: string; items: string[]; onSave: (i: string[]) => void; isChips?: boolean }) {
  const [val, setVal] = useState('')
  const handleAdd = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && val.trim()) {
      e.preventDefault(); onSave([...items, val.trim()]); setVal('')
    }
  }
  const remove = (idx: number) => { const n = [...items]; n.splice(idx,1); onSave(n) }
  
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em' }}>{label}</label>
      {isChips ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
          {items.map((it, i) => (
            <span key={i} style={{ background: 'var(--bg-secondary)', padding: '4px 10px', borderRadius: '20px', fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', border: '0.5px solid var(--border)' }}>
              {it} <button onClick={() => remove(i)} style={{ border:'none', background:'none', padding:0, cursor:'pointer', color:'inherit', opacity:0.6 }}><X size={10}/></button>
            </span>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
          {items.map((it, i) => (
             <div key={i} style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 12px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
               <span>{it}</span>
               <button onClick={() => remove(i)} style={{ border:'none', background:'none', padding:0, cursor:'pointer', color:'var(--text-muted)' }}><X size={12}/></button>
             </div>
          ))}
        </div>
      )}
      <input type="text" value={val} onChange={e => setVal(e.target.value)} onKeyDown={handleAdd} placeholder={`+ Add ${label.toLowerCase()} (press Enter)`} style={{ ...inputStyle, background: 'transparent' }} />
    </div>
  )
}

function InlineEditText({ value, onSave, placeholder, style }: { value: string; onSave: (v: string) => void; placeholder?: string; style?: React.CSSProperties }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setVal(value) }, [value])
  useEffect(() => { if (editing) inputRef.current?.focus() }, [editing])

  const save = () => { setEditing(false); if (val !== value) onSave(val) }

  if (editing) {
    return <input ref={inputRef} value={val} onChange={e => setVal(e.target.value)} onBlur={save} onKeyDown={e => e.key === 'Enter' && save()} style={{ ...style, border: '1px solid var(--accent)', background: 'var(--bg-secondary)', padding: '0 4px', borderRadius: '4px', outline: 'none' }} />
  }
  return <span onClick={() => setEditing(true)} style={{ ...style, cursor: 'text', display: 'inline-block', minWidth: '40px' }} title="Click to edit">{value || placeholder}</span>
}
