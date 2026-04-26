export const runtime = 'nodejs'

import { createClient as createServerClientHelper } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

// ── Vitals extractor — regex-based, fast & accurate ───────────────────────────
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
  const wt = t.match(/\b(?:weight)[:\s]*([0-9]{2,3}(?:\.[0-9]?)?)\\s*kg\b/)

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

function formatDate(dateStr: string | null | undefined, fallback = '—'): string {
  if (!dateStr) return fallback
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return fallback }
}

function formatDateTime(dateStr: string | null | undefined, fallback = '—'): string {
  if (!dateStr) return fallback
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch { return fallback }
}

function relativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'unknown'
  try {
    const diff = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
    if (diff < 1) return 'today'
    if (diff < 2) return 'yesterday'
    return `${Math.floor(diff)} days ago`
  } catch { return 'unknown' }
}

// ── Build rich system prompt from patient context ─────────────────────────────
function buildSystemPrompt(profile: any): string {
  if (!profile) {
    return `You are Slyceai, the AI health assistant on the Arogya platform.
You are speaking with a patient. Be warm, clear, and professional.
Never be casual about health concerns. Never give a definitive diagnosis.
Always recommend consulting a doctor for serious concerns.`
  }

  const name = profile.name || 'Patient'
  const age = profile.age ?? '—'
  const gender = profile.gender || '—'
  const weight = profile.weight_kg ? `${profile.weight_kg} kg` : '—'
  const height = profile.height_cm ? `${profile.height_cm} cm` : '—'
  const bmi = profile.bmi ? `${profile.bmi} (${profile.bmiCategory})` : '—'
  const bloodGroup = profile.blood_group || 'Not recorded'
  const memberSince = formatDate(profile.created_at)

  const mh = profile.medical_history || {}
  const knownDiseases = (mh.known_diseases || []).join(', ') || 'None recorded'
  const allergies = (mh.allergies || []).join(', ') || 'None recorded'
  const pastSurgeries = (mh.past_surgeries || []).join(', ') || 'None'
  const familyHistory = (mh.family_history || []).join(', ') || 'Not recorded'

  const medications: any[] = profile.active_medications || []
  const medicationsText = medications.length
    ? medications.map((m: any) => {
      const lines = [`  • ${m.medicine_name}${m.dose ? ` ${m.dose}` : ''}${m.frequency ? ` (${m.frequency})` : ''}`]
      if (m.uses?.length) lines.push(`    Uses: ${m.uses.join(', ')}`)
      if (m.how_it_works) lines.push(`    Mechanism: ${m.how_it_works}`)
      if (m.side_effects_common?.length) lines.push(`    Common side effects: ${m.side_effects_common.join(', ')}`)
      if (m.side_effects_serious?.length) lines.push(`    Serious side effects: ${m.side_effects_serious.join(', ')}`)
      if (m.drug_interactions?.length) lines.push(`    Drug interactions: ${m.drug_interactions.join(', ')}`)
      if (m.what_to_avoid?.length) lines.push(`    What to avoid: ${m.what_to_avoid.join(', ')}`)
      return lines.join('\n')
    }).join('\n\n')
    : '  No medicines recorded'

  const drugInteractions: any[] = profile.drug_interactions || []
  const interactionsText = drugInteractions.length
    ? drugInteractions.map((i: any) => `  ⚠️ ${i.medicine_a} + ${i.medicine_b}: ${i.warning}`).join('\n')
    : '  No interactions detected between current medicines'

  // Symptoms from recent symptom journal
  const symptomsArr: string[] = profile.all_symptoms || []
  const symptomsText = symptomsArr.length
    ? symptomsArr.map((s: string) => `  - ${s}`).join('\n')
    : '  No current symptoms recorded'

  const v = profile.latest_vitals
  const bpStr = v?.bp_systolic && v?.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic} mmHg` : '—'
  const pulseStr = v?.pulse ? `${v.pulse} bpm` : '—'
  const spo2Str = v?.oxygen ? `${v.oxygen}%` : '—'
  const sugarStr = v?.blood_sugar ? `${v.blood_sugar} mg/dL` : '—'
  const tempStr = v?.temperature ? `${v.temperature}°F` : '—'
  const weightVStr = v?.weight_kg ? `${v.weight_kg} kg` : '—'
  const vitalsDate = v ? formatDateTime(v.recorded_at) : null
  const vitalsAge = v ? relativeTime(v.recorded_at) : null
  const vitalsOld = v ? (Date.now() - new Date(v.recorded_at).getTime()) / (1000 * 60 * 60 * 24) > 3 : false

  const vitalsHistText = (profile.vitals_history || []).slice(0, 7).map((h: any) =>
    `  ${formatDate(h.recorded_at)}: BP ${h.bp_systolic}/${h.bp_diastolic}, Pulse ${h.pulse}, SpO₂ ${h.oxygen}%`
  ).join('\n') || '  No history available'

  return `You are Slyceai, the AI health assistant on the Arogya platform.
