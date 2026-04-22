import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { AuthProvider } from '../interfaces'

export class SupabaseAuthProvider implements AuthProvider {
  private getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
    return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
  }

  private async getServerClient() {
    const cookieStore = await cookies()
    return createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              )
            } catch {
              // Called from Server Component — ignore
            }
          },
        },
      }
    )
  }

  async signUp(
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ): Promise<{ userId: string }> {
    const client = this.getAdminClient()
    const { data, error } = await client.auth.admin.createUser({
      email,
      password,
      user_metadata: metadata,
      email_confirm: false,
    })
    if (error) throw new Error(`Auth signUp error: ${error.message}`)
    return { userId: data.user.id }
  }

  async signIn(email: string, password: string): Promise<{ token: string; userId: string }> {
    const supabase = await this.getServerClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw new Error(`Auth signIn error: ${error.message}`)
    return {
      token: data.session?.access_token ?? '',
      userId: data.user?.id ?? '',
    }
  }

  async signOut(): Promise<void> {
    const supabase = await this.getServerClient()
    const { error } = await supabase.auth.signOut()
    if (error) throw new Error(`Auth signOut error: ${error.message}`)
  }

  async getUser(): Promise<{ id: string; email: string } | null> {
    const supabase = await this.getServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return { id: user.id, email: user.email ?? '' }
  }

  async resetPassword(email: string): Promise<void> {
    const supabase = await this.getServerClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`,
    })
    if (error) throw new Error(`Auth resetPassword error: ${error.message}`)
  }
}
