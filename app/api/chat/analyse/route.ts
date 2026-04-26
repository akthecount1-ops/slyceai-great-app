export const runtime = 'nodejs'

import { createClient as createServerClientHelper } from '@/lib/supabase/server'
import { ai } from '@/lib/providers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
const DOC_TYPES   = ['application/pdf', 'text/plain', 'text/csv', 'text/html',
                     'application/msword',
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document']

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const supabase = await createServerClientHelper()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse multipart form data
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file      = formData.get('file') as File | null
  const message   = (formData.get('message') as string | null)?.trim() || ''
  const sessionId = (formData.get('sessionId') as string | null)?.trim() || ''

  if (!file)      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (!sessionId) return NextResponse.json({ error: 'Session ID required' }, { status: 400 })

  const mimeType = file.type || 'application/octet-stream'

  // Validate file type
  const isImage    = IMAGE_TYPES.includes(mimeType)
  const isDocument = DOC_TYPES.includes(mimeType)
  if (!isImage && !isDocument) {
    return NextResponse.json(
      { error: `Unsupported file type: ${mimeType}. Please upload a PDF, image (JPG/PNG/WebP), plain text, or Word document.` },
      { status: 415 }
    )
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)} MB.` },
      { status: 413 }
    )
  }

  // Convert to base64
  const arrayBuffer = await file.arrayBuffer()
  const base64      = Buffer.from(arrayBuffer).toString('base64')

  // Build a sensible prompt
  const userPrompt = message
    || (isImage
      ? 'Please analyse this image. If it is a medical scan, lab report, or prescription, explain the key findings clearly in plain language.'
      : 'Please analyse this document and explain the key findings in plain language, highlighting anything medically significant.')

  // The display message saved to chat history (user side)
  const displayMessage = message
    ? `[Attached: ${file.name}]\n${message}`
    : `[Attached: ${file.name}] Please analyse this ${isImage ? 'image' : 'document'} and explain the key findings.`

  try {
    let result: { content: string; usage: unknown }

    if (isImage) {
      result = await ai.analyseImage(base64, userPrompt)
    } else {
      result = await ai.analyseDocument(base64, mimeType, userPrompt)
    }

    // Save both turns to chat history
    await supabase.from('chat_history').insert([
      { user_id: user.id, session_id: sessionId, role: 'user',      content: displayMessage },
      { user_id: user.id, session_id: sessionId, role: 'assistant', content: result.content },
    ])

    return NextResponse.json({ content: result.content, usage: result.usage })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI analysis error'
    console.error('[/api/chat/analyse]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
