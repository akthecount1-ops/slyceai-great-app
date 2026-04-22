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
import { OpenRouterAIProvider } from './implementations/openrouter-ai'

import type {
  DatabaseProvider,
  StorageProvider,
  EmailProvider,
  AIProvider,
  AuthProvider,
} from './interfaces'

// ---- ACTIVE PROVIDERS ----
// To swap, e.g. to AWS S3:
//   import { AWSS3StorageProvider } from './implementations/aws-s3-storage'
//   export const storage: StorageProvider = new AWSS3StorageProvider()

export const db: DatabaseProvider = new SupabaseDatabaseProvider()
export const storage: StorageProvider = new SupabaseStorageProvider()
export const email: EmailProvider = new ResendEmailProvider()
export const ai: AIProvider = new OpenRouterAIProvider() // Now using Nemotron via OpenRouter
export const auth: AuthProvider = new SupabaseAuthProvider()
