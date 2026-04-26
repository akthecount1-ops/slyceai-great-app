'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Search, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Medicine {
    id: string
    name: string
    generic_name: string
    drug_interactions: string[]
    dosage_standard: string
    slug: string
}

interface MedicineAutocompleteProps {
    onSelect: (med: Medicine, warnings: string[]) => void
    activeMedicines: any[]
    placeholder?: string
}

export default function MedicineAutocomplete({ onSelect, activeMedicines, placeholder }: MedicineAutocompleteProps) {
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState<Medicine[]>([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [supabase] = useState(() => createClient())
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    useEffect(() => {
        if (query.length < 2) {
            setSuggestions([])
            return
        }

        const delayDebounceFn = setTimeout(async () => {
            setLoading(true)
            try {
                const { data } = await supabase
                    .from('kb_medicines')
                    .select('*')
                    .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%`)
                    .limit(6)

                setSuggestions(data || [])
                setIsOpen(true)
            } catch (err) {
                console.error('Search failed', err)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(delayDebounceFn)
    }, [query, supabase])

    const checkInteractions = (selectedMed: Medicine) => {
        const warnings: string[] = []
        const selectedInts = selectedMed.drug_interactions || []

        activeMedicines.forEach(active => {
            const activeName = (active.medicine_name || active.name || '').toLowerCase()
            const activeInts = active.drug_interactions || []
            const selectedName = selectedMed.name.toLowerCase()

            // Cross check selected med's interactions with active med
            const matchInSelected = selectedInts.find(it => activeName && it.toLowerCase().includes(activeName.split(' ')[0]))
            if (matchInSelected) {
                warnings.push(`Interaction with ${active.medicine_name}: ${matchInSelected}`)
            }

            // Cross check active med's interactions with selected med
            const matchInActive = activeInts.find((it: string) => it.toLowerCase().includes(selectedName.split(' ')[0]))
            if (matchInActive) {
                warnings.push(`Interaction with ${active.medicine_name}: ${matchInActive}`)
            }
        })

        return [...new Set(warnings)]
    }

    const handleSelect = (med: Medicine) => {
        const warnings = checkInteractions(med)
        onSelect(med, warnings)
        setQuery(med.name)
        setSuggestions([])
        setIsOpen(false)
    }

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '100%' }}>
            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        setIsOpen(true)
                    }}
                    placeholder={placeholder || "Search medicines..."}
                    style={{
                        width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px',
                        border: '1px solid var(--border)', fontSize: '14px', outline: 'none',
                        background: 'var(--bg-page)', color: 'var(--text-primary)', fontFamily: 'inherit',
                        boxSizing: 'border-box'
                    }}
                />
                <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                {loading && <Loader2 size={16} className="animate-spin" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--accent)' }} />}
            </div>

            {isOpen && (suggestions.length > 0 || query.length >= 2) && (
                <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: '8px', marginTop: '4px', zIndex: 100,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', overflow: 'hidden'
                }}>
                    {suggestions.length === 0 ? (
                        <div style={{ padding: '12px', fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center' }}>
                            {loading ? 'Searching...' : 'No medicines found. You can still type the name.'}
                        </div>
                    ) : (
                        suggestions.map(med => {
                            const warnings = checkInteractions(med)
                            return (
                                <div
                                    key={med.id}
                                    onClick={() => handleSelect(med)}
                                    style={{
                                        padding: '10px 12px', cursor: 'pointer', borderBottom: '0.5px solid var(--border)',
                                        display: 'flex', flexDirection: 'column', gap: '2px',
                                        background: 'transparent', transition: 'background 0.1s'
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
                                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>{med.name}</span>
                                        {warnings.length > 0 && <AlertTriangle size={14} style={{ color: '#dc2626' }} />}
                                    </div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{med.generic_name}</div>
                                    {warnings.length > 0 && (
                                        <div style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                                            <AlertTriangle size={10} /> {warnings.length} potential interaction(s)
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            )}
        </div>
    )
}
