export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

async function getOrCreatePatient(userId: string, supaName?: string) {
  let patient = await db.getPatient(userId)
  if (!patient) {
    patient = await db.createPatient({
      patient_id: userId,
      name: supaName ?? null,
    })
  }
  return patient
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: supaProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  await getOrCreatePatient(user.id, supaProfile?.name)

  const profile = await db.getPatientFullProfile(user.id)
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  const { data: supaProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  await getOrCreatePatient(user.id, supaProfile?.name)

  try {
    switch (action) {
      case 'update_patient': {
        const { name, age, gender, weight_kg, height_cm } = body
        await db.updatePatient(user.id, {
          ...(name      != null && { name }),
          ...(age       != null && { age }),
          ...(gender    != null && { gender }),
          ...(weight_kg != null && { weight_kg }),
          ...(height_cm != null && { height_cm }),
        })
        break
      }

      case 'add_vitals': {
        const { blood_pressure, pulse, spo2, blood_sugar, notes } = body
        await db.addVitals(user.id, { blood_pressure, pulse, spo2, blood_sugar, notes, source: 'onboarding' })
        break
      }

      case 'set_medical_history': {
        const { known_diseases = [], past_surgeries = [], allergies = [], family_history = [] } = body
        await db.updatePatient(user.id, {
          medical_history: { known_diseases, past_surgeries, allergies, family_history }
        })
        break
      }

      case 'add_medications': {
        const { medications = [] } = body
        for (const med of medications) {
          await db.addMedication(user.id, {
            medicine_name: med.name,
            dose:          med.dose ?? null,
            frequency:     med.frequency ?? null,
            since:         med.since ?? null,
          })
        }
        break
      }

      case 'add_symptoms': {
        const { symptoms = [] } = body
        for (const label of symptoms) {
          await db.addSymptom(user.id, { symptom_label: label, type: 'current' })
        }
        break
      }

      case 'mark_step': {
        const { step } = body
        if (step >= 1 && step <= 7) await db.markStepDone(user.id, step)
        break
      }

      case 'complete_onboarding': {
        await db.updatePatient(user.id, { onboarding_complete: 1, chat_ready: 1 })
        for (let s = 1; s <= 7; s++) {
          try { await db.markStepDone(user.id, s) } catch {}
        }
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    const profile = await db.getPatientFullProfile(user.id)
    return NextResponse.json({ ok: true, profile })

  } catch (err) {
    console.error('[patient API]', err)
    const msg = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
