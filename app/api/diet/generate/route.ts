import { createClient } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { userId, goal, season } = await request.json()

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, food_preference, allergies, state, region, date_of_birth')
    .eq('id', userId || user.id)
    .single()

  const age = profile?.date_of_birth
    ? Math.floor((Date.now() - new Date(profile.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
    : null

  const systemPrompt = `You are a certified Indian nutritionist and Ayurvedic health expert. Create personalised diet plans based on Indian cuisine, seasonal foods, and regional practices.`

  const prompt = `Create a detailed one-day personalised Indian diet plan for:
- Diet type: ${profile?.food_preference ?? 'vegetarian'}
- Allergies: ${profile?.allergies?.join(', ') || 'None'}
- Region: ${profile?.state ?? profile?.region ?? 'India'}
- Age: ${age ?? 'Adult'}
- Health goal: ${goal ?? 'general_wellness'}
- Season: ${season === 'current' ? 'Current season in India' : season}

Return ONLY valid JSON (no markdown) in this exact format:
{
  "date": "today",
  "meals": [
    {
      "time": "7:00 AM",
      "name": "Breakfast",
      "description": "Brief description",
      "calories": 350,
      "items": ["item1", "item2", "item3"]
    }
  ],
  "hydration": "Drink 2.5 litres of water. Include coconut water and lemon water.",
  "tips": ["tip1", "tip2", "tip3"]
}

Include: Early Morning, Breakfast, Mid-Morning, Lunch, Evening Snack, Dinner. Use traditional Indian foods appropriate for the region.`

  try {
    const response = await ai.chat([{ role: 'user', content: prompt }], systemPrompt, { maxTokens: 2000 })

    let plan
    try {
      // Strip markdown code blocks if present
      const content = response.content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      plan = JSON.parse(content)
    } catch {
      plan = { error: 'Could not parse diet plan', raw: response.content }
    }

    return NextResponse.json({ plan, usage: response.usage })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
