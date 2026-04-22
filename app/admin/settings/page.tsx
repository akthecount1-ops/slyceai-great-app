'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface FeatureFlag {
  key: string
  value: boolean | string | number
  description: string
  updated_at: string
}

const DEFAULT_FLAGS = [
  { key: 'ai_chat_enabled', description: 'Enable AI chat for all users', type: 'boolean' },
  { key: 'document_upload_enabled', description: 'Allow document uploads', type: 'boolean' },
  { key: 'ayurveda_enabled', description: 'Show Ayurveda section', type: 'boolean' },
  { key: 'diet_plan_enabled', description: 'AI diet plan generation', type: 'boolean' },
  { key: 'dataset_contributions_enabled', description: 'Allow dataset contributions', type: 'boolean' },
  { key: 'insights_public', description: 'Make insights page public', type: 'boolean' },
  { key: 'max_doc_upload_mb', description: 'Max document upload size (MB)', type: 'number' },
  { key: 'maintenance_mode', description: 'Enable maintenance mode banner', type: 'boolean' },
]

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState<Record<string, FeatureFlag>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from('system_settings').select('*')
      const map: Record<string, FeatureFlag> = {}
      data?.forEach((row) => { map[row.key] = row })
      setFlags(map)
      setLoading(false)
    }
    load()
  }, [supabase])

  const toggle = async (key: string, currentVal: boolean) => {
    setSaving(key)
    const newVal = !currentVal
    await supabase.from('system_settings').upsert({ key, value: newVal, updated_at: new Date().toISOString() })
    setFlags((prev) => ({ ...prev, [key]: { ...prev[key], key, value: newVal, updated_at: new Date().toISOString(), description: prev[key]?.description ?? '' } }))
    setSaving(null)
  }

  const setNumber = async (key: string, val: number) => {
    setSaving(key)
    await supabase.from('system_settings').upsert({ key, value: val, updated_at: new Date().toISOString() })
    setFlags((prev) => ({ ...prev, [key]: { ...prev[key], key, value: val, updated_at: new Date().toISOString(), description: prev[key]?.description ?? '' } }))
    setSaving(null)
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Platform Settings</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Feature flags and system configuration — changes take effect immediately
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="shimmer h-16 rounded-xl" />)}
        </div>
      ) : (
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
            <h2 className="font-semibold" style={{ color: 'var(--text-primary)' }}>Feature Flags</h2>
          </div>
          <div className="flex flex-col">
            {DEFAULT_FLAGS.map((flag, i) => {
              const current = flags[flag.key]
              const value = current?.value
              const boolVal = value !== false && value !== 0 && value !== 'false'
              const isLast = i === DEFAULT_FLAGS.length - 1

              return (
                <div key={flag.key} className="flex items-center justify-between px-5 py-4"
                     style={{ borderBottom: !isLast ? '1px solid rgba(255,255,255,0.04)' : undefined }}>
                  <div className="flex-1">
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>{flag.description}</div>
                    <div className="text-xs mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>{flag.key}</div>
                    {current?.updated_at && (
                      <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        Last changed: {new Date(current.updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {flag.type === 'boolean' ? (
                    <button
                      onClick={() => toggle(flag.key, boolVal)}
                      disabled={saving === flag.key}
                      className="relative w-12 h-6 rounded-full transition-all disabled:opacity-50"
                      style={{ background: boolVal ? 'var(--gradient-green)' : 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                    >
                      <div
                        className="absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm"
                        style={{ left: boolVal ? '26px' : '2px' }}
                      />
                    </button>
                  ) : (
                    <input
                      type="number"
                      defaultValue={typeof value === 'number' ? value : 10}
                      onBlur={(e) => setNumber(flag.key, parseInt(e.target.value))}
                      className="input-field w-20 text-sm text-center"
                      style={{ padding: '6px 8px' }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 p-4 rounded-xl text-sm" style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.15)', color: 'var(--text-secondary)' }}>
        💡 These feature flags control what is enabled for all users. To swap providers, edit <code className="font-mono text-xs px-1 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.08)' }}>/lib/providers/registry.ts</code>.
      </div>
    </div>
  )
}
