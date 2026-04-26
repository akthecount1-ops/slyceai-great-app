/**
 * Arogya Health Platform — SQLite DB Helper (server/db.js)
 *
 * All functions are synchronous (better-sqlite3).
 * Import these anywhere in the Arogya backend.
 *
 * Usage:
 *   const db = require('./server/db');
 *   const symptom = db.getSymptomById('dizziness');
 */

"use strict";

const path     = require("path");
const Database = require("better-sqlite3");

const DB_PATH = path.resolve(process.cwd(), "data", "arogya.db");

/** Lazy singleton — one connection per process */
let _db = null;
function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
  }
  return _db;
}

// ─── JSON helpers ─────────────────────────────────────────────────────────────
const j  = (v) => (v != null ? JSON.stringify(v) : null);
const jP = (v) => {
  if (v == null) return null;
  try { return JSON.parse(v); } catch { return v; }
};

/** Parse all JSON text columns on a row */
function parseArrayCols(row, cols) {
  if (!row) return row;
  const out = { ...row };
  for (const c of cols) out[c] = jP(out[c]);
  return out;
}

const SYMPTOM_JSON_COLS  = ["aliases","severity_levels","commonly_associated_diseases","follow_up_questions"];
const MEDICINE_JSON_COLS = ["uses","dosage_forms","side_effects_common","side_effects_serious",
                            "drug_interactions","food_interactions","contraindications","what_to_avoid"];
const HISTORY_JSON_COLS  = ["known_diseases","past_surgeries","allergies","family_history"];

// ══════════════════════════════════════════════════════════════════════════════
//  KNOWLEDGE BASE
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get a single symptom by its slug id.
 * @param {string} id
 */
function getSymptomById(id) {
  const db  = getDb();
  const row = db.prepare("SELECT * FROM symptoms WHERE id = ?").get(id);
  return parseArrayCols(row, SYMPTOM_JSON_COLS);
}

/**
 * Full-text search across symptom label and aliases.
 * Returns all matching symptom rows.
 * @param {string} query
 */
function searchSymptoms(query) {
  const db  = getDb();
  const q   = `%${query}%`;
  const rows = db.prepare(
    "SELECT * FROM symptoms WHERE label LIKE ? OR aliases LIKE ? ORDER BY label"
  ).all(q, q);
  return rows.map((r) => parseArrayCols(r, SYMPTOM_JSON_COLS));
}

/**
 * Return all symptoms marked as red flags.
 */
function getRedFlagSymptoms() {
  const db  = getDb();
  const rows = db.prepare("SELECT * FROM symptoms WHERE red_flag = 1 ORDER BY label").all();
  return rows.map((r) => parseArrayCols(r, SYMPTOM_JSON_COLS));
}

/**
 * Get a medicine by its slug.
 * @param {string} slug
 */
function getMedicineBySlug(slug) {
  const db  = getDb();
  const row = db.prepare("SELECT * FROM medicines WHERE slug = ?").get(slug);
  return parseArrayCols(row, MEDICINE_JSON_COLS);
}

/**
 * Search medicines by name or generic_name.
 * @param {string} query
 */
function searchMedicines(query) {
  const db   = getDb();
  const q    = `%${query}%`;
  const rows = db.prepare(
    "SELECT * FROM medicines WHERE name LIKE ? OR generic_name LIKE ? ORDER BY name"
  ).all(q, q);
  return rows.map((r) => parseArrayCols(r, MEDICINE_JSON_COLS));
}

/**
 * Given a list of medicine slugs, return all pairwise drug interaction warnings.
 * Returns an array of { medicine_a, medicine_b, interactions } objects.
 * @param {string[]} slugs
 */
function getMedicineInteractions(slugs) {
  if (!slugs || slugs.length < 2) return [];
  const db      = getDb();
  const results = [];

  for (let i = 0; i < slugs.length; i++) {
    for (let j = i + 1; j < slugs.length; j++) {
      const a = getMedicineBySlug(slugs[i]);
      if (!a) continue;
      const interactions = (a.drug_interactions || []).filter((interaction) => {
        const b = slugs[j];
        return interaction.toLowerCase().includes(b.replace(/_/g, "").toLowerCase());
      });

      // Also check medicine b's interactions for medicine a's name
      const b_row  = getMedicineBySlug(slugs[j]);
      const b_ints = b_row
        ? (b_row.drug_interactions || []).filter((i) =>
            i.toLowerCase().includes((a.generic_name || a.name || "").toLowerCase().split(" ")[0])
          )
        : [];

      const combined = [...new Set([...interactions, ...b_ints])];
      if (combined.length > 0) {
        results.push({
          medicine_a:   slugs[i],
          medicine_b:   slugs[j],
          interactions: combined,
        });
      }
    }
  }
  return results;
}

