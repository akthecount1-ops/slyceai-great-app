'use client'

import React, { useState } from 'react'
import AppModal from './AppModal'

interface HealthJournalModalProps {
  onClose: () => void
  onSuccess: () => void
  supabase: any
  userId: string
}

export default function HealthJournalModal({ onClose, onSuccess, supabase, userId }: HealthJournalModalProps) {
  const [saving, setSaving] = useState(false)
  const [entry, setEntry] = useState('')
  
  const handleSave = async () => {
    if (!entry.trim()) return
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        notes: entry.trim(),
        journal_date: new Date().toISOString()
      }
      
      const { error } = await supabase.from('symptom_journal').insert(payload)
      if (!error) {
        onSuccess()
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppModal title="Health Journal" subtitle="Write down your thoughts, activities, or anything else about your day." onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <div>
          <textarea 
            placeholder="Today I went for a 10-minute walk after dinner..." 
            value={entry} 
            onChange={e => setEntry(e.target.value)} 
            rows={5}
            style={{
              width: '100%', padding: '12px', borderRadius: '8px', 
              border: '1px solid var(--border)', fontSize: '14px', outline: 'none', 
              background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit',
              resize: 'vertical'
            }} 
          />
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
            disabled={saving || !entry.trim()}
            style={{
              padding: '10px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
              background: 'var(--accent)', border: 'none', color: 'var(--bg-card)',
              cursor: saving ? 'wait' : !entry.trim() ? 'not-allowed' : 'pointer', 
              fontFamily: 'inherit', opacity: !entry.trim() ? 0.5 : 1, transition: 'opacity 0.15s'
            }}
          >
            {saving ? 'Saving...' : 'Save entry'}
          </button>
        </div>
      </div>
    </AppModal>
  )
}
