'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  X,
  Heart,
  Wind,
  Droplets,
  Activity,
  Pill,
  BookOpen,
  Save,
  Plus,
  Calendar,
  ClipboardList,
  Smile,
  Frown,
  Meh,
  FileText,
  Upload,
  FileImage,
} from 'lucide-react'

type Tab = 'vitals' | 'medicine' | 'symptoms' | 'documents'

const EMPTY_VITALS = {
  bp_systolic: '',
  bp_diastolic: '',
  pulse: '',
  oxygen: '',
  blood_sugar: '',
  notes: '',
}

const EMPTY_MED = {
  medicine_name: '',
  dose: '',
  frequency: '',
  time_of_day: [] as string[],
  start_date: '',
  notes: '',
}

const EMPTY_JOURNAL = {
  journal_date: new Date().toISOString().split('T')[0],
  pain_level: 3,
  energy_level: 3,
  mood_level: 3,
  symptoms: [] as string[],
  notes: '',
}

const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Night', 'Before Meals', 'After Meals']

const SYMPTOMS_LIST = [
  'Headache', 'Fatigue', 'Nausea', 'Fever', 'Cough', 'Cold', 'Back Pain',
  'Joint Pain', 'Stomach Pain', 'Dizziness', 'Chest Pain', 'Anxiety', 'Insomnia',
]

const TABS: { key: Tab; label: string; icon: React.ReactNode; color: string; bg: string }[] = [
  { key: 'vitals',    label: 'Add Vitals',   icon: <Activity size={17} />,  color: '#4f46e5', bg: '#eef2ff' },
  { key: 'medicine',  label: 'Add Medicine', icon: <Pill size={17} />,      color: '#059669', bg: '#ecfdf5' },
  { key: 'symptoms',  label: 'Log Symptoms', icon: <BookOpen size={17} />,  color: '#b45309', bg: 'var(--bg-card)beb' },
  { key: 'documents', label: 'Upload Doc',   icon: <FileText size={17} />,  color: '#0369a1', bg: '#e0f2fe' },
]

const DOC_TYPES = [
  'Lab Report', 'Prescription', 'X-Ray / Scan', 'Discharge Summary',
  'Blood Test', 'ECG Report', 'Other'
]

const MOOD_ICONS: Record<number, React.ReactNode> = {
  1: <Frown size={18} style={{ color: '#ef4444' }} />,
  2: <Frown size={18} style={{ color: '#f97316' }} />,
  3: <Meh  size={18} style={{ color: '#3b82f6' }} />,
  4: <Smile size={18} style={{ color: '#22c55e' }} />,
  5: <Smile size={18} style={{ color: '#10b981' }} />,
}

const LEVEL_LABELS = ['', 'Very Bad', 'Bad', 'Okay', 'Good', 'Great']