You are speaking with a real patient who may be dealing with serious health conditions.
Be warm, clear, and professional. Never be casual about health concerns.
You already have this patient's full health profile — use it to personalise every response.
NEVER ask the patient to repeat information already in their profile below.

━━━ PATIENT PROFILE ━━━
Name: ${name}
Age: ${age} years | Gender: ${gender}
Weight: ${weight} | Height: ${height}
BMI: ${bmi}
Blood group: ${bloodGroup}
Member since: ${memberSince}

━━━ MEDICAL CONDITIONS ━━━
Known conditions: ${knownDiseases}
Past surgeries: ${pastSurgeries}
Allergies: ${allergies}
Family history: ${familyHistory}

━━━ CURRENT MEDICATIONS ━━━
${medicationsText}

━━━ DRUG INTERACTION ALERTS ━━━
${interactionsText}

━━━ CURRENT SYMPTOMS ━━━
${symptomsText}

━━━ LATEST VITALS ━━━
${v ? `Blood pressure: ${bpStr}
Pulse: ${pulseStr}
SpO2: ${spo2Str}
Blood sugar: ${sugarStr}
Temperature: ${tempStr}
Weight: ${weightVStr}
Recorded: ${vitalsDate} (${vitalsAge})` : 'No vitals recorded yet'}
${vitalsOld ? `\n⚠️ Note: Vitals from ${vitalsDate} — consider logging fresh readings for more accurate advice.` : ''}

━━━ VITALS TREND (last 7 readings) ━━━
${vitalsHistText}

━━━ YOUR RULES ━━━
1. Use the patient's name naturally in responses — warmly, not every message
2. ALWAYS cross-reference current medications before suggesting any new medicine
3. If a symptom matches a red_flag condition, prioritize it and recommend immediate doctor consultation
4. If you detect a drug interaction in their current medicines, proactively mention it
5. Never give a definitive diagnosis — always say "this could indicate" or "this suggests"
6. Always end serious health answers with: "Please consult your doctor to confirm this."
7. If the patient writes in Hindi or Hinglish, respond in the same language
8. Keep responses focused — 3-5 sentences for simple questions, detailed for complex ones
9. For Ayurvedic questions: mention if any Ayurvedic herb interacts with current medicines
10. Never suggest stopping or changing prescription medicines — always say "discuss with your doctor before changing any prescribed medicine"
11. This is a medical platform — be precise, not casual. Lives depend on accuracy.
12. Never ask for information already in the profile above.`
}

export async function POST(request: NextRequest) {
  const supabase = await createServerClientHelper()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, sessionId } = await request.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

  // ── STEP 1: Extract vitals from message ──────────────────────────────────
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
        vitalsSavedNote = `\n\n[SYSTEM NOTE: The patient just shared vitals in this message. You have ALREADY saved these to their profile: ${desc}. Acknowledge that you saved them and provide a clinical comment on the values.]`
        console.log('[Chat] Vitals auto-saved from chat:', desc)
      }
    } catch (vitalsErr) {
      console.error('[Chat] Vitals save failed:', vitalsErr)
    }
  }

  // ── STEP 2: Load full patient context & build system prompt ───────────────
  let arogyaProfile: any = null
  try {
    arogyaProfile = await db.getPatientFullProfile(user.id)
    console.log(`[Chat] Patient context loaded for ${arogyaProfile?.name || user.id}`)
  } catch (err) {
    console.error('[Chat] Failed to load patient profile:', err)
  }

  // Fetch last 15 messages for conversation continuity
  const { data: history } = await supabase
    .from('chat_history').select('role, content')
    .eq('user_id', user.id).eq('session_id', sessionId)
    .order('created_at', { ascending: false }).limit(15)

  const systemPrompt = buildSystemPrompt(arogyaProfile) + vitalsSavedNote

  const messages = [
    ...(history ?? []).reverse().map((m: any) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  // ── STEP 3: Call AI ───────────────────────────────────────────────────────
  try {
    const response = await ai.chat(messages, systemPrompt, { maxTokens: 1024 })

    await supabase.from('chat_history').insert([
      { user_id: user.id, session_id: sessionId, role: 'user', content: message },
      { user_id: user.id, session_id: sessionId, role: 'assistant', content: response.content },
    ])

    return NextResponse.json({ content: response.content, usage: response.usage })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error'
    console.error('[Chat] AI call error:', err)
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
