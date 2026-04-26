'use client'

import { useState } from 'react'
import { SupabaseClient } from '@supabase/supabase-js'
import { X, Check } from 'lucide-react'

// Reusing same questions as the full page
const DOSHA_QUESTIONS = [
    {
        id: 'body_type',
        question: 'Physical Constitution',
        options: [
            { value: 'vata', label: 'Thin, challenges with weight gain' },
            { value: 'pitta', label: 'Athletic, moderate weight stability' },
            { value: 'kapha', label: 'Robust, tendency for weight gain' },
        ],
    },
    {
        id: 'digestion',
        question: 'Digestion speed',
        options: [
            { value: 'vata', label: 'Inconsistent / delicate' },
            { value: 'pitta', label: 'Fast / strong appetite' },
            { value: 'kapha', label: 'Slow / steady' },
        ],
    },
    {
        id: 'sleep',
        question: 'Sleep pattern',
        options: [
            { value: 'vata', label: 'Light sleep / intermittent' },
            { value: 'pitta', label: 'Moderate / efficient rest' },
            { value: 'kapha', label: 'Deep sleep / prolonged' },
        ],
    },
    {
        id: 'stress',
        question: 'Stress response',
        options: [
            { value: 'vata', label: 'Anxiety / worry' },
            { value: 'pitta', label: 'Irritability / frustration' },
            { value: 'kapha', label: 'Withdrawal / slow down' },
        ],
    },
]

export default function AyurvedaModal({
    supabase, userId, onClose, onSuccess
}: {
    supabase: SupabaseClient
    userId: string
    onClose: () => void
    onSuccess: () => void
}) {
    const [answers, setAnswers] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)
    const currentQIndex = Object.keys(answers).length
    const q = DOSHA_QUESTIONS[currentQIndex]

    const handleSelect = async (val: string) => {
        const newAnswers = { ...answers, [q.id]: val }
        setAnswers(newAnswers)

        if (Object.keys(newAnswers).length === DOSHA_QUESTIONS.length) {
            setSaving(true)
            // Calculate dosha
            const counts: Record<string, number> = { vata: 0, pitta: 0, kapha: 0 }
            Object.values(newAnswers).forEach((v) => counts[v]++)

            const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
            const primary_dosha = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
            const dosha_vata_score = Math.round((counts.vata / total) * 100)
            const dosha_pitta_score = Math.round((counts.pitta / total) * 100)
            const dosha_kapha_score = Math.round((counts.kapha / total) * 100)

            try {
                await supabase.from('profiles').update({
                    primary_dosha,
                    dosha_vata_score,
                    dosha_pitta_score,
                    dosha_kapha_score,
                    updated_at: new Date().toISOString()
                }).eq('id', userId)

                onSuccess()
            } catch (err) {
                console.error(err)
            } finally {
                setSaving(false)
            }
        }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
        }}>
            <div style={{
                background: 'var(--bg-card)', borderRadius: '12px', width: '400px', maxWidth: '100%',
                boxShadow: '0 8px 32px rgba(0,0,0,0.1)', overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Ayurvedic profile</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 2 }}>
                            {currentQIndex < DOSHA_QUESTIONS.length ? `Question ${currentQIndex + 1} of ${DOSHA_QUESTIONS.length}` : 'Calculating...'}
                        </div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                        <X size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ padding: '24px 20px' }}>
                    {saving || currentQIndex >= DOSHA_QUESTIONS.length ? (
                        <div style={{ textAlign: 'center', padding: '20px 0' }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--badge-green-bg)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                <Check size={20} />
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>Profile updated</div>
                            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Applying personalized insights...</div>
                        </div>
                    ) : (
                        <div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 12 }}>
                                {q.question}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {q.options.map(opt => (
                                    <button key={opt.value} onClick={() => handleSelect(opt.value)} style={{
                                        padding: '12px 14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                                        borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                                        fontSize: 12, color: 'var(--text-primary)', transition: 'all 0.2s',
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
