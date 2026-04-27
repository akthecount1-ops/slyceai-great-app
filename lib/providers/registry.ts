/**
 * PROVIDER REGISTRY
 * ==================
 * This is the ONLY file that imports vendor implementations.
 * To swap a provider, change ONE import and ONE constructor call here.
 * Nothing else in the application changes.
 */

import { SupabaseDatabaseProvider } from './implementations/supabase-database'
import { AWSS3StorageProvider } from './implementations/aws-s3-storage'
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
export const db: DatabaseProvider = new SupabaseDatabaseProvider()
export const storage: StorageProvider = new AWSS3StorageProvider()
export const email: EmailProvider = new ResendEmailProvider()
export const ai: AIProvider = new BedrockAIProvider()
export const auth: AuthProvider = new SupabaseAuthProvider()
