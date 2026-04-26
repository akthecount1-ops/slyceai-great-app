'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  X,
  Activity,
  Pill,
  BookOpen,
  FileText,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'

interface TourStep {
  icon: React.ReactNode
  color: string
  bgColor: string
  title: string
  description: string
  cta: string
  href: string
  emoji: string
}

const TOUR_STEPS: TourStep[] = [
  {
    icon: <Activity size={28} />,
    color: '#be123c',
    bgColor: 'var(--bg-card)1f2',
    title: 'Record Your Health Vitals',
    description:
      'Log your blood pressure, pulse, oxygen level, and blood sugar regularly. Your AI health assistant uses this data to identify trends and alert you to risks early.',
    cta: 'Update Vitals Now',
    href: '/vitals',
    emoji: '❤️',
  },
  {
    icon: <Pill size={28} />,
    color: '#0369a1',
    bgColor: '#e0f2fe',
    title: 'Track Your Medicines',
    description:
      'Add your prescribed medicines and dosage schedules. Get reminders so you never miss a dose and monitor your daily medicine compliance.',
    cta: 'Manage Medicines',
    href: '/medicines',
    emoji: '💊',
  },
  {
    icon: <BookOpen size={28} />,
    color: '#5b21b6',
    bgColor: '#f5f3ff',
    title: 'Log Your Symptoms',
    description:
      'Write in your symptom journal daily. Tracking how you feel helps your AI doctor spot patterns and provide better, personalized health recommendations.',
    cta: 'Open Journal',
    href: '/journal',
    emoji: '📓',
  },
  {
    icon: <FileText size={28} />,
    color: '#047857',
    bgColor: '#ecfdf5',
    title: 'Upload Medical Reports',
    description:
      'Upload your lab reports, prescriptions, and medical documents. Keep everything in one secure place for easy access anytime.',
    cta: 'Upload Documents',
    href: '/documents',
    emoji: '📋',
  },
]

const STORAGE_KEY = 'arogya_tour_dismissed'
const REMINDER_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000 // 3 days