export default function AddActionModal({ onClose, defaultTab }: { onClose: () => void, defaultTab?: Tab }) {
  const [tab, setTab] = useState<Tab>(defaultTab || 'vitals')
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)

  const [vitals, setVitals] = useState(EMPTY_VITALS)
  const [med, setMed] = useState(EMPTY_MED)
  const [journal, setJournal] = useState(EMPTY_JOURNAL)

  // Documents state
  const [docFile, setDocFile] = useState<File | null>(null)
  const [docType, setDocType] = useState('')
  const [docNote, setDocNote] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const flash = () => {
    setSuccess(true)
    setTimeout(() => { setSuccess(false); onClose() }, 1200)
  }

  // ── Submit Vitals ──
  const saveVitals = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('vitals').insert({
      user_id: user.id,
      bp_systolic: vitals.bp_systolic ? parseInt(vitals.bp_systolic) : null,
      bp_diastolic: vitals.bp_diastolic ? parseInt(vitals.bp_diastolic) : null,
      pulse: vitals.pulse ? parseInt(vitals.pulse) : null,
      oxygen: vitals.oxygen ? parseFloat(vitals.oxygen) : null,
      blood_sugar: vitals.blood_sugar ? parseFloat(vitals.blood_sugar) : null,
      notes: vitals.notes || null,
    })
    setSaving(false)
    flash()
  }

  // ── Submit Medicine ──
  const saveMed = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('medicines').insert({
      user_id: user.id,
      ...med,
      start_date: med.start_date || null,
    })
    setSaving(false)
    flash()
  }

  // ── Submit Symptoms ──
  const saveJournal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('symptom_journal').upsert({
      user_id: user.id,
      ...journal,
      notes: journal.notes || null,
    }, { onConflict: 'user_id,journal_date' })
    setSaving(false)
    flash()
  }

  // ── Upload Document ──
  const saveDocument = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docFile) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const ext = docFile.name.split('.').pop()
    const path = `${user.id}/${Date.now()}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('health_documents')
      .upload(path, docFile, { contentType: docFile.type, upsert: false })

    if (!uploadErr) {
      const { data: urlData } = supabase.storage.from('health_documents').getPublicUrl(path)
      await supabase.from('health_documents').insert({
        user_id: user.id,
        document_type: docType || 'Other',
        file_url: urlData.publicUrl,
        file_name: docFile.name,
        notes: docNote || null,
      })
    }
    setDocFile(null)
    setDocType('')
    setDocNote('')
    setSaving(false)
    flash()
  }

  const currentTab = TABS.find((t) => t.key === tab)!

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl animate-slide-up"
        style={{ maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* ── Modal Header ── */}
        <div
          className="flex items-center justify-between px-6 py-5 border-b sticky top-0 bg-white z-10"
          style={{ borderColor: 'var(--border)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: currentTab.bg, color: currentTab.color }}
            >
              {currentTab.icon}
            </div>
            <span style={{ fontSize: '17px', fontWeight: 700, color: 'var(--medical-navy)' }}>
              {currentTab.label}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <X size={19} />
          </button>
        </div>

        {/* ── Tab Switcher ── */}
        <div className="grid grid-cols-2 sm:flex sm:gap-2 gap-2 px-6 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 flex flex-col items-center gap-1.5 py-2.5 rounded-xl transition-all"
              style={{
                background: tab === t.key ? t.bg : 'transparent',
                border: `1.5px solid ${tab === t.key ? t.color : 'var(--border)'}`,
                color: tab === t.key ? t.color : 'var(--text-muted)',
              }}
            >
              <span style={{ opacity: tab === t.key ? 1 : 0.5 }}>{t.icon}</span>
              <span style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1 }}>{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Success Banner ── */}
        {success && (
          <div
            className="mx-6 mt-4 px-5 py-3 rounded-xl flex items-center gap-3 font-bold"
            style={{ background: '#ecfdf5', color: '#047857', border: '1.5px solid #a7f3d0', fontSize: '15px' }}
          >
            ✅ Saved successfully!
          </div>
        )}

        {/* ══ VITALS FORM ══ */}
        {tab === 'vitals' && (
          <form onSubmit={saveVitals} className="p-6 flex flex-col gap-5">
            {/* Blood Pressure */}
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2"
                style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                <Heart size={15} style={{ color: '#be123c' }} /> Blood Pressure (mmHg)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'bp_systolic',  placeholder: 'Systolic  (e.g. 120)', label: 'SYS' },
                  { key: 'bp_diastolic', placeholder: 'Diastolic (e.g. 80)',  label: 'DIA' },
                ].map((f) => (
                  <div key={f.key} className="relative">
                    <span
                      className="absolute left-3 top-1/2 -translate-y-1/2 font-bold"
                      style={{ fontSize: '11px', color: 'var(--text-muted)' }}
                    >
                      {f.label}
                    </span>
                    <input
                      type="number"
                      placeholder={f.placeholder}
                      value={(vitals as Record<string, string>)[f.key]}
                      onChange={(e) => setVitals((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="input-field pl-12 text-center"
                      style={{ fontSize: '15px', minHeight: '46px' }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Other fields */}
            {[
              { key: 'pulse',       label: 'Heart Rate',   unit: 'bpm',   icon: <Activity size={15} style={{ color: '#059669' }} />, ph: 'e.g. 72' },
              { key: 'oxygen',      label: 'Oxygen Level', unit: 'SpO₂ %', icon: <Wind size={15} style={{ color: '#0369a1' }} />,    ph: 'e.g. 98' },
              { key: 'blood_sugar', label: 'Blood Sugar',  unit: 'mg/dL', icon: <Droplets size={15} style={{ color: '#5b21b6' }} />, ph: 'e.g. 100' },
            ].map((f) => (
              <div key={f.key}>
                <label className="block font-semibold mb-2 flex items-center gap-2"
                  style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  {f.icon} {f.label} <span style={{ fontSize: '12px', opacity: 0.6 }}>({f.unit})</span>
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder={f.ph}
                  value={(vitals as Record<string, string>)[f.key]}
                  onChange={(e) => setVitals((p) => ({ ...p, [f.key]: e.target.value }))}
                  className="input-field"
                  style={{ fontSize: '15px', minHeight: '46px' }}
                />
              </div>
            ))}

            <div>
              <label className="block font-semibold mb-2" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Notes (optional)
              </label>
              <textarea
                placeholder="Any notes about how you feel..."
                value={vitals.notes}
                onChange={(e) => setVitals((p) => ({ ...p, notes: e.target.value }))}
                className="input-field resize-none"
                rows={3}
                style={{ fontSize: '15px' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60"
              style={{ background: 'var(--medical-navy)', fontSize: '16px' }}
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Vitals'}
            </button>
          </form>
        )}

        {/* ══ MEDICINE FORM ══ */}
        {tab === 'medicine' && (
          <form onSubmit={saveMed} className="p-6 flex flex-col gap-5">
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2"
                style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                <Pill size={15} style={{ color: '#059669' }} /> Medicine Name *
              </label>
              <input
                required
                placeholder="e.g. Metformin, Amlodipine..."
                value={med.medicine_name}
                onChange={(e) => setMed((p) => ({ ...p, medicine_name: e.target.value }))}
                className="input-field"
                style={{ fontSize: '15px', minHeight: '46px' }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold mb-2" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  Dose
                </label>
                <input
                  placeholder="e.g. 500mg"
                  value={med.dose}
                  onChange={(e) => setMed((p) => ({ ...p, dose: e.target.value }))}
                  className="input-field"
                  style={{ fontSize: '15px', minHeight: '46px' }}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  How Often
                </label>
                <input
                  placeholder="e.g. Once daily"
                  value={med.frequency}
                  onChange={(e) => setMed((p) => ({ ...p, frequency: e.target.value }))}
                  className="input-field"
                  style={{ fontSize: '15px', minHeight: '46px' }}
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                When to Take
              </label>
              <div className="flex flex-wrap gap-2">
                {TIME_OPTIONS.map((t) => {
                  const active = med.time_of_day.includes(t)
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setMed((p) => ({
                        ...p,
                        time_of_day: active ? p.time_of_day.filter((x) => x !== t) : [...p.time_of_day, t]
                      }))}
                      className="px-4 py-2 rounded-xl border font-semibold transition-all"
                      style={{
                        fontSize: '14px',
                        background: active ? 'var(--medical-navy)' : 'white',
                        color: active ? 'white' : 'var(--text-muted)',
                        borderColor: active ? 'var(--medical-navy)' : 'var(--border)',
                      }}
                    >
                      {t}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2"
                style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                <Calendar size={15} /> Start Date (optional)
              </label>
              <input
                type="date"
                value={med.start_date}
                onChange={(e) => setMed((p) => ({ ...p, start_date: e.target.value }))}
                className="input-field"
                style={{ fontSize: '15px', minHeight: '46px' }}
              />
            </div>

            <div>
              <label className="block font-semibold mb-2" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Notes (optional)
              </label>
              <textarea
                placeholder="Any special instructions..."
                value={med.notes}
                onChange={(e) => setMed((p) => ({ ...p, notes: e.target.value }))}
                className="input-field resize-none"
                rows={2}
                style={{ fontSize: '15px' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60"
              style={{ background: '#059669', fontSize: '16px' }}
            >
              <Plus size={18} /> {saving ? 'Saving...' : 'Add Medicine'}
            </button>
          </form>
        )}

        {/* ══ SYMPTOMS FORM ══ */}
        {tab === 'symptoms' && (
          <form onSubmit={saveJournal} className="p-6 flex flex-col gap-5">
            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2"
                style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                <Calendar size={15} /> Date
              </label>
              <input
                type="date"
                value={journal.journal_date}
                onChange={(e) => setJournal((p) => ({ ...p, journal_date: e.target.value }))}
                className="input-field"
                style={{ fontSize: '15px', minHeight: '46px' }}
              />
            </div>

            {/* Sliders */}
            {[
              { key: 'pain_level',   label: 'Pain Level',   emoji: '🤕' },
              { key: 'energy_level', label: 'Energy Level', emoji: '⚡' },
              { key: 'mood_level',   label: 'Mood',         emoji: '😊' },
            ].map((s) => {
              const val = journal[s.key as keyof typeof journal] as number
              return (
                <div key={s.key}>
                  <div className="flex items-center justify-between mb-3">
                    <label className="font-semibold flex items-center gap-2"
                      style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                      <span>{s.emoji}</span> {s.label}
                    </label>
                    <div className="flex items-center gap-2">
                      {MOOD_ICONS[val]}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--medical-navy)' }}>
                        {LEVEL_LABELS[val]}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    value={val}
                    onChange={(e) => setJournal((p) => ({ ...p, [s.key]: parseInt(e.target.value) }))}
                    className="w-full accent-medical-navy"
                    style={{ height: '6px', cursor: 'pointer' }}
                  />
                  <div className="flex justify-between mt-1" style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <span>Worst</span><span>Best</span>
                  </div>
                </div>
              )
            })}

            {/* Symptom chips */}
            <div>
              <label className="block font-semibold mb-2" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Symptoms Today (tap to select)
              </label>
              <div className="flex flex-wrap gap-2">
                {SYMPTOMS_LIST.map((s) => {
                  const active = journal.symptoms.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setJournal((p) => ({
                        ...p,
                        symptoms: active ? p.symptoms.filter((x) => x !== s) : [...p.symptoms, s]
                      }))}
                      className="px-3 py-2 rounded-xl border font-semibold transition-all"
                      style={{
                        fontSize: '13px',
                        background: active ? 'var(--bg-card)1f2' : 'white',
                        color: active ? '#be123c' : 'var(--text-muted)',
                        borderColor: active ? '#fecdd3' : 'var(--border)',
                      }}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2 flex items-center gap-2"
                style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                <ClipboardList size={15} /> Notes (optional)
              </label>
              <textarea
                placeholder="Describe how you're feeling today..."
                value={journal.notes}
                onChange={(e) => setJournal((p) => ({ ...p, notes: e.target.value }))}
                className="input-field resize-none"
                rows={3}
                style={{ fontSize: '15px' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60"
              style={{ background: '#b45309', fontSize: '16px' }}
            >
              <ClipboardList size={18} /> {saving ? 'Saving...' : 'Save Journal Entry'}
            </button>
          </form>
        )}

        {/* ══ DOCUMENTS FORM ══ */}
        {tab === 'documents' && (
          <form onSubmit={saveDocument} className="p-6 flex flex-col gap-5">
            {/* File drop zone */}
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50"
              style={{ borderColor: docFile ? '#3b82f6' : 'var(--border)', background: docFile ? '#eff6ff' : 'var(--bg-secondary)' }}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={(e) => setDocFile(e.target.files?.[0] ?? null)}
              />
              {docFile ? (
                <>
                  <div className="text-3xl mb-2">
                    {docFile.type.includes('pdf') ? '📄' : '🖼️'}
                  </div>
                  <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e40af' }}>{docFile.name}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {(docFile.size / 1024).toFixed(0)} KB
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setDocFile(null) }}
                    className="mt-3 text-sm text-rose-500 hover:text-rose-700 font-semibold"
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <Upload size={32} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p style={{ fontSize: '15px', fontWeight: 700, color: 'var(--medical-navy)' }}>Tap to choose file</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>PDF, JPG, PNG (max 10 MB)</p>
                </>
              )}
            </div>

            {/* Document type */}
            <div>
              <label className="block font-semibold mb-2" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Document Type
              </label>
              <div className="flex flex-wrap gap-2">
                {DOC_TYPES.map((dt) => (
                  <button
                    key={dt}
                    type="button"
                    onClick={() => setDocType(dt)}
                    className="px-4 py-2 rounded-xl border font-semibold transition-all"
                    style={{
                      fontSize: '13px',
                      background: docType === dt ? '#0369a1' : 'white',
                      color: docType === dt ? 'white' : 'var(--text-muted)',
                      borderColor: docType === dt ? '#0369a1' : 'var(--border)',
                    }}
                  >
                    {dt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-2" style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                Notes (optional)
              </label>
              <textarea
                placeholder="e.g. Dr. Sharma's prescription, dated April 2025..."
                value={docNote}
                onChange={(e) => setDocNote(e.target.value)}
                className="input-field resize-none"
                rows={2}
                style={{ fontSize: '15px' }}
              />
            </div>

            <button
              type="submit"
              disabled={saving || !docFile}
              className="w-full py-4 rounded-xl text-white font-bold flex items-center justify-center gap-2 transition-all hover:scale-[1.01] disabled:opacity-60"
              style={{ background: '#0369a1', fontSize: '16px' }}
            >
              <Upload size={18} /> {saving ? 'Uploading...' : 'Upload Document'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
