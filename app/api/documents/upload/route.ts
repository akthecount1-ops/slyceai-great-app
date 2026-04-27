import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { storage } from '@/lib/providers'

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File is too large. Max 10MB.' }, { status: 400 })
  }

  const ext = file.name.split('.').pop()?.toLowerCase()
  const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'webp']
  if (!ext || !allowedTypes.includes(ext)) {
    return NextResponse.json({ error: 'Unsupported file type. Use PDF, JPG, PNG, or WebP.' }, { status: 400 })
  }

  const filePath = `${user.id}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`

  try {
    // Use the provider-agnostic storage utility
    await storage.upload('documents', filePath, file, { contentType: file.type })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Storage upload failed'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Infer category from filename
  const filename = file.name.toLowerCase()
  let category = 'Other'
  if (filename.includes('prescription') || filename.includes('rx')) category = 'Prescription'
  else if (filename.includes('report') || filename.includes('result')) category = 'Lab Result'
  else if (filename.includes('scan') || filename.includes('mri') || filename.includes('xray') || filename.includes('ct')) category = 'Scan'
  else if (filename.includes('insurance')) category = 'Insurance'
  else if (ext === 'pdf') category = 'Report'

  await supabase.from('documents').insert({
    user_id: user.id,
    filename: file.name,
    file_path: filePath,
    file_type: file.type,
    file_size: file.size,
    document_category: category,
  })

  return NextResponse.json({ success: true, filePath })
}

