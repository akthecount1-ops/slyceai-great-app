import { createServiceClient } from '@/lib/supabase/server'

interface ExportFilters {
  condition?: string
  category?: string
  region?: string
  state?: string
  ageRange?: string
  gender?: string
  minQuality?: number
  maxQuality?: number
  startDate?: string
  endDate?: string
  verificationStatus?: 'both' | 'patient_only' | 'unverified'
}

export async function exportDataset(
  filters: ExportFilters = {},
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const supabase = createServiceClient()
  let query = supabase.from('dataset_contributions').select('*').eq('is_active', true)

  if (filters.condition) query = query.ilike('condition_name', `%${filters.condition}%`)
  if (filters.category) query = query.eq('condition_category', filters.category)
  if (filters.region) query = query.eq('region', filters.region)
  if (filters.state) query = query.eq('state', filters.state)
  if (filters.gender) query = query.eq('gender', filters.gender)
  if (filters.minQuality) query = query.gte('quality_score', filters.minQuality)
  if (filters.maxQuality) query = query.lte('quality_score', filters.maxQuality)
  if (filters.startDate) query = query.gte('contributed_at', filters.startDate)
  if (filters.endDate) query = query.lte('contributed_at', filters.endDate)
  if (filters.verificationStatus === 'both') query = query.eq('both_verified', true)

  const { data, error } = await query
  if (error) throw new Error(`Export error: ${error.message}`)

  const rows = data ?? []

  if (format === 'json') {
    return JSON.stringify(rows, null, 2)
  }

  // CSV export
  if (rows.length === 0) return 'No data found'
  const headers = Object.keys(rows[0])
  const csvLines = [
    headers.join(','),
    ...rows.map((row: any) =>
      headers.map((h) => {
        const val = (row as Record<string, unknown>)[h]
        if (val === null || val === undefined) return ''
        if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`
        return `"${String(val).replace(/"/g, '""')}"`
      }).join(',')
    ),
  ]
  return csvLines.join('\n')
}

export async function exportUsers(
  filters: { role?: string; region?: string; state?: string } = {},
  format: 'json' | 'csv' = 'csv'
): Promise<string> {
  const supabase = createServiceClient()
  let query = supabase.from('profiles').select('id, name, gender, region, state, city, role, onboarding_complete, created_at')

  if (filters.role) query = query.eq('role', filters.role)
  if (filters.region) query = query.eq('region', filters.region)
  if (filters.state) query = query.eq('state', filters.state)

  const { data, error } = await query
  if (error) throw new Error(`Export users error: ${error.message}`)

  const rows = data ?? []
  if (format === 'json') return JSON.stringify(rows, null, 2)

  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const csvLines = [
    headers.join(','),
    ...rows.map((row: any) =>
      headers.map((h) => `"${String((row as Record<string, unknown>)[h] ?? '').replace(/"/g, '""')}"`).join(',')
    ),
  ]
  return csvLines.join('\n')
}
