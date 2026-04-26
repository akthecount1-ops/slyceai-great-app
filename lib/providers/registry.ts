/**
 * PROVIDER REGISTRY
 * ==================
 * This is the ONLY file that imports vendor implementations.
 * To swap a provider, change ONE import and ONE constructor call here.
 * Nothing else in the application changes.
 */

import { SupabaseDatabaseProvider } from './implementations/supabase-database'
import { SupabaseStorageProvider } from './implementations/supabase-storage'
import { SupabaseAuthProvider } from './implementations/supabase-auth'
import { ResendEmailProvider } from './implementations/resend-email'
import { BedrockAIProvider } from './implementations/bedrock-ai'

import type {
  DatabaseProvider,
  StorageProvider,
  EmailProvider,
  AIProvider,
  AuthProvider,
} from './interfaces'

// ---- ACTIVE PROVIDERS ----
// To swap back to OpenRouter:
//   import { OpenRouterAIProvider } from './implementations/openrouter-ai'
//   export const ai: AIProvider = new OpenRouterAIProvider()

export const db: DatabaseProvider = new SupabaseDatabaseProvider()
export const storage: StorageProvider = new SupabaseStorageProvider()
export const email: EmailProvider = new ResendEmailProvider()
export const ai: AIProvider = new BedrockAIProvider() // AWS Bedrock — Claude Sonnet 4.5 (ap-south-1)
export const auth: AuthProvider = new SupabaseAuthProvider()
