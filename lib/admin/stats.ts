import { createClient as createServiceClient } from '@supabase/supabase-js'

function getClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function getUserStats() {
  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalUsers },
    { count: activeUsers },
    { count: totalVitals },
    { count: totalDocuments },
    { count: verifiedJourneys },
    { count: datasetContributions },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('updated_at', thirtyDaysAgo),
    supabase.from('vitals').select('*', { count: 'exact', head: true }),
    supabase.from('documents').select('*', { count: 'exact', head: true }),
    supabase.from('health_journeys').select('*', { count: 'exact', head: true }).eq('doctor_verified', true),
    supabase.from('dataset_contributions').select('*', { count: 'exact', head: true }).eq('is_active', true),
  ])

  return {
    totalUsers: totalUsers ?? 0,
    activeUsers: activeUsers ?? 0,
    totalVitals: totalVitals ?? 0,
    totalDocuments: totalDocuments ?? 0,
    verifiedJourneys: verifiedJourneys ?? 0,
    datasetContributions: datasetContributions ?? 0,
  }
}

export async function getAIUsageStats() {
  const supabase = getClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const { data: todayCalls } = await supabase
    .from('api_usage_log')
    .select('input_tokens, output_tokens, total_tokens, feature, response_time_ms, status')
    .gte('created_at', today.toISOString())

  const { data: monthCalls } = await supabase
    .from('api_usage_log')
    .select('total_tokens')
    .gte('created_at', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())

  const totalCallsToday = todayCalls?.length ?? 0
  const totalTokensToday = todayCalls?.reduce((a, b) => a + (b.total_tokens ?? 0), 0) ?? 0
  const totalTokensMonth = monthCalls?.reduce((a, b) => a + (b.total_tokens ?? 0), 0) ?? 0
  const avgResponseTime = totalCallsToday > 0
    ? Math.round((todayCalls?.reduce((a, b) => a + (b.response_time_ms ?? 0), 0) ?? 0) / totalCallsToday)
    : 0
  const errorCount = todayCalls?.filter((c) => c.status === 'error').length ?? 0
  const errorRate = totalCallsToday > 0 ? Math.round((errorCount / totalCallsToday) * 100) : 0

  // Cost estimate: Claude claude-opus-4-5 pricing (input $3/M, output $15/M tokens)
  const inputTokensMonth = monthCalls?.length ?? 0
  const estimatedCost = ((totalTokensMonth * 0.6 * 3) + (totalTokensMonth * 0.4 * 15)) / 1_000_000

  return {
    totalCallsToday,
    totalTokensToday,
    totalTokensMonth,
    avgResponseTime,
    errorRate,
    estimatedCost: estimatedCost.toFixed(2),
  }
}

export async function getJourneyStats() {
  const supabase = getClient()

  const { data } = await supabase
    .from('health_journeys')
    .select('condition_category, current_status, patient_verified, doctor_verified')

  const categories: Record<string, number> = {}
  const statusDist: Record<string, number> = {}
  let bothVerified = 0

  for (const j of data ?? []) {
    const cat = j.condition_category ?? 'Other'
    categories[cat] = (categories[cat] ?? 0) + 1
    statusDist[j.current_status] = (statusDist[j.current_status] ?? 0) + 1
    if (j.patient_verified && j.doctor_verified) bothVerified++
  }

  return { categories, statusDist, bothVerified, total: data?.length ?? 0 }
}
