import { createServiceClient } from '@/lib/supabase/server'

// ---- FEATURE FLAG DEFAULTS ----
const FLAG_DEFAULTS: Record<string, boolean | string | number> = {
  ayurvedic_suggestions: true,
  dataset_contribution: true,
  doctor_verification: true,
  public_insights: true,
  document_upload: true,
  admin_panel: true,
  maintenance_mode: false,
  new_user_registration: true,
}

export async function getFeatureFlag(key: string): Promise<boolean | string | number> {
  try {
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', `flag_${key}`)
      .single()
    if (error || !data) return FLAG_DEFAULTS[key] ?? false
    return data.value as boolean | string | number
  } catch {
    return FLAG_DEFAULTS[key] ?? false
  }
}

export async function setFeatureFlag(
  key: string,
  value: boolean | string | number,
  updatedBy: string
): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from('system_settings').upsert({
    key: `flag_${key}`,
    value,
    description: `Feature flag: ${key}`,
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  })
}

export async function getAllFlags(): Promise<Record<string, boolean | string | number>> {
  try {
    const supabase = createServiceClient()
    const { data } = await supabase
      .from('system_settings')
      .select('key, value')
      .like('key', 'flag_%')

    const flags = { ...FLAG_DEFAULTS }
    if (data) {
      for (const row of data) {
        const flagKey = (row.key as string).replace('flag_', '')
        flags[flagKey] = row.value as boolean | string | number
      }
    }
    return flags
  } catch {
    return FLAG_DEFAULTS
  }
}
