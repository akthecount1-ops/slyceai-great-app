import React, { useState } from 'react'
import AppModal from './AppModal'
import SymptomChipSelector from './SymptomChipSelector'

interface AddSymptomModalProps {
  onClose: () => void
  onSuccess: () => void
  supabase: any
  userId: string
}

export default function AddSymptomModal({ onClose, onSuccess, supabase, userId }: AddSymptomModalProps) {
  const [saving, setSaving] = useState(false)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [notes, setNotes] = useState('')

  const toggleSymptom = (s: string) => {
    setSymptoms(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  const handleSave = async () => {
    if (symptoms.length === 0 && !notes.trim()) return
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        symptoms: symptoms.length > 0 ? symptoms : null,
        notes: notes.trim() || null,
        journal_date: new Date().toISOString().split('T')[0]
      }

      const { error } = await supabase.from('symptom_journal').insert(payload)
      if (!error) onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal title="Log Symptoms" subtitle="Keep a record of how you are feeling." onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '8px', fontWeight: 500 }}>
            Identify Symptoms (Tap all that apply)
          </label>
          <SymptomChipSelector
            selectedSymptoms={symptoms}
            onToggle={toggleSymptom}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Additional Notes or Conditions
          </label>
          <textarea
            placeholder="e.g. Symptoms worsen in the evening, taking paracetamol for relief..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)',
              fontSize: '14px', background: 'var(--bg-page)', color: 'var(--text-primary)',
              fontFamily: 'inherit', minHeight: '80px', outline: 'none', resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
          <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (symptoms.length === 0 && !notes.trim())}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'var(--accent)', border: 'none', color: 'var(--bg-card)',
              cursor: saving ? 'wait' : (symptoms.length === 0 && !notes.trim()) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', opacity: (symptoms.length === 0 && !notes.trim()) ? 0.5 : 1, transition: 'opacity 0.15s'
            }}
          >
            {saving ? 'Logging...' : 'Log symptom'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}

