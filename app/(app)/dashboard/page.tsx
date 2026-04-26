"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  X,
  FileText,
  ChevronLeft,
  Pencil,
  Trash2,
  Check,
} from "lucide-react";
import LogVitalsModal from "@/components/app/LogVitalsModal";
import AddMedicineModal from "@/components/app/AddMedicineModal";
import AddSymptomModal from "@/components/app/AddSymptomModal";
import HealthJournalModal from "@/components/app/HealthJournalModal";
import UploadReportModal from "@/components/app/UploadReportModal";
import AyurvedaModal from "@/components/app/AyurvedaModal";

/* ─── Types ─────────────────────────────────────────────── */
interface DashVitals {
  bp_systolic: number | null;
  bp_diastolic: number | null;
  pulse: number | null;
  oxygen: number | null;
  blood_sugar: number | null;
  temperature: number | null;
  recorded_at: string | null;
}
interface MedItem {
  id: string;
  medicine_name: string;
  dose: string | null;
  frequency: string | null;
  time_of_day: string[] | null;
  taken: boolean;
}
interface SymptomEntry {
  id: string;
  symptoms: string[] | null;
  notes: string | null;
  journal_date: string;
}
interface JournalEntry {
  id: string;
  notes: string | null;
  journal_date: string;
}
interface Profile {
  name: string | null;
  onboarding_complete: boolean | number | null;
  chat_ready: boolean | number | null;
  date_of_birth: string | null;
  gender: string | null;
  weight_kg?: number | null;
  height_cm?: number | null;
  blood_group?: string | null;
  primary_dosha?: string | null;
  dosha_vata_score?: number | null;
  dosha_pitta_score?: number | null;
  dosha_kapha_score?: number | null;
}

interface OnboardingProgress {
  current_step: number;
  is_completed: boolean;
  draft: {
    step1: { full_name: string; dob: string; gender: string; phone: string };
    step2: {
      weight_kg: number | null;
      height_cm: number | null;
      blood_group: string;
    };
    step3: { med_rows: MedRow[] };
    step4: {
      no_conditions: boolean;
      conditions: string[];
      cond_free_text: string;
      symptoms: string[];
    };
  };
}

function isCompletedFlag(value: boolean | number | null | undefined): boolean {
  return value === true || value === 1;
}

/* ─── Badge helpers ──────────────────────────────────────── */
function badge(label: string, variant: "green" | "amber" | "red") {
  const styles: Record<string, React.CSSProperties> = {
    green: {
      background: "var(--badge-green-bg)",
      color: "var(--badge-green-text)",
      border: "0.5px solid var(--accent)",
    },
    amber: {
      background: "var(--badge-amber-bg)",
      color: "var(--badge-amber-text)",
      border: "0.5px solid var(--badge-amber-text)",
    },
    red: {
      background: "var(--badge-red-bg)",
      color: "var(--badge-red-text)",
      border: "0.5px solid var(--badge-red-text)",
    },
  };
  return (
    <span
      style={{
        fontSize: "10px",
        padding: "2px 7px",
        borderRadius: "4px",
        fontWeight: 600,
        ...styles[variant],
      }}
    >
      {label}
    </span>
  );
}

function getBpStatus(
  sys: number | null,
  dia: number | null,
): "green" | "amber" | "red" {
  if (!sys) return "amber";
  if (sys < 120 && (dia ?? 0) < 80) return "green";
  if (sys < 140) return "amber";
  return "red";
}

function getPulseStatus(p: number | null): "green" | "amber" | "red" {
  if (!p) return "amber";
  if (p >= 60 && p <= 90) return "green";
  if (p > 90 && p <= 100) return "amber";
  return "red";
}

function getSugarStatus(s: number | null): "green" | "amber" | "red" {
  if (!s) return "amber";
  if (s < 100) return "green";
  if (s < 140) return "amber";
  return "red";
}

/* ─── Toast ──────────────────────────────────────────────── */
function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        bottom: 28,
        left: "50%",
        transform: "translateX(-50%)",
        background: "var(--text-primary)",
        color: "var(--bg-card)",
        padding: "12px 24px",
        borderRadius: 12,
        fontSize: 13.5,
        fontWeight: 500,
        boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
        zIndex: 9999,
        animation: "toastIn 0.3s ease",
      }}
    >
      <style>{`@keyframes toastIn{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}`}</style>
      ✅ {message}
    </div>
  );
}

/* ─── Chip helper ────────────────────────────────────────── */
function Chip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: "5px 13px",
        borderRadius: 100,
        fontSize: 12.5,
        fontWeight: 500,
        fontFamily: "inherit",
        border: `1.5px solid ${active ? "var(--accent)" : "var(--border)"}`,
        background: active ? "rgba(13,148,136,0.08)" : "var(--bg-secondary)",
        color: active ? "#0b7a70" : "var(--text-secondary)",
        cursor: "pointer",
        transition: "all 0.12s",
      }}
    >
      {label}
    </button>
  );
}

/* ─── Onboarding Modal ───────────────────────────────────── */
type OBStep = 1 | 2 | 3 | 4 | 5;

const KNOWN_CONDITIONS = [
  "Diabetes Type 2",
  "Hypertension",
  "Hypothyroidism",
  "PCOD/PCOS",
  "Asthma",
  "Anemia",
  "Anxiety",
  "Depression",
  "Arthritis",
  "Heart disease",
  "Kidney disease",
  "Liver disease",
  "Thyroid disorder",
  "High Cholesterol",
  "Migraine",
  "Obesity",
  "Osteoporosis",
  "GERD/Acid reflux",
  "Spondylosis",
  "Vitamin deficiency",
  "Muscle fibrosis",
];

const COMMON_SYMPTOMS = [
  "Fatigue",
  "Headache",
  "Dizziness",
  "Cough",
  "Chest Pain",
  "Nausea",
  "Vomiting",
  "Back Pain",
  "Joint Pain",
  "Fever",
  "Shortness of breath",
  "Palpitations",
  "Insomnia",
  "Skin rash",
  "Swelling",
  "Weakness",
  "Weight loss",
  "Night sweats",
  "Numbness",
  "Bloating",
  "Constipation",
];

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Don't know",
];
const GENDERS = ["Male", "Female", "Other"];

/** isOnboardingComplete — true only when required fields are set */
function isOnboardingComplete(p: Profile | null): boolean {
  if (!p) return false;
  const hasName = typeof p.name === "string" && p.name.trim().length > 0;
  const hasDob = !!p.date_of_birth;
  const hasGender = typeof p.gender === "string" && p.gender.trim().length > 0;
  const hasWeight = typeof p.weight_kg === "number" && p.weight_kg > 0;
  const hasHeight = typeof p.height_cm === "number" && p.height_cm > 0;
  return hasName && hasDob && hasGender && hasWeight && hasHeight;
}

function getResumeStep(
  profile: Profile | null,
  progress: OnboardingProgress | null,
): OBStep {
  if (progress) {
    const s = progress.current_step;
    if (s >= 1 && s <= 5) return s as OBStep;
  }

  // Fallback to legacy profile detection if no progress record exists
  const hasStep1 = !!(
    profile?.name?.trim() &&
    profile?.date_of_birth &&
    profile?.gender?.trim()
  );
  const hasStep2 =
    typeof profile?.weight_kg === "number" &&
    profile.weight_kg > 0 &&
    typeof profile?.height_cm === "number" &&
    profile.height_cm > 0;

  if (hasStep1 && hasStep2) return 3;
  if (hasStep1) return 2;
  return 1;
}

function calcBMI(weight: string, height: string) {
  const w = parseFloat(weight),
    h = parseFloat(height);
  if (!w || !h || h === 0) return null;
  const bmi = parseFloat((w / (h / 100) ** 2).toFixed(1));
  let cat = "Normal",
    color = "#16a34a";
  if (bmi < 18.5) {
    cat = "Underweight";
    color = "#b45309";
  } else if (bmi < 25) {
    cat = "Normal";
    color = "#16a34a";
  } else if (bmi < 30) {
    cat = "Overweight";
    color = "#b45309";
  } else {
    cat = "Obese";
    color = "#dc2626";
  }
  return { bmi, cat, color };
}

interface MedRow {
  name: string;
  dose: string;
  frequency: string;
}

