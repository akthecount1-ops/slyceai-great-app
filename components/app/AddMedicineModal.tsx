'use client'

import React, { useState } from 'react'
import AppModal from './AppModal'

interface AddMedicineModalProps {
  onClose: () => void
  onSuccess: () => void
  supabase: any // Or use defined SupabaseClient
  userId: string
}

const PRESET_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night']

export default function AddMedicineModal({ onClose, onSuccess, supabase, userId }: AddMedicineModalProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [times, setTimes] = useState<string[]>([])
  
  const toggleTime = (t: string) => {
    if (times.includes(t)) {
      setTimes(times.filter(x => x !== t))
    } else {
      setTimes([...times, t])
    }
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        medicine_name: name.trim(),
        dose: dose.trim() || null,
        time_of_day: times.length > 0 ? times : null,
        is_active: true
      }
      
      const { error } = await supabase.from('medicines').insert(payload)
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
    <AppModal title="Add a Medicine" subtitle="Keep track of your active medications and dosages." onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Medicine Name <span style={{ color: '#d97706' }}>*</span></label>
          <input type="text" placeholder="e.g. Metformin" value={name} onChange={e => setName(e.target.value)} style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>Dosage (optional)</label>
          <input type="text" placeholder="e.g. 500mg" value={dose} onChange={e => setDose(e.target.value)} style={inputStyle} />
        </div>
        
        <div>
          <label style={labelStyle}>Time of Day (optional)</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PRESET_TIMES.map(t => (
              <button 
                key={t}
                onClick={() => toggleTime(t)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
                  background: times.includes(t) ? 'var(--badge-green-bg)' : 'var(--bg-page)',
                  border: times.includes(t) ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: times.includes(t) ? 'var(--accent-dark)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.1s'
                }}
              >
                {t}
              </button>
            ))}
          </div>
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
            disabled={saving || !name.trim()}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'var(--accent)', border: 'none', color: 'var(--bg-card)',
              cursor: saving ? 'wait' : !name.trim() ? 'not-allowed' : 'pointer', 
              fontFamily: 'inherit', opacity: !name.trim() ? 0.5 : 1, transition: 'opacity 0.15s'
            }}
          >
            {saving ? 'Adding...' : 'Add medicine'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}
