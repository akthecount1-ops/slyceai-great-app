'use client'

import { useState, useRef, useEffect } from 'react'
import { Plus, FileText, Heart, Pill, X, Image } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ChatAttachMenuProps {
  onInjectText: (text: string) => void
  onFileSelect: (file: File) => void
}

export default function ChatAttachMenu({ onInjectText, onFileSelect }: ChatAttachMenuProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleShareVitals = async () => {
    setLoading('vitals')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('vitals')
        .select('bp_systolic,bp_diastolic,pulse,oxygen,blood_sugar,recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()

      if (data) {
        const date = new Date(data.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        const text = `[My latest vitals as of ${date}]
• Blood Pressure: ${data.bp_systolic ?? '—'}/${data.bp_diastolic ?? '—'} mmHg
• Pulse: ${data.pulse ?? '—'} bpm
• Oxygen Saturation: ${data.oxygen ?? '—'}%
• Blood Sugar: ${data.blood_sugar ?? '—'} mg/dL

Please analyse these readings and advise.`
        onInjectText(text)
      } else {
        onInjectText('I have not logged any vitals yet. Can you tell me what vitals I should be tracking?')
      }
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const handleShareMedicines = async () => {
    setLoading('medicines')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('medicines')
        .select('medicine_name,dose,frequency,time_of_day')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true })

      if (data && data.length > 0) {
        const list = data.map((m) =>
          `• ${m.medicine_name}${m.dose ? ` — ${m.dose}` : ''}${m.frequency ? `, ${m.frequency}` : ''}${m.time_of_day?.length ? ` (${m.time_of_day.join(', ')})` : ''}`
        ).join('\n')
        const text = `[My current active medications]\n${list}\n\nCan you check for any interactions or advise on this medicine list?`
        onInjectText(text)
      } else {
        onInjectText('I am not currently taking any medications. What should I discuss with my doctor at my next visit?')
      }
    } finally {
      setLoading(null)
      setOpen(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
      setOpen(false)
    }
    e.target.value = ''
  }

  const menuItems = [
    {
      id: 'report',
      icon: Image,
      label: 'Upload File',
      sublabel: 'PDF, image (JPG/PNG/WebP), CSV, Word',
      onClick: () => fileInputRef.current?.click(),
    },
    {
      id: 'vitals',
      icon: Heart,
      label: 'Share Latest Vitals',
      sublabel: 'BP, pulse, oxygen, sugar',
      onClick: handleShareVitals,
    },
    {
      id: 'medicines',
      icon: Pill,
      label: 'Share Medicine List',
      sublabel: 'Active medications',
      onClick: handleShareMedicines,
    },
  ]

  return (
    <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.webp,.gif,.txt,.csv,.doc,.docx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* + Button */}
      <button
        id="chat-attach-btn"
        onClick={() => setOpen((v) => !v)}
        title="Add context"
        style={{
          width: '36px',
          height: '36px',
          borderRadius: '50%',
          border: '1.5px solid #e2e8f0',
          background: open ? '#f1f5f9' : 'var(--bg-card)fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s',
          color: '#64748b',
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.background = '#f1f5f9'
            e.currentTarget.style.borderColor = '#cbd5e1'
            e.currentTarget.style.color = '#0f172a'
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.background = 'var(--bg-card)fff'
            e.currentTarget.style.borderColor = '#e2e8f0'
            e.currentTarget.style.color = '#64748b'
          }
        }}
      >
        {open
          ? <X size={16} strokeWidth={2.5} />
          : <Plus size={18} strokeWidth={2.5} />
        }
      </button>

      {/* Popover Menu */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            left: 0,
            width: '252px',
            background: 'var(--bg-secondary)',
            borderRadius: '14px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-menu, 0 8px 32px rgba(0,0,0,0.10))',
            overflow: 'hidden',
            zIndex: 50,
            animation: 'slideUpMenu 0.18s ease-out',
          }}
        >
          <style>{`
            @keyframes slideUpMenu {
              from { opacity: 0; transform: translateY(8px); }
              to   { opacity: 1; transform: translateY(0); }
            }
          `}</style>
          {menuItems.map((item, idx) => (
            <button
              key={item.id}
              onClick={item.onClick}
              disabled={loading === item.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '13px',
                width: '100%',
                padding: '13px 16px',
                background: 'transparent',
                border: 'none',
                borderTop: idx > 0 ? '1px solid #ede9e3' : 'none',
                cursor: loading === item.id ? 'wait' : 'pointer',
                textAlign: 'left',
                transition: 'background 0.1s',
                opacity: loading === item.id ? 0.6 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#eae6df'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '9px',
                  background: 'var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  color: '#5a5652',
                }}
              >
                {loading === item.id
                  ? <div style={{
                      width: '16px', height: '16px', borderRadius: '50%',
                      border: '2px solid #e2e8f0', borderTopColor: 'var(--accent)',
                      animation: 'spin 0.6s linear infinite',
                    }} />
                  : <item.icon size={17} strokeWidth={1.75} />
                }
              </div>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px', fontWeight: 500 }}>
                  {item.sublabel}
                </div>
              </div>
            </button>
          ))}
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  )
}
