import { createServiceClient } from '@/lib/supabase/server'

/**
 * logAdminAction — writes to admin_audit_log.
 * Call this on every admin mutation action.
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetTable: string | null,
  targetId: string | null,
  details?: Record<string, unknown>,
  ipAddress?: string
): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      action,
      target_table: targetTable,
      target_id: targetId,
      details: details ?? null,
      ip_address: ipAddress ?? null,
    })
  } catch (err) {
    // Non-fatal — log to console but don't break the request
    console.error('[Audit] Failed to write audit log:', err)
  }
}
