'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Wind, 
  Flame, 
  Waves, 
  Compass, 
  ShieldCheck, 
  Feather, 
  RefreshCw, 
  ChevronRight, 
  Sparkles,
  History,
  Activity,
  BrainCircuit,
  Stethoscope,
  Info
} from 'lucide-react'

const DOSHA_QUESTIONS = [
  {
    id: 'body_type',
    question: 'Physical Constitution Analysis',
    options: [
      { value: 'vata', label: 'Ectomorphic / Linear / Challenges with mass gain' },
      { value: 'pitta', label: 'Mesomorphic / Athletic / Moderate metabolic stability' },
      { value: 'kapha', label: 'Endomorphic / Robust / Tendency for mass retention' },
    ],
  },
  {
    id: 'digestion',
    question: 'Gastrointestinal Baseline',
    options: [
      { value: 'vata', label: 'Inconsistent / Occasional distension or stasis' },
      { value: 'pitta', label: 'Hyperactive / High caloric demand / Acidic tendency' },
      { value: 'kapha', label: 'Systemic / Consistent execution / Slow metabolic rate' },
    ],
  },
  {
    id: 'sleep',
    question: 'Circadian Pattern Monitoring',
    options: [
      { value: 'vata', label: 'Light-cycle / Intermittent / Vigilant dreaming' },
      { value: 'pitta', label: 'Moderate-cycle / Reliable latency / Efficient rest' },
      { value: 'kapha', label: 'Deep-cycle / High latency / Prolonged recovery' },
    ],
  },
  {
    id: 'stress',
    question: 'Psychological Response to Load',
    options: [
      { value: 'vata', label: 'Elevated cognitive load / Anxiety / Apprehension' },
      { value: 'pitta', label: 'Heightened aggression / Irritability / Intense focus' },
      { value: 'kapha', label: 'Systemic deceleration / Emotional stasis / Withdrawal' },
    ],
  },
]

const DOSHA_INFO: Record<string, { icon: any; name: string; desc: string; color: string; foods: string[]; avoid: string[]; practices: string[] }> = {
  vata: {
    icon: Wind, name: 'Vata', color: '#a78bfa',
    desc: 'Vata represents the kinetic energy of air and ether. Characterized by creativity, mobility, and coldness. Requires stabilization, warmth, and grounding protocols.',
    foods: ['Therapeutic cooked meals', 'Clarified butter (Ghee)', 'Lipid-dense oils', 'Tubers / Root vegetables', 'Turmeric-infused thermal milk', 'High-caloric fruits (Dates)'],
    avoid: ['Hypothermal sustenance', 'Excessive raw cellulose', 'Stimulants (Caffeine)', 'Dehydrated snacks'],
    practices: ['Abhyanga (Thermal Lipid Massage)', 'Low-impact stabilization (Gentle Yoga)', 'Nocturnal discipline (Early Rest)', 'Thermal Hydrotherapy'],
  },
  pitta: {
    icon: Flame, name: 'Pitta', color: '#f97316',
    desc: 'Pitta represents the transformational energy of fire and water. Characterized by heat, sharpness, and metabolism. Requires thermal regulation and anti-inflammatory protocols.',
    foods: ['Hydrating isotonic fluids (Coconut water)', 'Cooling botanicals (Cucumber)', 'Fennel infusion', 'Sweet phytochemicals', 'Polished grains (Basmati)'],
    avoid: ['Capsaicin-heavy foods', 'Ethanol exposure', 'Fermented compounds', 'Red protein / Lipid saturation', 'Caffeine'],
    practices: ['Sheetali (Thermal Breath Control)', 'Aquatic exercise (Swimming)', 'Luminance shielding', 'Metabolic consistency (Timed meals)'],
  },
  kapha: {
    icon: Waves, name: 'Kapha', color: '#22c55e',
    desc: 'Kapha represents the structural energy of earth and water. Characterized by stability, lubrication, and endurance. Requires metabolic stimulation and caloric restriction protocols.',
    foods: ['Pungent botanical profiles', 'Ginger thermal infusion', 'High-fiber legumes', 'Cruciferous vegetables', 'Raw bio-honey', 'Stimulating spices'],
    avoid: ['High-density dairy', 'Lipid-saturated / Fried compounds', 'Sucrose saturation', 'Cold fluids', 'Caloric excess'],
    practices: ['Aerobic exertion (Vigorous exercise)', 'Epidermal simulation (Dry brushing)', 'Metabolic reset (Fasting)', 'Early circadian initiation'],
  },
}

