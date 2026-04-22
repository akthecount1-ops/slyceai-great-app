// ============================================================
// AROGYA — TYPESCRIPT TYPES
// Mirrors the Supabase schema exactly.
// ============================================================

export type UserRole = 'user' | 'admin' | 'superadmin'
export type ChatRole = 'user' | 'assistant'
export type JourneyStatus = 'active' | 'recovered' | 'managing' | 'relapsed'
export type NotificationType = 'info' | 'warning' | 'success' | 'reminder'
export type AIStatus = 'success' | 'error'

// ---- PROFILES ----
export interface Profile {
  id: string
  name: string
  date_of_birth: string | null
  gender: string | null
  food_preference: string
  allergies: string[] | null
  region: string | null
  state: string | null
  city: string | null
  onboarding_complete: boolean
  role: UserRole
  created_at: string
  updated_at: string
}

// ---- VITALS ----
export interface Vital {
  id: string
  user_id: string
  bp_systolic: number | null
  bp_diastolic: number | null
  pulse: number | null
  oxygen: number | null
  blood_sugar: number | null
  notes: string | null
  recorded_at: string
}

// ---- DOCUMENTS ----
export interface Document {
  id: string
  user_id: string
  filename: string
  file_path: string
  file_type: string | null
  document_category: string | null
  ai_analysis: string | null
  file_size: number | null
  created_at: string
}

// ---- SYMPTOM JOURNAL ----
export interface SymptomJournal {
  id: string
  user_id: string
  journal_date: string
  pain_level: number | null
  energy_level: number | null
  mood_level: number | null
  symptoms: string[] | null
  notes: string | null
  created_at: string
}

// ---- MEDICINES ----
export interface Medicine {
  id: string
  user_id: string
  medicine_name: string
  dose: string | null
  frequency: string | null
  time_of_day: string[] | null
  start_date: string | null
  is_active: boolean
  notes: string | null
  created_at: string
}

// ---- MEDICINE LOGS ----
export interface MedicineLog {
  id: string
  medicine_id: string
  user_id: string
  log_date: string
  taken: boolean
}

// ---- CHAT HISTORY ----
export interface ChatMessage {
  id: string
  user_id: string
  role: ChatRole
  content: string
  created_at: string
}

// ---- DAILY PLANS ----
export interface DailyPlan {
  id: string
  user_id: string
  plan_date: string
  plan_items: PlanItem[]
  generated_at: string
}

export interface PlanItem {
  time: string
  type: 'meal' | 'exercise' | 'medicine' | 'rest' | 'other'
  title: string
  description: string
  duration?: number
  calories?: number
}

// ---- HEALTH JOURNEYS ----
export interface HealthJourney {
  id: string
  user_id: string
  title: string
  condition_name: string
  condition_category: string | null
  start_date: string | null
  end_date: string | null
  current_status: JourneyStatus
  recovery_percentage: number
  patient_verified: boolean
  patient_verified_at: string | null
  doctor_verified: boolean
  doctor_verified_at: string | null
  doctor_name: string | null
  doctor_registration_number: string | null
  doctor_speciality: string | null
  doctor_email: string | null
  consent_given: boolean
  anonymised_for_dataset: boolean
  created_at: string
  updated_at: string
}

// ---- JOURNEY EVENTS ----
export interface JourneyEvent {
  id: string
  journey_id: string
  user_id: string
  event_type: string
  event_date: string
  title: string
  description: string | null
  severity: number | null
  verified_by_doctor: boolean
  supporting_document_id: string | null
  created_at: string
}

// ---- JOURNEY TREATMENTS ----
export interface JourneyTreatment {
  id: string
  journey_id: string
  treatment_type: string | null
  treatment_name: string
  start_date: string | null
  end_date: string | null
  effectiveness_score: number | null
  doctor_recommended: boolean
  notes: string | null
}

// ---- JOURNEY OUTCOMES ----
export interface JourneyOutcome {
  id: string
  journey_id: string
  outcome_date: string
  recovery_percentage: number | null
  quality_of_life_score: number | null
  symptoms_remaining: string[] | null
  patient_notes: string | null
  doctor_notes: string | null
  verified_by_doctor: boolean
}

// ---- DOCTOR VERIFICATIONS ----
export interface DoctorVerification {
  id: string
  journey_id: string
  doctor_name: string
  doctor_registration_number: string | null
  doctor_email: string
  doctor_speciality: string | null
  verification_token: string
  token_expires_at: string
  is_verified: boolean
  verified_at: string | null
  doctor_notes: string | null
  created_at: string
}

// ---- DATASET CONTRIBUTIONS ----
export interface DatasetContribution {
  id: string
  journey_id: string
  condition_name: string
  condition_category: string | null
  age_range: string | null
  gender: string | null
  region: string | null
  state: string | null
  condition_duration_months: number | null
  treatments_summary: Record<string, unknown> | null
  outcome_summary: Record<string, unknown> | null
  symptom_tags: string[] | null
  quality_score: number | null
  both_verified: boolean
  contributed_at: string
  is_active: boolean
}

// ---- NOTIFICATIONS ----
export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  type: NotificationType | null
  is_read: boolean
  created_at: string
}

// ---- ADMIN AUDIT LOG ----
export interface AdminAuditLog {
  id: string
  admin_id: string | null
  action: string
  target_table: string | null
  target_id: string | null
  details: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ---- SYSTEM SETTINGS ----
export interface SystemSetting {
  key: string
  value: unknown
  description: string | null
  updated_by: string | null
  updated_at: string
}

// ---- API USAGE LOG ----
export interface APIUsageLog {
  id: string
  user_id: string | null
  feature: string
  model: string
  input_tokens: number | null
  output_tokens: number | null
  total_tokens: number | null
  response_time_ms: number | null
  status: AIStatus
  error_message: string | null
  created_at: string
}

// ---- FORM TYPES ----
export interface VitalFormData {
  bp_systolic?: number
  bp_diastolic?: number
  pulse?: number
  oxygen?: number
  blood_sugar?: number
  notes?: string
}

export interface OnboardingFormData {
  name: string
  date_of_birth?: string
  gender?: string
  food_preference: string
  allergies: string[]
  region?: string
  state?: string
  city?: string
}
