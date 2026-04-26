export const runtime = 'nodejs'

import { createClient } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const db = require('@/server/db')

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
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // ── Fetch all from Supabase ──────────────────────────────────────────
    const arogyaProfile = await db.getPatientFullProfile(user.id)
    if (!arogyaProfile) {
      return NextResponse.json(FALLBACK)
    }

    const { data: vitals } = await supabase.from('vitals')
      .select('bp_systolic,bp_diastolic,pulse,oxygen,blood_sugar,recorded_at')
      .eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(3)

    const { data: journal } = await supabase.from('symptom_journal')
      .select('symptoms,pain_level,energy_level,mood_level,journal_date,notes')
      .eq('user_id', user.id).order('journal_date', { ascending: false }).limit(5)

    // Build context strings
    const vitalsStr = vitals?.length
      ? vitals.map(v => `[${v.recorded_at}] BP ${v.bp_systolic}/${v.bp_diastolic}, P ${v.pulse}, O2 ${v.oxygen}%`).join(' | ')
      : 'No recent vitals'

    const medsStr = arogyaProfile.active_medications?.length
      ? arogyaProfile.active_medications.map((m: any) => m.medicine_name).join(', ')
      : 'None'

    const mh = arogyaProfile.medical_history || {}
    const conditionsStr = mh.known_diseases?.join(', ') || 'None'
    
    const userPrompt = `
      Patient: ${arogyaProfile.name}, Age: ${arogyaProfile.age}, Gender: ${arogyaProfile.gender}
      Conditions: ${conditionsStr}
      Vitals: ${vitalsStr}
      Meds: ${medsStr}
      
      Generate personalised health insights in JSON format.
    `

    const response = await withTimeout(
      ai.chat([{ role: 'user', content: userPrompt }], 'Respond with raw JSON only.'),
      25000
    ) as { content: string }

    let text = (response.content || '').replace(/```json/g, '').replace(/```/g, '').trim()
    const data = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))

    return NextResponse.json(data)
  } catch (err) {
    console.error('[Dashboard Insights]', err)
    return NextResponse.json(FALLBACK)
  }
}
