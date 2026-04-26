import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import fs from 'fs'
import path from 'path'

const profilePath = (id: string) =>
  path.resolve(process.cwd(), 'data', 'patients', id, 'profile.json')

function ensureDir(id: string) {
  const dir = path.dirname(profilePath(id))
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fp = profilePath(user.id)
  if (!fs.existsSync(fp)) {
    return NextResponse.json({ profile: null })
  }
  const profile = JSON.parse(fs.readFileSync(fp, 'utf8'))
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const fp = profilePath(user.id)
  ensureDir(user.id)

  // Merge with existing profile if present
  let existing: Record<string, unknown> = {}
  if (fs.existsSync(fp)) {
    try { existing = JSON.parse(fs.readFileSync(fp, 'utf8')) } catch {}
  }

  const now = new Date().toISOString()
  const merged = {
    patient_id: user.id,
    created_at: existing.created_at ?? now,
    updated_at: now,
    demographics: { ...(existing.demographics as object ?? {}), ...(body.demographics ?? {}) },
    vitals_snapshot: body.vitals_snapshot !== undefined
      ? body.vitals_snapshot
      : (existing.vitals_snapshot ?? null),
    medical_history: {
      known_diseases: [],
      past_surgeries: [],
      allergies: [],
      family_history: [],
      ...(existing.medical_history as object ?? {}),
      ...(body.medical_history ?? {}),
    },
    current_medications: body.current_medications !== undefined
      ? body.current_medications
      : (existing.current_medications ?? []),
    symptoms: {
      past: [],
      current: [],
      duration: '',
      severity: 'mild',
      ...(existing.symptoms as object ?? {}),
      ...(body.symptoms ?? {}),
    },
    onboarding_complete: body.onboarding_complete !== undefined
      ? body.onboarding_complete
      : (existing.onboarding_complete ?? false),
    chat_ready: body.chat_ready !== undefined
      ? body.chat_ready
      : (existing.chat_ready ?? false),
    onboarding_step: body.onboarding_step !== undefined
      ? body.onboarding_step
      : (existing.onboarding_step ?? 1),
  }

  fs.writeFileSync(fp, JSON.stringify(merged, null, 2), 'utf8')
  return NextResponse.json({ ok: true, profile: merged })
}
