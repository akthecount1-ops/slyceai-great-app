import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { storage } from '@/lib/providers'

export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { docId, filePath } = await request.json()
    if (!docId || !filePath) {
        return NextResponse.json({ error: 'Document ID and file path required' }, { status: 400 })
    }

    try {
        // 1. Delete from storage (AWS S3 or Supabase)
        await storage.delete('documents', filePath)

        // 2. Delete from database
        const { error: dbError } = await supabase
            .from('documents')
            .delete()
            .eq('id', docId)
            .eq('user_id', user.id)

        if (dbError) throw dbError

        return NextResponse.json({ success: true })
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'Deletion failed'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
