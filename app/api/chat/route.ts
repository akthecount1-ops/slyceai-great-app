import { createClient as createServerClientHelper } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createServerClientHelper()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { message, sessionId } = await request.json()
  if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 })
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

  // Load last 10 messages for context for this specific session
  const { data: history } = await supabase
    .from('chat_history')
    .select('role, content')
    .eq('user_id', user.id)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: false })
    .limit(10)

  // Load user profile for context
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, gender, date_of_birth, food_preference, allergies, state, region')
    .eq('id', user.id)
    .single()

  // Load patient data for context
  const [
    { data: vitals },
    { data: medicines },
    { data: documents }
  ] = await Promise.all([
    supabase.from('vitals').select('bp_systolic, bp_diastolic, pulse, oxygen, blood_sugar, recorded_at').eq('user_id', user.id).order('recorded_at', { ascending: false }).limit(5),
    supabase.from('medicines').select('medicine_name, dose, frequency, is_active').eq('user_id', user.id).eq('is_active', true),
    supabase.from('documents').select('document_category, ai_analysis, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(3)
  ])

  const formatVitals = () => {
    if (!vitals?.length) return 'None recorded recently.'
    return vitals.map(v => `- ${new Date(v.recorded_at).toLocaleDateString()}: BP ${v.bp_systolic}/${v.bp_diastolic}, Pulse ${v.pulse}, O2 ${v.oxygen}%, Sugar ${v.blood_sugar} mg/dL`).join('\n')
  }

  const formatMedicines = () => {
    if (!medicines?.length) return 'No active medicines.'
    return medicines.map((m: {medicine_name: string; dose: string | null; frequency: string | null}) => `- ${m.medicine_name}: ${m.dose ?? ''} (${m.frequency ?? ''})`).join('\n')
  }

  const formatDocs = () => {
    if (!documents?.length) return 'No recent health reports analysed.'
    return documents.map((d: {document_category: string | null; ai_analysis: string | null; created_at: string}) => `- ${d.document_category ?? 'Document'} (${new Date(d.created_at).toLocaleDateString()}): ${d.ai_analysis || 'No summary available'}`).join('\n')
  }

  const systemPrompt = `You are Slyceai, a knowledgeable and compassionate personal health assistant built for Indian users.

User Profile:
- Name: ${profile?.name ?? 'User'}
- Gender: ${profile?.gender ?? 'Not specified'}
- Diet: ${profile?.food_preference ?? 'vegetarian'}
- Allergies: ${profile?.allergies?.join(', ') || 'None known'}
- Location: ${profile?.state ?? profile?.region ?? 'India'}

Recent Vitals:
${formatVitals()}

Active Medicines:
${formatMedicines()}

Recent Health Reports:
${formatDocs()}

Guidelines:
1. Be warm, empathetic, and culturally aware of Indian dietary and lifestyle practices
2. Reference Ayurvedic wisdom alongside modern medicine when appropriate
3. Always recommend consulting a doctor for serious symptoms
4. Provide practical advice that considers Indian dietary patterns, seasonal foods, and regional practices
5. Keep responses concise but thorough — use bullet points for clarity
6. Never diagnose — provide information and guidance only
7. If asked about diet, consider the user's food preferences and allergies
8. Rely on the user's provided vitals, medicines, and reports to answer questions personally when relevant
9. Respond in a friendly, conversational tone

Remember: You are a health companion, not a replacement for medical care.`

  const messages = [
    ...(history ?? []).reverse().map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  try {
    const response = await ai.chat(messages, systemPrompt)

    // Save to chat history
    await supabase.from('chat_history').insert([
      { user_id: user.id, session_id: sessionId, role: 'user', content: message },
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
  } catch (err) {
    return NextResponse.json({ error: 'Failed to clear chat' }, { status: 500 })
  }
}
