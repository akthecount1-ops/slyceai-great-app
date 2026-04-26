import React, { useState, useEffect } from 'react'
import AppModal from './AppModal'
import MedicineAutocomplete from './MedicineAutocomplete'
import { AlertCircle, Trash2 } from 'lucide-react'

interface AddMedicineModalProps {
  onClose: () => void
  onSuccess: () => void
  supabase: any
  userId: string
}

const PRESET_TIMES = ['Morning', 'Afternoon', 'Evening', 'Night']

export default function AddMedicineModal({ onClose, onSuccess, supabase, userId }: AddMedicineModalProps) {
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const [times, setTimes] = useState<string[]>([])
  const [activeMeds, setActiveMeds] = useState<any[]>([])
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    async function loadMeds() {
      const { data } = await supabase
        .from('medicines')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
      setActiveMeds(data || [])
    }
    loadMeds()
  }, [supabase, userId])

  const toggleTime = (t: string) => {
    setTimes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t])
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const { error } = await supabase.from('medicines').insert({
        user_id: userId,
        medicine_name: name.trim(),
        dose: dose.trim() || null,
        time_of_day: times.length > 0 ? times : null,
        is_active: true
      })
      if (!error) onSuccess()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal title="Add a Medicine" subtitle="Keep track of your active medications and dosages." onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Medicine Name <span style={{ color: '#d97706' }}>*</span>
          </label>
          <MedicineAutocomplete
            activeMedicines={activeMeds}
            onSelect={(med, warns) => {
              setName(med.name)
              setWarnings(warns)
              if (med.dosage_standard) setDose(med.dosage_standard)
            }}
          />
        </div>

        {warnings.length > 0 && (
          <div style={{
            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
            borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: '13px', fontWeight: 600 }}>
              <AlertCircle size={16} /> Drug Interaction Alerts
            </div>
            {warnings.map((w, idx) => (
              <div key={idx} style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4 }}>• {w}</div>
            ))}
            <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
              Caution: Consult your doctor before combining these medications.
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Dosage (optional)
          </label>
          <input
            type="text" placeholder="e.g. 500mg" value={dose}
            onChange={e => setDose(e.target.value)}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)',
              fontSize: '14px', background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit'
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '6px', fontWeight: 500 }}>
            Time of Day (optional)
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {PRESET_TIMES.map(t => (
              <button
                key={t} onClick={() => toggleTime(t)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
                  background: times.includes(t) ? 'var(--badge-green-bg)' : 'var(--bg-page)',
                  border: times.includes(t) ? '1px solid var(--accent)' : '1px solid var(--border)',
                  color: times.includes(t) ? 'var(--accent-dark)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontFamily: 'inherit'
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit' }}>
            Cancel
          </button>
          <button
            onClick={handleSave} disabled={saving || !name.trim()}
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

