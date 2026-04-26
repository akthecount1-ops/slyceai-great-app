'use client'

import React, { useState, useEffect } from 'react'
import { AlertCircle, Plus, Search, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface KB_Symptom {
    id: string
    label: string
    red_flag: boolean
    warning_text: string
    aliases: string[]
}

interface SymptomChipSelectorProps {
    selectedSymptoms: string[]
    onToggle: (label: string) => void
}

export default function SymptomChipSelector({ selectedSymptoms, onToggle }: SymptomChipSelectorProps) {
    const [kbSymptoms, setKbSymptoms] = useState<KB_Symptom[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [supabase] = useState(() => createClient())

    useEffect(() => {
        async function fetchSymptoms() {
            const { data } = await supabase
                .from('kb_symptoms')
                .select('*')
                .order('label')

            setKbSymptoms(data || [])
            setLoading(false)
        }
        fetchSymptoms()
    }, [supabase])

    const filtered = kbSymptoms.filter(s =>
        s.label.toLowerCase().includes(search.toLowerCase()) ||
        s.aliases.some(a => a.toLowerCase().includes(search.toLowerCase()))
    )

    const redFlagsSelected = kbSymptoms.filter(s =>
        s.red_flag && selectedSymptoms.includes(s.label)
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    placeholder="Search symptoms..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{
                        width: '100%', padding: '8px 12px 8px 34px', borderRadius: '8px',
                        border: '1px solid var(--border)', fontSize: '13px', outline: 'none',
                        background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit'
                    }}
                />
                <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>

            {/* Warning Box for Red Flags */}
            {redFlagsSelected.length > 0 && (
                <div style={{
                    background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)',
                    borderRadius: '8px', padding: '10px 14px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#dc2626', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                        <AlertCircle size={16} /> Emergency Warning
                    </div>
                    {redFlagsSelected.map(s => (
                        <div key={s.id} style={{ fontSize: '12px', color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: '4px' }}>
                            • <strong>{s.label}</strong>: {s.warning_text || 'This can be a sign of a serious condition. Seek medical attention immediately.'}
                        </div>
                    ))}
                </div>
            )}

            {/* Symptom Grid */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', maxHeight: '180px', overflowY: 'auto', padding: '2px' }}>
                {loading ? (
                    <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>Loading symptoms...</div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>No symptoms found.</div>
                ) : (
                    filtered.map(s => {
                        const isActive = selectedSymptoms.includes(s.label)
                        return (
                            <button
                                key={s.id}
                                onClick={() => onToggle(s.label)}
                                style={{
                                    padding: '6px 14px', borderRadius: '20px', fontSize: '12.5px',
                                    display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
                                    fontFamily: 'inherit', transition: 'all 0.1s',
                                    background: isActive ? (s.red_flag ? 'rgba(220,38,38,0.1)' : 'var(--badge-green-bg)') : 'var(--bg-card)',
                                    border: isActive ? (s.red_flag ? '1px solid #dc2626' : '1px solid var(--accent)') : '1px solid var(--border)',
                                    color: isActive ? (s.red_flag ? '#dc2626' : 'var(--accent-dark)') : 'var(--text-secondary)',
                                    fontWeight: isActive ? 600 : 400
                                }}
                            >
                                {isActive && <Check size={12} />}
                                {s.label}
                                {s.red_flag && !isActive && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} />}
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
