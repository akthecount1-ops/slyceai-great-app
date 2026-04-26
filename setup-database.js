#!/usr/bin/env node
/**
 * Arogya Health Platform — Database Setup Script
 * Run: node setup-database.js
 *
 * - Creates SQLite database at ./data/arogya.db
 * - Creates all tables (idempotent)
 * - Seeds symptoms and medicines from knowledge base JSON files
 * - Inserts test patient with vitals and medical history
 */

const path = require("path");
const fs   = require("fs");

// ─── Resolve paths ────────────────────────────────────────────────────────────
const DB_PATH       = path.resolve(__dirname, "data", "arogya.db");
const SYMPTOMS_PATH = path.resolve(__dirname, "data", "knowledge", "symptoms.json");
const MED_INDEX     = path.resolve(__dirname, "data", "knowledge", "medicines", "index.json");
const MED_DIR       = path.resolve(__dirname, "data", "knowledge", "medicines");

// Ensure data dir exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

// ─── Open database ────────────────────────────────────────────────────────────
const Database = require("better-sqlite3");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

console.log(`\n🗄️  Arogya Database Setup`);
console.log(`   Location: ${DB_PATH}\n`);

// ─── SCHEMA ───────────────────────────────────────────────────────────────────
const schema = `

-- ══════════════════════════════════════════════════════
--  KNOWLEDGE BASE
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS symptoms (
  id                          TEXT PRIMARY KEY,
  label                       TEXT NOT NULL,
  aliases                     TEXT,          -- JSON array
  body_system                 TEXT,
  severity_levels             TEXT,          -- JSON array
  commonly_associated_diseases TEXT,         -- JSON array
  red_flag                    INTEGER DEFAULT 0,
  follow_up_questions         TEXT,          -- JSON array
  created_at                  TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS medicines (
  slug                  TEXT PRIMARY KEY,
  name                  TEXT NOT NULL,
  generic_name          TEXT,
  manufacturer          TEXT,
  uses                  TEXT,               -- JSON array
  how_it_works          TEXT,
  dosage_forms          TEXT,               -- JSON array
  side_effects_common   TEXT,               -- JSON array
  side_effects_serious  TEXT,               -- JSON array
  drug_interactions     TEXT,               -- JSON array
  food_interactions     TEXT,               -- JSON array
  contraindications     TEXT,               -- JSON array
  what_to_avoid         TEXT,               -- JSON array
  storage               TEXT,
  source_note           TEXT,
  last_updated          TEXT,
  created_at            TEXT DEFAULT (datetime('now'))
);

-- ══════════════════════════════════════════════════════
--  PATIENT PROFILES
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS patients (
  patient_id           TEXT PRIMARY KEY,
  name                 TEXT,
  age                  INTEGER,
  gender               TEXT,
  weight_kg            REAL,
  height_cm            REAL,
  email                TEXT UNIQUE,
  phone                TEXT,
  onboarding_complete  INTEGER DEFAULT 0,
  chat_ready           INTEGER DEFAULT 0,
  created_at           TEXT DEFAULT (datetime('now')),
  updated_at           TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS patient_vitals (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id   TEXT NOT NULL,
  blood_pressure TEXT,
  pulse        INTEGER,
  spo2         REAL,
  blood_sugar  REAL,
  temperature  REAL,
  weight_kg    REAL,
  recorded_at  TEXT DEFAULT (datetime('now')),
  source       TEXT DEFAULT 'manual',
  notes        TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS patient_medical_history (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id       TEXT NOT NULL UNIQUE,
  known_diseases   TEXT,   -- JSON array
  past_surgeries   TEXT,   -- JSON array
  allergies        TEXT,   -- JSON array
  family_history   TEXT,   -- JSON array
  blood_group      TEXT,
  updated_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS patient_medications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     TEXT NOT NULL,
  medicine_slug  TEXT,
  medicine_name  TEXT NOT NULL,
  dose           TEXT,
  frequency      TEXT,
  since          TEXT,
  active         INTEGER DEFAULT 1,
  added_at       TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (medicine_slug) REFERENCES medicines(slug)
);

CREATE TABLE IF NOT EXISTS patient_symptoms (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     TEXT NOT NULL,
  symptom_id     TEXT,
  symptom_label  TEXT NOT NULL,
  type           TEXT NOT NULL,
  severity       TEXT,
  duration       TEXT,
  notes          TEXT,
  recorded_at    TEXT DEFAULT (datetime('now')),
  resolved_at    TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  FOREIGN KEY (symptom_id) REFERENCES symptoms(id)
);

-- ══════════════════════════════════════════════════════
--  CHAT SYSTEM
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS chat_sessions (
  session_id    TEXT PRIMARY KEY,
  patient_id    TEXT NOT NULL,
  session_type  TEXT DEFAULT 'general',
  started_at    TEXT DEFAULT (datetime('now')),
  ended_at      TEXT,
  message_count INTEGER DEFAULT 0,
  summary       TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id   TEXT NOT NULL,
  patient_id   TEXT NOT NULL,
  role         TEXT NOT NULL,
  content      TEXT NOT NULL,
  tokens_used  INTEGER,
  created_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (session_id) REFERENCES chat_sessions(session_id),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ══════════════════════════════════════════════════════
--  ONBOARDING
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS onboarding_progress (
  patient_id    TEXT PRIMARY KEY,
  current_step  INTEGER DEFAULT 1,
  step_1_done   INTEGER DEFAULT 0,
  step_2_done   INTEGER DEFAULT 0,
  step_3_done   INTEGER DEFAULT 0,
  step_4_done   INTEGER DEFAULT 0,
  step_5_done   INTEGER DEFAULT 0,
  step_6_done   INTEGER DEFAULT 0,
  step_7_done   INTEGER DEFAULT 0,
  last_updated  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ══════════════════════════════════════════════════════
--  HEALTH DOCUMENTS
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS health_documents (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    TEXT NOT NULL,
  document_type TEXT,
  file_name     TEXT,
  file_path     TEXT,
  file_size     INTEGER,
  mime_type     TEXT,
  ai_summary    TEXT,
  uploaded_at   TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ══════════════════════════════════════════════════════
--  DIET PLANS
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS diet_plans (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    TEXT NOT NULL,
  plan_title    TEXT,
  plan_type     TEXT,
  content       TEXT,
  generated_by  TEXT DEFAULT 'ai',
  valid_from    TEXT,
  valid_until   TEXT,
  active        INTEGER DEFAULT 1,
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ══════════════════════════════════════════════════════
--  HEALTH JOURNEYS
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS health_journeys (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id    TEXT NOT NULL,
  title         TEXT,
  condition     TEXT,
  start_date    TEXT,
  end_date      TEXT,
  outcome       TEXT,
  verified      INTEGER DEFAULT 0,
  published     INTEGER DEFAULT 0,
  journey_data  TEXT,
  created_at    TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ══════════════════════════════════════════════════════
--  AYURVEDIC SUGGESTIONS
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS ayurvedic_suggestions (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id             TEXT NOT NULL,
  suggestion_type        TEXT,
  title                  TEXT,
  description            TEXT,
  source                 TEXT,
  relevant_conditions    TEXT,   -- JSON array
  contraindications      TEXT,   -- JSON array
  created_at             TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- ══════════════════════════════════════════════════════
--  NOTIFICATIONS
-- ══════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS notifications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  patient_id     TEXT NOT NULL,
  type           TEXT,
  title          TEXT,
  body           TEXT,
  scheduled_for  TEXT,
  sent_at        TEXT,
  read_at        TEXT,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);
`;