export default function AyurvedaPage() {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [dosha, setDosha] = useState<string | null>(null)
  const [aiAdvice, setAiAdvice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const calculateDosha = () => {
    const counts: Record<string, number> = { vata: 0, pitta: 0, kapha: 0 }
    Object.values(answers).forEach((v) => counts[v]++)
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
  }

  const handleSubmit = async () => {
    if (Object.keys(answers).length < DOSHA_QUESTIONS.length) return
    const result = calculateDosha()
    setDosha(result)
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = await supabase.from('profiles').select('name, food_preference, state').eq('id', user?.id ?? '').single()

    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Based on my dosha assessment, I appear to be primarily ${result} type. Please give me personalised Ayurvedic recommendations for diet, lifestyle, herbs, and daily routine (dinacharya) specific to ${result} dosha. I am from ${profile?.state ?? 'India'} and follow a ${profile?.food_preference ?? 'vegetarian'} diet. Please be specific and practical.`
      }),
    })
    const data = await res.json()
    setAiAdvice(data.content)
    setLoading(false)
  }

  const info = dosha ? DOSHA_INFO[dosha] : null

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-teal mb-2">Molecular Wellness</div>
          <h1 className="text-3xl font-black text-medical-navy tracking-tight">Ayurvedic Protocol Assessment</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Discover your Prakriti (biological constitution) through clinical synthesis.</p>
        </div>
        <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-medical-teal shadow-sm">
           <Compass size={28} />
        </div>
      </div>

      {!dosha ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <div className="glass-card rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white/50 backdrop-blur-xl">
                 <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
                    <h2 className="text-xs font-black uppercase tracking-[0.2em] text-medical-navy">Prakriti Diagnostic Queue</h2>
                    <div className="text-[9px] font-black text-slate-300 uppercase">{Object.keys(answers).length} / {DOSHA_QUESTIONS.length} Complete</div>
                 </div>
                 <div className="p-8 space-y-10">
                    {DOSHA_QUESTIONS.map((q) => (
                      <div key={q.id} className="space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="w-6 h-6 rounded-lg bg-medical-navy text-white text-[10px] font-black flex items-center justify-center">
                              {DOSHA_QUESTIONS.indexOf(q) + 1}
                           </div>
                           <p className="text-sm font-black text-medical-navy uppercase tracking-tight">{q.question}</p>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                          {q.options.map((opt) => (
                            <button key={opt.value} type="button"
                                    onClick={() => setAnswers((p) => ({ ...p, [q.id]: opt.value }))}
                                    className={`text-left px-5 py-4 rounded-2xl text-[11px] font-bold uppercase tracking-wider transition-all border ${
                                      answers[q.id] === opt.value 
                                        ? 'bg-medical-teal text-white border-medical-teal shadow-lg shadow-medical-teal/10' 
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-medical-teal/20 hover:text-medical-teal'
                                    }`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                 </div>
                 <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                    <button onClick={handleSubmit}
                            disabled={Object.keys(answers).length < DOSHA_QUESTIONS.length}
                            className="w-full py-4 rounded-2xl bg-medical-navy text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-medical-navy/20 hover:scale-[1.01] transition-all disabled:opacity-30">
                      Execute Synthesis Analysis
                    </button>
                 </div>
              </div>
           </div>

           <div className="lg:col-span-1 space-y-6">
              <section className="p-6 rounded-3xl border border-slate-100 bg-white shadow-sm">
                 <div className="flex items-center gap-2 mb-4">
                    <History size={16} className="text-medical-teal" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diagnostic Context</h3>
                 </div>
                 <p className="text-xs font-medium text-slate-500 leading-relaxed italic">
                   "Ayurvedic prakriti is the unique combination of physical, mental and emotional characteristics which together form your basic constitution."
                 </p>
              </section>

              <section className="p-6 rounded-3xl border-2 border-dashed border-slate-100 bg-slate-50/30">
                 <div className="flex items-center gap-2 mb-4">
                    <Activity size={16} className="text-medical-navy" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">System Parameters</h3>
                 </div>
                 <div className="space-y-4">
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-slate-400">PROVIDER</span>
                       <span className="text-[10px] font-black text-medical-navy">ARO-SYS v2.4</span>
                    </div>
                    <div className="flex justify-between items-center">
                       <span className="text-[10px] font-bold text-slate-400">INPUT SOURCE</span>
                       <span className="text-[10px] font-black text-medical-navy">PATIENT-DIRECT</span>
                    </div>
                 </div>
              </section>
           </div>
        </div>
      ) : info && (
        <div className="flex flex-col gap-8 animate-fade-in">
          {/* Result Visualization */}
          <div className="glass-card rounded-3xl border border-slate-100 shadow-sm overflow-hidden bg-white p-8 md:p-12 relative">
             <div className="absolute right-0 top-0 opacity-[0.02] -mr-20 -mt-20">
                <info.icon size={400} />
             </div>
             <div className="flex flex-col md:flex-row items-center gap-10 relative z-10">
                <div className="w-40 h-40 rounded-[2.5rem] bg-medical-navy flex items-center justify-center text-white shadow-2xl shadow-medical-navy/20">
                   <info.icon size={80} />
                </div>
                <div className="text-center md:text-left space-y-4 flex-1">
                   <div className="text-[10px] font-black uppercase tracking-[0.4em] text-medical-teal">Primary Biosignature Identified</div>
                   <h2 className="text-5xl font-black text-medical-navy tracking-tighter">{info.name} Modality</h2>
                   <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-2xl">{info.desc}</p>
                   <button onClick={() => { setDosha(null); setAnswers({}); setAiAdvice(null) }}
                           className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest py-3 px-6 rounded-xl border border-slate-100 text-slate-400 hover:text-rose-500 hover:border-rose-200 transition-all">
                     <RefreshCw size={14} /> Recalibrate Assessment
                   </button>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card rounded-3xl p-6 border border-slate-100 bg-white border-t-4 border-t-emerald-500">
              <div className="flex items-center gap-2 font-black text-emerald-500 uppercase text-[10px] tracking-widest mb-4">
                 <ShieldCheck size={16} /> Precision Sustainment
              </div>
              <ul className="space-y-3">
                {info.foods.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs font-bold text-slate-600">
                    <ChevronRight size={14} className="text-emerald-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="glass-card rounded-3xl p-6 border border-slate-100 bg-white border-t-4 border-t-rose-500">
              <div className="flex items-center gap-2 font-black text-rose-500 uppercase text-[10px] tracking-widest mb-4">
                 <Info size={16} /> Restricted Exposure
              </div>
              <ul className="space-y-3">
                {info.avoid.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs font-bold text-slate-600">
                    <ChevronRight size={14} className="text-rose-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
            </div>

            <div className="glass-card rounded-3xl p-6 border border-slate-100 bg-white border-t-4 border-t-medical-navy">
              <div className="flex items-center gap-2 font-black text-medical-navy uppercase text-[10px] tracking-widest mb-4">
                 <Feather size={16} /> Lifestyle Directives
              </div>
              <ul className="space-y-3">
                {info.practices.map((p) => (
                  <li key={p} className="flex items-start gap-2 text-xs font-bold text-slate-600">
                    <ChevronRight size={14} className="text-medical-navy shrink-0 mt-0.5" /> {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {loading && (
            <div className="glass-card rounded-3xl p-10 border border-slate-100 bg-slate-50/50 space-y-4">
               <div className="flex items-center gap-2 mb-2">
                  <BrainCircuit size={20} className="text-medical-teal animate-pulse" />
                  <span className="text-[10px] font-black uppercase text-medical-teal tracking-widest">Synthesizing AI Clinical Insight...</span>
               </div>
               <div className="space-y-3">
                  <div className="h-3 w-full bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-3 w-5/6 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-3 w-4/6 bg-slate-200 rounded-full animate-pulse" />
               </div>
            </div>
          )}

          {aiAdvice && !loading && (
            <div className="glass-card rounded-3xl overflow-hidden border border-slate-100 bg-white shadow-xl shadow-medical-navy/5">
              <div className="px-8 py-5 bg-medical-navy flex items-center justify-between border-b border-medical-navy/10">
                 <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">
                       <Stethoscope size={18} />
                    </div>
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white">Advanced AI Consultation Result</h3>
                 </div>
                 <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    <Sparkles size={12} className="text-emerald-500" />
                    <span className="text-[9px] font-black text-emerald-500 uppercase tracking-tighter">Verified Logic</span>
                 </div>
              </div>
              <div className="p-8 md:p-10">
                <div className="text-sm font-medium leading-relaxed text-slate-600 whitespace-pre-wrap max-w-4xl columns-1 md:columns-2 gap-12">
                  {aiAdvice}
                </div>
              </div>
              <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                 <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <ShieldCheck size={14} /> End-to-End Encrypted
                 </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
