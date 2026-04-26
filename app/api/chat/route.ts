export const runtime = 'nodejs'

import { createClient as createServerClientHelper } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

type MedRow = { medicine_name: string; dose: string | null; frequency: string | null; slug?: string }

// ── Vitals extractor — regex-based, fast & accurate ──────────────
interface ExtractedVitals {
  bp_systolic: number | null
  bp_diastolic: number | null
  pulse: number | null
  oxygen: number | null
  blood_sugar: number | null
  temperature: number | null
  weight_kg: number | null
}

function extractVitalsFromMessage(msg: string): ExtractedVitals | null {
  const t = msg.toLowerCase()
  const bp = t.match(/\b(?:bp|blood\s*pressure)[:\s]*([0-9]{2,3})[/\\s]+([0-9]{2,3})\b/)
  const pulse = t.match(/\b(?:pulse|heart\s*rate|hr)[:\s]*([0-9]{2,3})\b/)
  const spo2 = t.match(/\bsp?o2[:\s]*([0-9]{2,3})\b/)
  const sugar = t.match(/\b(?:sugar|blood\s*sugar|glucose)[:\s]*([0-9]{2,4})\b/)
  const temp = t.match(/\b(?:temp(?:erature)?)[:\s]*([0-9]{2,3}(?:\.[0-9])?)\b/)
  const wt = t.match(/\b(?:weight)[:\s]*([0-9]{2,3}(?:\.[0-9]?)?)\s*kg\b/)

  if (!bp && !pulse && !spo2 && !sugar && !temp && !wt) return null

  return {
    bp_systolic: bp ? parseInt(bp[1]) : null,
    bp_diastolic: bp ? parseInt(bp[2]) : null,
    pulse: pulse ? parseInt(pulse[1]) : null,
    oxygen: spo2 ? parseFloat(spo2[1]) : null,
    blood_sugar: sugar ? parseFloat(sugar[1]) : null,
    temperature: temp ? parseFloat(temp[1]) : null,
    weight_kg: wt ? parseFloat(wt[1]) : null,
  }
}

function describeExtractedVitals(v: ExtractedVitals): string {
  const parts: string[] = []
  if (v.bp_systolic && v.bp_diastolic) parts.push(`BP ${v.bp_systolic}/${v.bp_diastolic}`)
  if (v.pulse) parts.push(`Pulse ${v.pulse} bpm`)
  if (v.oxygen) parts.push(`SpO₂ ${v.oxygen}%`)
  if (v.blood_sugar) parts.push(`Blood sugar ${v.blood_sugar} mg/dL`)
  if (v.temperature) parts.push(`Temperature ${v.temperature}°C`)
  if (v.weight_kg) parts.push(`Weight ${v.weight_kg} kg`)
  return parts.join(', ')
}

