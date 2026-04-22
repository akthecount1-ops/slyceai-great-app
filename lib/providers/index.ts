/**
 * /lib/providers/index.ts
 * ========================
 * Public API for all providers.
 * Application code imports ONLY from here:
 *   import { db, storage, email, ai, auth } from '@/lib/providers'
 */
export { db, storage, email, ai, auth } from './registry'
export type {
  DatabaseProvider,
  StorageProvider,
  EmailProvider,
  AIProvider,
  AuthProvider,
  AIMessage,
  AIUsageStats,
} from './interfaces'
