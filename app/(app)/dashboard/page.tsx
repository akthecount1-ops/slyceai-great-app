'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Activity, Pill, Leaf, Sun, RefreshCw,
  MessageSquare, Heart, Utensils, Zap, TrendingUp, Shield,
} from 'lucide-react'

interface Meal  { time: string; suggestion: string; benefit: string }
interface LifeTip { title: string; tip: string; emoji: string }
interface AyurHerb { herb: string; benefit: string; how: string; emoji: string }
interface YogaPose { pose: string; duration: string; benefit: string; emoji: string }
interface Insights {
  feeling: string
  health_tip: string
  diet: { title: string; meals: Meal[] }
  lifestyle: LifeTip[]
  ayurveda: AyurHerb[]
  yoga: YogaPose[]
}

interface Stats {
  vitalsCount: number
  medicinesCount: number
  journalsCount: number
  medicineAdherence: string
  takenCount: number
  status: string
}

export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<{ name: string | null; state: string | null } | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loadingInsights, setLoadingInsights] = useState(true)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const todayStr = new Date().toISOString().split('T')[0]

      const [
        { data: p },
        { data: latestVitals, count: vitalsCount },
        { data: meds },
        { count: journalsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('name, state').eq('id', user.id).single(),
        supabase.from('vitals').select('bp_systolic, blood_sugar').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1).single(),
        supabase.from('medicines').select('id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('symptom_journal').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])

      setProfile(p)
      const medicineIds = meds?.map((m) => m.id) ?? []
      const { data: logs } = medicineIds.length > 0
        ? await supabase.from('medicine_logs').select('taken').eq('user_id', user.id).eq('log_date', todayStr).in('medicine_id', medicineIds)
        : { data: [] }
      const takenCount = logs?.filter((l) => l.taken).length ?? 0

      let status = 'Stable'
      if (latestVitals) {
        if (latestVitals.bp_systolic > 140 || latestVitals.blood_sugar > 180) status = 'Needs Attention'
        else if (latestVitals.bp_systolic > 130 || latestVitals.blood_sugar > 140) status = 'Elevated'
      }

      setStats({
        vitalsCount: vitalsCount ?? 0,
        medicinesCount: medicineIds.length,
        journalsCount: journalsCount ?? 0,
        medicineAdherence: medicineIds.length > 0 ? `${takenCount}/${medicineIds.length}` : '—',
        takenCount,
        status,
      })
    }
    load()
  }, [supabase])

  const CACHE_KEY = 'slyceai_insights_cache'
  const CACHE_TTL = 6 * 60 * 60 * 1000

  const fetchInsights = async (force = false) => {
    if (!force) {
      try {
        const cached = localStorage.getItem(CACHE_KEY)
        if (cached) {
          const { ts, data } = JSON.parse(cached)
          if (Date.now() - ts < CACHE_TTL) { setInsights(data); setLoadingInsights(false); return }
        }
      } catch { /* ignore */ }
    }
    setLoadingInsights(true)
    try {
      const res = await fetch('/api/dashboard-insights')
      const data = await res.json()
      setInsights(data)
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) } catch { /* ignore */ }
    } catch { /* ignore */ } finally {
      setLoadingInsights(false)
    }
  }

  useEffect(() => { fetchInsights() }, [])

  const firstName = profile?.name?.split(' ')[0] ?? 'there'
  const currentStatus = stats?.status ?? 'Stable'
  const statusColor = currentStatus === 'Needs Attention' ? '#e11d48' : currentStatus === 'Elevated' ? '#d97706' : '#059669'

  // Computed health score from stats
  const adherenceScore = stats && stats.medicinesCount > 0
    ? Math.round((stats.takenCount / stats.medicinesCount) * 40)
    : 20
  const vitalsScore = Math.min((stats?.vitalsCount ?? 0) * 5, 30)
  const journalScore = Math.min((stats?.journalsCount ?? 0) * 2, 20)
  const statusBonus = currentStatus === 'Stable' ? 10 : currentStatus === 'Elevated' ? 5 : 0
  const healthScore = Math.min(adherenceScore + vitalsScore + journalScore + statusBonus, 100) || 72

  return (
    <div style={{ maxWidth: '820px', margin: '0 auto', padding: '40px 0 80px' }}>

      {/* ── Greeting ─────────────────────────────────── */}
      <div style={{ marginBottom: '36px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: '12px', fontWeight: 500, color: '#9a9690', letterSpacing: '0.04em' }}>
            {today} · {currentStatus}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px' }}>
          <h1 style={{
            fontSize: 'clamp(28px, 5vw, 40px)', fontWeight: 600,
            color: '#1a1a1a', letterSpacing: '-0.02em', margin: 0, lineHeight: 1.15
          }}>
            {greeting}, {firstName} 👋
          </h1>
          <button
            onClick={() => fetchInsights(true)}
            disabled={loadingInsights}
            style={{
              display: 'flex', alignItems: 'center', gap: '7px',
              padding: '8px 16px', borderRadius: '10px',
              background: 'rgba(255,255,255,0.8)', border: '1px solid #d9d5ce',
              fontSize: '13px', fontWeight: 500, color: '#5a5652',
              cursor: loadingInsights ? 'wait' : 'pointer',
              transition: 'all 0.15s', opacity: loadingInsights ? 0.6 : 1,
              flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.color = '#0d9488' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = '#d9d5ce'; e.currentTarget.style.color = '#5a5652' }}
          >
            <RefreshCw size={13} style={{ animation: loadingInsights ? 'spin 1s linear infinite' : 'none' }} />
            {loadingInsights ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── AI Narrative ─────────────────────────────── */}
      <div style={{
        background: '#ffffff', border: '1px solid #e8e4dd',
        borderRadius: '18px', padding: '28px 32px',
        marginBottom: '16px',
        boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
      }}>
        {loadingInsights ? (
          <div>
            <div style={{ height: '10px', background: '#f0ece6', borderRadius: '6px', width: '25%', marginBottom: '16px' }} />
            <div style={{ height: '20px', background: '#f0ece6', borderRadius: '6px', width: '90%', marginBottom: '10px' }} />
            <div style={{ height: '20px', background: '#f0ece6', borderRadius: '6px', width: '70%' }} />
          </div>
        ) : (
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 14px' }}>
              Your daily insight
            </p>
            <p style={{ fontSize: 'clamp(17px, 2.5vw, 20px)', fontWeight: 400, color: '#1a1a1a', lineHeight: 1.55, margin: '0 0 20px' }}>
              {insights?.feeling ?? 'Your health data is being analyzed…'}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Link href="/chat" style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '9px 18px', borderRadius: '10px',
                background: '#1a1a1a', color: '#fff',
                fontSize: '13.5px', fontWeight: 500, textDecoration: 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#2d2d2d'}
              onMouseLeave={e => e.currentTarget.style.background = '#1a1a1a'}>
                <MessageSquare size={14} />
                Talk to Slyceai
              </Link>
              {insights?.health_tip && (
                <div style={{
                  padding: '9px 16px', borderRadius: '10px',
                  background: '#f0fdf9', border: '1px solid #99f6e4',
                  fontSize: '13px', fontWeight: 500, color: '#047857',
                }}>
                  💡 {insights.health_tip.split('.')[0]}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Row ────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px', marginBottom: '32px',
      }}>
        {[
          { label: 'Health Score', value: `${healthScore}`, unit: '/100', icon: TrendingUp, color: '#059669' },
          { label: 'Meds Today', value: stats?.medicineAdherence ?? '—', unit: '', icon: Pill, color: '#0d9488' },
          { label: 'Vitals Logged', value: `${stats?.vitalsCount ?? 0}`, unit: '', icon: Heart, color: '#d97706' },
          { label: 'Journals', value: `${stats?.journalsCount ?? 0}`, unit: '', icon: Activity, color: '#7c3aed' },
        ].map((s, i) => {
          const Icon = s.icon
          return (
            <div key={i} style={{
              background: '#ffffff', border: '1px solid #e8e4dd',
              borderRadius: '16px', padding: '18px 20px',
              boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#9a9690' }}>{s.label}</span>
                <Icon size={15} style={{ color: s.color }} strokeWidth={1.75} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                <span style={{ fontSize: '26px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.02em', lineHeight: 1 }}>{s.value}</span>
                {s.unit && <span style={{ fontSize: '13px', color: '#9a9690', fontWeight: 500 }}>{s.unit}</span>}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Diet Plan ───────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Utensils size={16} style={{ color: '#0d9488' }} strokeWidth={1.75} />
          {insights?.diet?.title ?? 'Your Nutrition Plan'}
        </h2>
        <div style={{
          background: '#ffffff', border: '1px solid #e8e4dd',
          borderRadius: '18px', overflow: 'hidden',
          boxShadow: '0 1px 8px rgba(0,0,0,0.03)',
        }}>
          {loadingInsights ? (
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[1,2,3].map(i => <div key={i} style={{ height: '56px', background: '#f5f1eb', borderRadius: '10px' }} />)}
            </div>
          ) : (
            insights?.diet?.meals.map((meal, i, arr) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '18px',
                padding: '16px 24px',
                borderBottom: i < arr.length - 1 ? '1px solid #f0ece6' : 'none',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#faf9f7'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '10px',
                  background: '#f5f1eb', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#5a5652', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {meal.time.slice(0,3)}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: '14.5px', fontWeight: 500, color: '#1a1a1a', margin: '0 0 3px' }}>{meal.suggestion}</p>
                  <p style={{ fontSize: '12px', color: '#0d9488', margin: 0, fontWeight: 500 }}>{meal.benefit}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Movement & Ayurveda ──────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>

        {/* Yoga / Movement */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} style={{ color: '#0d9488' }} strokeWidth={1.75} />
            Movement
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loadingInsights ? (
              [1,2].map(i => <div key={i} style={{ height: '80px', background: '#ffffff', border: '1px solid #e8e4dd', borderRadius: '14px' }} />)
            ) : (
              insights?.yoga?.slice(0,3).map((y, i) => (
                <div key={i} style={{
                  background: '#ffffff', border: '1px solid #e8e4dd',
                  borderRadius: '14px', padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.03)',
                }}>
                  <span style={{ fontSize: '22px', flexShrink: 0 }}>{y.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <p style={{ fontSize: '14px', fontWeight: 500, color: '#1a1a1a', margin: 0 }}>{y.pose}</p>
                      <span style={{ fontSize: '11px', color: '#0d9488', fontWeight: 600, flexShrink: 0 }}>{y.duration}</span>
                    </div>
                    <p style={{ fontSize: '12px', color: '#6b6b6b', margin: '3px 0 0', lineHeight: 1.4 }}>{y.benefit}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Ayurveda */}
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Leaf size={16} style={{ color: '#0d9488' }} strokeWidth={1.75} />
            Ayurvedic Support
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {loadingInsights ? (
              [1,2].map(i => <div key={i} style={{ height: '80px', background: '#ffffff', border: '1px solid #e8e4dd', borderRadius: '14px' }} />)
            ) : (
              insights?.ayurveda?.slice(0,3).map((herb, i) => (
                <div key={i} style={{
                  background: '#ffffff', border: '1px solid #e8e4dd',
                  borderRadius: '14px', padding: '14px 18px',
                  boxShadow: '0 1px 6px rgba(0,0,0,0.03)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '20px' }}>{herb.emoji}</span>
                    <p style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>{herb.herb}</p>
                  </div>
                  <p style={{ fontSize: '12px', color: '#6b6b6b', margin: '0 0 6px', lineHeight: 1.4 }}>{herb.benefit}</p>
                  <div style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: '6px',
                    background: '#f0fdf9', border: '1px solid #99f6e4',
                    fontSize: '11px', color: '#047857', fontWeight: 500,
                  }}>
                    {herb.how}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Lifestyle Tips ───────────────────────────── */}
      {insights?.lifestyle && insights.lifestyle.length > 0 && (
        <div style={{
          background: '#1a1a1a', borderRadius: '20px',
          padding: '28px 32px', marginBottom: '16px',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, right: 0, opacity: 0.05, pointerEvents: 'none' }}>
            <Sun size={180} />
          </div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#ffffff', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: '8px', position: 'relative', zIndex: 1 }}>
            <Sun size={16} style={{ color: '#0d9488' }} strokeWidth={1.75} />
            Today's Lifestyle Tips
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', position: 'relative', zIndex: 1 }}>
            {insights.lifestyle.map((tip, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '14px', padding: '16px 18px',
                backdropFilter: 'blur(8px)',
              }}>
                <div style={{ fontSize: '22px', marginBottom: '8px' }}>{tip.emoji}</div>
                <p style={{ fontSize: '12px', fontWeight: 600, color: '#0d9488', margin: '0 0 5px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tip.title}</p>
                <p style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.75)', margin: 0, lineHeight: 1.4 }}>{tip.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