// ─── INDEXES ──────────────────────────────────────────────────────────────────
const indexes = `
CREATE INDEX IF NOT EXISTS idx_vitals_patient       ON patient_vitals(patient_id);
CREATE INDEX IF NOT EXISTS idx_vitals_recorded      ON patient_vitals(recorded_at);
CREATE INDEX IF NOT EXISTS idx_symptoms_patient     ON patient_symptoms(patient_id);
CREATE INDEX IF NOT EXISTS idx_symptoms_type        ON patient_symptoms(type);
CREATE INDEX IF NOT EXISTS idx_medications_patient  ON patient_medications(patient_id);
CREATE INDEX IF NOT EXISTS idx_medications_active   ON patient_medications(active);
CREATE INDEX IF NOT EXISTS idx_messages_session     ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_patient     ON chat_messages(patient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created     ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_journeys_verified    ON health_journeys(verified);
CREATE INDEX IF NOT EXISTS idx_journeys_published   ON health_journeys(published);
CREATE INDEX IF NOT EXISTS idx_documents_patient    ON health_documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient    ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled  ON notifications(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_symptoms_redflag     ON symptoms(red_flag);
CREATE INDEX IF NOT EXISTS idx_medicines_generic    ON medicines(generic_name);
`;

// ─── Execute schema and indexes ───────────────────────────────────────────────
console.log("📋 Creating tables...");
db.exec(schema);
console.log("📋 Creating indexes...");
db.exec(indexes);

const tableNames = [
  "symptoms","medicines","patients","patient_vitals",
  "patient_medical_history","patient_medications","patient_symptoms",
  "chat_sessions","chat_messages","onboarding_progress",
  "health_documents","diet_plans","health_journeys",
  "ayurvedic_suggestions","notifications"
];
console.log(`✅ Tables created: ${tableNames.join(", ")}\n`);

// ─── SEED SYMPTOMS ─────────────────────────────────────────────────────────────
console.log("🌱 Seeding symptoms...");