// ══════════════════════════════════════════════════════════════════════════════
//  PATIENT QUERIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get a patient by ID.
 * @param {string} patient_id
 */
function getPatient(patient_id) {
  return getDb().prepare("SELECT * FROM patients WHERE patient_id = ?").get(patient_id) || null;
}

/**
 * Create a new patient record.
 * @param {object} data - { patient_id, name, age, gender, weight_kg, height_cm, email, phone }
 */
function createPatient(data) {
  const db = getDb();
  db.prepare(`
    INSERT INTO patients (patient_id, name, age, gender, weight_kg, height_cm, email, phone)
    VALUES (@patient_id, @name, @age, @gender, @weight_kg, @height_cm, @email, @phone)
  `).run({
    patient_id: data.patient_id,
    name:       data.name       ?? null,
    age:        data.age        ?? null,
    gender:     data.gender     ?? null,
    weight_kg:  data.weight_kg  ?? null,
    height_cm:  data.height_cm  ?? null,
    email:      data.email      ?? null,
    phone:      data.phone      ?? null,
  });
  return getPatient(data.patient_id);
}

/**
 * Update patient fields. Only provided fields are updated.
 * @param {string} patient_id
 * @param {object} data
 */
function updatePatient(patient_id, data) {
  const db      = getDb();
  const allowed = ["name","age","gender","weight_kg","height_cm","email","phone",
                   "onboarding_complete","chat_ready"];
  const sets    = [];
  const params  = {};
  for (const key of allowed) {
    if (key in data) {
      sets.push(`${key} = @${key}`);
      params[key] = data[key];
    }
  }
  if (sets.length === 0) return getPatient(patient_id);
  sets.push("updated_at = datetime('now')");
  params.patient_id = patient_id;
  db.prepare(`UPDATE patients SET ${sets.join(", ")} WHERE patient_id = @patient_id`).run(params);
  return getPatient(patient_id);
}

/**
 * Returns a rich patient profile joining:
 * patients + medical_history + latest vitals + active medications + onboarding progress
 * @param {string} patient_id
 */
