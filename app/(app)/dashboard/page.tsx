'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Activity, Pill, Leaf, Sun, RefreshCw,
  MessageSquare, Heart, Utensils, Zap, TrendingUp, ChevronRight,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────── */
interface Meal     { time: string; suggestion: string; benefit: string }
interface LifeTip  { title: string; tip: string; emoji: string }
interface AyurHerb { herb: string; benefit: string; how: string; emoji: string }
interface YogaPose { pose: string; duration: string; benefit: string; emoji: string }
interface Insights { feeling: string; health_tip: string; diet: { title: string; meals: Meal[] }; lifestyle: LifeTip[]; ayurveda: AyurHerb[]; yoga: YogaPose[] }
interface Stats    { vitalsCount: number; medicinesCount: number; journalsCount: number; medicineAdherence: string; takenCount: number; status: string }

/* ─── Skeleton block ─────────────────────────────────────── */
function Skel({ w = '100%', h = 16, r = 8, mb = 0 }: { w?: string | number; h?: number; r?: number; mb?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: 'linear-gradient(90deg, #f0ece6 0%, #e8e4dd 50%, #f0ece6 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s ease-in-out infinite',
      marginBottom: mb, flexShrink: 0,
    }} />
  )
}

/* ─── Meal Tab Switcher ──────────────────────────────────── */
function MealTabs({ meals }: { meals: Meal[] }) {
  const [active, setActive] = useState(0)
  if (!meals.length) return null
  const meal = meals[active]
  const timeColors: Record<string, { bg: string; accent: string; pill: string }> = {
    default:   { bg: '#f5f1eb', accent: '#5a5652', pill: '#e8e4dd' },
    breakfast: { bg: '#fff8f0', accent: '#d97706', pill: '#fef3c7' },
    lunch:     { bg: '#f0fdf9', accent: '#0d9488', pill: '#ccfbf1' },
    dinner:    { bg: '#f5f3ff', accent: '#7c3aed', pill: '#ede9fe' },
    snack:     { bg: '#fdf4ff', accent: '#a21caf', pill: '#fae8ff' },
  }
  const getColors = (t: string) => timeColors[t.toLowerCase()] ?? timeColors.default

  return (
    <div style={{ padding: '0 16px' }}>
      {/* Pill tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {meals.map((m, i) => {
          const c = getColors(m.time)
          const isActive = i === active
          return (
            <button
              key={i}
              onClick={() => setActive(i)}
              style={{
                padding: '6px 14px', borderRadius: 100,
                border: isActive ? `1.5px solid ${c.accent}` : '1.5px solid #e8e4dd',
                background: isActive ? c.pill : '#fff',
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                color: isActive ? c.accent : '#9a9690',
                cursor: 'pointer', transition: 'all 0.18s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {m.time}
            </button>
          )
        })}
      </div>

      {/* Full-width meal card */}
      {(() => {
        const c = getColors(meal.time)
        return (
          <div style={{
            background: '#fff', border: '1px solid #e8e4dd',
            borderRadius: 18, boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
          }}>
            {/* Coloured header band */}
            <div style={{ background: c.bg, padding: '14px 18px 12px', borderBottom: '1px solid #e8e4dd' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: c.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {meal.time}
              </span>
            </div>
            <div style={{ padding: '16px 18px' }}>
              <p style={{ margin: '0 0 8px', fontSize: 15, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.4 }}>
                {meal.suggestion}
              </p>
              <p style={{ margin: 0, fontSize: 13, color: '#059669', fontWeight: 500, lineHeight: 1.55 }}>
                {meal.benefit}
              </p>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile]   = useState<{ name: string | null } | null>(null)
  const [stats, setStats]       = useState<Stats | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading]   = useState(true)

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today    = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  /* fetch stats */
  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const todayStr = new Date().toISOString().split('T')[0]
      const [
        { data: p },
        { data: latestVitals, count: vitalsCount },
        { data: meds },
        { count: journalsCount },
      ] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).single(),
        supabase.from('vitals').select('bp_systolic, blood_sugar').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(1).single(),
        supabase.from('medicines').select('id').eq('user_id', user.id).eq('is_active', true),
        supabase.from('symptom_journal').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
      ])
      setProfile(p)
      const ids = meds?.map(m => m.id) ?? []
      const { data: logs } = ids.length > 0
        ? await supabase.from('medicine_logs').select('taken').eq('user_id', user.id).eq('log_date', todayStr).in('medicine_id', ids)
        : { data: [] }
      const taken = logs?.filter(l => l.taken).length ?? 0
      let status = 'Stable'
      if (latestVitals) {
        if ((latestVitals.bp_systolic ?? 0) > 140 || (latestVitals.blood_sugar ?? 0) > 180) status = 'Needs Attention'
        else if ((latestVitals.bp_systolic ?? 0) > 130 || (latestVitals.blood_sugar ?? 0) > 140) status = 'Elevated'
      }
      setStats({ vitalsCount: vitalsCount ?? 0, medicinesCount: ids.length, journalsCount: journalsCount ?? 0, medicineAdherence: ids.length > 0 ? `${taken}/${ids.length}` : '—', takenCount: taken, status })
    }
    run()
  }, [supabase])

  /* fetch fresh AI insights */
  const fetchInsights = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard-insights', { cache: 'no-store' })
      setInsights(await res.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchInsights() }, [fetchInsights])

  /* computed */
  const firstName   = profile?.name?.split(' ')[0] ?? 'there'
  const status      = stats?.status ?? 'Stable'
  const statusColor = status === 'Needs Attention' ? '#e11d48' : status === 'Elevated' ? '#d97706' : '#059669'
  const healthScore = Math.min(
    (stats && stats.medicinesCount > 0 ? Math.round((stats.takenCount / stats.medicinesCount) * 40) : 20) +
    Math.min((stats?.vitalsCount ?? 0) * 5, 30) +
    Math.min((stats?.journalsCount ?? 0) * 2, 20) +
    (status === 'Stable' ? 10 : status === 'Elevated' ? 5 : 0),
    100
  ) || 72

  /* style helpers */
  const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: '#fff', border: '1px solid #e8e4dd',
    borderRadius: 18, boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
    ...extra,
  })

  const sectionHeader = (icon: React.ReactNode, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px 12px' }}>
      {icon}
      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{label}</span>
    </div>
  )

  const STATS = [
    { label: 'Health Score', value: `${healthScore}`, unit: '/100', icon: TrendingUp, color: '#059669', href: '/vitals' },
    { label: 'Meds Today',   value: stats?.medicineAdherence ?? '—', unit: '', icon: Pill,        color: '#0d9488', href: '/medicines' },
    { label: 'Vitals',       value: `${stats?.vitalsCount ?? 0}`,    unit: '', icon: Heart,       color: '#d97706', href: '/vitals' },
    { label: 'Journals',     value: `${stats?.journalsCount ?? 0}`,  unit: '', icon: Activity,    color: '#7c3aed', href: '/journal' },
  ]

  const ACTIONS = [
    { label: 'Log Vitals',    href: '/vitals',    icon: Heart,    color: '#d97706', bg: '#fffbeb' },
    { label: 'Add Medicine',  href: '/medicines', icon: Pill,     color: '#0d9488', bg: '#f0fdf9' },
    { label: 'Journal Entry', href: '/journal',   icon: Activity, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Diet Plan',     href: '/diet',      icon: Utensils, color: '#059669', bg: '#f0fdf4' },
  ]

  return (
    <div style={{ width: '100%', maxWidth: 600, margin: '0 auto', paddingBottom: 32 }}>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100% { background-position: 200% 0; } 50% { background-position: 0% 0; } }
        @keyframes fadeUp  { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* ── 1. Greeting ───────────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#9a9690' }}>{today} · {status}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em', lineHeight: 1.2, flex: 1, minWidth: 0 }}>
            {greeting}, {firstName} 👋
          </h1>
          <button
            onClick={fetchInsights}
            disabled={loading}
            style={{
              display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0,
              padding: '8px 12px', borderRadius: 10,
              background: '#fff', border: '1px solid #e8e4dd',
              fontSize: 12, fontWeight: 600, color: '#5a5652',
              cursor: loading ? 'wait' : 'pointer', opacity: loading ? 0.5 : 1,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            }}
          >
            <RefreshCw size={12} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            {loading ? 'Syncing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* ── 2. AI Insight card ────────────────────────── */}
      <div style={{ padding: '14px 16px 0' }}>
        <div style={card({ padding: '20px 18px' })}>
          {loading ? (
            <div>
              <Skel w="28%" h={10} r={6} mb={12} />
              <Skel w="96%" h={15} r={6} mb={8} />
              <Skel w="80%" h={15} r={6} mb={8} />
              <Skel w="60%" h={15} r={6} mb={18} />
              <div style={{ display: 'flex', gap: 8 }}>
                <Skel w={140} h={40} r={11} />
                <Skel w={120} h={40} r={11} />
              </div>
            </div>
          ) : (
            <div style={{ animation: 'fadeUp 0.3s ease' }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Your Daily Insight ✨
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 400, color: '#1a1a1a', lineHeight: 1.65, wordBreak: 'break-word' }}>
                {insights?.feeling ?? 'Your health data is being analyzed…'}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link href="/chat" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7, alignSelf: 'flex-start',
                  padding: '10px 18px', borderRadius: 11,
                  background: '#1a1a1a', color: '#fff',
                  fontSize: 14, fontWeight: 600, textDecoration: 'none',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
                }}>
                  <MessageSquare size={15} /> Talk to Slyceai
                </Link>
                {insights?.health_tip && (
                  <div style={{
                    padding: '10px 14px', borderRadius: 11,
                    background: '#f0fdf9', border: '1px solid #a7f3d0',
                    fontSize: 13, fontWeight: 500, color: '#047857', lineHeight: 1.5, wordBreak: 'break-word',
                  }}>
                    💡 {insights.health_tip.split('.')[0]}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Stats 2×2 grid ─────────────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {STATS.map((s, i) => {
            const Icon = s.icon
            return (
              <Link key={i} href={s.href} style={{ textDecoration: 'none' }}>
                <div style={card({ padding: '16px 14px' })}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#9a9690' }}>{s.label}</span>
                    <Icon size={14} style={{ color: s.color, flexShrink: 0 }} strokeWidth={1.75} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
                    <span style={{ fontSize: 26, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.03em', lineHeight: 1 }}>{s.value}</span>
                    {s.unit && <span style={{ fontSize: 12, color: '#9a9690', fontWeight: 500 }}>{s.unit}</span>}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── 4. Quick Actions 2×2 grid ─────────────────── */}
      <div style={{ padding: '16px 16px 0' }}>
        <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#9a9690', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Quick Actions
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {ACTIONS.map((a, i) => {
            const Icon = a.icon
            return (
              <Link key={i} href={a.href} style={{ textDecoration: 'none' }}>
                <div style={card({ padding: '14px', background: a.bg, display: 'flex', alignItems: 'center', gap: 10, minHeight: 56 })}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
                    <Icon size={15} style={{ color: a.color }} strokeWidth={1.75} />
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.3, flex: 1, minWidth: 0 }}>{a.label}</span>
                  <ChevronRight size={13} style={{ color: '#c9c5be', flexShrink: 0 }} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* ── 5. Diet Plan — pill tab switcher ──────────── */}
      <div style={{ marginTop: 26 }}>
        {sectionHeader(<Utensils size={14} style={{ color: '#0d9488' }} strokeWidth={1.75} />, insights?.diet?.title ?? "Today's Diet Plan")}
        {loading ? (
          <div style={{ padding: '0 16px' }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
              {[80, 60, 64, 52].map((w, i) => <Skel key={i} w={w} h={30} r={100} />)}
            </div>
            <Skel w="100%" h={130} r={18} />
          </div>
        ) : (
          <div style={{ animation: 'fadeUp 0.3s ease' }}>
            <MealTabs meals={insights?.diet?.meals ?? []} />
          </div>
        )}
      </div>

      {/* ── 6. Yoga — 2-column grid ───────────────────── */}
      <div style={{ marginTop: 26 }}>
        {sectionHeader(<Zap size={14} style={{ color: '#0d9488' }} strokeWidth={1.75} />, 'Movement & Yoga')}
        {loading ? (
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[1, 2, 3, 4].map(i => <Skel key={i} w="100%" h={140} r={18} />)}
          </div>
        ) : (
          <div style={{ padding: '0 16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, animation: 'fadeUp 0.3s ease' }}>
            {(insights?.yoga ?? []).map((y, i) => (
              <div key={i} style={card({ padding: '14px 12px' })}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{y.emoji}</div>
                <p style={{ margin: '0 0 6px', fontSize: 13, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.35 }}>{y.pose}</p>
                <span style={{
                  display: 'inline-block', marginBottom: 6,
                  fontSize: 10, fontWeight: 700, color: '#0d9488',
                  background: '#f0fdf9', padding: '2px 8px', borderRadius: 20,
                  border: '1px solid #a7f3d0', whiteSpace: 'nowrap',
                }}>
                  {y.duration}
                </span>
                <p style={{ margin: 0, fontSize: 11, color: '#6b6b6b', lineHeight: 1.45 }}>{y.benefit}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 7. Ayurveda — stacked full-width rows ─────── */}
      <div style={{ marginTop: 26 }}>
        {sectionHeader(<Leaf size={14} style={{ color: '#0d9488' }} strokeWidth={1.75} />, 'Ayurvedic Support')}
        {loading ? (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1, 2, 3].map(i => <Skel key={i} w="100%" h={80} r={18} />)}
          </div>
        ) : (
          <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeUp 0.3s ease' }}>
            {(insights?.ayurveda ?? []).map((h, i) => (
              <div key={i} style={card({ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' })}>
                <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{h.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 700, color: '#1a1a1a' }}>{h.herb}</p>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#3d3d3d', lineHeight: 1.55 }}>{h.benefit}</p>
                  <span style={{
                    display: 'inline-block',
                    fontSize: 11, fontWeight: 600, color: '#047857',
                    background: '#f0fdf9', border: '1px solid #a7f3d0',
                    padding: '3px 10px', borderRadius: 20,
                    maxWidth: '100%', overflow: 'hidden',
                    textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    🌿 {h.how}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 8. Lifestyle Tips grid ────────────────────── */}
      {insights?.lifestyle && insights.lifestyle.length > 0 && (
        <div style={{ padding: '26px 16px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
            <Sun size={14} style={{ color: '#0d9488' }} strokeWidth={1.75} />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>Today&apos;s Lifestyle Tips</span>
          </div>
          <div style={{ background: '#1a1a1a', borderRadius: 22, padding: '18px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {insights.lifestyle.map((tip, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '14px 12px' }}>
                <div style={{ fontSize: 22, marginBottom: 7 }}>{tip.emoji}</div>
                <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{tip.title}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'rgba(255,255,255,0.78)', lineHeight: 1.5, wordBreak: 'break-word' }}>{tip.tip}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
