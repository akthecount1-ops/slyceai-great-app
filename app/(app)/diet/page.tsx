'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Salad, 
  Scale, 
  Stethoscope, 
  HeartPulse, 
  ShieldCheck, 
  Zap, 
  Droplets, 
  Lightbulb,
  Clock,
  ChevronRight,
  BrainCircuit,
  Settings2,
  CalendarDays,
  Target,
  Utensils
} from 'lucide-react'

interface DietPlan {
  date: string
  meals: { time: string; name: string; description: string; calories: number; items: string[] }[]
  hydration: string
  tips: string[]
}

export default function DietPage() {
  const [plan, setPlan] = useState<DietPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [preferences, setPreferences] = useState({ goal: 'general_wellness', season: 'current' })
  const supabase = createClient()

  const generatePlan = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const res = await fetch('/api/diet/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, ...preferences }),
    })
    const data = await res.json()
    if (data.plan) setPlan(data.plan)
    setLoading(false)
  }

  const GOALS = [
    { id: 'general_wellness', label: 'General Wellness', icon: Salad },
    { id: 'weight_loss', label: 'Weight Analysis', icon: Scale },
    { id: 'diabetes', label: 'Glycemic Control', icon: Stethoscope },
    { id: 'heart_health', label: 'Cardiac Health', icon: HeartPulse },
    { id: 'immunity_boost', label: 'Immune Shield', icon: ShieldCheck },
    { id: 'energy', label: 'Metabolic Energy', icon: Zap },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-teal mb-2">Nutritional Control</div>
          <h1 className="text-3xl font-black text-medical-navy tracking-tight">Clinical Diet Protocol</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Precision caloric and nutrient distribution synthesized by Nemotron-3 AI.</p>
        </div>
        <div className="flex items-center gap-2">
           <div className="text-right px-4">
              <div className="text-[10px] font-black text-slate-300 uppercase leading-none">Status</div>
              <div className="text-xs font-bold text-medical-teal">ALGORITHM READY</div>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-medical-navy flex items-center justify-center text-white shadow-xl shadow-medical-navy/20">
              <Settings2 size={24} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar: Preferences */}
        <div className="lg:col-span-1 space-y-6">
          <section className="glass-card rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
              <Target size={16} className="text-medical-teal" />
              <h2 className="font-bold text-medical-navy uppercase text-xs tracking-widest">Target Objective</h2>
            </div>
            <div className="p-3 flex flex-col gap-2">
              {GOALS.map((g) => (
                <button key={g.id} type="button"
                        onClick={() => setPreferences((p) => ({ ...p, goal: g.id }))}
                        className={`flex items-center gap-3 p-3 rounded-xl font-bold text-[11px] uppercase tracking-wider text-left transition-all border ${
                          preferences.goal === g.id 
                            ? 'bg-medical-teal text-white border-medical-teal shadow-lg shadow-medical-teal/20' 
                            : 'bg-white border-slate-100 text-slate-400 hover:border-medical-teal/30 hover:text-medical-teal'
                        }`}>
                  <g.icon size={16} className={preferences.goal === g.id ? 'animate-pulse' : ''} />
                  {g.label}
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-slate-50">
               <button onClick={generatePlan} disabled={loading} className="w-full py-4 rounded-xl bg-medical-navy text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-medical-navy/10 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-40">
                {loading ? 'Synthesizing Plan...' : 'Generate Protocol'}
              </button>
            </div>
          </section>

          <section className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={16} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Temporal Cycle</span>
            </div>
            <div className="text-xs font-bold text-medical-navy">Standard Clinical Window (24h)</div>
          </section>
        </div>

        {/* Main: Protocol Output */}
        <div className="lg:col-span-3 space-y-6">
          {!plan && !loading ? (
             <div className="glass-card rounded-2xl p-20 text-center flex flex-col items-center border-2 border-dashed border-slate-200 bg-slate-50/30">
                <div className="w-20 h-20 rounded-3xl bg-white shadow-xl flex items-center justify-center text-slate-300 mb-6">
                  <Utensils size={40} />
                </div>
                <h3 className="text-xl font-black text-medical-navy mb-2">Algorithm Idle</h3>
                <p className="text-sm font-medium text-slate-500 max-w-sm mx-auto mb-8">
                  Select a clinical target objective to synthesize a professional nutritional protocol.
                </p>
                <button onClick={generatePlan} className="px-8 py-3 bg-medical-navy text-white rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg shadow-medical-navy/20 hover:scale-[1.02] transition-all">
                  Run Synthesis Now
                </button>
             </div>
          ) : loading ? (
             <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-32 rounded-2xl border border-slate-100 bg-slate-50/50 animate-pulse flex items-center px-8 gap-6">
                     <div className="w-12 h-12 rounded-xl bg-slate-200" />
                     <div className="flex-1 space-y-2">
                        <div className="w-1/4 h-3 bg-slate-200 rounded" />
                        <div className="w-3/4 h-4 bg-slate-200 rounded" />
                     </div>
                  </div>
                ))}
             </div>
          ) : (
            <div className="space-y-6">
               <div className="flex items-center justify-between px-2">
                  <h2 className="text-lg font-black text-medical-navy flex items-center gap-2">
                    Daily Logistics <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  </h2>
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-medical-teal/10 border border-medical-teal/20">
                     <BrainCircuit size={14} className="text-medical-teal" />
                     <span className="text-[10px] font-black text-medical-teal uppercase tracking-widest">Protocol Version v3.0</span>
                  </div>
               </div>

               {plan?.meals?.map((meal, i) => (
                <div key={i} className="glass-card rounded-2xl border border-slate-100 hover:border-medical-teal/30 hover:shadow-xl hover:shadow-medical-teal/5 transition-all group overflow-hidden flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 bg-slate-50/50 border-r border-slate-100 p-6 flex flex-col justify-center">
                    <div className="flex items-center gap-1.5 text-medical-teal mb-1">
                       <Clock size={14} />
                       <span className="text-xs font-black uppercase tracking-tighter">{meal.time}</span>
                    </div>
                    <div className="text-sm font-bold text-medical-navy group-hover:text-medical-teal transition-colors">{meal.name}</div>
                  </div>
                  <div className="flex-1 p-6 flex flex-col justify-center">
                    <p className="text-sm font-medium text-slate-500 leading-relaxed mb-4">{meal.description}</p>
                    <div className="flex flex-wrap gap-2">
                      {meal.items?.map((item, j) => (
                        <span key={j} className="text-[10px] font-bold text-medical-navy bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg uppercase tracking-tight">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="p-6 bg-slate-50/30 flex flex-col items-center justify-center border-l border-slate-100">
                     <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Telemetry</div>
                     <div className="px-3 py-1.5 rounded-xl bg-white border border-slate-100 text-xs font-black text-medical-navy tabular-nums">
                        {meal.calories} KCAL
                     </div>
                  </div>
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plan?.hydration && (
                   <div className="glass-card rounded-2xl p-6 border border-slate-100 bg-white flex items-start gap-4 shadow-sm relative overflow-hidden">
                      <div className="absolute right-0 top-0 opacity-[0.03] -mr-4 -mt-4">
                         <Droplets size={120} className="text-medical-teal" />
                      </div>
                      <div className="w-12 h-12 rounded-xl bg-medical-teal/10 flex items-center justify-center text-medical-teal shrink-0">
                         <Droplets size={24} />
                      </div>
                      <div>
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-medical-teal mb-1">Hydration Matrix</h4>
                         <p className="text-sm font-bold text-medical-navy leading-relaxed">{plan.hydration}</p>
                      </div>
                   </div>
                )}

                {plan?.tips && plan.tips.length > 0 && (
                  <div className="glass-card rounded-2xl p-6 border border-slate-100 bg-white flex items-start gap-4 shadow-sm relative overflow-hidden">
                     <div className="absolute right-0 top-0 opacity-[0.03] -mr-4 -mt-4">
                        <Lightbulb size={120} className="text-medical-navy" />
                     </div>
                     <div className="w-12 h-12 rounded-xl bg-medical-navy/5 flex items-center justify-center text-medical-navy shrink-0">
                        <Lightbulb size={24} />
                     </div>
                     <div className="relative z-10">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-medical-navy mb-3">Clinical Directives</h4>
                        <ul className="space-y-3">
                          {plan?.tips?.map((tip, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs font-medium text-slate-500">
                               <ChevronRight size={14} className="text-medical-teal shrink-0 mt-0.5" />
                               {tip}
                            </li>
                          ))}
                        </ul>
                     </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security Disclaimer */}
      <div className="flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-100 bg-white shadow-sm">
        <div className="w-10 h-10 rounded-xl bg-medical-navy flex items-center justify-center text-white shrink-0 shadow-lg shadow-medical-navy/20">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-medical-navy flex items-center gap-1.5">
            Diagnostic Integrity Verified <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </h4>
          <p className="text-xs font-medium text-slate-500 mt-1 max-w-3xl leading-relaxed">
            Nutritional protocols are synthesized based on your clinical profile, historical Vitals telemetry, and current metabolic window. 
            All algorithmic logic is strictly verified against standard medical nutritional guidelines.
          </p>
        </div>
      </div>
    </div>
  )
}