function getPatientFullProfile(patient_id) {
  const db      = getDb();
  const patient = getPatient(patient_id);
  if (!patient) return null;

  const history = db.prepare(
    "SELECT * FROM patient_medical_history WHERE patient_id = ?"
  ).get(patient_id);

  const latestVitals = db.prepare(
    "SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1"
  ).get(patient_id);

  const activeMeds = db.prepare(
    "SELECT * FROM patient_medications WHERE patient_id = ? AND active = 1"
  ).all(patient_id);

  const onboarding = db.prepare(
    "SELECT * FROM onboarding_progress WHERE patient_id = ?"
  ).get(patient_id);

  return {
    ...patient,
    medical_history:    history ? parseArrayCols(history, HISTORY_JSON_COLS) : null,
    latest_vitals:      latestVitals || null,
    active_medications: activeMeds,
    onboarding:         onboarding || null,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
//  VITALS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Add a vitals record.
 * @param {string} patient_id
 * @param {object} data - { blood_pressure, pulse, spo2, blood_sugar, temperature, weight_kg, source, notes }
 */
function addVitals(patient_id, data) {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO patient_vitals
      (patient_id, blood_pressure, pulse, spo2, blood_sugar, temperature, weight_kg, source, notes)
    VALUES
      (@patient_id, @blood_pressure, @pulse, @spo2, @blood_sugar, @temperature, @weight_kg, @source, @notes)
  `).run({
    patient_id:     patient_id,
    blood_pressure: data.blood_pressure ?? null,
    pulse:          data.pulse          ?? null,
    spo2:           data.spo2           ?? null,
    blood_sugar:    data.blood_sugar    ?? null,
    temperature:    data.temperature    ?? null,
    weight_kg:      data.weight_kg      ?? null,
    source:         data.source         ?? "manual",
    notes:          data.notes          ?? null,
  });
  return db.prepare("SELECT * FROM patient_vitals WHERE id = ?").get(result.lastInsertRowid);
}

/**
 * Get the most recent vitals entry for a patient.
 * @param {string} patient_id
 */
function getLatestVitals(patient_id) {
  return getDb().prepare(
    "SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1"
  ).get(patient_id) || null;
}

/**
 * Get vitals history for the past N days.
 * @param {string} patient_id
 * @param {number} days
 */
function getVitalsHistory(patient_id, days = 30) {
  return getDb().prepare(`
    SELECT * FROM patient_vitals
    WHERE patient_id = ?
      AND recorded_at >= datetime('now', ? || ' days')
    ORDER BY recorded_at DESC
  `).all(patient_id, `-${days}`);
}

// ══════════════════════════════════════════════════════════════════════════════
//  SYMPTOMS (patient)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Record a symptom for a patient.
 * @param {string} patient_id
 * @param {object} data - { symptom_id?, symptom_label, type, severity?, duration?, notes? }
 */
function addSymptom(patient_id, data) {
  const db     = getDb();
  const result = db.prepare(`
    INSERT INTO patient_symptoms
      (patient_id, symptom_id, symptom_label, type, severity, duration, notes)
    VALUES
      (@patient_id, @symptom_id, @symptom_label, @type, @severity, @duration, @notes)
  `).run({
    patient_id:    patient_id,
    symptom_id:    data.symptom_id    ?? null,
    symptom_label: data.symptom_label,
    type:          data.type,
    severity:      data.severity      ?? null,
    duration:      data.duration      ?? null,
    notes:         data.notes         ?? null,
  });
  return db.prepare("SELECT * FROM patient_symptoms WHERE id = ?").get(result.lastInsertRowid);
}

/**
 * Get all unresolved (active) symptoms for a patient.
 * @param {string} patient_id
 */
function getActiveSymptoms(patient_id) {
  return getDb().prepare(
    "SELECT * FROM patient_symptoms WHERE patient_id = ? AND resolved_at IS NULL ORDER BY recorded_at DESC"
  ).all(patient_id);
}

/**
 * Mark a patient symptom as resolved.
 * @param {number} id - row id of patient_symptoms
 */
function resolveSymptom(id) {
  getDb().prepare(
    "UPDATE patient_symptoms SET resolved_at = datetime('now') WHERE id = ?"
  ).run(id);
}

// ══════════════════════════════════════════════════════════════════════════════
//  MEDICATIONS (patient)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Add a medication to a patient's record.
 * @param {string} patient_id
 * @param {object} data - { medicine_slug?, medicine_name, dose?, frequency?, since? }
 */
function addMedication(patient_id, data) {
  const db     = getDb();
  const result = db.prepare(`
    INSERT INTO patient_medications
      (patient_id, medicine_slug, medicine_name, dose, frequency, since)
    VALUES
      (@patient_id, @medicine_slug, @medicine_name, @dose, @frequency, @since)
  `).run({
    patient_id:    patient_id,
    medicine_slug: data.medicine_slug  ?? null,
    medicine_name: data.medicine_name,
    dose:          data.dose           ?? null,
    frequency:     data.frequency      ?? null,
    since:         data.since          ?? null,
  });
  return db.prepare("SELECT * FROM patient_medications WHERE id = ?").get(result.lastInsertRowid);
}

/**
 * Get all active medications for a patient.
 * @param {string} patient_id
 */
function getActiveMedications(patient_id) {
  return getDb().prepare(
    "SELECT * FROM patient_medications WHERE patient_id = ? AND active = 1 ORDER BY added_at DESC"
  ).all(patient_id);
}

/**
 * Mark a medication as stopped (active = 0).
 * @param {number} id - row id of patient_medications
 */
function stopMedication(id) {
  getDb().prepare("UPDATE patient_medications SET active = 0 WHERE id = ?").run(id);
}

// ══════════════════════════════════════════════════════════════════════════════
//  CHAT
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new chat session.
 * @param {string} patient_id
 * @param {string} type - 'onboarding' | 'general' | 'vitals_review'
 * @returns session row
 */
function createSession(patient_id, type = "general") {
  const db         = getDb();
  const session_id = `sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    INSERT INTO chat_sessions (session_id, patient_id, session_type)
    VALUES (@session_id, @patient_id, @session_type)
  `).run({ session_id, patient_id, session_type: type });
  return db.prepare("SELECT * FROM chat_sessions WHERE session_id = ?").get(session_id);
}

/**
 * Append a message to a chat session. Auto-increments message_count.
 * @param {string} session_id
 * @param {string} patient_id
 * @param {string} role - 'user' | 'assistant' | 'system'
 * @param {string} content
 * @param {number|null} tokens
 */
function addMessage(session_id, patient_id, role, content, tokens = null) {
  const db     = getDb();
  const result = db.prepare(`
    INSERT INTO chat_messages (session_id, patient_id, role, content, tokens_used)
    VALUES (@session_id, @patient_id, @role, @content, @tokens_used)
  `).run({ session_id, patient_id, role, content, tokens_used: tokens });
  db.prepare(
    "UPDATE chat_sessions SET message_count = message_count + 1 WHERE session_id = ?"
  ).run(session_id);
  return db.prepare("SELECT * FROM chat_messages WHERE id = ?").get(result.lastInsertRowid);
}

/**
 * Get all messages for a session, ordered chronologically.
 * @param {string} session_id
 */
function getSessionMessages(session_id) {
  return getDb().prepare(
    "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at ASC"
  ).all(session_id);
}

/**
 * Get the most recent sessions for a patient.
 * @param {string} patient_id
 * @param {number} limit
 */
function getRecentSessions(patient_id, limit = 10) {
  return getDb().prepare(
    "SELECT * FROM chat_sessions WHERE patient_id = ? ORDER BY started_at DESC LIMIT ?"
  ).all(patient_id, limit);
}

// ══════════════════════════════════════════════════════════════════════════════
//  ONBOARDING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Get or initialize onboarding progress for a patient.
 * @param {string} patient_id
 */
function getOnboardingProgress(patient_id) {
  const db  = getDb();
  let   row = db.prepare("SELECT * FROM onboarding_progress WHERE patient_id = ?").get(patient_id);
  if (!row) {
    db.prepare(
      "INSERT OR IGNORE INTO onboarding_progress (patient_id) VALUES (?)"
    ).run(patient_id);
    row = db.prepare("SELECT * FROM onboarding_progress WHERE patient_id = ?").get(patient_id);
  }
  return row;
}

/**
 * Mark a specific onboarding step as done.
 * @param {string} patient_id
 * @param {number} step - 1 through 7
 */
function markStepDone(patient_id, step) {
  if (step < 1 || step > 7) throw new Error("Step must be between 1 and 7");
  const db = getDb();
  db.prepare(`
    UPDATE onboarding_progress
    SET step_${step}_done = 1,
        current_step      = MAX(current_step, ${step + 1}),
        last_updated      = datetime('now')
    WHERE patient_id = ?
  `).run(patient_id);

  // If all steps done, mark patient as onboarding_complete
  const prog = getOnboardingProgress(patient_id);
  const allDone = [1,2,3,4,5,6,7].every((s) => prog[`step_${s}_done`] === 1);
  if (allDone) {
    db.prepare(
      "UPDATE patients SET onboarding_complete = 1, chat_ready = 1, updated_at = datetime('now') WHERE patient_id = ?"
    ).run(patient_id);
    db.prepare(
      "UPDATE onboarding_progress SET step_7_done = 1, current_step = 7, last_updated = datetime('now') WHERE patient_id = ?"
    ).run(patient_id);
  }

  return getOnboardingProgress(patient_id);
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  // Internals (advanced use)
  getDb,

  // Knowledge base
  getSymptomById,
  searchSymptoms,
  getRedFlagSymptoms,
  getMedicineBySlug,
  searchMedicines,
  getMedicineInteractions,

  // Patient
  getPatient,
  createPatient,
  updatePatient,
  getPatientFullProfile,

  // Vitals
  addVitals,
  getLatestVitals,
  getVitalsHistory,

  // Symptoms (patient)
  addSymptom,
  getActiveSymptoms,
  resolveSymptom,

  // Medications
  addMedication,
  getActiveMedications,
  stopMedication,

  // Chat
  createSession,
  addMessage,
  getSessionMessages,
  getRecentSessions,

  // Onboarding
  getOnboardingProgress,
  markStepDone,
};
