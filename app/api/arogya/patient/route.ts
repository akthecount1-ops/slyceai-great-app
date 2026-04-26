export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

function getOrCreatePatient(userId: string, supaName?: string) {
  let patient = db.getPatient(userId)
  if (!patient) {
    patient = db.createPatient({
      patient_id: userId,
      name: supaName ?? null,
      onboarding_complete: 0,
      chat_ready: 0,
    })
    db.getOnboardingProgress(userId) // initialize row
  }
  return patient
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: supaProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  getOrCreatePatient(user.id, supaProfile?.name)

  const profile = db.getPatientFullProfile(user.id)
  return NextResponse.json({ profile })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  const { data: supaProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
  getOrCreatePatient(user.id, supaProfile?.name)

  try {
    switch (action) {

      case 'update_patient': {
        // Update basic demographics
        const { name, age, gender, weight_kg, height_cm } = body
        db.updatePatient(user.id, {
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
        db.addVitals(user.id, { blood_pressure, pulse, spo2, blood_sugar, notes, source: 'onboarding' })
        break
      }

      case 'set_medical_history': {
        // Upsert into patient_medical_history
        const sqliteDb = db.getDb()
        const existing = sqliteDb.prepare('SELECT id FROM patient_medical_history WHERE patient_id = ?').get(user.id)
        const { known_diseases = [], past_surgeries = [], allergies = [], family_history = [] } = body
        if (existing) {
          sqliteDb.prepare(`
            UPDATE patient_medical_history
            SET known_diseases = ?, past_surgeries = ?, allergies = ?, family_history = ?, updated_at = datetime('now')
            WHERE patient_id = ?
          `).run(
            JSON.stringify(known_diseases),
            JSON.stringify(past_surgeries),
            JSON.stringify(allergies),
            JSON.stringify(family_history),
            user.id
          )
        } else {
          sqliteDb.prepare(`
            INSERT INTO patient_medical_history (patient_id, known_diseases, past_surgeries, allergies, family_history)
            VALUES (?, ?, ?, ?, ?)
          `).run(
            user.id,
            JSON.stringify(known_diseases),
            JSON.stringify(past_surgeries),
            JSON.stringify(allergies),
            JSON.stringify(family_history),
          )
        }
        break
      }

      case 'add_medications': {
        // Replace all current onboarding medications
        const sqliteDb = db.getDb()
        const { medications = [] } = body
        // Deactivate previous onboarding meds
        sqliteDb.prepare(`UPDATE patient_medications SET active = 0 WHERE patient_id = ? AND since IS NOT NULL`).run(user.id)
        for (const med of medications) {
          db.addMedication(user.id, {
            medicine_name: med.name,
            dose:          med.dose ?? null,
            frequency:     med.frequency ?? null,
            since:         med.since ?? null,
          })
        }
        break
      }

      case 'add_symptoms': {
        const { symptoms = [], type = 'current', severity, duration } = body
        const sqliteDb = db.getDb()
        // Clear previous symptoms of this type
        sqliteDb.prepare(`
          UPDATE patient_symptoms SET resolved_at = datetime('now')
          WHERE patient_id = ? AND type = ? AND resolved_at IS NULL
        `).run(user.id, type)
        for (const label of symptoms) {
          db.addSymptom(user.id, {
            symptom_label: label,
            type,
            severity: severity ?? null,
            duration: duration ?? null,
          })
        }
        break
      }

      case 'mark_step': {
        const { step } = body
        if (step >= 1 && step <= 7) db.markStepDone(user.id, step)
        break
      }

      case 'complete_onboarding': {
        db.updatePatient(user.id, { onboarding_complete: 1, chat_ready: 1 })
        // Mark all steps done
        for (let s = 1; s <= 7; s++) {
          try { db.markStepDone(user.id, s) } catch {}
        }
        break
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
    }

    const profile = db.getPatientFullProfile(user.id)
    return NextResponse.json({ ok: true, profile })

  } catch (err) {
    console.error('[patient API]', err)
    const msg = err instanceof Error ? err.message : 'DB error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
