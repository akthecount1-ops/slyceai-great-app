'use client'

import React, { useState } from 'react'
import AppModal from './AppModal'

interface AddSymptomModalProps {
  onClose: () => void
  onSuccess: () => void
  supabase: any
  userId: string
}

const COMMON_SYMPTOMS = ['Fatigue', 'Headache', 'Nausea', 'Dizziness', 'Back pain', 'Chest pain', 'Shortness of breath', 'Muscle weakness', 'Fever', 'Cough']

export default function AddSymptomModal({ onClose, onSuccess, supabase, userId }: AddSymptomModalProps) {
  const [saving, setSaving] = useState(false)
  const [symptoms, setSymptoms] = useState<string[]>([])
  const [notes, setNotes] = useState('') // Used for Known Conditions 
  
  const toggleSymptom = (s: string) => {
    if (symptoms.includes(s)) {
      setSymptoms(symptoms.filter(x => x !== s))
    } else {
      setSymptoms([...symptoms, s])
    }
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
      if (!error) {
        onSuccess()
      }
    } finally {
      setSaving(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: '8px', 
    border: '1px solid var(--border)', fontSize: '14px', outline: 'none', 
    background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit'
  }

  const labelStyle: React.CSSProperties = {
    fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500
  }

  return (
    <AppModal title="Log Symptoms" subtitle="Keep a record of how you are feeling." onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <label style={labelStyle}>Select Symptoms</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {COMMON_SYMPTOMS.map(s => (
              <button 
                key={s}
                onClick={() => toggleSymptom(s)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
                  background: symptoms.includes(s) ? 'var(--badge-green-bg)' : 'var(--bg-page)',
                  border: symptoms.includes(s) ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: symptoms.includes(s) ? 'var(--accent-dark)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s'
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>Known Conditions / Notes</label>
          <input type="text" placeholder="e.g. Muscle Fibrosis" value={notes} onChange={e => setNotes(e.target.value)} style={inputStyle} />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button 
            onClick={onClose} 
            style={{
              padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)',
              cursor: 'pointer', fontFamily: 'inherit'
            }}
          >
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
