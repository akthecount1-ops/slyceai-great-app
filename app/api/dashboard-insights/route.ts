export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'

// Force dynamic -- we read user session
export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

// Shared fallback returned on any error so dashboard never blanks
const FALLBACK = {
  greeting: "Welcome back! Let's check in on your health today.",
  feeling: "It's a great day to focus on your well-being. Stay consistent with your health habits.",
  health_tip: 'Remember to drink at least 8 glasses of water today and take a short walk.',
  diet: {
    title: "Today's Diet Suggestion",
    meals: [
      { time: 'Breakfast', suggestion: 'Oats porridge with nuts and banana', benefit: 'Provides sustained energy and fibre' },
      { time: 'Lunch', suggestion: 'Dal, roti, sabzi and salad', benefit: 'Balanced nutrition with protein and vitamins' },
      { time: 'Dinner', suggestion: 'Khichdi with ghee and curd', benefit: 'Light, warming and easy to digest' },
      { time: 'Snacks', suggestion: 'Roasted chana or seasonal fruit', benefit: 'Healthy energy boost without refined sugar' },
    ],
  },
  lifestyle: [
    { title: 'Sleep', tip: 'Aim to sleep by 10 PM for 7-8 hours of restorative rest', emoji: '😴' },
    { title: 'Movement', tip: 'Take a brisk 30-minute walk in the morning fresh air', emoji: '🚶' },
    { title: 'Hydration', tip: 'Start your day with warm lemon water to kickstart digestion', emoji: '💧' },
    { title: 'Stress', tip: 'Practice box breathing: 4s inhale, hold, exhale, hold', emoji: '🧘' },
  ],
  ayurveda: [
    { herb: 'Ashwagandha', benefit: 'Reduces cortisol, boosts stamina and immune resilience', how: '1 tsp in warm milk at night', emoji: '🌿' },
    { herb: 'Tulsi', benefit: 'Powerful adaptogen that supports immunity and respiratory health', how: '5-7 fresh leaves steeped in morning tea', emoji: '🍃' },
    { herb: 'Triphala', benefit: 'Balances all three doshas and aids gentle detoxification', how: '1 tsp with warm water at bedtime', emoji: '🌱' },
  ],
  yoga: [
    { pose: 'Anulom Vilom (Alternate Nostril Breathing)', duration: '10 minutes', benefit: 'Calms the nervous system and improves oxygen circulation', emoji: '🧘' },
    { pose: 'Surya Namaskar (Sun Salutation)', duration: '5-10 rounds', benefit: 'Full body warm-up that energises all muscle groups', emoji: '🌅' },
    { pose: 'Shavasana (Corpse Pose)', duration: '5-7 minutes', benefit: 'Deep relaxation and integration of practice benefits', emoji: '🙏' },
  ],
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out after ' + ms + 'ms')), ms)
    ),
  ])
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Fetch Supabase data in parallel ──────────────────────────────────────
    const [{ data: profile }, { data: vitals }, { data: medicines }, { data: journal }] =
      await Promise.all([
        supabase
          .from('profiles')
          .select('name, gender, food_preference, state, date_of_birth')
          .eq('id', user.id)
          .single(),
        supabase
          .from('vitals')
          .select('bp_systolic,bp_diastolic,pulse,oxygen,blood_sugar,recorded_at')
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false })
          .limit(3),
        supabase
          .from('medicines')
          .select('medicine_name,dose,frequency')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .limit(8),
        supabase
          .from('symptom_journal')
          .select('symptoms,pain_level,energy_level,mood_level,journal_date,notes')
          .eq('user_id', user.id)
          .order('journal_date', { ascending: false })
          .limit(5),
      ])

    // ── Fetch SQLite patient profile (medical history, conditions, BMI) ──────
    let arogyaProfile: ReturnType<typeof db.getPatientFullProfile> = null
    let activeSymptoms: Array<{ symptom_label: string; type: string; severity: string | null; duration: string | null }> = []
    try {
      arogyaProfile = db.getPatientFullProfile(user.id)
      if (arogyaProfile) {
        const sqliteDb = db.getDb()
        activeSymptoms = sqliteDb.prepare(
          'SELECT symptom_label, type, severity, duration FROM patient_symptoms WHERE patient_id = ? AND resolved_at IS NULL ORDER BY recorded_at DESC LIMIT 5'
        ).all(user.id)
      }
    } catch {
      // SQLite not available in this env — gracefully ignore
    }

    // ── Build context strings ─────────────────────────────────────────────────
    const vitalsStr = vitals?.length
      ? vitals.map((v) => {
          const d = new Date(v.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          return `[${d}] BP ${v.bp_systolic}/${v.bp_diastolic} mmHg, Pulse ${v.pulse} bpm, O2 ${v.oxygen}%, Sugar ${v.blood_sugar} mg/dL`
        }).join(' | ')
      : 'No vitals recorded yet'

    const medsStr = medicines?.length
      ? medicines.map((m) => `${m.medicine_name}${m.dose ? ' ' + m.dose : ''}${m.frequency ? ' (' + m.frequency + ')' : ''}`).join(', ')
      : 'None prescribed'

    const journalStr = journal?.length
      ? journal.map((j) => {
          const parts = [`[${j.journal_date}] Pain ${j.pain_level}/5, Energy ${j.energy_level}/5, Mood ${j.mood_level}/5`]
          if (j.symptoms?.length) parts.push(`Symptoms: ${Array.isArray(j.symptoms) ? j.symptoms.join(', ') : j.symptoms}`)
          if (j.notes) parts.push(`Notes: ${j.notes}`)
          return parts.join(' — ')
        }).join(' | ')
      : 'No journal entries'

    // SQLite-enriched context
    const mh = arogyaProfile?.medical_history
    const conditionsStr = mh?.known_diseases?.length ? mh.known_diseases.join(', ') : 'None reported'
    const allergiesStr = mh?.allergies?.length ? mh.allergies.join(', ') : 'None known'
    const familyHistoryStr = mh?.family_history?.length ? mh.family_history.join(', ') : 'None reported'
    const activeSxStr = activeSymptoms.length
      ? activeSymptoms.map(s => `${s.symptom_label}${s.severity ? ` (${s.severity} severity)` : ''}${s.duration ? ` for ${s.duration}` : ''}`).join(', ')
      : 'None currently active'

    // BMI calculation
    let bmiStr = 'Not available'
    if (arogyaProfile?.weight_kg && arogyaProfile?.height_cm) {
      const heightM = arogyaProfile.height_cm / 100
      const bmi = (arogyaProfile.weight_kg / (heightM * heightM)).toFixed(1)
      const bmiCategory = parseFloat(bmi) < 18.5 ? 'Underweight' : parseFloat(bmi) < 25 ? 'Normal' : parseFloat(bmi) < 30 ? 'Overweight' : 'Obese'
      bmiStr = `${bmi} (${bmiCategory}) — ${arogyaProfile.weight_kg}kg, ${arogyaProfile.height_cm}cm`
    }

    // Age calculation
    let ageStr = arogyaProfile?.age ? `${arogyaProfile.age} years` : 'Unknown'
    if (profile?.date_of_birth && !arogyaProfile?.age) {
      const dob = new Date(profile.date_of_birth)
      const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
      if (age > 0 && age < 120) ageStr = `${age} years`
    }

    const name = arogyaProfile?.name ?? profile?.name ?? 'Patient'
    const gender = arogyaProfile?.gender ?? profile?.gender ?? 'Not specified'
    const food = profile?.food_preference ?? 'vegetarian'
    const location = profile?.state ?? 'India'
    const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

    const systemPrompt = 'You are a strict JSON API. Respond with ONLY a raw JSON object. No markdown, no code fences, no explanation. Start directly with { and end with }.'

    const userPrompt = [
      `You are Arogya AI, a premier personalised health concierge for Indian patients.`,
      `Today is ${today}.`,
      ``,
      `PATIENT PROFILE:`,
      `- Name: ${name}, Age: ${ageStr}, Gender: ${gender}`,
      `- Location: ${location}, Diet preference: ${food}`,
      `- BMI: ${bmiStr}`,
      `- Known conditions: ${conditionsStr}`,
      `- Allergies: ${allergiesStr}`,
      `- Family history: ${familyHistoryStr}`,
      ``,
      `HEALTH DATA:`,
      `- Recent vitals (most recent first): ${vitalsStr}`,
      `- Current medications: ${medsStr}`,
      `- Active symptoms: ${activeSxStr}`,
      `- Symptom journal (recent entries): ${journalStr}`,
      ``,
      `CRITICAL: Base ALL recommendations directly on this patient's actual data above.`,
      `- If they have high BP, tailor diet for sodium restriction and recommend BP-lowering herbs.`,
      `- If they have diabetes, recommend low-GI foods and blood-sugar managing herbs.`,
      `- If their pain/energy/mood scores are low, acknowledge it and tailor tips accordingly.`,
      `- If they are taking specific medicines, check for relevant dietary restrictions.`,
      `- Diet meals must respect their food preference (${food} — do NOT suggest meat/eggs if vegetarian).`,
      `- Reference local Indian foods from their region (${location}) where possible.`,
      `- Yoga/movement must be appropriate for their age, weight and any known conditions.`,
      ``,
      `Return ONLY a valid JSON object with these exact fields:`,
      `{`,
      `  "greeting": "Warm, personalised greeting referencing their name and one specific data point (e.g. a recent trend in their vitals or mood). 1-2 sentences.",`,
      `  "feeling": "2-3 sentence clinical analysis addressing this patient directly. Reference their actual vitals, symptoms or journal entries. Be specific, not generic.",`,
      `  "health_tip": "One highly specific health insight based on their data — not generic advice. E.g. if BP is elevated, give a specific BP tip.",`,
      `  "diet": {`,
      `    "title": "Personalised diet plan title mentioning their condition/goal",`,
      `    "meals": [`,
      `      { "time": "Breakfast", "suggestion": "Specific ${food} meal with quantity", "benefit": "Specific benefit for this patient" },`,
      `      { "time": "Lunch",     "suggestion": "Specific ${food} meal with quantity", "benefit": "Specific benefit for this patient" },`,
      `      { "time": "Dinner",    "suggestion": "Specific ${food} meal with quantity", "benefit": "Specific benefit for this patient" },`,
      `      { "time": "Snacks",    "suggestion": "2 options with quantities",            "benefit": "Specific benefit for this patient" }`,
      `    ]`,
      `  },`,
      `  "lifestyle": [`,
      `    { "title": "Sleep",      "tip": "Personalised sleep tip for this patient", "emoji": "😴" },`,
      `    { "title": "Movement",   "tip": "Personalised exercise tip for their age/condition", "emoji": "🚶" },`,
      `    { "title": "Hydration",  "tip": "Specific hydration guidance for their condition", "emoji": "💧" },`,
      `    { "title": "Stress",     "tip": "Targeted stress tip based on their mood data", "emoji": "🧘" }`,
      `  ],`,
      `  "ayurveda": [`,
      `    { "herb": "Herb name", "benefit": "Specific benefit for this patient's condition", "how": "Exact dosage and method", "emoji": "🌿" },`,
      `    { "herb": "Herb name", "benefit": "Specific benefit", "how": "Exact method", "emoji": "🍃" },`,
      `    { "herb": "Herb name", "benefit": "Specific benefit", "how": "Exact method", "emoji": "🌱" }`,
      `  ],`,
      `  "yoga": [`,
      `    { "pose": "Pose name", "duration": "Specific duration", "benefit": "Specific benefit for this patient", "emoji": "🧘" },`,
      `    { "pose": "Pose name", "duration": "Specific duration", "benefit": "Specific benefit", "emoji": "🌅" },`,
      `    { "pose": "Pose name", "duration": "Specific duration", "benefit": "Specific benefit", "emoji": "🙏" }`,
      `  ]`,
      `}`,
      ``,
      `RULES:`,
      `1. No unescaped double quotes inside string values — use single quotes or rephrase.`,
      `2. All arrays must be complete with proper comma separation.`,
      `3. MUST return completely valid, parseable JSON.`,
      `4. Do NOT use generic filler content — every sentence must be tailored to this patient.`,
    ].join('\n')

    const response = await withTimeout(
      ai.chat(
        [{ role: 'user', content: userPrompt }],
        systemPrompt,
        { maxTokens: 2500, temperature: 0.25 }
      ),
      25000
    ) as { content: string }

    let text = response.content || ''
    
    // Cleanup: Remove markdown code fences if AI ignored system prompt
    text = text.replace(/```json/g, '').replace(/```/g, '').trim()

    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    
    if (start === -1 || end === -1) {
      console.error('[Dashboard Insights] No JSON object found in response:', text)
      throw new Error('No JSON found in AI response')
    }

    let jsonString = text.slice(start, end + 1)
    // Remove trailing commas before closing brackets/braces
    jsonString = jsonString.replace(/,(\s*[\]}])/g, '$1')

    let data;
    try {
      data = JSON.parse(jsonString)
    } catch (parseError) {
      console.error('[Dashboard Insights] JSON Parse Error:', parseError)
      console.error('[Dashboard Insights] Raw string that failed to parse:', jsonString.slice(0, 500))
      throw parseError
    }

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  } catch (err) {
    console.error('[Dashboard Insights] Error:', err instanceof Error ? err.message : err)
    return NextResponse.json(FALLBACK, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }
}
