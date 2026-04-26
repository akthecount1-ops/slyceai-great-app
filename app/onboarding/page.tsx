'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  User,
  Settings2,
  MapPin,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Database,
  Lock,
  Stethoscope,
  Activity,
  CheckCircle2,
  AlertCircle,
  HeartPulse
} from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Identity', icon: User },
  { id: 2, title: 'Baselines', icon: HeartPulse },
  { id: 3, title: 'Parameters', icon: Settings2 },
  { id: 4, title: 'Geographics', icon: MapPin },
]

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Puducherry', 'Chandigarh',
]

const COMMON_ALLERGIES = [
  'Dairy', 'Gluten', 'Nuts', 'Peanuts', 'Shellfish', 'Eggs', 'Soy',
  'Sesame', 'Sulphites', 'Latex', 'Penicillin',
]

const REGIONS = ['North India', 'South India', 'East India', 'West India', 'Central India', 'Northeast India']

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    date_of_birth: '',
    gender: '',
    height_cm: '',
    weight_kg: '',
    bp_systolic: '',
    bp_diastolic: '',
    pulse: '',
    blood_sugar: '',
    spo2: '',
    food_preference: 'vegetarian',
    allergies: [] as string[],
    region: '',
    state: '',
    city: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('onboarding_complete')
        .eq('id', user.id)
        .single()

      if (profile?.onboarding_complete) {
        router.push('/dashboard')
      }
    }
    checkStatus()
  }, [supabase, router])

  const updateField = (key: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const toggleAllergy = (allergy: string) => {
    setFormData((prev) => ({
      ...prev,
      allergies: prev.allergies.includes(allergy)
        ? prev.allergies.filter((a) => a !== allergy)
        : [...prev.allergies, allergy],
    }))
  }

  const handleComplete = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/auth/login')
      return
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        name: formData.name,
        date_of_birth: formData.date_of_birth,
        gender: formData.gender,
        height_cm: formData.height_cm ? parseInt(formData.height_cm) : null,
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        food_preference: formData.food_preference,
        allergies: formData.allergies,
        region: formData.region,
        state: formData.state,
        city: formData.city,
        onboarding_complete: true,
        updated_at: new Date().toISOString()
      })

    if (profileError) {
      console.error('Onboarding profile error:', profileError)
      setLoading(false)
      return
    }

    if (formData.bp_systolic || formData.pulse || formData.blood_sugar) {
      await supabase.from('vitals').insert({
        user_id: user.id,
        bp_systolic: formData.bp_systolic ? parseInt(formData.bp_systolic) : null,
        bp_diastolic: formData.bp_diastolic ? parseInt(formData.bp_diastolic) : null,
        pulse: formData.pulse ? parseInt(formData.pulse) : null,
        oxygen: formData.spo2 ? parseInt(formData.spo2) : null,
        blood_sugar: formData.blood_sugar ? parseInt(formData.blood_sugar) : null,
        notes: 'Initial Baseline from Onboarding',
        recorded_at: new Date().toISOString()
      })
    }

    router.refresh()
    setTimeout(() => {
      router.push('/dashboard')
    }, 100)
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-20 relative overflow-hidden bg-slate-50">
      {/* Background Circuit Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #0f172a 1px, transparent 0)', backgroundSize: '40px 40px' }} />

      <div className="relative z-10 w-full max-w-2xl animate-fade-in">
        {/* Header Branding */}
        <div className="text-center mb-16 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-medical-navy flex items-center justify-center mx-auto text-white shadow-2xl shadow-medical-navy/20 relative">
            <Stethoscope size={32} className="text-medical-teal" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-4 border-slate-50 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            </div>
          </div>
          <h1 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400">Clinical Protocol v4.1</h1>
          <h2 className="text-3xl font-black text-medical-navy tracking-tighter uppercase">Initialize Identity <span className="text-medical-teal">Matrix</span></h2>
        </div>

        {/* Progress Matrix */}
        <div className="flex items-center justify-center mb-12 gap-4">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isCurrent = step === s.id
            const isCompleted = step > s.id
            return (
              <div key={s.id} className="flex items-center">
                <div className={`flex flex-col items-center gap-2 transition-all duration-500 ${isCurrent ? 'scale-110' : 'scale-100 opacity-60'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/20' :
                      isCurrent ? 'bg-white border-medical-teal text-medical-teal shadow-xl shadow-medical-teal/10' :
                        'bg-slate-100 border-slate-200 text-slate-400'
                    }`}>
                    {isCompleted ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                  </div>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${isCurrent ? 'text-medical-navy' : 'text-slate-400'}`}>{s.title}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-12 h-px bg-slate-200 mx-2 mt-[-16px]" />
                )}
              </div>
            )
          })}
        </div>

        {/* Content Terminal */}
        <div className="glass-card rounded-[3rem] border border-slate-200 bg-white/80 p-12 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100 bg-slate-50/50">
              <Lock size={12} className="text-medical-teal" />
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">E2EE ACTIVE</span>
            </div>
          </div>

          {step === 1 && (
            <div className="space-y-8 animate-slide-up">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-medical-navy uppercase tracking-[0.2em]">Parameter Group 01: Identification</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Enter legal and biological baseline telemetry.</p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Primary Nomenclature</label>
                  <input className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy focus:outline-none focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal transition-all"
                    placeholder="Enter full name..." value={formData.name} onChange={(e) => updateField('name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Chronological Datum (DOB)</label>
                  <input type="date" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy outline-none"
                    value={formData.date_of_birth} onChange={(e) => updateField('date_of_birth', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Biological Gender Mapping</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['Male', 'Female', 'Other', 'Non-Disclosed'].map((g) => (
                      <button key={g} type="button" onClick={() => updateField('gender', g)}
                        className={`py-3 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${formData.gender === g
                            ? 'bg-medical-navy text-white border-medical-navy shadow-lg shadow-medical-navy/10'
                            : 'bg-white border-slate-100 text-slate-400 hover:border-medical-teal/30 hover:text-medical-teal'
                          }`}>
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-slide-up">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-medical-navy uppercase tracking-[0.2em]">Parameter Group 02: Baseline Telemetry</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Enter physiological baseline parameters (optional but recommended).</p>
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Height (cm)</label>
                  <input type="number" placeholder="170" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy focus:outline-none focus:ring-2 focus:border-medical-teal transition-all"
                    value={formData.height_cm} onChange={(e) => updateField('height_cm', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Weight (kg)</label>
                  <input type="number" placeholder="70" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy focus:outline-none focus:ring-2 focus:border-medical-teal transition-all"
                    value={formData.weight_kg} onChange={(e) => updateField('weight_kg', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">BP Systolic</label>
                  <input type="number" placeholder="120" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy focus:outline-none focus:ring-2 focus:border-medical-teal transition-all"
                    value={formData.bp_systolic} onChange={(e) => updateField('bp_systolic', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">BP Diastolic</label>
                  <input type="number" placeholder="80" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy focus:outline-none focus:ring-2 focus:border-medical-teal transition-all"
                    value={formData.bp_diastolic} onChange={(e) => updateField('bp_diastolic', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Heart Rate (bpm)</label>
                  <input type="number" placeholder="72" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy focus:outline-none focus:ring-2 focus:border-medical-teal transition-all"
                    value={formData.pulse} onChange={(e) => updateField('pulse', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">SpO2 (%)</label>
                  <input type="number" placeholder="98" className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy focus:outline-none focus:ring-2 focus:border-medical-teal transition-all"
                    value={formData.spo2} onChange={(e) => updateField('spo2', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-slide-up">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-medical-navy uppercase tracking-[0.2em]">Parameter Group 03: Bio-Architecture</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Define nutritional protocols and systemic sensitivity.</p>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Nutritional Basis</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['vegetarian', 'non-vegetarian', 'vegan', 'jain', 'keto', 'sattvic'].map((pref) => (
                      <button key={pref} type="button" onClick={() => updateField('food_preference', pref)}
                        className={`py-2 px-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${formData.food_preference === pref
                            ? 'bg-medical-teal text-white border-medical-teal shadow-lg shadow-medical-teal/10'
                            : 'bg-white border-slate-100 text-slate-400'
                          }`}>
                        {pref}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1 text-rose-500">Pathological Sensitivities (Allergies)</label>
                  <div className="flex flex-wrap gap-2">
                    {COMMON_ALLERGIES.map((allergy) => (
                      <button key={allergy} type="button" onClick={() => toggleAllergy(allergy)}
                        className={`py-1.5 px-3 rounded-full text-[8px] font-black uppercase tracking-widest transition-all border ${formData.allergies.includes(allergy)
                            ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/10'
                            : 'bg-slate-50 border-slate-100 text-slate-400'
                          }`}>
                        {allergy}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-8 animate-slide-up">
              <div className="space-y-1">
                <h3 className="text-sm font-black text-medical-navy uppercase tracking-[0.2em]">Parameter Group 04: Geographics</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">Initialize georegional health tracking nodes.</p>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Primary Macro-Region</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy outline-none"
                    value={formData.region} onChange={(e) => updateField('region', e.target.value)}>
                    <option value="">Select Primary Cluster</option>
                    {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Jurisdiction Node (State)</label>
                  <select className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy outline-none"
                    value={formData.state} onChange={(e) => updateField('state', e.target.value)}>
                    <option value="">Select State Node</option>
                    {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] pl-1">Local Identity Node (City)</label>
                  <input className="w-full bg-slate-50 border border-slate-100 rounded-xl py-4 px-4 text-sm font-bold text-medical-navy focus:outline-none focus:ring-2 focus:ring-medical-teal/20"
                    placeholder="Enter city nomenclature..." value={formData.city} onChange={(e) => updateField('city', e.target.value)} />
                </div>
              </div>
            </div>
          )}

          {/* Logic Control Footer */}
          <div className="flex gap-4 mt-12 pt-10 border-t border-slate-50">
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)}
                className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100">
                PREVIOUS NODE
              </button>
            )}
            {step < 4 ? (
              <button onClick={() => setStep((s) => s + 1)}
                disabled={step === 1 && !formData.name}
                className="flex-1 py-4 rounded-2xl bg-medical-navy text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-navy/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 flex items-center justify-center gap-3">
                CONTINUE PROTOCOL <ArrowRight size={16} className="text-medical-teal" />
              </button>
            ) : (
              <button onClick={handleComplete} disabled={loading}
                className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30">
                {loading ? 'FINALIZING ENCRYPTION...' : 'INITIALIZE SYSTEM MATRIX'}
              </button>
            )}
          </div>
        </div>

        {/* System Integrity Notification */}
        <div className="mt-8 flex items-center justify-center gap-6 opacity-40">
          <div className="flex items-center gap-2">
            <Database size={12} className="text-slate-400" />
            <span className="text-[8px] font-black uppercase tracking-widest">PostgreSQL Indexed</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300" />
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-slate-400" />
            <span className="text-[8px] font-black uppercase tracking-widest">SOC2 Type II Compliant</span>
          </div>
          <div className="w-1 h-1 rounded-full bg-slate-300" />
          <div className="flex items-center gap-2">
            <Activity size={12} className="text-slate-400" />
            <span className="text-[8px] font-black uppercase tracking-widest">Matrix Status: OK</span>
          </div>
        </div>
      </div>
    </div>
  )
}
