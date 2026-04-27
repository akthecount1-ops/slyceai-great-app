export const runtime = 'nodejs'

import { createClient as createServerClientHelper } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// ─────────────────────────────────────────────────────────────────────────────
// DATA LAYER  (server/db.js via require — Next.js server only)
// ─────────────────────────────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
interface ExtractedVitals {
  bp_systolic: number | null
  bp_diastolic: number | null
  pulse: number | null
  oxygen: number | null
  blood_sugar: number | null
  temperature: number | null
  weight_kg: number | null
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES — date / time
// Inspired by Claude Code's context.ts which always injects `currentDate`
// into getUserContext so the model never claims ignorance of the date.
// ─────────────────────────────────────────────────────────────────────────────

/** Returns current IST time, e.g. "Monday, 28 Apr 2026, 10:32 AM IST" */
function getCurrentISTDateTime(): string {
  return (
    new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }) + ' IST'
  )
}

function fmtDate(d: string | null | undefined, fb = '-'): string {
  if (!d) return fb
  try {
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    })
  } catch { return fb }
}

function fmtDateTime(d: string | null | undefined, fb = '-'): string {
  if (!d) return fb
  try {
    const dt = new Date(d)
    return (
      dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ', ' +
      dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
    )
  } catch { return fb }
}

function relTime(d: string | null | undefined): string {
  if (!d) return 'unknown'
  try {
    const days = (Date.now() - new Date(d).getTime()) / 86_400_000
    if (days < 1) return 'today'
    if (days < 2) return 'yesterday'
    return `${Math.floor(days)} days ago`
  } catch { return 'unknown' }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES — vitals extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractVitalsFromMessage(msg: string): ExtractedVitals | null {
  const t = msg.toLowerCase()
  const bp = t.match(/\b(?:bp|blood\s*pressure)[:\s]*([0-9]{2,3})[/\s]+([0-9]{2,3})\b/)
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
  const p: string[] = []
  if (v.bp_systolic && v.bp_diastolic) p.push(`BP ${v.bp_systolic}/${v.bp_diastolic}`)
  if (v.pulse) p.push(`Pulse ${v.pulse} bpm`)
  if (v.oxygen) p.push(`SpO2 ${v.oxygen}%`)
  if (v.blood_sugar) p.push(`Blood sugar ${v.blood_sugar} mg/dL`)
  if (v.temperature) p.push(`Temperature ${v.temperature}°F`)
  if (v.weight_kg) p.push(`Weight ${v.weight_kg} kg`)
  return p.join(', ')
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES — per-session staleness nudge (fires once)
// ─────────────────────────────────────────────────────────────────────────────

const _sessionVitalsMentioned = new Map<string, boolean>()

function getVitalsStalenessNote(latestVitals: any, sessionId: string): string {
  if (!latestVitals || _sessionVitalsMentioned.get(sessionId)) return ''
  const days = Math.floor(
    (Date.now() - new Date(latestVitals.recorded_at).getTime()) / 86_400_000,
  )
  if (days >= 3) {
    _sessionVitalsMentioned.set(sessionId, true)
    return (
      '\n\n[CONTEXT: Vitals are ' + days + ' days old.' +
      ' If relevant, mention once: "Your last vitals were ' + days + ' days ago — fresh readings help me give more precise guidance."]'
    )
  }
  return ''
}

// ─────────────────────────────────────────────────────────────────────────────
// WEB SEARCH  (Anthropic SDK, non-blocking) & KNOWLEDGE BASE SEARCH
// ─────────────────────────────────────────────────────────────────────────────

const SEARCH_TRIGGERS = [
  'latest', 'recent', 'new research', 'current treatment',
  'best medicine for', 'is there a cure', 'new drug', 'clinical trial',
  'ayurvedic remedy for', 'home remedy', 'what causes', 'how to treat',
  'can i take', 'is it safe', 'natural treatment', 'alternative medicine',
]

function shouldSearch(message: string): boolean {
  const l = message.toLowerCase()
  return SEARCH_TRIGGERS.some(s => l.includes(s))
}

async function searchKnowledgeBase(message: string, supabase: any): Promise<string> {
  try {
    const lmsg = message.toLowerCase();
    const words = lmsg.split(/\s+/).filter(w => w.length > 3);

    // Quick search against kb_symptoms and kb_medicines
    const matchTerms = words.join(' | ');
    let contextParts = [];

    // Search Medicines
    const { data: meds } = await supabase
      .from('kb_medicines')
      .select('name, uses, side_effects_common, how_it_works, generic_name')
      .textSearch('name', matchTerms, { config: 'english' })
      .limit(3);

    if (meds && meds.length > 0) {
      contextParts.push('Medicine Info from DB: ' + meds.map((m: any) =>
        `[${m.name} (${m.generic_name})]: ${m.how_it_works} Uses: ${m.uses.join(',')} SE: ${m.side_effects_common.join(',')}`
      ).join('\n'));
    }

    if (contextParts.length > 0) {
      console.log('[Chat] Internal KB search found items:', meds?.length || 0);
      return '\n\nINTERNAL DATABASE KNOWLEDGE:\n' + contextParts.join('\n');
    }
  } catch (err) {
    console.error('[Chat] Internal KB search err:', err);
  }
  return '';
}

async function performWebSearch(message: string, profile: any): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return ''
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey })
    const condition = profile?.medical_history?.known_diseases?.[0] || ''
    const meds = (profile?.active_medications || [])
      .map((m: any) => m.generic_name || m.medicine_name).join(', ')
    const query = message +
      (condition ? ' for patient with ' + condition : '') +
      ' India treatment 2025'

    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 600,
      tools: [{ type: 'web_search_20250305' as any, name: 'web_search' }],
      messages: [{
        role: 'user',
        content: (
          'Search: "' + query + '". ' +
          'Patient: ' + (condition ? 'has ' + condition : 'general') + ', ' +
          'on: ' + (meds || 'none') + '. ' +
          'Return evidence-based findings in 2-3 paragraphs. India-focused.'
        ),
      }],
    })

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n').trim()

    if (!text) return ''
    console.log('[Chat] Web search:', text.length, 'chars')
    return '\n\nRELEVANT RESEARCH (cite naturally as "recent research suggests..."):\n' + text
  } catch (err) {
    console.error('[Chat] Web search failed (non-fatal):', err instanceof Error ? err.message : err)
    return ''
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE AUDIT
// ─────────────────────────────────────────────────────────────────────────────

function auditResponse(response: string, userMessage: string): void {
  const issues: string[] = []
  const disclaimers = (response.match(/consult.*doctor|see.*doctor|visit.*doctor/gi) || []).length
  if (disclaimers > 2) issues.push('TOO_MANY_DISCLAIMERS')
  for (const phrase of [
    'I cannot provide medical advice',
    'as an AI I cannot',
    'I am not able to answer medical',
  ]) {
    if (response.toLowerCase().includes(phrase.toLowerCase()))
      issues.push('HARD_DEFLECTION:' + phrase.slice(0, 30))
  }
  const isSymptom = /pain|feeling|symptom|ache|hurt|burning|swelling|nausea|discomfort/i.test(userMessage)
  if (isSymptom && response.length < 300) issues.push('TOO_SHORT_FOR_SYMPTOM')
  if (issues.length) console.log('[RESPONSE_QUALITY]', issues, '| msg:', userMessage.slice(0, 60))
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM PROMPT BUILDER
//
// Architecture borrowed from Claude Code's constants/prompts.ts:
//   • Each section is an array of strings joined with '\n'
//   • Sections are composed in order and joined — no template-literal nesting
//   • "Static" data (persona, rules) comes first; "dynamic" data (patient,
//     date, vitals) is clearly separated so it is easy to update.
//   • Date is ALWAYS injected first — the model must never claim ignorance.
// ─────────────────────────────────────────────────────────────────────────────

function section(title: string, lines: string[]): string {
  return ['=== ' + title + ' ===', ...lines].join('\n')
}

function buildSystemPrompt(profile: any, currentDateTime: string): string {
  // ── 1. Identity + Date (ALWAYS first — model must know date) ──────────────
  const identity = section('SLYCEAI IDENTITY', [
    'You are Slyceai, the AI health companion on the Arogya platform.',
    '',
    'TODAY\'S DATE AND TIME (India, IST): ' + currentDateTime,
    'You KNOW today\'s date and time — ALWAYS answer date/day/time questions directly using this.',
    '',
    'You are not a generic chatbot.',
    'You are the most knowledgeable, warm, and precise health companion a patient in India has ever spoken to.',
    'Your patients deal with real pain — chronic conditions, undiagnosed symptoms, medication confusion,',
    'fear, and frustration from years of being dismissed. Many have never had anyone fully explain their',
    'condition. Your job is to change that.',
  ])

  // ── 2. Patient Profile ─────────────────────────────────────────────────────
  let patientSection = section('PATIENT PROFILE', [
    'No profile loaded — ask warmly what the patient is experiencing and provide your best clinical guidance.',
  ])

  if (profile) {
    const name = profile.name || 'Patient'
    const age = profile.age ?? '-'
    const gender = profile.gender || '-'
    const weight = profile.weight_kg ? profile.weight_kg + ' kg' : '-'
    const height = profile.height_cm ? profile.height_cm + ' cm' : '-'
    const bmi = profile.bmi ? profile.bmi + ' (' + profile.bmiCategory + ')' : '-'
    const blood = profile.blood_group || 'Not recorded'
    const since = fmtDate(profile.created_at)
    const mh = profile.medical_history || {}
    const diseases = (mh.known_diseases || []).join(', ') || 'None recorded'
    const allergies = (mh.allergies || []).join(', ') || 'None recorded'
    const surgeries = (mh.past_surgeries || []).join(', ') || 'None'
    const family = (mh.family_history || []).join(', ') || 'Not recorded'

    const meds: any[] = profile.active_medications || []
    const medsText = meds.length === 0
      ? '  (No medicines recorded)'
      : meds.map((m: any) => {
        const lines = ['  * ' + m.medicine_name + (m.dose ? ' ' + m.dose : '') + (m.frequency ? ' (' + m.frequency + ')' : '')]
        if (m.generic_name) lines.push('    Generic: ' + m.generic_name)
        if (m.uses?.length) lines.push('    Uses: ' + m.uses.join(', '))
        if (m.how_it_works) lines.push('    Works by: ' + m.how_it_works)
        if (m.side_effects_common?.length) lines.push('    Common SE: ' + m.side_effects_common.join(', '))
        if (m.side_effects_serious?.length) lines.push('    Serious SE: ' + m.side_effects_serious.join(', '))
        if (m.drug_interactions?.length) lines.push('    Interactions: ' + m.drug_interactions.join(', '))
        if (m.what_to_avoid?.length) lines.push('    Avoid: ' + m.what_to_avoid.join(', '))
        return lines.join('\n')
      }).join('\n\n')

    const interactions: any[] = profile.drug_interactions || []
    const interText = interactions.length === 0
      ? '  No interactions detected'
      : interactions.map((i: any) => '  ALERT: ' + i.medicine_a + ' + ' + i.medicine_b + ': ' + i.warning).join('\n')

    const symptoms: string[] = profile.all_symptoms || []
    const sympText = symptoms.length === 0
      ? '  (No symptoms recorded)'
      : symptoms.map((s: string) => '  - ' + s).join('\n')

    const v = profile.latest_vitals
    const vitalsBlock = v ? [
      'Blood pressure: ' + (v.bp_systolic && v.bp_diastolic ? v.bp_systolic + '/' + v.bp_diastolic + ' mmHg' : '-'),
      'Pulse:          ' + (v.pulse ? v.pulse + ' bpm' : '-'),
      'SpO2:           ' + (v.oxygen ? v.oxygen + '%' : '-'),
      'Blood sugar:    ' + (v.blood_sugar ? v.blood_sugar + ' mg/dL' : '-'),
      'Temperature:    ' + (v.temperature ? v.temperature + ' F' : '-'),
      'Weight:         ' + (v.weight_kg ? v.weight_kg + ' kg' : '-'),
      'Recorded:       ' + fmtDateTime(v.recorded_at) + ' (' + relTime(v.recorded_at) + ')',
    ].join('\n') : 'No vitals logged yet — patient has not recorded any readings'

    const histText = (profile.vitals_history || []).slice(0, 7)
      .map((h: any) =>
        '  ' + fmtDate(h.recorded_at) +
        ': BP ' + h.bp_systolic + '/' + h.bp_diastolic +
        ', Pulse ' + h.pulse +
        ', SpO2 ' + h.oxygen + '%'
      ).join('\n') || '  (No history)'

    patientSection = [
      section('PATIENT PROFILE', [
        'Name: ' + name,
        'Age: ' + age + ' | Gender: ' + gender,
        'Weight: ' + weight + ' | Height: ' + height,
        'BMI: ' + bmi + ' | Blood group: ' + blood,
        'Member since: ' + since,
        '',
        'Known conditions: ' + diseases,
        'Past surgeries:   ' + surgeries,
        'Allergies:        ' + allergies,
        'Family history:   ' + family,
      ]),
      '',
      section('CURRENT MEDICATIONS', [medsText]),
      '',
      section('DRUG INTERACTION ALERTS', [interText]),
      '',
      section('CURRENT SYMPTOMS (from health journal)', [sympText]),
      '',
      section('LATEST VITALS (loaded from database)', [vitalsBlock]),
      '',
      section('VITALS TREND (last 7 readings)', [histText]),
    ].join('\n')
  }

  // ── 3. Critical data-access rules ─────────────────────────────────────────
  // Directly mirrors Claude Code's approach of injecting explicit context
  // rules so the model doesn't claim it lacks data it was given.
  const dataAccess = section('CRITICAL — DATA YOU ALREADY HAVE', [
    'All sections above were loaded from the patient\'s database BEFORE this conversation.',
    '',
    '[DATE]    It is ' + currentDateTime + '.',
    '          NEVER say you do not know the date/time. Answer directly.',
    '',
    '[VITALS]  These readings come directly from the patient database.',
    '          NEVER say "I don\'t have access to your vitals" — that is false.',
    '          NEVER ask the patient to share vitals you already have above.',
    '          If no vitals are logged, say: "You haven\'t logged any vitals yet."',
    '          NOT: "I cannot access your vitals."',
    '',
    '[MEDS]    Full medication list with mechanisms, side effects, interactions — use it.',
    '',
    '[PROFILE] Conditions, symptoms, history, allergies — all loaded. Use them.',
    '',
    'If any field shows "-" or "None recorded" it means the patient has not entered that data.',
    'Say so naturally — do NOT claim it is a system limitation.',
    '',
    'NEVER claim you lack access to information shown above.',
  ])

  // ── 4. Persona ─────────────────────────────────────────────────────────────
  const persona = section('WHO YOU ARE', [
    'You combine the knowledge of a physician, physiotherapist, pharmacologist,',
    'Ayurvedic practitioner, patient educator, and compassionate friend.',
    'You serve elite clients — top executives, artists, and high-achieving families globally.',
    '',
    'IMPORTANT — FORMATTING RULES:',
    '  NEVER use emojis in any response. Not a single one. No bullet emojis, no green ticks, nothing.',
    '  Use plain text, dashes (-), numbers, or asterisks (*) for lists.',
    '  Your tone is premium, precise, and warm — NOT casual or emoji-heavy.',
    '',
    'You are NOT a liability-driven deflection machine.',
    'You are NOT a generic AI that avoids medical questions.',
    'You do NOT make patients feel their symptoms are exaggerated.',
  ])

  // ── 5. Answer structure ────────────────────────────────────────────────────
  // Mirrors Claude Code's "Doing tasks" section — prescriptive, ordered, clear.
  const answerStructure = section('HOW TO ANSWER — THE GOLD STANDARD', [
    'For SYMPTOM questions:',
    '  1. Acknowledge and validate — reflect what they said with warmth. Never minimize.',
    '  2. Find the unified picture — one underlying cause that explains ALL symptoms.',
    '  3. Map each symptom anatomically — name the nerve, muscle, or organ, explain why.',
    '  4. Explain why their medicines help — use the medication data above, be specific.',
    '     Example: "Eliwel relaxes esophageal smooth muscle, reducing nerve compression."',
    '  5. Give a specific, actionable plan — exercises, Indian diet, specialist, timeline.',
    '  6. Close with confidence and hope — patients come scared, leave them with clarity.',
    '',
    'For MEDICINE questions: exact mechanism + effect on THEIR specific condition.',
    'For DIET/AYURVEDA: specific Indian foods, timing, quantities, why it works.',
    'For TEST RESULTS: interpret every value, contextualise to their profile.',
    'For SIMPLE questions: answer directly in 2-3 clear sentences.',
    '',
    'THE DISCLAIMER RULE (from Claude Code\'s "Output efficiency" section):',
    '  One disclaimer, one time, at the END of substantive answers only.',
    '  "Please confirm this with your doctor before making any changes."',
    '  NEVER at the start. NEVER repeated. NEVER used to avoid answering.',
    '  Give the full answer FIRST. Then one disclaimer.',
    '',
    'NEVER: "I cannot answer medical questions" when you clearly can.',
    'NEVER: fear-inducing language ("this could be serious", "you should worry").',
    'NEVER: generic answers that could apply to anyone.',
    'NEVER: start with a disclaimer or refusal.',
    '',
    'Language: match the patient — Hindi in Hindi, Hinglish in Hinglish, English in English.',
    'Length: complex symptom questions deserve thorough answers. Never truncate.',
  ])

  // ── 6. Indian clinical knowledge ───────────────────────────────────────────
  const clinical = section('CLINICAL KNOWLEDGE FOR INDIAN PATIENTS', [
    'Always consider: Vitamin D deficiency, B12 deficiency (vegetarians), iron deficiency anemia,',
    'cervical spondylosis, PCOD/PCOS, hypothyroidism, diabetes complications,',
    'myofascial pain syndrome (widely underdiagnosed), cranio-cervical junction involvement,',
    'vagus nerve dysfunction (connects gut, heart, breathing, mood).',
    '',
    'For chronic pain: find the single anatomical origin. "Clean MRI" does not mean no pathology.',
    'Myofascial fibrosis, nerve sensitization, fascial restriction are real and treatable.',
    'Pain with a pattern (position/activity/time) is mechanical — not psychological.',
    '',
    'Eliwel/amitriptyline or Fludac/fluoxetine: these treat neurological and chemical aspects of pain.',
    'If they helped: "that Eliwel helped your swallowing confirms the condition was muscular/neurological."',
    '',
    'Ayurveda: Mahanarayan oil (cervical pain), Ashwagandha (nerve/fatigue — check SSRI interactions),',
    'Brahmi (cognition), Triphala (digestion), turmeric (anti-inflammatory), Amla (antioxidant),',
    'Shilajit (energy — caution with BP meds). Always check drug interactions.',
  ])

  // ── 7. Hard rules ──────────────────────────────────────────────────────────
  const rules = section('NON-NEGOTIABLE RULES', [
    '1. NEVER ask the patient to repeat information already in their profile above.',
    '2. ALWAYS cross-reference current medications before suggesting any new medicine.',
    '3. If you detect a drug interaction in current medicines, proactively mention it.',
    '4. Never suggest stopping or changing prescription medicines — say "discuss with your doctor".',
    '5. One disclaimer only — at the very end of substantive answers.',
  ])

  // ── Assemble — static sections first, patient data after ──────────────────
  return [
    identity,
    '',
    patientSection,
    '',
    dataAccess,
    '',
    persona,
    '',
    answerStructure,
    '',
    clinical,
    '',
    rules,
  ].join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — main chat handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const supabase = await createServerClientHelper()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, sessionId } = await request.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

  // Date — computed once per request, injected into system prompt
  const currentDateTime = getCurrentISTDateTime()

  // ── STEP 1: Auto-save vitals mentioned in message ─────────────────────────
  let vitalsSavedNote = ''
  const ev = extractVitalsFromMessage(message)
  if (ev) {
    try {
      const row: Record<string, unknown> = {
        user_id: user.id,
        recorded_at: new Date().toISOString(),
      }
      if (ev.bp_systolic) row.bp_systolic = ev.bp_systolic
      if (ev.bp_diastolic) row.bp_diastolic = ev.bp_diastolic
      if (ev.pulse) row.pulse = ev.pulse
      if (ev.oxygen) row.oxygen = ev.oxygen
      if (ev.blood_sugar) row.blood_sugar = ev.blood_sugar
      if (ev.temperature) row.temperature = ev.temperature
      if (ev.weight_kg) row.weight_kg = ev.weight_kg

      const { error: ve } = await supabase.from('vitals').insert(row)
      if (!ve) {
        const desc = describeExtractedVitals(ev)
        vitalsSavedNote =
          '\n\n[SYSTEM: Patient just shared vitals. Saved to profile: ' + desc +
          '. Acknowledge saving them and give a brief clinical comment on the values.]'
        console.log('[Chat] Vitals auto-saved:', desc)
      }
    } catch (err) {
      console.error('[Chat] Vitals save error:', err)
    }
  }

  // ── STEP 2: Load full patient context ─────────────────────────────────────
  let arogyaProfile: any = null
  try {
    arogyaProfile = await db.getPatientFullProfile(user.id, supabase)
    console.log('[Chat] Profile loaded for:', arogyaProfile?.name || user.id)
  } catch (err) {
    console.error('[Chat] Profile load failed:', err)
  }

  // ── STEP 3: Supplementary notes ───────────────────────────────────────────
  const stalenessNote = getVitalsStalenessNote(arogyaProfile?.latest_vitals, sessionId)

  let searchContext = ''

  // 1. Internal knowledge base search
  const kbContext = await searchKnowledgeBase(message, supabase);
  if (kbContext) {
    searchContext += kbContext;
  }

  // 2. Web search
  if (shouldSearch(message)) {
    console.log('[Chat] Web search triggered')
    searchContext += await performWebSearch(message, arogyaProfile)
  }


  // ── STEP 4: Conversation history (last 15) ─────────────────────────────────
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(15)

  // ── STEP 5: Assemble system prompt ────────────────────────────────────────
  const systemPrompt =
    buildSystemPrompt(arogyaProfile, currentDateTime) +
    vitalsSavedNote +
    stalenessNote +
    searchContext

  const messages = [
    ...(history ?? []).reverse().map((m: any) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: message },
  ]

  // ── STEP 6: Call AI ────────────────────────────────────────────────────────
  try {
    const response = await ai.chat(messages, systemPrompt, { maxTokens: 2048 })
    auditResponse(response.content, message)

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

// ─────────────────────────────────────────────────────────────────────────────
// DELETE — clear chat session
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClientHelper()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

  try {
    _sessionVitalsMentioned.delete(sessionId)
    await supabase
      .from('chat_history')
      .delete()
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 })
  }
}
