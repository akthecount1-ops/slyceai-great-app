/**
 * Arogya Health Platform — Supabase DB Helper (server/db.js)
 * 
 * Migrated from SQLite to Supabase for clean production installation.
 * All functions are now ASYNCHRONOUS.
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

async function getPatientFullProfile(userId) {
  const [profileRes, vitalsRes, medsRes, journalRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).single(),
    supabase.from('vitals').select('*').eq('user_id', userId).order('recorded_at', { ascending: false }).limit(1),
    supabase.from('medicines').select('*').eq('user_id', userId).eq('is_active', true),
    supabase.from('symptom_journal').select('*').eq('user_id', userId).order('journal_date', { ascending: false }).limit(5)
  ]);
  const profile = profileRes.data;
  if (!profile) return null;
  return {
    ...profile,
    patient_id: profile.id,
    medical_history: profile.medical_history || {},
    latest_vitals: vitalsRes.data?.[0] || null,
    active_medications: medsRes.data || [],
    recent_symptoms: journalRes.data || [],
    onboarding: profile.onboarding_progress || { current_step: 1 },
    chat_ready: profile.chat_ready || 0
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
    updates.chat_ready = 1;
    updates.onboarding_complete = 1;
  }
  
  await supabase.from('profiles').update(updates).eq('id', userId);
}

module.exports = {
  getSymptomById, searchSymptoms, getRedFlagSymptoms,
  getMedicineBySlug, searchMedicines, getMedicineInteractions,
  getPatient, createPatient, updatePatient, getPatientFullProfile,
  addVitals, addMedication, addSymptom, markStepDone
};