export default function HealthTourPopup() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [checklistStatus, setChecklistStatus] = useState({
    hasVitals: false,
    hasMedicines: false,
    hasJournal: false,
    hasDocuments: false,
  })
  const supabase = createClient()

  const checkShouldShow = useCallback(async () => {
    // Check local storage for dismissal time
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed) {
        const ts = parseInt(dismissed, 10)
        if (Date.now() - ts < REMINDER_INTERVAL_MS) return
      }
    } catch {
      // ignore localStorage errors
    }

    // Check user data completeness
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return

    const [vitalsRes, medsRes, journalRes, docsRes] = await Promise.all([
      supabase.from('vitals').select('id').eq('user_id', user.id).limit(1),
      supabase.from('medicines').select('id').eq('user_id', user.id).limit(1),
      supabase.from('symptom_journal').select('id').eq('user_id', user.id).limit(1),
      supabase.from('health_documents').select('id').eq('user_id', user.id).limit(1),
    ])

    const status = {
      hasVitals: (vitalsRes.data?.length ?? 0) > 0,
      hasMedicines: (medsRes.data?.length ?? 0) > 0,
      hasJournal: (journalRes.data?.length ?? 0) > 0,
      hasDocuments: (docsRes.data?.length ?? 0) > 0,
    }
    setChecklistStatus(status)

    // Show tour if any section is incomplete
    const allComplete = Object.values(status).every(Boolean)
    if (!allComplete) {
      // Small delay so page loads first
      setTimeout(() => setVisible(true), 1800)
    }
  }, [supabase])

  useEffect(() => {
    checkShouldShow()
  }, [checkShouldShow])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString())
    } catch {
      // ignore
    }
    setVisible(false)
  }

  const sectionDone = [
    checklistStatus.hasVitals,
    checklistStatus.hasMedicines,
    checklistStatus.hasJournal,
    checklistStatus.hasDocuments,
  ]

  if (!visible) return null

  const currentStep = TOUR_STEPS[step]
  const isDone = sectionDone[step]
  const totalDone = sectionDone.filter(Boolean).length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200]"
        style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={dismiss}
      />

      {/* Modal */}
      <div
        className="fixed z-[201] flex flex-col"
        style={{
          bottom: '32px',
          right: '32px',
          width: '380px',
          maxWidth: 'calc(100vw - 48px)',
          background: 'var(--bg-card)fff',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18), 0 4px 16px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Header bar */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ background: 'var(--medical-navy)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={16} style={{ color: 'var(--medical-teal)' }} />
            <span style={{ color: 'var(--bg-card)fff', fontWeight: 700, fontSize: '13px', letterSpacing: '0.04em' }}>
              HEALTH SETUP GUIDE
            </span>
          </div>
          <button
            onClick={dismiss}
            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors"
          >
            <X size={16} style={{ color: 'rgba(255,255,255,0.7)' }} />
          </button>
        </div>

        {/* Progress row */}
        <div className="flex items-center gap-2 px-5 pt-4 pb-2">
          {TOUR_STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className="flex-1 h-1.5 rounded-full transition-all"
              style={{
                background: i === step
                  ? 'var(--medical-teal)'
                  : sectionDone[i]
                    ? '#6ee7b7'
                    : '#e2e8f0',
              }}
            />
          ))}
        </div>
        <div className="px-5 pb-1">
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
            {totalDone} of {TOUR_STEPS.length} sections complete
          </span>
        </div>

        {/* Step content */}
        <div className="px-5 py-4">
          {/* Icon + status */}
          <div className="flex items-start gap-4 mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: currentStep.bgColor }}
            >
              <span style={{ color: currentStep.color }}>{currentStep.icon}</span>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: '20px' }}>{currentStep.emoji}</span>
                {isDone && (
                  <span
                    className="flex items-center gap-1 text-emerald-600 font-semibold"
                    style={{ fontSize: '11px' }}
                  >
                    <CheckCircle2 size={12} />
                    Done
                  </span>
                )}
              </div>
              <h3
                style={{
                  fontSize: '16px',
                  fontWeight: 800,
                  color: 'var(--medical-navy)',
                  lineHeight: 1.3,
                  margin: 0,
                }}
              >
                {currentStep.title}
              </h3>
            </div>
          </div>

          <p
            style={{
              fontSize: '13.5px',
              color: '#475569',
              lineHeight: 1.65,
              margin: '0 0 20px',
            }}
          >
            {currentStep.description}
          </p>

          {/* CTA */}
          <Link
            href={currentStep.href}
            onClick={dismiss}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: isDone
                ? 'linear-gradient(135deg, #059669, #047857)'
                : `linear-gradient(135deg, var(--medical-navy), var(--medical-teal))`,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 14px rgba(13,148,136,0.3)',
            }}
          >
            {isDone ? <CheckCircle2 size={16} /> : currentStep.icon}
            {isDone ? 'View & Update' : currentStep.cta}
            <ChevronRight size={16} />
          </Link>
        </div>

        {/* Navigation footer */}
        <div
          className="flex items-center justify-between px-5 py-3 border-t"
          style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
        >
          <button
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200"
            style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}
          >
            <ChevronLeft size={15} />
            Prev
          </button>

          <div className="flex gap-1.5">
            {TOUR_STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className="w-2 h-2 rounded-full transition-all"
                style={{
                  background: i === step ? 'var(--medical-navy)' : '#cbd5e1',
                  transform: i === step ? 'scale(1.3)' : 'scale(1)',
                }}
              />
            ))}
          </div>

          {step < TOUR_STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all hover:bg-slate-200"
              style={{ fontSize: '13px', fontWeight: 600, color: 'var(--medical-navy)' }}
            >
              Next
              <ChevronRight size={15} />
            </button>
          ) : (
            <button
              onClick={dismiss}
              className="flex items-center gap-1 px-3 py-2 rounded-lg transition-all hover:bg-emerald-50"
              style={{ fontSize: '13px', fontWeight: 600, color: '#059669' }}
            >
              Done ✓
            </button>
          )}
        </div>
      </div>
    </>
  )
}
