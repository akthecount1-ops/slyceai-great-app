export const runtime = 'nodejs'

import { createClient as createServerClientHelper } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

type MedRow = { medicine_name: string; dose: string | null; frequency: string | null }

function buildSystemPrompt(
  profile: ReturnType<typeof db.getPatientFullProfile>,
  supaProfile: { name?: string; gender?: string; food_preference?: string; allergies?: string[]; state?: string; region?: string } | null
): string {
  if (!profile) {
    return `You are Slyceai, a compassionate AI health assistant for Indian users. Be warm, empathetic, and culturally aware. Never diagnose definitively. Always recommend consulting a doctor for serious symptoms.`
  }

  const mh   = profile.medical_history
  const v    = profile.latest_vitals
  const meds = (profile.active_medications ?? []) as MedRow[]

  // Pull current and past symptoms from DB
  const sqliteDb = db.getDb()
  const allSx = sqliteDb.prepare(
    'SELECT symptom_id, symptom_label, type, severity, duration FROM patient_symptoms WHERE patient_id = ? AND resolved_at IS NULL ORDER BY recorded_at DESC'
  ).all(profile.patient_id) as Array<{ symptom_id: string | null; symptom_label: string; type: string; severity: string | null; duration: string | null }>

  const currSx  = allSx.filter(s => s.type === 'current')
  const pastSx  = allSx.filter(s => s.type === 'past')

  const vitalsStr = v
    ? `BP ${v.blood_pressure ?? '—'}, Pulse ${v.pulse ?? '—'} bpm, SpO₂ ${v.spo2 ?? '—'}%, Blood Sugar ${v.blood_sugar ?? '—'} mg/dL`
    : 'Not recorded'

  // Enrich medications from Knowledge Base
  let kbContext = ''
  if (meds.length > 0) {
    const medSlugs = meds.map((m: any) => m.medicine_slug).filter(Boolean)
    const activeMedDetails = medSlugs.map(slug => db.getMedicineBySlug(slug)).filter(Boolean)
    
    // Check drug interactions from KB
    const interactions = db.getMedicineInteractions(medSlugs)
    if (interactions.length > 0) {
      kbContext += `\n[WARNING] Potential Drug Interactions detected in patient's active meds:\n`
      interactions.forEach((i: any) => {
        kbContext += `- Between ${i.medicine_a} and ${i.medicine_b}: ${i.interactions.join('; ')}\n`
      })
    }
    
    // Add known side effects of their drugs
    activeMedDetails.forEach((m: any) => {
      kbContext += `\nMedicine KB for ${m.name}:\n`
      if (m.side_effects_common?.length) kbContext += `- Common side ex: ${m.side_effects_common.join(', ')}\n`
      if (m.food_interactions?.length) kbContext += `- Food to avoid: ${m.food_interactions.join(', ')}\n`
    })
  }

  // Enrich symptoms from Knowledge Base
  if (currSx.length > 0) {
    const activeSxDetails = currSx.map(s => s.symptom_id ? db.getSymptomById(s.symptom_id) : null).filter(Boolean)
    activeSxDetails.forEach((sx: any) => {
      kbContext += `\nSymptom KB for ${sx.label}:\n`
      if (sx.red_flag) kbContext += `- [RED FLAG WARNING] This is marked as a critical symptom. Always advise medical attention.\n`
      if (sx.commonly_associated_diseases?.length) kbContext += `- Associated diseases: ${sx.commonly_associated_diseases.join(', ')}\n`
      if (sx.follow_up_questions?.length) kbContext += `- AI should ask: ${sx.follow_up_questions.slice(0,2).join(' or ')}\n`
    })
  }

  const medsStr = meds.length
    ? meds.map(m => `${m.medicine_name}${m.dose ? ` ${m.dose}` : ''}${m.frequency ? ` (${m.frequency})` : ''}`).join(', ')
    : 'None'

  const diseases   = (mh?.known_diseases ?? []).join(', ') || 'None reported'
  const allergies  = (mh?.allergies ?? []).join(', ') || supaProfile?.allergies?.join(', ') || 'None known'
  const currSxStr  = currSx.length ? currSx.map(s => `${s.symptom_label}${s.severity ? ` (${s.severity})` : ''}${s.duration ? ` for ${s.duration}` : ''}`).join(', ') : 'None reported'
  const pastSxStr  = pastSx.length ? pastSx.map(s => s.symptom_label).join(', ') : 'None reported'

  return `You are Slyceai, an empathetic AI health assistant on the Arogya platform.

Patient Profile:
- Name: ${profile.name ?? supaProfile?.name ?? 'Patient'}, Age: ${profile.age ?? '—'}, Gender: ${profile.gender ?? supaProfile?.gender ?? '—'}, Weight: ${profile.weight_kg ?? '—'} kg, Height: ${profile.height_cm ?? '—'} cm
- Known conditions: ${diseases}
- Allergies: ${allergies}
- Current medications: ${medsStr}
- Current symptoms: ${currSxStr}
- Past symptoms: ${pastSxStr}
- Latest vitals: ${vitalsStr}
- Diet: ${supaProfile?.food_preference ?? 'Not specified'}, Location: ${supaProfile?.state ?? supaProfile?.region ?? 'India'}

${kbContext ? `\n--- KNOWN MEDICINE INTERACTIONS & PRECAUTIONS ---\nThe following matches were found in our clinical Knowledge Base for the patient's current medications:${kbContext}\n----------------------------------------------\n` : ''}

Instructions:
- You have FULL context on this patient — NEVER ask for info already in their profile.
- Always personalise responses based on their conditions, medications, and symptoms.
- If the patient asks about side effects or their symptoms match known side effects from the Knowledge Base above, point it out.
- Reference Indian dietary practices and Ayurvedic wisdom alongside modern medicine where appropriate.
- Never diagnose definitively. For serious symptoms, always recommend consulting a doctor.
- If asked about drug interactions, check the Knowledge Base section provided above against their current medication list.
- Respond in the language the patient uses (Hindi or English).
- Be warm, concise, and use bullet points for clarity.`
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClientHelper()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, sessionId } = await request.json()
  if (!message)   return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

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

  // Load full SQLite profile
  const arogyaProfile = db.getPatientFullProfile(user.id)

  const systemPrompt = buildSystemPrompt(arogyaProfile, supaProfile)

  const messages = [
    ...(history ?? []).reverse().map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  try {
    const response = await ai.chat(messages, systemPrompt)

    await supabase.from('chat_history').insert([
      { user_id: user.id, session_id: sessionId, role: 'user',      content: message },
      { user_id: user.id, session_id: sessionId, role: 'assistant', content: response.content },
    ])

    return NextResponse.json({ content: response.content, usage: response.usage })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error'
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
