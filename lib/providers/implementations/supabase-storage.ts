import { createClient } from '@supabase/supabase-js'
import type { StorageProvider } from '../interfaces'

export class SupabaseStorageProvider implements StorageProvider {
  private client

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    this.client = createClient(url, key)
  }

  async upload(
    bucket: string,
    path: string,
    file: Buffer | Blob,
    options?: { contentType?: string }
  ): Promise<{ path: string; url: string }> {
    const { error } = await this.client.storage
      .from(bucket)
      .upload(path, file, { contentType: options?.contentType, upsert: true })
    if (error) throw new Error(`Storage upload error: ${error.message}`)

    const { data: urlData } = this.client.storage.from(bucket).getPublicUrl(path)
    return { path, url: urlData.publicUrl }
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)
    if (error) throw new Error(`Storage signed URL error: ${error.message}`)
    return data.signedUrl
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([path])
    if (error) throw new Error(`Storage delete error: ${error.message}`)
  }

  async list(bucket: string, prefix?: string): Promise<{ name: string; size: number }[]> {
    const { data, error } = await this.client.storage.from(bucket).list(prefix)
    if (error) throw new Error(`Storage list error: ${error.message}`)
    return (data ?? []).map((f) => ({ name: f.name, size: f.metadata?.size ?? 0 }))
  }
}
