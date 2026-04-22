import { createClient } from '@supabase/supabase-js'
import type { DatabaseProvider } from '../interfaces'

/**
 * Supabase implementation of DatabaseProvider.
 * Swap this by replacing the import in /lib/providers/registry.ts — nothing else changes.
 */
export class SupabaseDatabaseProvider implements DatabaseProvider {
  private client

  constructor() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) throw new Error('Supabase credentials not configured')
    this.client = createClient(url, key)
  }

  async query(table: string, filters?: Record<string, unknown>): Promise<unknown[]> {
    let q = this.client.from(table).select('*')
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null) {
          q = q.eq(key, value) as typeof q
        }
      }
    }
    const { data, error } = await q
    if (error) throw new Error(`DB query error on ${table}: ${error.message}`)
    return data ?? []
  }

  async findOne(table: string, id: string): Promise<unknown | null> {
    const { data, error } = await this.client.from(table).select('*').eq('id', id).single()
    if (error && error.code !== 'PGRST116') throw new Error(`DB findOne error on ${table}: ${error.message}`)
    return data ?? null
  }

  async insert(table: string, data: Partial<Record<string, unknown>>): Promise<unknown> {
    const { data: inserted, error } = await this.client.from(table).insert(data).select().single()
    if (error) throw new Error(`DB insert error on ${table}: ${error.message}`)
    return inserted
  }

  async update(table: string, id: string, data: Partial<Record<string, unknown>>): Promise<unknown> {
    const { data: updated, error } = await this.client
      .from(table)
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()
    if (error) {
      // Fallback without updated_at if column doesn't exist
      const { data: updated2, error: error2 } = await this.client
        .from(table)
        .update(data)
        .eq('id', id)
        .select()
        .single()
      if (error2) throw new Error(`DB update error on ${table}: ${error2.message}`)
      return updated2
    }
    return updated
  }

  async delete(table: string, id: string): Promise<void> {
    const { error } = await this.client.from(table).delete().eq('id', id)
    if (error) throw new Error(`DB delete error on ${table}: ${error.message}`)
  }

  async rpc(functionName: string, params?: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await this.client.rpc(functionName, params)
    if (error) throw new Error(`DB rpc error on ${functionName}: ${error.message}`)
    return data
  }
}
