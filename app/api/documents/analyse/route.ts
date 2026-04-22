import { createClient } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { documentId } = await request.json()

  const { data: doc } = await supabase
    .from('documents')
    .select('filename, document_category, file_type')
    .eq('id', documentId)
    .eq('user_id', user.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })

  const prompt = `Analyse a medical document titled "${doc.filename}" of category "${doc.document_category ?? 'unknown'}". 
  
  As an experienced Indian doctor, provide:
  1. What type of medical document this appears to be
  2. Key metrics or values typically found in this type of document and what they mean
  3. General health insights from documents of this type
  4. What follow-up actions the patient should consider
  5. Any red flags to watch for
  
  Note: This is a document analysis assistance tool. Always recommend consulting with a qualified doctor for medical advice.
  Keep the response concise (under 300 words), practical, and in simple language.`

  try {
    const response = await ai.chat(
      [{ role: 'user', content: prompt }],
      'You are a helpful medical document assistant for Indian patients. Provide clear, actionable insights from medical documents.'
    )

    await supabase
      .from('documents')
      .update({ ai_analysis: response.content })
      .eq('id', documentId)
      .eq('user_id', user.id)

    return NextResponse.json({ analysis: response.content })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
