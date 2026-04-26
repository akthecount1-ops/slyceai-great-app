/**
 * Arogya Health Platform — Supabase DB Helper (server/db.js)
 *
 * All functions are ASYNCHRONOUS and use Supabase client.
 */

"use strict";

const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ══════════════════════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
// ══════════════════════════════════════════════════════════════════════════════

async function getSymptomById(id) {
  const { data } = await supabase.from('kb_symptoms').select('*').eq('id', id).single();
  return data;
}

async function searchSymptoms(query) {
  const { data } = await supabase.from('kb_symptoms')
    .select('*')
    .or(`label.ilike.%${query}%,aliases.cs.{${query}}`)
    .order('label');
  return data || [];
}

async function getRedFlagSymptoms() {
  const { data } = await supabase.from('kb_symptoms').select('*').eq('red_flag', true).order('label');
  return data || [];
}

async function getMedicineBySlug(slug) {
  const { data } = await supabase.from('kb_medicines').select('*').eq('slug', slug).single();
  return data;
}

async function searchMedicines(query) {
  const { data } = await supabase.from('kb_medicines')
    .select('*')
    .or(`name.ilike.%${query}%,generic_name.ilike.%${query}%`)
    .order('name');
  return data || [];
}

async function getMedicineInteractions(slugs) {
  if (!slugs || slugs.length < 2) return [];
  const results = [];
  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = await getMedicineBySlug(slugs[i]);
      if (!a) continue;
      const interactions = (a.drug_interactions || []).filter(it => it.toLowerCase().includes(slugs[j].replace(/_/g, "").toLowerCase()));
      const b_row = await getMedicineBySlug(slugs[j]);
      const b_ints = b_row ? (b_row.drug_interactions || []).filter(it => it.toLowerCase().includes((a.generic_name || a.name || "").toLowerCase().split(" ")[0])) : [];
      const combined = [...new Set([...interactions, ...b_ints])];
      if (combined.length > 0) results.push({ medicine_a: slugs[i], medicine_b: slugs[j], interactions: combined });
    }
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
//  PATIENT PROFILES
// ══════════════════════════════════════════════════════════════════════════════

async function getPatient(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single();
  return data;
}

async function createPatient({ patient_id, name }) {
  const { data } = await supabase.from('profiles').upsert({ id: patient_id, name }).select().single();
  return data;
}

async function updatePatient(userId, data) {
  const { data: updated } = await supabase.from('profiles').update(data).eq('id', userId).select().single();
  return updated;
}

/**
 * Compute age from a DOB string (yyyy-mm-dd) or age field
 */
function computeAge(dob, ageFallback) {
  if (!dob) return ageFallback || null;
  try {
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  } catch {
    return ageFallback || null;
  }
}

/**
 * Compute BMI and category
 */
function computeBMI(weight_kg, height_cm) {
  if (!weight_kg || !height_cm) return { bmi: null, category: null };
  const h_m = height_cm / 100;
  const bmi = parseFloat((weight_kg / (h_m * h_m)).toFixed(1));
  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi, category };
}

/**
 * Cross-check drug interactions across all active medicines
 * Returns array of { medicine_a, medicine_b, warning }
 */
function crossCheckDrugInteractions(medications) {
  const warnings = [];
  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const a = medications[i];
      const b = medications[j];
      const aInts = a.drug_interactions || [];
      const bInts = b.drug_interactions || [];
      const bName = (b.medicine_name || b.generic_name || '').toLowerCase();
      const aName = (a.medicine_name || a.generic_name || '').toLowerCase();
      const matchA = aInts.find(x => bName && x.toLowerCase().includes(bName.split(' ')[0]));
      const matchB = bInts.find(x => aName && x.toLowerCase().includes(aName.split(' ')[0]));
      if (matchA) {
        warnings.push({ medicine_a: a.medicine_name, medicine_b: b.medicine_name, warning: matchA });
      } else if (matchB) {
        warnings.push({ medicine_a: b.medicine_name, medicine_b: a.medicine_name, warning: matchB });
      }
    }
  }
  return warnings;
}

/**
 * getPatientFullProfile — primary function used by AI pipeline
 * Runs all queries in parallel for performance.
 */
