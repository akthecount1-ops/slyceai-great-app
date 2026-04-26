'use client'

import React, { useState } from 'react'
import AppModal from './AppModal'

interface LogVitalsModalProps {
  onClose: () => void
  onSuccess: () => void
  supabase: any // Or use defined SupabaseClient
  userId: string
}

export default function LogVitalsModal({ onClose, onSuccess, supabase, userId }: LogVitalsModalProps) {
  const [saving, setSaving] = useState(false)
  const [bpSys, setBpSys] = useState('')
  const [bpDia, setBpDia] = useState('')
  const [pulse, setPulse] = useState('')
  const [spo2, setSpo2] = useState('')
  const [sugar, setSugar] = useState('')
  
  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: any = {
        user_id: userId,
        recorded_at: new Date().toISOString()
      }
      if (bpSys) payload.bp_systolic = parseInt(bpSys)
      if (bpDia) payload.bp_diastolic = parseInt(bpDia)
      if (pulse) payload.pulse = parseInt(pulse)
      if (spo2) payload.oxygen = parseFloat(spo2)
      if (sugar) payload.blood_sugar = parseFloat(sugar)
      
      const { error } = await supabase.from('vitals').insert(payload)
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
    <AppModal title="Log Today's Vitals" subtitle="Enter your current readings to track your health." onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={labelStyle}>Blood pressure (mmHg)</label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="number" placeholder="Systolic (e.g. 120)" value={bpSys} onChange={e => setBpSys(e.target.value)} style={inputStyle} />
            <span style={{ color: 'var(--text-muted)' }}>/</span>
            <input type="number" placeholder="Diastolic (e.g. 80)" value={bpDia} onChange={e => setBpDia(e.target.value)} style={inputStyle} />
          </div>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle}>Pulse (bpm)</label>
            <input type="number" placeholder="e.g. 78" value={pulse} onChange={e => setPulse(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>SpO2 (%)</label>
            <input type="number" placeholder="e.g. 98" value={spo2} onChange={e => setSpo2(e.target.value)} style={inputStyle} />
          </div>
        </div>
        
        <div>
          <label style={labelStyle}>Blood sugar (mg/dL)</label>
          <input type="number" placeholder="e.g. 95 (Fasting)" value={sugar} onChange={e => setSugar(e.target.value)} style={inputStyle} />
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
            disabled={saving || (!bpSys && !bpDia && !pulse && !spo2 && !sugar)}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'var(--accent)', border: 'none', color: 'var(--bg-card)',
              cursor: saving ? 'wait' : (!bpSys && !bpDia && !pulse && !spo2 && !sugar) ? 'not-allowed' : 'pointer', 
              fontFamily: 'inherit', opacity: (!bpSys && !bpDia && !pulse && !spo2 && !sugar) ? 0.5 : 1, transition: 'opacity 0.15s'
            }}
          >
            {saving ? 'Saving...' : 'Save vitals'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}