const insertSymptom = db.prepare(`
  INSERT OR IGNORE INTO symptoms
    (id, label, aliases, body_system, severity_levels,
     commonly_associated_diseases, red_flag, follow_up_questions)
  VALUES
    (@id, @label, @aliases, @body_system, @severity_levels,
     @commonly_associated_diseases, @red_flag, @follow_up_questions)
`);

let symptomCount = 0;
try {
  const symptomsData = JSON.parse(fs.readFileSync(SYMPTOMS_PATH, "utf8"));
  const seedSymptoms = db.transaction((symptoms) => {
    for (const s of symptoms) {
      insertSymptom.run({
        id:                         s.id,
        label:                      s.label,
        aliases:                    JSON.stringify(s.aliases || []),
        body_system:                s.body_system || null,
        severity_levels:            JSON.stringify(s.severity_levels || []),
        commonly_associated_diseases: JSON.stringify(s.commonly_associated_diseases || []),
        red_flag:                   s.red_flag ? 1 : 0,
        follow_up_questions:        JSON.stringify(s.follow_up_questions || []),
      });
    }
    return symptoms.length;
  });
  symptomCount = seedSymptoms(symptomsData.symptoms);
  console.log(`✅ Symptoms seeded: ${symptomCount}`);
} catch (err) {
  console.error("❌ Could not seed symptoms:", err.message);
}

// ─── SEED MEDICINES ───────────────────────────────────────────────────────────
console.log("\n🌱 Seeding medicines...");

const insertMedicine = db.prepare(`
  INSERT OR IGNORE INTO medicines
    (slug, name, generic_name, manufacturer, uses, how_it_works, dosage_forms,
     side_effects_common, side_effects_serious, drug_interactions, food_interactions,
     contraindications, what_to_avoid, storage, source_note, last_updated)
  VALUES
    (@slug, @name, @generic_name, @manufacturer, @uses, @how_it_works, @dosage_forms,
     @side_effects_common, @side_effects_serious, @drug_interactions, @food_interactions,
     @contraindications, @what_to_avoid, @storage, @source_note, @last_updated)
`);

let medicineCount = 0;
try {
  const indexData  = JSON.parse(fs.readFileSync(MED_INDEX, "utf8"));
  const seedMeds   = db.transaction((medicines) => {
    let count = 0;
    for (const entry of medicines) {
      const slugPath = path.join(MED_DIR, `${entry.slug}.json`);
      if (!fs.existsSync(slugPath)) {
        console.warn(`  ⚠️  Missing file for slug: ${entry.slug}`);
        continue;
      }
      const m = JSON.parse(fs.readFileSync(slugPath, "utf8"));
      insertMedicine.run({
        slug:                 m.slug,
        name:                 m.name,
        generic_name:         m.generic_name    || null,
        manufacturer:         m.manufacturer    || null,
        uses:                 JSON.stringify(m.uses                         || []),
        how_it_works:         m.how_it_works    || null,
        dosage_forms:         JSON.stringify(m.dosage_forms                 || []),
        side_effects_common:  JSON.stringify((m.side_effects || {}).common  || []),
        side_effects_serious: JSON.stringify((m.side_effects || {}).serious || []),
        drug_interactions:    JSON.stringify(m.drug_interactions             || []),
        food_interactions:    JSON.stringify(m.food_interactions             || []),
        contraindications:    JSON.stringify(m.contraindications             || []),
        what_to_avoid:        JSON.stringify(m.what_to_avoid                || []),
        storage:              m.storage         || null,
        source_note:          m.source_note     || null,
        last_updated:         m.last_updated    || null,
      });
      count++;
    }
    return count;
  });
  medicineCount = seedMeds(indexData.medicines);
  console.log(`✅ Medicines seeded: ${medicineCount}`);
} catch (err) {
  console.error("❌ Could not seed medicines:", err.message);
}

// ─── SEED TEST PATIENT ────────────────────────────────────────────────────────
console.log("\n🧑‍⚕️  Seeding test patient...");

const TEST_ID   = "test-patient-001";
const TEST_NAME = "Akash Gupta";

const insertPatient = db.prepare(`
  INSERT OR IGNORE INTO patients
    (patient_id, name, age, gender, weight_kg, onboarding_complete, chat_ready)
  VALUES
    (@patient_id, @name, @age, @gender, @weight_kg, 1, 1)
`);

const insertHistory = db.prepare(`
  INSERT OR IGNORE INTO patient_medical_history
    (patient_id, known_diseases, past_surgeries, allergies, family_history)
  VALUES
    (@patient_id, @known_diseases, @past_surgeries, @allergies, @family_history)
`);

const insertVitals = db.prepare(`
  INSERT INTO patient_vitals
    (patient_id, blood_pressure, pulse, spo2, blood_sugar, source, notes)
  VALUES
    (@patient_id, @blood_pressure, @pulse, @spo2, @blood_sugar, @source, @notes)
`);