async function getPatientFullProfile(userId) {
  const [
    profileRes,
    vitalsRes,
    medsRes,
    journalRes,
    docsRes,
    vitalsHistoryRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('vitals').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(1),
    supabase.from('medicines').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('symptom_journal').select('*').eq('user_id', userId).order('journal_date', { ascending: false }).limit(5),
    supabase.from('documents').select('filename, document_category, ai_analysis').eq('user_id', userId).order('created_at', { ascending: false }).limit(3),
    supabase.from('vitals').select('bp_systolic,bp_diastolic,pulse,oxygen,blood_sugar,recorded_at').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(7),
  ]);

  const profile = profileRes.data;
  if (!profile) return null;

  const age = computeAge(profile.date_of_birth, profile.age);
  const { bmi, category: bmiCategory } = computeBMI(profile.weight_kg, profile.height_cm);
  const medications = medsRes.data || [];
  const latestVitals = vitalsRes.data?.[0] || null;
  const vitalsHistory = vitalsHistoryRes.data || [];

  // Cross-check drug interactions client-side
  const drugInteractions = crossCheckDrugInteractions(medications);

  // Extract known diseases from medical_history or profile columns
  const mh = profile.medical_history || {};
  const knownDiseases = mh.known_diseases || profile.known_diseases || [];
  const allergies = mh.allergies || profile.allergies || [];
  const pastSurgeries = mh.past_surgeries || profile.past_surgeries || [];
  const familyHistory = mh.family_history || profile.family_history || [];

  // Consolidate symptoms from recent journal entries
  const recentSymptoms = journalRes.data || [];
  const allSymptoms = [...new Set(
    recentSymptoms.flatMap(j => j.symptoms || [])
  )];

  return {
    // Basic profile
    id: profile.id,
    name: profile.name || 'Patient',
    age,
    gender: profile.gender,
    weight_kg: profile.weight_kg,
    height_cm: profile.height_cm,
    bmi,
    bmiCategory,
    blood_group: profile.blood_group,
    phone: profile.phone,
    date_of_birth: profile.date_of_birth,
    created_at: profile.created_at,

    // for backward compat
    patient_id: profile.id,
    onboarding: profile.onboarding_progress || { current_step: 1 },
    chat_ready: !!profile.chat_ready,
    onboarding_complete: !!profile.onboarding_complete,

    // Extended medical data
    medical_history: {
      known_diseases: knownDiseases,
      allergies,
      past_surgeries: pastSurgeries,
      family_history: familyHistory,
      ...mh,
    },
    active_medications: medications,
    latest_vitals: latestVitals,
    vitals_history: vitalsHistory,
    recent_symptoms: recentSymptoms,
    all_symptoms: allSymptoms,
    reports: docsRes.data || [],
    drug_interactions: drugInteractions,
  };
}

async function addVitals(userId, data) {
  const { blood_pressure, pulse, spo2, blood_sugar, notes } = data;
  const [systolic, diastolic] = (blood_pressure || "120/80").split('/').map(Number);
  const { data: inserted } = await supabase.from('vitals').insert([{
    user_id: userId,
    bp_systolic: systolic,
    bp_diastolic: diastolic,
    pulse,
    oxygen: spo2,
    blood_sugar,
    notes,
    recorded_at: new Date().toISOString()
  }]).select().single();
  return inserted;
}

async function addMedication(userId, data) {
  const { data: inserted } = await supabase.from('medicines').insert([{
    user_id: userId,
    medicine_name: data.medicine_name,
    dose: data.dose,
    frequency: data.frequency,
    is_active: true
  }]).select().single();
  return inserted;
}

async function addSymptom(userId, data) {
  const { data: inserted } = await supabase.from('symptom_journal').insert([{
    user_id: userId,
    journal_date: new Date().toISOString().split('T')[0],
    symptoms: [data.symptom_label],
    notes: data.notes
  }]).select().single();
  return inserted;
}

async function markStepDone(userId, step) {
  const { data: profile } = await supabase.from('profiles').select('onboarding_progress').eq('id', userId).single();
  const prog = profile?.onboarding_progress || { current_step: 1 };
  prog[`step_${step}_done`] = true;
  prog.current_step = Math.max(prog.current_step, step + 1);

  const updates = { onboarding_progress: prog };
  if (prog.current_step >= 7) {
    updates.chat_ready = true;
    updates.onboarding_complete = true;
  }

  await supabase.from('profiles').update(updates).eq('id', userId);
}

module.exports = {
  getSymptomById, searchSymptoms, getRedFlagSymptoms,
  getMedicineBySlug, searchMedicines, getMedicineInteractions,
  getPatient, createPatient, updatePatient, getPatientFullProfile,
  addVitals, addMedication, addSymptom, markStepDone,
  computeAge, computeBMI, crossCheckDrugInteractions,
};
