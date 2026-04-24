'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Activity, Pill, Leaf, Sun, RefreshCw,
  MessageSquare, Heart, Utensils, Zap, TrendingUp, ChevronRight,
} from 'lucide-react'

/* ─── Types ─────────────────────────────────────────────── */
interface Meal       { time: string; suggestion: string; benefit: string }
interface LifeTip    { title: string; tip: string; emoji: string }
interface AyurHerb   { herb: string; benefit: string; how: string; emoji: string }
interface YogaPose   { pose: string; duration: string; benefit: string; emoji: string }
interface Insights   { feeling: string; health_tip: string; diet: { title: string; meals: Meal[] }; lifestyle: LifeTip[]; ayurveda: AyurHerb[]; yoga: YogaPose[] }
interface Stats      { vitalsCount: number; medicinesCount: number; journalsCount: number; medicineAdherence: string; takenCount: number; status: string }

/* ─── Tiny snap-carousel (no vw units, sized via cardWidth px) ─── */
function Carousel({ items, cardWidth, gap = 12, renderCard }: {
  items: unknown[]
  cardWidth: number | string
  gap?: number
  renderCard: (item: unknown, i: number) => React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const scrollTo = (i: number) => {
    const el = ref.current
    if (!el) return
    const child = el.children[i] as HTMLElement
    if (child) el.scrollTo({ left: child.offsetLeft - 16, behavior: 'smooth' })
    setActive(i)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Observe only real card children (not the spacer)
    const obs = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          const idx = Array.from(el.children).indexOf(e.target as HTMLElement)
          // last child is spacer — ignore it
          if (idx >= 0 && idx < items.length) setActive(idx)
        }
      }),
      { root: el, threshold: 0.6 }
    )
    // observe only card divs (skip spacer)
    Array.from(el.children).slice(0, items.length).forEach(c => obs.observe(c))
    return () => obs.disconnect()
  }, [items.length])

  return (
    <div>
      <div
        ref={ref}
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap,
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          // NOTE: paddingRight is IGNORED by browsers on overflow containers.
          // We use a phantom spacer div below instead.
          paddingLeft: 16,
          paddingBottom: 6,
        }}
      >
        {items.map((item, i) => (
          <div key={i} style={{ width: cardWidth, minWidth: cardWidth, flexShrink: 0, scrollSnapAlign: 'start' }}>
            {renderCard(item, i)}
          </div>
        ))}
        {/* Phantom spacer — creates the right-edge breathing room that paddingRight can't */}
        <div style={{ width: 16, minWidth: 16, flexShrink: 0 }} aria-hidden="true" />
      </div>
      {items.length > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 10 }}>
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollTo(i)}
              style={{
                width: i === active ? 18 : 6, height: 6,
                borderRadius: 100,
                background: i === active ? '#0d9488' : '#d9d5ce',
                border: 'none', padding: 0, cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

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

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<{ name: string | null } | null>(null)
  const [stats, setStats]     = useState<Stats | null>(null)
  const [insights, setInsights] = useState<Insights | null>(null)
  const [loading, setLoading]  = useState(true)
  const pageRef = useRef<HTMLDivElement>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

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

  /* fetch fresh AI insights — no caching */
  const fetchInsights = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/dashboard-insights', { cache: 'no-store' })
      setInsights(await res.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchInsights() }, [fetchInsights])

  /* computed */
  const firstName    = profile?.name?.split(' ')[0] ?? 'there'
  const status       = stats?.status ?? 'Stable'
  const statusColor  = status === 'Needs Attention' ? '#e11d48' : status === 'Elevated' ? '#d97706' : '#059669'
  const healthScore  = Math.min(
    (stats && stats.medicinesCount > 0 ? Math.round((stats.takenCount / stats.medicinesCount) * 40) : 20) +
    Math.min((stats?.vitalsCount ?? 0) * 5, 30) +
    Math.min((stats?.journalsCount ?? 0) * 2, 20) +
    (status === 'Stable' ? 10 : status === 'Elevated' ? 5 : 0),
    100
  ) || 72

  /* Pure CSS card widths 
   *  100% resolves to the Carousel container width. 
   *  We subtract the left padding (16px), gap (10px), and desired peek amount.
   *  Diet peek: 50px -> 16+10+50 = 76px
   *  Yoga peek: 80px -> 16+10+80 = 106px
   */
  const gap   = 10
  const dietW = "calc(100% - 76px)"
  const yogaW = "calc(100% - 106px)"

  /* style helpers */
  const card = (extra: React.CSSProperties = {}): React.CSSProperties => ({
    background: '#fff', border: '1px solid #e8e4dd',
    borderRadius: 18, boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
    ...extra,
  })

  const sectionTitle = (icon: React.ReactNode, label: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 16px 10px' }}>
      {icon}
      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{label}</span>
    </div>
  )

  const STATS = [
    { label: 'Health Score', value: `${healthScore}`, unit: '/100', icon: TrendingUp, color: '#059669', href: '/vitals' },
    { label: 'Meds Today',   value: stats?.medicineAdherence ?? '—', unit: '', icon: Pill, color: '#0d9488', href: '/medicines' },
    { label: 'Vitals',       value: `${stats?.vitalsCount ?? 0}`, unit: '', icon: Heart, color: '#d97706', href: '/vitals' },
    { label: 'Journals',     value: `${stats?.journalsCount ?? 0}`, unit: '', icon: Activity, color: '#7c3aed', href: '/journal' },
  ]

  const ACTIONS = [
    { label: 'Log Vitals',     href: '/vitals',    icon: Heart,    color: '#d97706', bg: '#fffbeb' },
    { label: 'Add Medicine',   href: '/medicines', icon: Pill,     color: '#0d9488', bg: '#f0fdf9' },
    { label: 'Journal Entry',  href: '/journal',   icon: Activity, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Diet Plan',      href: '/diet',      icon: Utensils, color: '#059669', bg: '#f0fdf4' },
  ]

  return (
    <div
      ref={pageRef}
      style={{ width: '100%', maxWidth: 600, margin: '0 auto', paddingBottom: 96 }}
    >
      <style>{`
        @keyframes spin     { to { transform: rotate(360deg); } }
        @keyframes shimmer  { 0%,100% { background-position: 200% 0; } 50% { background-position: 0% 0; } }
      `}</style>

      {/* ── 1. Greeting row ──────────────────────────── */}
      <div style={{ padding: '20px 16px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor }} />
          <span style={{ fontSize: 12, fontWeight: 500, color: '#9a9690' }}>
            {today} · {status}
          </span>
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

      {/* ── 2. AI Insight card ───────────────────────── */}
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
            <div>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Your Daily Insight ✨
              </p>
              <p style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 400, color: '#1a1a1a', lineHeight: 1.65, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                {insights?.feeling ?? 'Your health data is being analyzed…'}
              </p>
              {/* CTA row — stacked on very small screens */}
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
                    fontSize: 13, fontWeight: 500, color: '#047857',
                    lineHeight: 1.5, wordBreak: 'break-word',
                  }}>
                    💡 {insights.health_tip.split('.')[0]}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Stats — 2×2 grid (no carousel, always fits) ── */}
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

      {/* ── 4. Quick Actions — 2×2 grid ─────────────── */}
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

      {/* ── 5. Diet Plan carousel ────────────────────── */}
      <div style={{ marginTop: 24 }}>
        {sectionTitle(<Utensils size={14} style={{ color: '#0d9488' }} strokeWidth={1.75} />, insights?.diet?.title ?? "Today's Nutrition")}
        {loading ? (
          <div style={{ display: 'flex', gap: 10, paddingLeft: 16, overflow: 'hidden' }}>
            {[1,2].map(i => <Skel key={i} w={260} h={130} r={18} />)}
          </div>
        ) : (
          <Carousel
            items={insights?.diet?.meals ?? []}
            cardWidth={dietW}
            gap={10}
            renderCard={(item) => {
              const meal = item as Meal
              return (
                <div style={card({ padding: '18px 16px' })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f1eb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 10, fontWeight: 800, color: '#5a5652', textTransform: 'uppercase' }}>{meal.time.slice(0,3)}</span>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{meal.time}</span>
                  </div>
                  <p style={{ margin: '0 0 5px', fontSize: 14, fontWeight: 600, color: '#1a1a1a', lineHeight: 1.4, wordBreak: 'break-word' }}>{meal.suggestion}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#059669', fontWeight: 500 }}>{meal.benefit}</p>
                </div>
              )
            }}
          />
        )}
      </div>

      {/* ── 6. Yoga / Movement carousel ──────────────── */}
      <div style={{ marginTop: 24 }}>
        {sectionTitle(<Zap size={14} style={{ color: '#0d9488' }} strokeWidth={1.75} />, 'Movement & Yoga')}
        {loading ? (
          <div style={{ display: 'flex', gap: 10, paddingLeft: 16, overflow: 'hidden' }}>
            {[1,2].map(i => <Skel key={i} w={240} h={140} r={18} />)}
          </div>
        ) : (
          <Carousel
            items={insights?.yoga ?? []}
            cardWidth={yogaW}
            gap={10}
            renderCard={(item) => {
              const y = item as YogaPose
              return (
                <div style={card({ padding: '16px' })}>
                  <div style={{ fontSize: 26, marginBottom: 10 }}>{y.emoji}</div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3, flex: 1, minWidth: 0 }}>{y.pose}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#0d9488', flexShrink: 0, background: '#f0fdf9', padding: '3px 8px', borderRadius: 20, border: '1px solid #a7f3d0', whiteSpace: 'nowrap' }}>{y.duration}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b6b6b', lineHeight: 1.45, wordBreak: 'break-word' }}>{y.benefit}</p>
                </div>
              )
            }}
          />
        )}
      </div>

      {/* ── 7. Ayurveda carousel ─────────────────────── */}
      <div style={{ marginTop: 24 }}>
        {sectionTitle(<Leaf size={14} style={{ color: '#0d9488' }} strokeWidth={1.75} />, 'Ayurvedic Support')}
        {loading ? (
          <div style={{ display: 'flex', gap: 10, paddingLeft: 16, overflow: 'hidden' }}>
            {[1,2].map(i => <Skel key={i} w={260} h={140} r={18} />)}
          </div>
        ) : (
          <Carousel
            items={insights?.ayurveda ?? []}
            cardWidth={dietW}
            gap={10}
            renderCard={(item) => {
              const h = item as AyurHerb
              return (
                <div style={card({ padding: '16px' })}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span style={{ fontSize: 26, flexShrink: 0 }}>{h.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#1a1a1a', lineHeight: 1.3 }}>{h.herb}</span>
                  </div>
                  <p style={{ margin: '0 0 10px', fontSize: 13, color: '#3d3d3d', lineHeight: 1.5, wordBreak: 'break-word' }}>{h.benefit}</p>
                  <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 7, background: '#f0fdf9', border: '1px solid #a7f3d0', fontSize: 11, color: '#047857', fontWeight: 600 }}>
                    {h.how}
                  </span>
                </div>
              )
            }}
          />
        )}
      </div>

      {/* ── 8. Lifestyle Tips grid ───────────────────── */}
      {insights?.lifestyle && insights.lifestyle.length > 0 && (
        <div style={{ padding: '24px 16px 0' }}>
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