interface OnboardingModalProps {
  initialStep: OBStep;
  userId: string;
  prefillName?: string; // pre-fill from auth
  supabase: ReturnType<typeof createClient>;
  onComplete: () => void;
  initialProgress?: OnboardingProgress | null;
}

// Onboarding step count now includes vitals step
const OB_TOTAL_STEPS = 5;

function OnboardingModal({
  initialStep,
  userId,
  prefillName,
  supabase,
  onComplete,
  initialProgress,
}: OnboardingModalProps) {
  const [step, setStep] = useState<OBStep>(initialStep);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1 — Basic Info
  const [fullName, setFullName] = useState(prefillName || "");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");

  // Sync prefillName if it arrives late
  useEffect(() => {
    if (prefillName && !fullName) {
      setFullName(prefillName);
    }
  }, [prefillName, fullName]);

  // Step 2 — Body Measurements
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const bmiInfo = calcBMI(weight, height);

  // Step 3 — Optional Vitals
  const [bpSystolic, setBpSystolic] = useState("");
  const [bpDiastolic, setBpDiastolic] = useState("");
  const [pulse, setPulse] = useState("");
  const [spo2, setSpo2] = useState("");
  const [bloodSugar, setBloodSugar] = useState("");

  // Step 4 — Medicines
  const [medRows, setMedRows] = useState<MedRow[]>([
    { name: "", dose: "", frequency: "" },
  ]);

  // Step 5 — Conditions + Symptoms
  const [noConditions, setNoConditions] = useState(false);
  const [conditions, setConditions] = useState<string[]>([]);
  const [condFreeText, setCondFreeText] = useState("");
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const progressKey = `onboarding_step_${userId}`;

  // Restore last onboarding step on refresh.
  useEffect(() => {
    const savedStep = Number(localStorage.getItem(progressKey));
    if (savedStep >= 1 && savedStep <= 4) {
      setStep(savedStep as OBStep);
    }
  }, [progressKey]);

  // Persist current onboarding step while user progresses.
  useEffect(() => {
    localStorage.setItem(progressKey, String(step));
  }, [progressKey, step]);

  // Hydrate previously saved data so refresh doesn't force users to re-enter earlier steps.
  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      try {
        // Priority 1: Use initialProgress passed from page load if available
        if (initialProgress?.draft) {
          const { step1, step2, step3, step4 } = initialProgress.draft;
          if (step1) {
            setFullName(step1.full_name || prefillName || "");
            setDob(step1.dob || "");
            setGender(step1.gender || "");
            setPhone(step1.phone || "");
          }
          if (step2) {
            setWeight(step2.weight_kg != null ? String(step2.weight_kg) : "");
            setHeight(step2.height_cm != null ? String(step2.height_cm) : "");
            setBloodGroup(step2.blood_group || "");
          }
          if (step3?.med_rows?.length) setMedRows(step3.med_rows);
          if (step4) {
            setNoConditions(!!step4.no_conditions);
            setConditions(step4.conditions || []);
            setCondFreeText(step4.cond_free_text || "");
            setSymptoms(step4.symptoms || []);
          }
          setHydrated(true);
          return;
        }

        // Priority 2: Fallback to direct DB fetch (legacy or safety check)
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select(
            "name, date_of_birth, gender, phone, weight_kg, height_cm, blood_group",
          )
          .eq("id", userId)
          .single();

        if (cancelled) return;

        if (existingProfile) {
          setFullName(
            (prev) => prev || existingProfile.name || prefillName || "",
          );
          setDob((prev) => prev || existingProfile.date_of_birth || "");

          const genderValue =
            typeof existingProfile.gender === "string"
              ? `${existingProfile.gender.charAt(0).toUpperCase()}${existingProfile.gender.slice(1).toLowerCase()}`
              : "";
          if (genderValue && GENDERS.includes(genderValue)) {
            setGender((prev) => prev || genderValue);
          }

          setPhone((prev) => prev || existingProfile.phone || "");
          setWeight(
            (prev) =>
              prev ||
              (existingProfile.weight_kg != null
                ? String(existingProfile.weight_kg)
                : ""),
          );
          setHeight(
            (prev) =>
              prev ||
              (existingProfile.height_cm != null
                ? String(existingProfile.height_cm)
                : ""),
          );
          setBloodGroup((prev) => prev || existingProfile.blood_group || "");
        }

        const { data: existingMeds } = await supabase
          .from("medicines")
          .select("medicine_name, dose, frequency")
          .eq("user_id", userId)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(10);

        if (cancelled) return;

        if (existingMeds?.length) {
          setMedRows((prev) =>
            prev.some((r) => r.name.trim())
              ? prev
              : existingMeds.map((m: any) => ({
                  name: m.medicine_name ?? "",
                  dose: m.dose ?? "",
                  frequency: m.frequency ?? "",
                })),
          );
        }
      } catch (err) {
        console.error("Hydration failed:", err);
      } finally {
        if (!cancelled) setHydrated(true);
      }
    };

    hydrate();
    return () => {
      cancelled = true;
    };
  }, [initialProgress, prefillName, supabase, userId]);

  // Block Escape key — modal cannot be closed via keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") e.preventDefault();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 11px",
    borderRadius: "7px",
    border: "0.5px solid var(--border)",
    fontSize: "13px",
    outline: "none",
    background: "var(--bg-page)",
    color: "var(--text-primary)",
    fontFamily: "inherit",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--text-secondary)",
    display: "block",
    marginBottom: "4px",
    fontWeight: 500,
  };

  const syncDraft = async (nextStep: number) => {
    try {
      const draft = {
        step1: { full_name: fullName, dob, gender, phone },
        step2: {
          weight_kg: parseFloat(weight) || null,
          height_cm: parseFloat(height) || null,
          blood_group: bloodGroup,
        },
        step3: {
          bp_systolic: bpSystolic,
          bp_diastolic: bpDiastolic,
          pulse,
          spo2,
          blood_sugar: bloodSugar,
        },
        step4: { med_rows: medRows },
        step5: {
          no_conditions: noConditions,
          conditions,
          cond_free_text: condFreeText,
          symptoms,
        },
      };
      const { error } = await supabase.rpc("upsert_onboarding_progress", {
        _user_id: userId,
        _current_step: nextStep,
        _draft: draft,
      });
      if (error) console.error("Onboarding auto-save error:", error);
    } catch (err) {
      console.error("Onboarding sync failed:", err);
    }
  };

  // Auto-save draft as user types (debounced)
  useEffect(() => {
    // 🛡️ CRITICAL: Do not auto-save until hydration is complete.
    if (!hydrated || !userId) return;

    const timer = setTimeout(() => {
      syncDraft(step);
    }, 2000);
    return () => clearTimeout(timer);
  }, [
    hydrated,
    fullName,
    dob,
    gender,
    phone,
    weight,
    height,
    bloodGroup,
    bpSystolic,
    bpDiastolic,
    pulse,
    spo2,
    bloodSugar,
    medRows,
    noConditions,
    conditions,
    condFreeText,
    symptoms,
    step,
    userId,
  ]);

  const saveStep1 = async () => {
    setError("");
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!dob) {
      setError("Please enter your date of birth.");
      return;
    }
    // validate age 1-110
    const age =
      (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 1 || age > 110) {
      setError("Please enter a valid date of birth.");
      return;
    }
    if (!gender) {
      setError("Please select your gender.");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        name: fullName.trim(),
        date_of_birth: dob,
        gender: gender.toLowerCase(),
        ...(phone ? { phone } : {}),
        updated_at: new Date().toISOString(),
      });
      await syncDraft(2);
    } finally {
      setSaving(false);
    }
    setStep(2);
  };

  const saveStep2 = async () => {
    setError("");
    const w = parseFloat(weight),
      h = parseFloat(height);
    if (!weight || isNaN(w) || w < 20 || w > 300) {
      setError("Enter a valid weight (20–300 kg).");
      return;
    }
    if (!height || isNaN(h) || h < 50 || h > 250) {
      setError("Enter a valid height (50–250 cm).");
      return;
    }
    setSaving(true);
    try {
      await supabase.from("profiles").upsert({
        id: userId,
        weight_kg: w,
        height_cm: h,
        ...(bloodGroup ? { blood_group: bloodGroup } : {}),
        updated_at: new Date().toISOString(),
      });
      await syncDraft(3);
    } finally {
      setSaving(false);
    }
    setStep(3);
  };

  const saveStep3 = async () => {
    // Step 3 = optional vitals — save if any provided, then go to step 4
    setSaving(true);
    try {
      const sys = parseInt(bpSystolic),
        dia = parseInt(bpDiastolic);
      const pu = parseInt(pulse),
        sp = parseFloat(spo2),
        bs = parseFloat(bloodSugar);
      const hasVitals = sys || pu || sp || bs;
      if (hasVitals) {
        await supabase.from("vitals").insert({
          user_id: userId,
          bp_systolic: sys || null,
          bp_diastolic: dia || null,
          pulse: pu || null,
          oxygen: sp || null,
          blood_sugar: bs || null,
          recorded_at: new Date().toISOString(),
        });
      }
      await syncDraft(4);
    } finally {
      setSaving(false);
    }
    setStep(4);
  };

  const saveStep4 = async () => {
    setSaving(true);
    try {
      const validMeds = medRows.filter((r) => r.name.trim());
      if (validMeds.length > 0) {
        await supabase.from("medicines").insert(
          validMeds.map((m) => ({
            user_id: userId,
            medicine_name: m.name.trim(),
            dose: m.dose.trim() || null,
            time_of_day: m.frequency ? [m.frequency.trim()] : null,
            is_active: true,
          })),
        );
      }
      await syncDraft(5);
    } finally {
      setSaving(false);
    }
    setStep(5);
  };

  const finishOnboarding = async (saveData: boolean) => {
    setSaving(true);
    try {
      if (saveData) {
        const allConditions = noConditions ? [] : [...conditions];
        if (!noConditions && condFreeText.trim()) {
          allConditions.push(
            ...condFreeText
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
          );
        }
        if (symptoms.length > 0 || allConditions.length > 0) {
          await supabase.from("symptom_journal").insert({
            user_id: userId,
            symptoms: symptoms.length > 0 ? symptoms : [],
            notes: allConditions.length > 0 ? allConditions.join(", ") : null,
            journal_date: new Date().toISOString().split("T")[0],
          });
        }
      }
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        onboarding_complete: true,
        chat_ready: true,
        updated_at: new Date().toISOString(),
      });
      if (error)
        throw new Error(error.message || "Failed to mark onboarding complete");

      await supabase.from("onboarding_progress").upsert({
        user_id: userId,
        is_completed: true,
        completed_at: new Date().toISOString(),
        current_step: 5,
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to complete setup";
      setError(msg);
      return;
    } finally {
      setSaving(false);
    }
    localStorage.removeItem(progressKey);
    onComplete();
  };

  const titles: Record<OBStep, string> = {
    1: "Basic information",
    2: "Body measurements",
    3: "Current vitals",
    4: "Current medicines",
    5: "Conditions & symptoms",
  };

  const step1Valid = fullName.trim() && dob && gender;
  const step2Valid = weight && height;
  const showLater = false;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      // NO onClick on backdrop — modal cannot be closed by clicking outside
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "14px",
          border: "0.5px solid var(--border)",
          boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
          padding: "28px",
          width: "500px",
          maxWidth: "96vw",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "6px",
          }}
        >
          <div>
            <p
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                margin: "0 0 4px",
                fontWeight: 500,
              }}
            >
              Step {step} of {OB_TOTAL_STEPS}
            </p>
            <h2
              style={{
                fontSize: "18px",
                fontWeight: 600,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              {titles[step]}
            </h2>
            {(step === 1 || step === 2) && (
              <p
                style={{
                  fontSize: "11px",
                  color: "#b45309",
                  margin: "4px 0 0",
                  fontWeight: 500,
                }}
              >
                ✦ Required to unlock Slyceai chat
              </p>
            )}
          </div>
          {/* Step indicator dots */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              paddingTop: 2,
            }}
          >
            {([1, 2, 3, 4, 5] as OBStep[]).map((n) => (
              <div
                key={n}
                style={{
                  width: n === step ? 18 : 8,
                  height: 8,
                  borderRadius: 100,
                  background:
                    n < step
                      ? "var(--accent)"
                      : n === step
                        ? "var(--accent)"
                        : "var(--border)",
                  opacity: n < step ? 0.5 : 1,
                  transition: "all 0.25s",
                }}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            borderTop: "0.5px solid var(--border)",
            marginBottom: "20px",
            paddingTop: "0px",
          }}
        />

        {/* ── Error banner ── */}
        {error && (
          <div
            style={{
              background: "rgba(220,38,38,0.07)",
              border: "1px solid rgba(220,38,38,0.25)",
              borderRadius: "6px",
              padding: "8px 12px",
              marginBottom: "14px",
              fontSize: "12.5px",
              color: "#dc2626",
            }}
          >
            {error}
          </div>
        )}

        {/* ── Step 1: Basic Info ── */}
        {step === 1 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>
                Full name <span style={{ color: "#d97706" }}>*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Priya Sharma"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>
                Date of birth <span style={{ color: "#d97706" }}>*</span>
              </label>
              <input
                type="date"
                value={dob}
                onChange={(e) => setDob(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>
                Gender <span style={{ color: "#d97706" }}>*</span>
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {GENDERS.map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    style={{
                      padding: "7px 20px",
                      borderRadius: 100,
                      fontSize: 13,
                      fontFamily: "inherit",
                      cursor: "pointer",
                      border: `1.5px solid ${gender === g ? "var(--accent)" : "var(--border)"}`,
                      background:
                        gender === g
                          ? "rgba(13,148,136,0.08)"
                          : "var(--bg-secondary)",
                      color: gender === g ? "#0b7a70" : "var(--text-secondary)",
                      fontWeight: gender === g ? 600 : 400,
                      transition: "all 0.12s",
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>
                Phone{" "}
                <span style={{ color: "var(--text-muted)" }}>optional</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                style={inputStyle}
              />
            </div>
          </div>
        )}

        {/* ── Step 2: Body Measurements ── */}
        {step === 2 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Weight (kg) <span style={{ color: "#d97706" }}>*</span>
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="e.g. 68"
                  style={inputStyle}
                  min="20"
                  max="300"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Height (cm) <span style={{ color: "#d97706" }}>*</span>
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="e.g. 168"
                  style={inputStyle}
                  min="50"
                  max="250"
                />
              </div>
            </div>
            {/* BMI preview */}
            {bmiInfo && (
              <div
                style={{
                  background: "var(--bg-secondary)",
                  border: "0.5px solid var(--border)",
                  borderRadius: "7px",
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{ fontSize: "12px", color: "var(--text-secondary)" }}
                >
                  Your BMI:
                </span>
                <span
                  style={{
                    fontSize: "15px",
                    fontWeight: 700,
                    color: bmiInfo.color,
                  }}
                >
                  {bmiInfo.bmi}
                </span>
                <span
                  style={{
                    fontSize: "11px",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    fontWeight: 600,
                    background: bmiInfo.color + "15",
                    color: bmiInfo.color,
                  }}
                >
                  {bmiInfo.cat}
                </span>
              </div>
            )}
            <div>
              <label style={labelStyle}>
                Blood group{" "}
                <span style={{ color: "var(--text-muted)" }}>optional</span>
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                style={inputStyle}
              >
                <option value="">Select blood group</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <p
              style={{
                fontSize: 12,
                color: "var(--text-muted)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              This helps Slyceai personalise diet, dosage, and health scores.
            </p>
          </div>
        )}

        {/* ── Step 3: Optional Vitals ── */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--text-secondary)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              These are optional but help Slyceai give you accurate health
              insights right away.
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div>
                <label style={labelStyle}>
                  Blood pressure — Systolic{" "}
                  <span style={{ color: "var(--text-muted)" }}>optional</span>
                </label>
                <input
                  type="number"
                  value={bpSystolic}
                  onChange={(e) => setBpSystolic(e.target.value)}
                  placeholder="e.g. 120"
                  style={inputStyle}
                  min="60"
                  max="250"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Blood pressure — Diastolic{" "}
                  <span style={{ color: "var(--text-muted)" }}>optional</span>
                </label>
                <input
                  type="number"
                  value={bpDiastolic}
                  onChange={(e) => setBpDiastolic(e.target.value)}
                  placeholder="e.g. 80"
                  style={inputStyle}
                  min="40"
                  max="150"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  Pulse (bpm){" "}
                  <span style={{ color: "var(--text-muted)" }}>optional</span>
                </label>
                <input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(e.target.value)}
                  placeholder="e.g. 72"
                  style={inputStyle}
                  min="30"
                  max="250"
                />
              </div>
              <div>
                <label style={labelStyle}>
                  SpO₂ (%){" "}
                  <span style={{ color: "var(--text-muted)" }}>optional</span>
                </label>
                <input
                  type="number"
                  value={spo2}
                  onChange={(e) => setSpo2(e.target.value)}
                  placeholder="e.g. 98"
                  style={inputStyle}
                  min="50"
                  max="100"
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={labelStyle}>
                  Blood sugar (mg/dL){" "}
                  <span style={{ color: "var(--text-muted)" }}>optional</span>
                </label>
                <input
                  type="number"
                  value={bloodSugar}
                  onChange={(e) => setBloodSugar(e.target.value)}
                  placeholder="e.g. 95"
                  style={inputStyle}
                  min="30"
                  max="600"
                />
              </div>
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>
              You can always log or update vitals from your dashboard later.
            </p>
          </div>
        )}

        {/* ── Step 4: Medicines ── */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <p
              style={{
                fontSize: 13,
                color: "var(--text-secondary)",
                margin: 0,
              }}
            >
              Add medicines you currently take. Slyceai will check for
              interactions.
            </p>
            {medRows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr auto",
                  gap: 8,
                  alignItems: "end",
                }}
              >
                <div>
                  {i === 0 && <label style={labelStyle}>Medicine name</label>}
                  <input
                    type="text"
                    value={row.name}
                    onChange={(e) => {
                      const rows = [...medRows];
                      rows[i] = { ...rows[i], name: e.target.value };
                      setMedRows(rows);
                    }}
                    placeholder="e.g. Metformin"
                    style={inputStyle}
                  />
                </div>
                <div>
                  {i === 0 && <label style={labelStyle}>Dose</label>}
                  <input
                    type="text"
                    value={row.dose}
                    onChange={(e) => {
                      const rows = [...medRows];
                      rows[i] = { ...rows[i], dose: e.target.value };
                      setMedRows(rows);
                    }}
                    placeholder="500mg"
                    style={inputStyle}
                  />
                </div>
                <div>
                  {i === 0 && <label style={labelStyle}>Frequency</label>}
                  <input
                    type="text"
                    value={row.frequency}
                    onChange={(e) => {
                      const rows = [...medRows];
                      rows[i] = { ...rows[i], frequency: e.target.value };
                      setMedRows(rows);
                    }}
                    placeholder="Twice daily"
                    style={inputStyle}
                  />
                </div>
                <button
                  onClick={() => {
                    if (medRows.length === 1) {
                      setMedRows([{ name: "", dose: "", frequency: "" }]);
                    } else {
                      setMedRows(medRows.filter((_, idx) => idx !== i));
                    }
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--text-muted)",
                    padding: "8px 4px",
                    alignSelf: "end",
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {medRows.length < 10 && (
              <button
                onClick={() =>
                  setMedRows([
                    ...medRows,
                    { name: "", dose: "", frequency: "" },
                  ])
                }
                style={{
                  background: "transparent",
                  border: "0.5px dashed var(--border)",
                  borderRadius: 7,
                  padding: "8px",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  width: "100%",
                }}
              >
                + Add another medicine
              </button>
            )}
          </div>
        )}

        {/* ── Step 5: Conditions + Symptoms ── */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 8px",
                }}
              >
                Known conditions
              </p>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  marginBottom: 10,
                }}
              >
                <input
                  type="checkbox"
                  checked={noConditions}
                  onChange={(e) => {
                    setNoConditions(e.target.checked);
                    if (e.target.checked) setConditions([]);
                  }}
                  style={{
                    accentColor: "var(--accent)",
                    width: 14,
                    height: 14,
                  }}
                />
                I have no known conditions
              </label>
              {!noConditions && (
                <>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 6,
                      marginBottom: 8,
                    }}
                  >
                    {KNOWN_CONDITIONS.map((c) => (
                      <Chip
                        key={c}
                        label={c}
                        active={conditions.includes(c)}
                        onToggle={() =>
                          setConditions((p) =>
                            p.includes(c)
                              ? p.filter((x) => x !== c)
                              : [...p, c],
                          )
                        }
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={condFreeText}
                    onChange={(e) => setCondFreeText(e.target.value)}
                    placeholder="Other conditions (comma separated)"
                    style={inputStyle}
                  />
                </>
              )}
            </div>
            <div>
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: "0 0 8px",
                }}
              >
                Current symptoms
              </p>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: "0 0 8px",
                }}
              >
                What are you experiencing right now? Select all that apply.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {COMMON_SYMPTOMS.map((s) => (
                  <Chip
                    key={s}
                    label={s}
                    active={symptoms.includes(s)}
                    onToggle={() =>
                      setSymptoms((p) =>
                        p.includes(s) ? p.filter((x) => x !== s) : [...p, s],
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div
          style={{
            display: "flex",
            gap: 8,
            justifyContent: "space-between",
            marginTop: 24,
            alignItems: "center",
          }}
        >
          {/* Back button */}
          <div>
            {step > 1 && (
              <button
                onClick={() => {
                  setError("");
                  setStep((step - 1) as OBStep);
                }}
                style={{
                  background: "transparent",
                  border: "0.5px solid var(--border)",
                  padding: "8px 14px",
                  borderRadius: "7px",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <ChevronLeft size={13} /> Back
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {/* Skip/Later — ONLY visible on steps 3 & 4 (optional steps) */}
            {showLater && (
              <button
                onClick={
                  step === 3 ? () => setStep(4) : () => finishOnboarding(false)
                }
                disabled={saving}
                style={{
                  background: "transparent",
                  border: "0.5px solid var(--border)",
                  padding: "8px 14px",
                  borderRadius: "7px",
                  fontSize: "12.5px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                  fontFamily: "inherit",
                }}
              >
                {step === 3 ? "Skip for now" : "Done"}
              </button>
            )}

            {/* Main action button */}
            {step < 5 ? (
              <button
                disabled={
                  saving ||
                  (step === 1 && !step1Valid) ||
                  (step === 2 && !step2Valid)
                }
                onClick={
                  step === 1
                    ? saveStep1
                    : step === 2
                      ? saveStep2
                      : step === 3
                        ? saveStep3
                        : saveStep4
                }
                style={{
                  background: "var(--accent)",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "7px",
                  fontSize: "12.5px",
                  cursor: saving ? "wait" : "pointer",
                  color: "var(--bg-card)",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  opacity:
                    saving ||
                    (step === 1 && !step1Valid) ||
                    (step === 2 && !step2Valid)
                      ? 0.55
                      : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {saving
                  ? "Saving…"
                  : step === 3
                    ? "Save & continue →"
                    : "Save & continue →"}
              </button>
            ) : (
              <button
                disabled={saving}
                onClick={() => finishOnboarding(true)}
                style={{
                  background: "var(--accent)",
                  border: "none",
                  padding: "8px 18px",
                  borderRadius: "7px",
                  fontSize: "12.5px",
                  cursor: saving ? "wait" : "pointer",
                  color: "var(--bg-card)",
                  fontWeight: 600,
                  fontFamily: "inherit",
                  opacity: saving ? 0.7 : 1,
                }}
              >
                {saving ? "Saving…" : "Complete setup ✓"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [profile, setProfile] = useState<Profile | null>(null);
  const [vitals, setVitals] = useState<DashVitals | null>(null);
  const [medicines, setMedicines] = useState<MedItem[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomEntry | null>(null);
  const [journals, setJournals] = useState<JournalEntry[]>([]);
  const [userId, setUserId] = useState<string>("");
  const [authName, setAuthName] = useState<string>(""); // name from auth metadata
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string>("");
  const [insightLoading, setInsightLoading] = useState(true);
  const [insightTab, setInsightTab] = useState<
    "tip" | "diet" | "exercise" | "dosha"
  >("tip");
  const [insightCache, setInsightCache] = useState<Record<string, string>>({});

  // Onboarding state
  const [onboardStep, setOnboardStep] = useState<OBStep | null>(null);
  const [onboardProgress, setOnboardProgress] =
    useState<OnboardingProgress | null>(null);
  const [onboardDone, setOnboardDone] = useState(false);
  const autoOpenRef = useRef(false);

  // Vitals nudge state
  const [showVitalsNudge, setShowVitalsNudge] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  // Modal states
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [showMedicineModal, setShowMedicineModal] = useState(false);
  const [showSymptomModal, setShowSymptomModal] = useState(false);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [showAyurvedaModal, setShowAyurvedaModal] = useState(false);
  const [showUploadReportModal, setShowUploadReportModal] = useState(false);

  // Medicine edit state
  const [editingMedId, setEditingMedId] = useState<string | null>(null);
  const [editMedName, setEditMedName] = useState("");
  const [editMedDose, setEditMedDose] = useState("");
  const [editMedFreq, setEditMedFreq] = useState("");

  /* ── Load all dashboard data ─────────────────────── */
  const loadData = useCallback(async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);
    const authMeta = user.user_metadata ?? {};
    const nameFromSignup = (authMeta.full_name || authMeta.name || "")
      .toString()
      .trim();
    if (nameFromSignup) setAuthName(nameFromSignup);

    const todayStr = new Date().toISOString().split("T")[0];

    const [
      profileRes,
      vitalsRes,
      medsRes,
      symptomRes,
      journalRes,
      progressRes,
    ] = await Promise.all([
      supabase
        .from("profiles")
        .select(
          "name, onboarding_complete, chat_ready, date_of_birth, gender, weight_kg, height_cm, blood_group, primary_dosha, dosha_vata_score, dosha_pitta_score, dosha_kapha_score",
        )
        .eq("id", user.id)
        .single(),
      supabase
        .from("vitals")
        .select(
          "bp_systolic, bp_diastolic, pulse, oxygen, blood_sugar, temperature, recorded_at",
        )
        .eq("user_id", user.id)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("medicines")
        .select("id, medicine_name, dose, frequency, time_of_day")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      supabase
        .from("symptom_journal")
        .select("id, symptoms, notes, journal_date")
        .eq("user_id", user.id)
        .order("journal_date", { ascending: false })
        .limit(1)
        .single(),
      supabase
        .from("symptom_journal")
        .select("id, notes, journal_date")
        .eq("user_id", user.id)
        .order("journal_date", { ascending: false })
        .limit(2),
      supabase
        .from("onboarding_progress")
        .select("current_step, is_completed, draft")
        .eq("user_id", user.id)
        .single(),
    ]);

    const profileData = profileRes.data as Profile | null;
    const progressData = progressRes.data as OnboardingProgress | null;
    setProfile(profileData);
    setOnboardProgress(progressData);

    const isFullyComplete =
      isCompletedFlag(profileData?.onboarding_complete) ||
      progressData?.is_completed === true;
    setOnboardDone(isFullyComplete);

    // Always have a prefill source for the modal's full name field.
    const nameForPrefill = profileData?.name?.trim() || nameFromSignup || "";
    if (nameForPrefill) setAuthName(nameForPrefill);

    // Auto-open: always open modal if onboarding isn't fully complete.
    if (!isFullyComplete && !autoOpenRef.current) {
      autoOpenRef.current = true;
      setOnboardStep(getResumeStep(profileData, progressData));
    }

    if (vitalsRes.data) {
      setVitals(vitalsRes.data as DashVitals);
      // Vitals nudge: check if >= 2 days old
      const lastVitalsDate = new Date(vitalsRes.data.recorded_at!);
      const daysSince =
        (Date.now() - lastVitalsDate.getTime()) / (1000 * 60 * 60 * 24);
      const nudgeDismissKey = `vitals_nudge_${todayStr}`;
      if (daysSince >= 2 && !localStorage.getItem(nudgeDismissKey)) {
        setShowVitalsNudge(true);
      }
    }

    // Get medicine logs for today
    const medIds = medsRes.data?.map((m) => m.id) ?? [];
    const logsRes =
      medIds.length > 0
        ? await supabase
            .from("medicine_logs")
            .select("medicine_id, taken")
            .eq("user_id", user.id)
            .eq("log_date", todayStr)
            .in("medicine_id", medIds)
        : { data: [] };
    const logsMap = new Map(
      (logsRes.data ?? []).map((l) => [l.medicine_id, l.taken]),
    );
    setMedicines(
      (medsRes.data ?? []).map((m) => ({
        ...m,
        taken: logsMap.get(m.id) ?? false,
      })),
    );

    if (symptomRes.data) setSymptoms(symptomRes.data as SymptomEntry);
    setJournals((journalRes.data ?? []) as JournalEntry[]);

    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* ── Fetch AI daily insight ──────────────────────── */
  useEffect(() => {
    const fetchInsight = async () => {
      setInsightLoading(true);
      try {
        const res = await fetch("/api/dashboard-insights", {
          cache: "no-store",
        });
        const data = await res.json();
        setInsight(data?.feeling ?? data?.health_tip ?? "");
      } catch {
        /* ignore */
      } finally {
        setInsightLoading(false);
      }
    };
    fetchInsight();
  }, []);

  /* ── Toggle medicine taken ───────────────────────── */
  const toggleMed = async (med: MedItem) => {
    const todayStr = new Date().toISOString().split("T")[0];
    const newTaken = !med.taken;
    setMedicines((prev) =>
      prev.map((m) => (m.id === med.id ? { ...m, taken: newTaken } : m)),
    );
    await supabase.from("medicine_logs").upsert(
      {
        medicine_id: med.id,
        user_id: userId,
        log_date: todayStr,
        taken: newTaken,
      },
      { onConflict: "medicine_id,user_id,log_date" },
    );
  };

  /* ── Delete medicine ─────────────────────────────── */
  const deleteMed = async (medId: string) => {
    await supabase
      .from("medicines")
      .update({ is_active: false })
      .eq("id", medId);
    setMedicines((prev) => prev.filter((m) => m.id !== medId));
    setToast("Medicine removed.");
  };

  /* ── Edit medicine ───────────────────────────────── */
  const startEditMed = (med: MedItem) => {
    setEditingMedId(med.id);
    setEditMedName(med.medicine_name);
    setEditMedDose(med.dose || "");
    setEditMedFreq(med.frequency || med.time_of_day?.[0] || "");
  };

  const saveEditMed = async (medId: string) => {
    await supabase
      .from("medicines")
      .update({
        medicine_name: editMedName.trim(),
        dose: editMedDose.trim() || null,
        frequency: editMedFreq.trim() || null,
      })
      .eq("id", medId);
    setMedicines((prev) =>
      prev.map((m) =>
        m.id === medId
          ? {
              ...m,
              medicine_name: editMedName.trim(),
              dose: editMedDose.trim() || null,
              frequency: editMedFreq.trim() || null,
            }
          : m,
      ),
    );
    setEditingMedId(null);
    setToast("Medicine updated.");
  };

  /* ── Onboarding handlers ─────────────────────────── */
  const handleOnboardComplete = () => {
    setOnboardDone(true);
    setOnboardStep(null);
    if (userId) localStorage.removeItem(`onboarding_step_${userId}`);
    setToast("Profile complete! Slyceai now knows your health context.");
    loadData();
  };

  /* ── Fetch AI insight by tab ─────────────────────── */
  const fetchInsightForTab = useCallback(
    async (type: string) => {
      if (insightCache[type]) {
        setInsight(insightCache[type]);
        setInsightLoading(false);
        return;
      }
      setInsightLoading(true);
      try {
        const res = await fetch(`/api/dashboard-insights?type=${type}`, {
          cache: "no-store",
        });
        const data = await res.json();
        const text = data?.content || data?.feeling || "";
        setInsight(text);
        setInsightCache((prev) => ({ ...prev, [type]: text }));
      } catch {
        /* ignore */
      } finally {
        setInsightLoading(false);
      }
    },
    [insightCache],
  );

  useEffect(() => {
    fetchInsightForTab(insightTab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [insightTab]);

  useEffect(() => {
    fetchInsightForTab("tip");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Computed values ─────────────────────────────── */
  const healthScore = Math.min(
    (onboardDone ? 30 : 10) +
      (vitals ? 30 : 0) +
      (medicines.length > 0 ? 20 : 0) +
      (medicines.filter((m) => m.taken).length /
        Math.max(medicines.length, 1)) *
        20,
    100,
  );
  const boostedScore = Math.min(Math.round(healthScore + 15), 100);
  const scoreColor =
    boostedScore >= 70
      ? "var(--accent)"
      : boostedScore >= 40
        ? "#BA7517"
        : "var(--badge-red-text)";
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  /* ── Style helpers ───────────────────────────────── */
  const card: React.CSSProperties = {
    background: "var(--bg-card)",
    border: "0.5px solid var(--border)",
    borderRadius: "10px",
    padding: "14px 16px",
  };
  const cardHeader: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  };
  const cardTitle: React.CSSProperties = {
    fontSize: "13px",
    fontWeight: 500,
    color: "var(--text-primary)",
  };
  const cardLink: React.CSSProperties = {
    fontSize: "11px",
    color: "var(--accent)",
    cursor: "pointer",
    textDecoration: "none",
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div style={{ fontSize: "13px", color: "var(--text-muted)" }}>
          Loading dashboard…
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Onboarding Banner ─────────────────────────────────── */}
      {!onboardDone && (
        <div
          style={{
            background: "var(--bg-card)",
            borderBottom: "0.5px solid var(--border)",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h2
              style={{
                fontSize: "15px",
                fontWeight: 500,
                color: "var(--text-primary)",
                margin: 0,
              }}
            >
              Complete your health profile
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                margin: "2px 0 0",
              }}
            >
              Takes 2 minutes — helps Slyceai give you accurate, personalised
              answers
            </p>
          </div>
          <button
            onClick={() =>
              setOnboardStep(getResumeStep(profile, onboardProgress))
            }
            style={{
              background: "var(--accent)",
              color: "var(--bg-card)",
              border: "none",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
              cursor: "pointer",
              fontWeight: 500,
              fontFamily: "inherit",
              whiteSpace: "nowrap",
            }}
          >
            Continue setup
          </button>
        </div>
      )}

      {/* ── Vitals Nudge Card ─────────────────────────────────── */}
      {showVitalsNudge && onboardDone && (
        <div
          style={{
            margin: "12px 24px 0",
            background: "var(--badge-green-bg)",
            border: "1px solid var(--accent)",
            borderRadius: "10px",
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: "10px",
                fontWeight: 700,
                color: "var(--accent)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                marginBottom: 3,
              }}
            >
              Vitals reminder
            </div>
            <div style={{ fontSize: "13px", color: "var(--insight-text)" }}>
              Time for a quick vitals check — it only takes a minute.
            </div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexShrink: 0,
            }}
          >
            <button
              onClick={() => setShowVitalsModal(true)}
              style={{
                background: "var(--accent)",
                color: "var(--bg-card)",
                border: "none",
                padding: "7px 14px",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
                fontWeight: 600,
                fontFamily: "inherit",
                whiteSpace: "nowrap",
              }}
            >
              + Log vitals
            </button>
            <button
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                localStorage.setItem(`vitals_nudge_${today}`, "dismissed");
                setShowVitalsNudge(false);
              }}
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                color: "var(--accent)",
                display: "flex",
                padding: 4,
              }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Dash Content ─────────────────────────────────────── */}
      <div
        className="dash-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          flex: 1,
        }}
      >
        {/* ── Row 1: 4 Metric Cards ───────────────────────────── */}
        <div className="grid-4col" style={{ gap: "12px" }}>
          {/* Health Score */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{ fontSize: "11px", color: "var(--text-secondary)" }}
              >
                Health score
              </span>
              {badge(
                boostedScore >= 70
                  ? "Good"
                  : boostedScore >= 40
                    ? "Low"
                    : "Poor",
                boostedScore >= 70
                  ? "green"
                  : boostedScore >= 40
                    ? "amber"
                    : "red",
              )}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 500,
                color: scoreColor,
                lineHeight: 1,
              }}
            >
              {boostedScore}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "3px",
              }}
            >
              {onboardDone
                ? `You are doing good!`
                : "Complete profile to improve"}
            </div>
          </div>

          {/* Blood Pressure */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{ fontSize: "11px", color: "var(--text-secondary)" }}
              >
                Blood pressure
              </span>
              {badge(
                getBpStatus(
                  vitals?.bp_systolic ?? null,
                  vitals?.bp_diastolic ?? null,
                ) === "green"
                  ? "Normal"
                  : getBpStatus(
                        vitals?.bp_systolic ?? null,
                        vitals?.bp_diastolic ?? null,
                      ) === "amber"
                    ? "Elevated"
                    : "High",
                getBpStatus(
                  vitals?.bp_systolic ?? null,
                  vitals?.bp_diastolic ?? null,
                ),
              )}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 500,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {vitals?.bp_systolic ?? "—"}
              {vitals?.bp_systolic && (
                <span
                  style={{ fontSize: "14px", color: "var(--text-secondary)" }}
                >
                  /{vitals.bp_diastolic ?? "?"}
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "3px",
              }}
            >
              {vitals ? "mmHg · logged today" : "No reading yet"}
            </div>
          </div>

          {/* Pulse */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{ fontSize: "11px", color: "var(--text-secondary)" }}
              >
                Pulse
              </span>
              {badge(
                getPulseStatus(vitals?.pulse ?? null) === "green"
                  ? "Normal"
                  : getPulseStatus(vitals?.pulse ?? null) === "amber"
                    ? "High-normal"
                    : "High",
                getPulseStatus(vitals?.pulse ?? null),
              )}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 500,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {vitals?.pulse ?? "—"}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "3px",
              }}
            >
              bpm{vitals?.pulse ? " · monitoring" : " · log vitals"}
            </div>
          </div>

          {/* Blood Sugar */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "4px",
              }}
            >
              <span
                style={{ fontSize: "11px", color: "var(--text-secondary)" }}
              >
                Blood sugar
              </span>
              {badge(
                getSugarStatus(vitals?.blood_sugar ?? null) === "green"
                  ? "Normal"
                  : getSugarStatus(vitals?.blood_sugar ?? null) === "amber"
                    ? "Elevated"
                    : "High",
                getSugarStatus(vitals?.blood_sugar ?? null),
              )}
            </div>
            <div
              style={{
                fontSize: "28px",
                fontWeight: 500,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {vitals?.blood_sugar ?? "—"}
            </div>
            <div
              style={{
                fontSize: "11px",
                color: "var(--text-muted)",
                marginTop: "3px",
              }}
            >
              mg/dL{vitals?.blood_sugar ? " · fasting" : " · no data"}
            </div>
          </div>
        </div>

        {/* ── Row 2: Insight Panel (left) + Vitals detail (right) ─── */}
        <div className="grid-2col" style={{ gap: "12px" }}>
          {/* Dosha + Tabbed Insight Panel */}
          <div style={card}>
            {/* ---- Tabbed insight panel ---- */}
            <div style={{ ...cardHeader, marginBottom: "10px" }}>
              <span style={cardTitle}>Slyceai insights</span>
              {insightLoading && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--accent)",
                    display: "inline-block",
                    animation: "insightPulse 1.4s ease-in-out infinite",
                  }}
                />
              )}
            </div>
            <style>{`@keyframes insightPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.8)}}`}</style>

            {/* Tab row */}
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "0.5px solid var(--border)",
                marginBottom: 12,
              }}
            >
              {(["tip", "diet", "exercise", "dosha"] as const).map((t) => {
                const labels: Record<string, string> = {
                  tip: "💡 Daily",
                  diet: "🥗 Diet",
                  exercise: "🏃 Exercise",
                  dosha: "🌿 Dosha",
                };
                return (
                  <button
                    key={t}
                    onClick={() => setInsightTab(t)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontSize: "11px",
                      padding: "5px 10px",
                      color:
                        insightTab === t
                          ? "var(--accent)"
                          : "var(--text-muted)",
                      borderBottom:
                        insightTab === t
                          ? "2px solid var(--accent)"
                          : "2px solid transparent",
                      fontWeight: insightTab === t ? 600 : 400,
                      marginBottom: "-0.5px",
                    }}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            {/* Insight content */}
            <div
              style={{
                background: "rgba(29, 158, 117, 0.04)",
                border: "1px solid rgba(29, 158, 117, 0.15)",
                borderLeft: "4px solid var(--accent)",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: 14,
                minHeight: 72,
              }}
            >
              <div
                style={{
                  fontSize: "12.5px",
                  color: "var(--insight-text)",
                  lineHeight: 1.6,
                }}
              >
                {insightLoading
                  ? "Generating your personalised insight…"
                  : insight ||
                    "Log your vitals and health data to unlock personalised insights."}
              </div>
            </div>

            {/* ---- Dosha mini-card ---- */}
            {(() => {
              const v = profile?.dosha_vata_score || 0;
              const p = profile?.dosha_pitta_score || 0;
              const k = profile?.dosha_kapha_score || 0;
              const hasDosha = v > 0 || p > 0 || k > 0;
              const doshaColors: Record<string, string> = {
                vata: "#a78bfa",
                pitta: "#f97316",
                kapha: "#22c55e",
              };
              const total = v + p + k || 1;
              if (!hasDosha)
                return (
                  <div
                    style={{
                      padding: "12px",
                      background: "var(--bg-secondary)",
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "var(--text-primary)",
                          marginBottom: 2,
                        }}
                      >
                        Ayurvedic profile not set
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        Take the 3-min quiz to discover your Dosha
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAyurvedaModal(true)}
                      style={{
                        fontSize: 11,
                        color: "var(--accent)",
                        fontWeight: 600,
                        textDecoration: "none",
                        border: "none",
                        cursor: "pointer",
                        background: "rgba(29,158,117,0.08)",
                        padding: "5px 10px",
                        borderRadius: 6,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Start quiz →
                    </button>
                  </div>
                );
              return (
                <div
                  style={{
                    padding: "10px 12px",
                    background: "var(--bg-secondary)",
                    borderRadius: 8,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                      }}
                    >
                      Your Dosha blend
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        color: "var(--text-muted)",
                        textTransform: "capitalize",
                      }}
                    >
                      {profile?.primary_dosha} dominant
                    </span>
                  </div>
                  {[
                    { label: "Vata", score: v, color: doshaColors.vata },
                    { label: "Pitta", score: p, color: doshaColors.pitta },
                    { label: "Kapha", score: k, color: doshaColors.kapha },
                  ].map((d) => (
                    <div key={d.label} style={{ marginBottom: 6 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 3,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 10,
                            color: "var(--text-secondary)",
                          }}
                        >
                          {d.label}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 600,
                            color: d.color,
                          }}
                        >
                          {Math.round((d.score / total) * 100)}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: 5,
                          background: "var(--border)",
                          borderRadius: 99,
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${(d.score / total) * 100}%`,
                            background: d.color,
                            borderRadius: 99,
                            transition: "width 0.6s ease",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowAyurvedaModal(true)}
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      textDecoration: "none",
                      display: "block",
                      marginTop: 6,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    Retake assessment →
                  </button>
                </div>
              );
            })()}

            {/* Action buttons */}
            <button
              onClick={() => router.push("/chat?context=dashboard")}
              style={{
                width: "100%",
                background: "#111",
                color: "var(--bg-card)",
                border: "none",
                padding: "11px",
                borderRadius: "6px",
                fontSize: "13px",
                cursor: "pointer",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                fontFamily: "inherit",
                marginTop: 14,
              }}
            >
              <MessageSquare size={14} />
              Talk to Slyceai
            </button>
            <button
              onClick={() => setShowUploadReportModal(true)}
              style={{
                width: "100%",
                background: "transparent",
                color: "var(--text-primary)",
                border: "1px dashed var(--border)",
                padding: "11px",
                borderRadius: "6px",
                fontSize: "13px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "7px",
                fontFamily: "inherit",
                marginTop: "8px",
              }}
            >
              <FileText size={14} style={{ color: "var(--text-muted)" }} />
              Upload report
            </button>
          </div>

          {/* Today's vitals detail */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={cardTitle}>Today&apos;s vitals</span>
              <button
                onClick={() => setShowVitalsModal(true)}
                style={{
                  ...cardLink,
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                + Log vitals
              </button>
            </div>
            {/* Tabs (visual) */}
            <div
              style={{
                display: "flex",
                gap: 0,
                borderBottom: "0.5px solid var(--border)",
                marginBottom: "12px",
              }}
            >
              {["Today", "7 days", "30 days"].map((t, i) => (
                <div
                  key={t}
                  style={{
                    fontSize: "12px",
                    padding: "5px 12px",
                    cursor: "pointer",
                    color: i === 0 ? "var(--accent)" : "var(--text-muted)",
                    borderBottom:
                      i === 0
                        ? "2px solid var(--accent)"
                        : "2px solid transparent",
                    fontWeight: i === 0 ? 500 : 400,
                    marginBottom: "-0.5px",
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "8px",
              }}
            >
              {(() => {
                const w = profile?.weight_kg;
                const h = profile?.height_cm;
                const bmi = w && h ? +(w / (h / 100) ** 2).toFixed(1) : null;
                const bmiCat = bmi
                  ? bmi < 18.5
                    ? "Underweight"
                    : bmi < 25
                      ? "Normal"
                      : bmi < 30
                        ? "Overweight"
                        : "Obese"
                  : null;
                const bmiColor = bmi
                  ? bmi < 18.5
                    ? "#f59e0b"
                    : bmi < 25
                      ? "var(--accent)"
                      : bmi < 30
                        ? "#f97316"
                        : "#dc2626"
                  : "var(--text-muted)";
                return [
                  {
                    name: "SpO₂",
                    val: vitals?.oxygen ? `${vitals.oxygen}` : "—",
                    unit: "%",
                  },
                  {
                    name: "Temperature",
                    val: vitals?.temperature ? `${vitals.temperature}` : "—",
                    unit: "°C",
                  },
                  { name: "Weight", val: w ? `${w}` : "—", unit: "kg" },
                  { name: "Height", val: h ? `${h}` : "—", unit: "cm" },
                  {
                    name: "BMI",
                    val: bmi ? `${bmi}` : "—",
                    unit: bmiCat || "",
                    color: bmiColor,
                  },
                  {
                    name: "Blood group",
                    val: profile?.blood_group || "—",
                    unit: "",
                  },
                ].map((v) => (
                  <div
                    key={v.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "7px 10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "11px",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {v.name}
                    </span>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 500,
                        color: (v as any).color || "var(--text-primary)",
                      }}
                    >
                      {v.val}
                      <span
                        style={{
                          fontSize: "10px",
                          color: "var(--text-muted)",
                          marginLeft: "2px",
                        }}
                      >
                        {v.unit}
                      </span>
                    </span>
                  </div>
                ));
              })()}
            </div>
          </div>
        </div>

        {/* ── Row 3: Medicines + Symptoms + Journal ──────── */}
        <div className="grid-3col" style={{ gap: "12px" }}>
          {/* Medicines today */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={cardTitle}>Medicines today</span>
              <button
                onClick={() => setShowMedicineModal(true)}
                style={{
                  ...cardLink,
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                + Add
              </button>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {medicines.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "16px 0",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ fontSize: "22px", marginBottom: "6px" }}>
                    💊
                  </div>
                  <div style={{ fontSize: "12px" }}>No medicines added yet</div>
                  <a
                    href="/medicines"
                    style={{
                      fontSize: "11px",
                      color: "var(--accent)",
                      marginTop: "4px",
                      display: "inline-block",
                      textDecoration: "none",
                    }}
                  >
                    + Add medicine
                  </a>
                </div>
              ) : (
                medicines.map((med) => (
                  <div
                    key={med.id}
                    style={{
                      padding: "8px 10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "6px",
                      border:
                        editingMedId === med.id
                          ? "1px solid var(--accent)"
                          : "1px solid transparent",
                    }}
                  >
                    {editingMedId === med.id ? (
                      /* Inline edit form */
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <input
                          value={editMedName}
                          onChange={(e) => setEditMedName(e.target.value)}
                          placeholder="Medicine name"
                          style={{
                            padding: "5px 8px",
                            borderRadius: 5,
                            border: "1px solid var(--border)",
                            fontSize: 12,
                            width: "100%",
                            background: "var(--bg-page)",
                            color: "var(--text-primary)",
                            fontFamily: "inherit",
                          }}
                        />
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 6,
                          }}
                        >
                          <input
                            value={editMedDose}
                            onChange={(e) => setEditMedDose(e.target.value)}
                            placeholder="Dose (e.g. 500mg)"
                            style={{
                              padding: "5px 8px",
                              borderRadius: 5,
                              border: "1px solid var(--border)",
                              fontSize: 12,
                              background: "var(--bg-page)",
                              color: "var(--text-primary)",
                              fontFamily: "inherit",
                            }}
                          />
                          <input
                            value={editMedFreq}
                            onChange={(e) => setEditMedFreq(e.target.value)}
                            placeholder="Frequency (e.g. Morning)"
                            style={{
                              padding: "5px 8px",
                              borderRadius: 5,
                              border: "1px solid var(--border)",
                              fontSize: 12,
                              background: "var(--bg-page)",
                              color: "var(--text-primary)",
                              fontFamily: "inherit",
                            }}
                          />
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 6,
                            justifyContent: "flex-end",
                          }}
                        >
                          <button
                            onClick={() => setEditingMedId(null)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 5,
                              border: "1px solid var(--border)",
                              fontSize: 11,
                              cursor: "pointer",
                              background: "transparent",
                              color: "var(--text-secondary)",
                              fontFamily: "inherit",
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => saveEditMed(med.id)}
                            style={{
                              padding: "4px 10px",
                              borderRadius: 5,
                              border: "none",
                              fontSize: 11,
                              cursor: "pointer",
                              background: "var(--accent)",
                              color: "white",
                              fontFamily: "inherit",
                              fontWeight: 600,
                            }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Normal view */
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: "12px",
                              fontWeight: 500,
                              color: "var(--text-primary)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {med.medicine_name}
                            {med.dose ? ` · ${med.dose}` : ""}
                          </div>
                          <div
                            style={{
                              fontSize: "11px",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {med.frequency ||
                              med.time_of_day?.join(", ") ||
                              "Daily"}
                          </div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            flexShrink: 0,
                            marginLeft: 8,
                          }}
                        >
                          <button
                            onClick={() => startEditMed(med)}
                            title="Edit"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--text-muted)",
                              padding: "3px",
                              display: "flex",
                              alignItems: "center",
                              borderRadius: 4,
                            }}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteMed(med.id)}
                            title="Remove"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "#dc2626",
                              padding: "3px",
                              display: "flex",
                              alignItems: "center",
                              borderRadius: 4,
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            onClick={() => toggleMed(med)}
                            style={{
                              width: "20px",
                              height: "20px",
                              borderRadius: "4px",
                              flexShrink: 0,
                              border:
                                "0.5px solid " +
                                (med.taken ? "var(--accent)" : "var(--border)"),
                              background: med.taken
                                ? "var(--accent)"
                                : "transparent",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              cursor: "pointer",
                              color: "var(--bg-card)",
                              fontSize: "11px",
                              fontWeight: 700,
                            }}
                          >
                            {med.taken ? "✓" : ""}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {medicines.length > 0 && (
                <button
                  onClick={() => setShowMedicineModal(true)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "100%",
                    padding: "7px 10px",
                    background: "transparent",
                    border: "0.5px dashed var(--border)",
                    borderRadius: "6px",
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  + Add medicine
                </button>
              )}
            </div>
          </div>

          {/* Current symptoms */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={cardTitle}>Current symptoms</span>
              <button
                onClick={() => setShowSymptomModal(true)}
                style={{
                  ...cardLink,
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                + Add
              </button>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {symptoms?.symptoms && symptoms.symptoms.length > 0 ? (
                symptoms.symptoms.map((s, index) => (
                  <span
                    key={s}
                    style={{
                      fontSize: "11px",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      border:
                        index === 0
                          ? "1px solid var(--accent)"
                          : index === 1
                            ? "1px solid var(--badge-red-text)"
                            : "1px solid var(--border)",
                      color:
                        index === 0
                          ? "var(--accent-dark)"
                          : index === 1
                            ? "var(--badge-red-text)"
                            : "var(--text-secondary)",
                      background:
                        index === 0
                          ? "var(--badge-green-bg)"
                          : index === 1
                            ? "initial"
                            : "var(--bg-secondary)",
                    }}
                  >
                    {s}
                  </span>
                ))
              ) : (
                <div
                  style={{
                    width: "100%",
                    textAlign: "center",
                    padding: "12px 0",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>
                    🩺
                  </div>
                  <div style={{ fontSize: "12px" }}>No symptoms logged</div>
                </div>
              )}
              <button
                onClick={() => setShowSymptomModal(true)}
                style={{
                  fontSize: "11px",
                  padding: "4px 10px",
                  borderRadius: "20px",
                  border: "1px dashed var(--border)",
                  color: "var(--text-primary)",
                  cursor: "pointer",
                  background: "transparent",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontFamily: "inherit",
                }}
              >
                + Add symptom
              </button>
            </div>
            {symptoms?.notes && (
              <div
                style={{
                  marginTop: "10px",
                  fontSize: "11px",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                Known condition:
                <br />
                <strong
                  style={{ color: "var(--text-primary)", fontWeight: 700 }}
                >
                  {symptoms.notes}
                </strong>
              </div>
            )}
          </div>

          {/* Health journals */}
          <div style={card}>
            <div style={cardHeader}>
              <span style={cardTitle}>Health journals</span>
              <button
                onClick={() => setShowJournalModal(true)}
                style={{
                  ...cardLink,
                  background: "none",
                  border: "none",
                  padding: 0,
                }}
              >
                + New entry
              </button>
            </div>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "6px" }}
            >
              {journals.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "12px 0",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ fontSize: "20px", marginBottom: "4px" }}>
                    📓
                  </div>
                  <div style={{ fontSize: "12px" }}>No journal entries yet</div>
                </div>
              ) : (
                journals.map((j) => (
                  <div
                    key={j.id}
                    style={{
                      padding: "8px 10px",
                      background: "var(--bg-secondary)",
                      borderRadius: "6px",
                    }}
                  >
                    <div
                      style={{ fontSize: "10px", color: "var(--text-muted)" }}
                    >
                      {new Date(j.journal_date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "var(--text-primary)",
                        marginTop: "2px",
                        lineHeight: 1.4,
                      }}
                    >
                      {j.notes || "No notes"}
                    </div>
                  </div>
                ))
              )}
              <button
                onClick={() => setShowJournalModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "100%",
                  padding: "7px 10px",
                  border: "0.5px dashed var(--border)",
                  background: "transparent",
                  borderRadius: "6px",
                  fontSize: "11px",
                  color: "var(--text-muted)",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                Write today&apos;s entry
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Onboarding Modal ──────────────────────────────────── */}
      {onboardStep !== null && (
        <OnboardingModal
          initialStep={onboardStep}
          userId={userId}
          prefillName={authName}
          supabase={supabase}
          onComplete={handleOnboardComplete}
          initialProgress={onboardProgress}
        />
      )}

      {/* ── Modals ──────────────────────────────────── */}
      {showVitalsModal && (
        <LogVitalsModal
          supabase={supabase}
          userId={userId}
          onClose={() => setShowVitalsModal(false)}
          onSuccess={() => {
            setShowVitalsModal(false);
            setShowVitalsNudge(false);
            loadData();
          }}
        />
      )}
      {showMedicineModal && (
        <AddMedicineModal
          supabase={supabase}
          userId={userId}
          onClose={() => setShowMedicineModal(false)}
          onSuccess={() => {
            setShowMedicineModal(false);
            loadData();
          }}
        />
      )}
      {showSymptomModal && (
        <AddSymptomModal
          supabase={supabase}
          userId={userId}
          onClose={() => setShowSymptomModal(false)}
          onSuccess={() => {
            setShowSymptomModal(false);
            loadData();
          }}
        />
      )}
      {showJournalModal && (
        <HealthJournalModal
          supabase={supabase}
          userId={userId}
          onClose={() => setShowJournalModal(false)}
          onSuccess={() => {
            setShowJournalModal(false);
            loadData();
          }}
        />
      )}
      {showAyurvedaModal && (
        <AyurvedaModal
          supabase={supabase}
          userId={userId}
          onClose={() => setShowAyurvedaModal(false)}
          onSuccess={() => {
            setShowAyurvedaModal(false);
            loadData();
          }}
        />
      )}
      {showUploadReportModal && (
        <UploadReportModal onClose={() => setShowUploadReportModal(false)} />
      )}

      {/* ── Toast ──────────────────────────────────────────────── */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
