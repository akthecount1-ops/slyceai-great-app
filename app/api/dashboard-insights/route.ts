export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

const FALLBACKS: Record<string, string> = {
  tip: "Welcome back! Remember to stay hydrated today and take your medicines on time. If you have any health concerns, Slyceai is here to help.",
  diet: "A balanced diet rich in whole grains, vegetables, and lean proteins supports your overall health. Avoid processed foods and stay well-hydrated.",
  exercise: "Aim for at least 30 minutes of moderate activity today. Even a brisk walk improves cardiovascular health and boosts mood.",
  dosha: "Your Ayurvedic profile helps personalise your health journey. Complete the assessment on the dashboard to get Dosha-specific recommendations.",
}

const SYSTEM_PROMPTS: Record<string, string> = {
  tip: `You are Slyceai. Generate a personalised daily health insight for this patient.
Be specific to their conditions, medicines, and vitals. Format: 2-3 sentences. End with one specific, actionable tip.
Do not be generic. Reference their actual data.
If their vitals show something notable, mention it.
If they have active symptoms, address them.
Never diagnose. Always recommend doctor for serious concerns.
Keep it warm, encouraging, and under 70 words total.`,
  diet: `You are Slyceai. Generate a personalised daily diet recommendation for this patient.
Consider their conditions, medicines, dosha type, weight/BMI, and food preferences.
Be specific — name actual foods, meal timing, or portion guidance.
If they have diabetes, hypertension, or other conditions, factor that in.
Mention Ayurvedic foods if their dosha is known.
Never diagnose. Keep it practical and warm. Under 80 words.`,
  exercise: `You are Slyceai. Generate a personalised daily exercise recommendation for this patient.
Consider their BMI, conditions, current symptoms, pulse, and dosha constitution.
Recommend specific activity type, duration, and intensity.
If they have high BP or high pulse, recommend low-impact options.
If Kapha dominant, recommend vigorous activity. If Vata, gentle grounding.
Under 70 words. Actionable and specific.`,
  dosha: `You are Slyceai. Generate a personalised Ayurvedic wellness tip for this patient based on their dosha profile.
Mention their dominant dosha and how it applies to their current health state.
Give one specific lifestyle, herb, or routine recommendation based on their dosha blend.
Cross-reference with their current vitals or symptoms if relevant.
Under 70 words. Warm and precise.`,
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return '—' }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timed out after ' + ms + 'ms')), ms)
    ),
  ])
}

export async function GET(req: NextRequest) {
  const type = (req.nextUrl.searchParams.get('type') || 'tip') as string
  const forceRefresh = req.nextUrl.searchParams.get('force_refresh') === '1'
  const insightType = ['tip', 'diet', 'exercise', 'dosha'].includes(type) ? type : 'tip'
  const fallback = FALLBACKS[insightType] || FALLBACKS.tip

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Check cache (daily_insights table) ──────────────────────────────────
    const today = new Date().toISOString().split('T')[0]

    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from('daily_insights')
        .select('content')
        .eq('user_id', user.id)
        .eq('insight_date', today)
        .eq('insight_type', insightType)
        .single()

      if (cached?.content) {
        return NextResponse.json({ feeling: cached.content, content: cached.content })
      }
    }

    // ── Load full patient context ────────────────────────────────────────────
    const [arogyaProfile, profileRes] = await Promise.all([
      db.getPatientFullProfile(user.id),
      supabase.from('profiles')
        .select('primary_dosha, dosha_vata_score, dosha_pitta_score, dosha_kapha_score, weight_kg, height_cm')
        .eq('id', user.id)
        .single(),
    ])

    if (!arogyaProfile || !arogyaProfile.name) {
      return NextResponse.json({ feeling: fallback, content: fallback })
    }

    // Build context summary for prompt
    const mh = arogyaProfile.medical_history || {}
    const knownDiseases = (mh.known_diseases || []).join(', ') || 'None'
    const medications = (arogyaProfile.active_medications || []).map((m: any) => m.medicine_name).join(', ') || 'None'
    const symptoms = (arogyaProfile.all_symptoms || []).join(', ') || 'None'
    const v = arogyaProfile.latest_vitals
    const vitalsStr = v
      ? `BP ${v.bp_systolic}/${v.bp_diastolic} mmHg, Pulse ${v.pulse} bpm, SpO2 ${v.oxygen}%, Sugar ${v.blood_sugar} mg/dL (logged ${formatDate(v.recorded_at)})`
      : 'No recent vitals'
    const bmi = arogyaProfile.bmi ? `${arogyaProfile.bmi} (${arogyaProfile.bmiCategory})` : 'Not calculated'
    const drugInts = (arogyaProfile.drug_interactions || []).map((i: any) => `${i.medicine_a} + ${i.medicine_b}`).join(', ') || 'None'

    // Dosha context
    const pd = profileRes.data
    const doshaStr = pd?.primary_dosha
      ? `${pd.primary_dosha} dominant (Vata: ${pd.dosha_vata_score || 0}, Pitta: ${pd.dosha_pitta_score || 0}, Kapha: ${pd.dosha_kapha_score || 0})`
      : 'Dosha not assessed'
    const bmiFromProfile = (pd?.weight_kg && pd?.height_cm)
      ? `${+(pd.weight_kg / ((pd.height_cm / 100) ** 2)).toFixed(1)}`
      : bmi

    const userPrompt = `Patient: ${arogyaProfile.name}, Age: ${arogyaProfile.age || '—'}, Gender: ${arogyaProfile.gender || '—'}
BMI: ${bmiFromProfile}
Known conditions: ${knownDiseases}
Current medications: ${medications}
Active symptoms: ${symptoms}
Vitals: ${vitalsStr}
Drug interactions to note: ${drugInts}
Ayurvedic dosha: ${doshaStr}

Generate a personalised ${insightType} recommendation.`

    const response = await withTimeout(
      ai.chat([{ role: 'user', content: userPrompt }], SYSTEM_PROMPTS[insightType], { maxTokens: 220 }),
      20000
    ) as { content: string }

    const content = response.content?.trim() || fallback

    // ── Cache in daily_insights ──────────────────────────────────────────────
    try {
      await supabase.from('daily_insights').upsert({
        user_id: user.id,
        insight_date: today,
        insight_type: insightType,
        content,
        created_at: new Date().toISOString(),
      }, { onConflict: 'user_id,insight_date,insight_type' })
    } catch (cacheErr) {
      console.warn('[Insights] Cache write failed (non-fatal):', cacheErr)
    }

    return NextResponse.json({ feeling: content, content })
  } catch (err) {
    console.error('[Dashboard Insights]', err)
    return NextResponse.json({ feeling: fallback, content: fallback })
  }
}
