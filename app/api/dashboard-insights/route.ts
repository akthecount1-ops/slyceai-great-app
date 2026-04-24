import { createClient } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'

// Force dynamic — we read user session
export const dynamic = 'force-dynamic'

// ── Shared fallback (returned on any error so dashboard never blanks) ──
const FALLBACK = {
  feeling: "Welcome back! Let's check in on your health today.",
  health_tip: 'Remember to drink at least 8 glasses of water today.',
  diet: {
    title: "Today's Diet Suggestion",
    meals: [
      { time: 'Breakfast', suggestion: 'Oats porridge with nuts and banana', benefit: 'Provides sustained energy' },
      { time: 'Lunch', suggestion: 'Dal, roti, sabzi and salad', benefit: 'Balanced nutrition' },
      { time: 'Dinner', suggestion: 'Khichdi with ghee and curd', benefit: 'Light and digestive' },
      { time: 'Snacks', suggestion: 'Roasted chana or seasonal fruit', benefit: 'Healthy energy boost' },
    ],
  },
  lifestyle: [
    { title: 'Sleep', tip: 'Sleep by 10 PM for 7–8 hours of rest', emoji: '😴' },
    { title: 'Movement', tip: 'Take a 30-minute walk in the morning', emoji: '🚶' },
    { title: 'Hydration', tip: 'Drink warm water with lemon in the morning', emoji: '💧' },
    { title: 'Stress', tip: 'Practice deep breathing for 5 minutes daily', emoji: '🧘' },
  ],
  ayurveda: [
    { herb: 'Ashwagandha (अश्वगंधा)', benefit: 'Reduces stress and boosts energy', how: '1 tsp in warm milk at night', emoji: '🌿' },
    { herb: 'Tulsi (तुलसी)', benefit: 'Boosts immunity and relieves cough', how: '5–7 leaves in morning tea', emoji: '🍃' },
    { herb: 'Triphala (त्रिफला)', benefit: 'Aids digestion and detox', how: '1 tsp with warm water at bedtime', emoji: '🌱' },
  ],
  yoga: [
    { pose: 'Anulom Vilom (Breathing)', duration: '10 minutes', benefit: 'Calms mind and improves oxygen', emoji: '🧘' },
    { pose: 'Surya Namaskar', duration: '5–10 rounds', benefit: 'Full body stretch and energize', emoji: '🌅' },
    { pose: 'Shavasana (Corpse Pose)', duration: '5 minutes', benefit: 'Deep relaxation and stress relief', emoji: '😌' },
  ],
}

// Smart timeout wrapper
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms)
    ),
  ])
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch only what's necessary — lean query
  const [{ data: profile }, { data: vitals }, { data: medicines }, { data: journal }] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('name, gender, food_preference, state')
        .eq('id', user.id)
        .single(),
      supabase
        .from('vitals')
        .select('bp_systolic,bp_diastolic,pulse,oxygen,blood_sugar,recorded_at')
        .eq('user_id', user.id)
        .order('recorded_at', { ascending: false })
        .limit(2), // reduced from 3 → 2
      supabase
        .from('medicines')
        .select('medicine_name,dose,frequency')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .limit(5), // cap to top 5
      supabase
        .from('symptom_journal')
        .select('symptoms,pain_level,energy_level,mood_level,journal_date')
        .eq('user_id', user.id)
        .order('journal_date', { ascending: false })
        .limit(3), // reduced from 5 → 3
    ])

  // Build compact context strings
  const vitalsStr = vitals?.length
    ? vitals
        .map(
          (v) =>
            `BP ${v.bp_systolic}/${v.bp_diastolic}, Pulse ${v.pulse}, O2 ${v.oxygen}%, Sugar ${v.blood_sugar} mg/dL`
        )
        .join(' | ')
    : 'No vitals yet'

  const medsStr = medicines?.length
    ? medicines.map((m) => `${m.medicine_name} ${m.dose}`).join(', ')
    : 'None'

  const journalStr = journal?.length
    ? journal
        .map(
          (j) =>
            `Pain ${j.pain_level}/5, Energy ${j.energy_level}/5, Mood ${j.mood_level}/5, Sx: ${(j.symptoms || []).slice(0, 3).join(', ') || 'none'}`
        )
        .join(' | ')
    : 'No entries'

  // ── Compact prompt — shorter = faster response ──
  const prompt = `You are Arogya AI, a premier health concierge. 
Patient: ${profile?.name ?? 'Patient'}, ${profile?.gender ?? ''}, Food: ${profile?.food_preference ?? 'vegetarian'}, Location: ${profile?.state ?? 'India'}.
Vitals: ${vitalsStr}
Medicines: ${medsStr}
Recent symptoms: ${journalStr}

Return ONLY a valid JSON object. 
The "feeling" field MUST be a thoughtful, detailed 2-3 sentence clinical analysis of how they are doing based ON THE DATA. Talk directly to them.
Example: "I noticed your BP has stabilized over the last 2 days, which is excellent. However, your energy levels in the journal seem low, possibly related to the late dinner you logged."

Structure:
{"feeling":"conversational analysis","health_tip":"personalized insight","diet":{"title":"Today's Diet Plan","meals":[{"time":"Breakfast","suggestion":"Indian breakfast","benefit":"why"},{"time":"Lunch","suggestion":"Indian lunch","benefit":"why"},{"time":"Dinner","suggestion":"Indian dinner","benefit":"why"},{"time":"Snacks","suggestion":"healthy snack","benefit":"why"}]},"lifestyle":[{"title":"Sleep","tip":"tip","emoji":"😴"},{"title":"Movement","tip":"tip","emoji":"🚶"},{"title":"Hydration","tip":"tip","emoji":"💧"},{"title":"Stress","tip":"tip","emoji":"🧘"}],"ayurveda":[{"herb":"name (Hindi name)","benefit":"benefit","how":"usage","emoji":"🌿"},{"herb":"name","benefit":"benefit","how":"usage","emoji":"🍃"},{"herb":"name","benefit":"benefit","how":"usage","emoji":"🌱"}],"yoga":[{"pose":"name","duration":"X min","benefit":"benefit","emoji":"🧘"},{"pose":"name","duration":"X min","benefit":"benefit","emoji":"🌅"},{"pose":"name","duration":"X min","benefit":"benefit","emoji":"😌"}]}`

  try {
    const response = await withTimeout(
      ai.chat(
        [{ role: 'user', content: prompt }],
        'You are a strict JSON API. Respond with ONLY a raw JSON object. No greetings, no markdown, no code fences. Start with { and end with }.',
        { maxTokens: 900, temperature: 0.4 } // smaller output, deterministic
      ),
      25000 // 25s timeout — fall back to static data instead of hanging forever
    )

    // Robust JSON extraction
    const text = response.content
    const start = text.indexOf('{')
    const end = text.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON in response')
    const data = JSON.parse(text.slice(start, end + 1))

    return NextResponse.json(data, {
      headers: {
        // No caching — every patient visit generates fresh, personalised AI insights
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (err) {
    console.error('[Dashboard Insights] Error:', err instanceof Error ? err.message : err)
    // Always return fallback so the dashboard renders
    return NextResponse.json(FALLBACK, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
    })
  }
}