const insertOnboarding = db.prepare(`
  INSERT OR IGNORE INTO onboarding_progress
    (patient_id, current_step, step_1_done, step_2_done, step_3_done,
     step_4_done, step_5_done, step_6_done, step_7_done)
  VALUES
    (@patient_id, 7, 1, 1, 1, 1, 1, 1, 1)
`);

const seedPatient = db.transaction(() => {
  insertPatient.run({
    patient_id: TEST_ID,
    name:       TEST_NAME,
    age:        28,
    gender:     "male",
    weight_kg:  72,
  });

  insertHistory.run({
    patient_id:     TEST_ID,
    known_diseases: JSON.stringify(["Muscle Fibrosis"]),
    past_surgeries: JSON.stringify([]),
    allergies:      JSON.stringify([]),
    family_history: JSON.stringify([]),
  });

  insertVitals.run({
    patient_id:     TEST_ID,
    blood_pressure: "120/80",
    pulse:          100,
    spo2:           99,
    blood_sugar:    98,
    source:         "manual",
    notes:          "Initial vitals recorded during setup",
  });

  insertOnboarding.run({ patient_id: TEST_ID });
});

try {
  seedPatient();
  console.log(`✅ Test patient: ${TEST_NAME} (${TEST_ID})`);
} catch (err) {
  if (err.message.includes("UNIQUE constraint")) {
    console.log(`ℹ️  Test patient already exists — skipped (idempotent)`);
  } else {
    console.error("❌ Could not seed test patient:", err.message);
  }
}

// ─── VERIFICATION QUERIES ─────────────────────────────────────────────────────
console.log("\n🔍 Verifying row counts...");

const counts = {
  symptoms:  db.prepare("SELECT COUNT(*) as c FROM symptoms").get().c,
  medicines: db.prepare("SELECT COUNT(*) as c FROM medicines").get().c,
  patients:  db.prepare("SELECT COUNT(*) as c FROM patients").get().c,
};
console.log(`   symptoms  → ${counts.symptoms} rows`);
console.log(`   medicines → ${counts.medicines} rows`);
console.log(`   patients  → ${counts.patients} rows`);

// ─── TEST QUERY: Full patient profile ─────────────────────────────────────────
console.log(`\n🔍 Test query: getPatientFullProfile('${TEST_ID}')`);

const patient     = db.prepare("SELECT * FROM patients WHERE patient_id = ?").get(TEST_ID);
const history     = db.prepare("SELECT * FROM patient_medical_history WHERE patient_id = ?").get(TEST_ID);
const latestVital = db.prepare(
  "SELECT * FROM patient_vitals WHERE patient_id = ? ORDER BY recorded_at DESC LIMIT 1"
).get(TEST_ID);
const activeMeds  = db.prepare(
  "SELECT * FROM patient_medications WHERE patient_id = ? AND active = 1"
).all(TEST_ID);
const onboarding  = db.prepare("SELECT * FROM onboarding_progress WHERE patient_id = ?").get(TEST_ID);

const fullProfile = {
  ...patient,
  medical_history:     history ? {
    ...history,
    known_diseases: JSON.parse(history.known_diseases || "[]"),
    past_surgeries: JSON.parse(history.past_surgeries || "[]"),
    allergies:      JSON.parse(history.allergies      || "[]"),
    family_history: JSON.parse(history.family_history || "[]"),
  } : null,
  latest_vitals:   latestVital || null,
  active_medications: activeMeds,
  onboarding:      onboarding  || null,
};

console.log("\n📄 Full Profile Result:");
console.log(JSON.stringify(fullProfile, null, 2));

db.close();

// ─── SUMMARY ──────────────────────────────────────────────────────────────────
console.log("\n" + "═".repeat(60));
console.log("✅ Tables created:", tableNames.join(", "));
console.log(`✅ Symptoms seeded: ${counts.symptoms}`);
console.log(`✅ Medicines seeded: ${counts.medicines}`);
console.log(`✅ Test patient: ${TEST_NAME}`);
console.log(`✅ db.js exports: getSymptomById, searchSymptoms, getRedFlagSymptoms,`);
console.log(`   getMedicineBySlug, searchMedicines, getMedicineInteractions,`);
console.log(`   getPatient, createPatient, updatePatient, getPatientFullProfile,`);
console.log(`   addVitals, getLatestVitals, getVitalsHistory,`);
console.log(`   addSymptom, getActiveSymptoms, resolveSymptom,`);
console.log(`   addMedication, getActiveMedications, stopMedication,`);
console.log(`   createSession, addMessage, getSessionMessages, getRecentSessions,`);
console.log(`   getOnboardingProgress, markStepDone`);
console.log(`📁 Database location: ${DB_PATH}`);
console.log("═".repeat(60) + "\n");