async function buildSystemPrompt(
  profile: any,
  supaProfile: any
): Promise<string> {
  const name = profile?.name || supaProfile?.name || 'Patient'
  const age = profile?.age || '—'
  const gender = profile?.gender || '—'
  const weight = profile?.weight_kg || '—'
  const height = profile?.height_cm || '—'
  const blood_group = profile?.blood_group || '—'
  const known_diseases = (profile?.medical_history?.known_diseases || []).join(', ') || 'None'
  const medications = (profile?.active_medications || []) as MedRow[]
  const medications_list = medications.length
    ? medications.map(m => `${m.medicine_name}${m.dose ? ` ${m.dose}` : ''}${m.frequency ? ` (${m.frequency})` : ''}`).join(', ')
    : 'None'

  const journal = profile?.recent_symptoms ?? []
  const current_symptoms = journal.length
    ? [...new Set(journal.flatMap((j: any) => j.symptoms || []))].join(', ')
    : 'None reported'

  const v = profile?.latest_vitals
  const bp = v ? `${v.bp_systolic}/${v.bp_diastolic}` : '—'
  const pulse = v ? `${v.pulse} bpm` : '—'
  const spo2 = v ? `${v.oxygen}%` : '—'
  const blood_sugar = v ? `${v.blood_sugar} mg/dL` : '—'
  const vitals_date = v ? new Date(v.recorded_at).toLocaleDateString('en-IN') : 'None recorded'

  return `You are Slyceai, a warm and knowledgeable AI health assistant on the Arogya platform.
You already have this patient's full health profile — use it silently to personalise
every response. Never ask the patient to repeat information that is already in their profile.

PATIENT PROFILE:
Name: ${name}
Age: ${age} | Gender: ${gender} | Weight: ${weight}kg | Height: ${height}cm
Blood group: ${blood_group}
Known conditions: ${known_diseases}
Current medications: ${medications_list}
Active symptoms: ${current_symptoms}
Latest vitals: BP ${bp}, Pulse ${pulse}, SpO2 ${spo2}, Sugar ${blood_sugar}
Last vitals logged: ${vitals_date}

MEDICINE KNOWLEDGE:
You have access to detailed information about all medicines in this patient's profile.
For each medicine, you know: uses, mechanism, side effects, drug interactions, 
contraindications, and what to avoid.
Cross-reference this when answering questions about medicines.

SYMPTOM KNOWLEDGE:
You have the patient's symptom history and a medical symptom database.
If a patient describes a red-flag symptom, recommend immediate medical attention.

RULES:
1. Never give a definitive diagnosis
2. Always recommend consulting a doctor for serious concerns
3. Be warm, clear, and use simple language (many patients are elderly or non-technical)
4. If the patient writes in Hindi, respond fully in Hindi
5. If asked about medicines, always mention interactions with their current medicines
6. Keep responses concise — 3-4 sentences max unless the patient asks for detail
7. Never ask for information already in the profile above
8. If vitals are more than 3 days old, you may gently mention it once per session`
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClientHelper()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, sessionId } = await request.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

  // ── STEP 1: Extract vitals from message ──────────────────────
  let vitalsSavedNote = ''
  const extractedVitals = extractVitalsFromMessage(message)
  if (extractedVitals) {
    try {
      const insertRow: Record<string, unknown> = {
        user_id: user.id,
        recorded_at: new Date().toISOString(),
      }
      if (extractedVitals.bp_systolic) insertRow.bp_systolic = extractedVitals.bp_systolic
      if (extractedVitals.bp_diastolic) insertRow.bp_diastolic = extractedVitals.bp_diastolic
      if (extractedVitals.pulse) insertRow.pulse = extractedVitals.pulse
      if (extractedVitals.oxygen) insertRow.oxygen = extractedVitals.oxygen
      if (extractedVitals.blood_sugar) insertRow.blood_sugar = extractedVitals.blood_sugar
      if (extractedVitals.temperature) insertRow.temperature = extractedVitals.temperature
      if (extractedVitals.weight_kg) insertRow.weight_kg = extractedVitals.weight_kg

      const { error: vitalsErr } = await supabase.from('vitals').insert(insertRow)
      if (!vitalsErr) {
        const desc = describeExtractedVitals(extractedVitals)
        vitalsSavedNote = `\n\n[SYSTEM NOTE: The patient just shared vitals in this message. You have ALREADY saved these to their profile: ${desc}. Acknowledge that you saved them and comment on the values in your response.]`
        console.log('Vitals auto-saved from chat:', desc)
      }
    } catch (vitalsErr) {
      console.error('Vitals save failed:', vitalsErr)
    }
  }

  // ── STEP 2: Load context + build system prompt ───────────────
  // Chat history from Supabase
  const { data: history } = await supabase
    .from('chat_history').select('role, content')
    .eq('user_id', user.id).eq('session_id', sessionId)
    .order('created_at', { ascending: false }).limit(12)

  // Load Supabase profile (food_preference, location, allergies)
  const { data: supaProfile } = await supabase
    .from('profiles')
    .select('name, gender, food_preference, allergies, state, region')
    .eq('id', user.id).single()

  // Load full profile from Supabase
  const arogyaProfile = await db.getPatientFullProfile(user.id)

  const systemPrompt = (await buildSystemPrompt(arogyaProfile, supaProfile)) + vitalsSavedNote

  const messages = [
    ...(history ?? []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  // ── STEP 3: Call AI ──────────────────────────────────────────
  try {
    const response = await ai.chat(messages, systemPrompt)

    await supabase.from('chat_history').insert([
      { user_id: user.id, session_id: sessionId, role: 'user', content: message },
      { user_id: user.id, session_id: sessionId, role: 'assistant', content: response.content },
    ])

    return NextResponse.json({ content: response.content, usage: response.usage })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error'
    console.error('Chat error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClientHelper()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
  try {
    await supabase.from('chat_history').delete().eq('user_id', user.id).eq('session_id', sessionId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 })
  }
}
