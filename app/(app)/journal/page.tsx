'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen, 
  Plus, 
  Calendar, 
  Activity, 
  Zap, 
  Smile, 
  AlertCircle, 
  ClipboardList, 
  History as HistoryIcon,
  ChevronRight,
  ShieldCheck,
  Stethoscope,
  Frown,
  Meh,
  ChevronDown,
  ArrowUpRight,
  Timer
} from 'lucide-react'

const SYMPTOMS = [
  'Headache', 'Fatigue', 'Nausea', 'Fever', 'Cough', 'Cold', 'Back Pain',
  'Joint Pain', 'Stomach Pain', 'Bloating', 'Dizziness', 'Shortness of Breath',
  'Chest Pain', 'Anxiety', 'Insomnia', 'Muscle Ache', 'Sore Throat', 'Rash',
]

interface JournalEntry {
  id: string
  journal_date: string
  pain_level: number | null
  energy_level: number | null
  mood_level: number | null
  symptoms: string[] | null
  notes: string | null
}

const LEVEL_LABELS: Record<number, { label: string, color: string, icon: any }> = { 
  1: { label: 'CRITICAL', color: 'text-rose-600', icon: Frown }, 
  2: { label: 'ACUTE', color: 'text-orange-600', icon: Meh }, 
  3: { label: 'STABLE', color: 'text-medical-navy', icon: Meh }, 
  4: { label: 'OPTIMIZED', color: 'text-medical-teal', icon: Smile }, 
  5: { label: 'PEAK', color: 'text-emerald-600', icon: Activity } 
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [form, setForm] = useState({
    journal_date: new Date().toISOString().split('T')[0],
    pain_level: 3,
    energy_level: 3,
    mood_level: 3,
    symptoms: [] as string[],
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('symptom_journal')
      .select('*')
      .eq('user_id', user.id)
      .order('journal_date', { ascending: false })
      .limit(20)
    setEntries((data as JournalEntry[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const toggleSymptom = (s: string) => {
    setForm((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(s)
        ? prev.symptoms.filter((x) => x !== s)
        : [...prev.symptoms, s],
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('symptom_journal').upsert({
      user_id: user.id,
      journal_date: form.journal_date,
      pain_level: form.pain_level,
      energy_level: form.energy_level,
      mood_level: form.mood_level,
      symptoms: form.symptoms,
      notes: form.notes || null,
    }, { onConflict: 'user_id,journal_date' })

    await load()
    setSaving(false)
  }

  const Slider = ({ label, field, color }: { label: string; field: 'pain_level' | 'energy_level' | 'mood_level'; color: string }) => {
    const config = LEVEL_LABELS[form[field]]
    const Icon = config.icon
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</label>
          <div className={`flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-100 ${config.color}`}>
             <Icon size={12} strokeWidth={3} />
             <span className="text-[9px] font-black uppercase tracking-widest">{config.label}</span>
          </div>
        </div>
        <div className="relative pt-2">
          <input type="range" min="1" max="5" value={form[field]}
                 onChange={(e) => setForm((p) => ({ ...p, [field]: parseInt(e.target.value) }))}
                 className="w-full h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer accent-medical-navy" />
          <div className="flex justify-between text-[8px] font-black text-slate-300 uppercase tracking-widest mt-2">
            <span>Minimum</span><span>Moderate</span><span>Maximum</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-teal mb-2">Subjective Analysis</div>
          <h1 className="text-4xl font-black tracking-tighter text-medical-navy">
            Clinical <span className="text-medical-teal uppercase">Symptom Analytics</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-3">
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <BookOpen size={12} className="text-medical-teal" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Diagnostic Journaling</span>
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <ClipboardList size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Encrypted Observation Vault</span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right">
              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Protocol v4.0</div>
              <div className="text-xs font-bold text-medical-navy">Longitudinal History</div>
           </div>
           <div className="w-14 h-14 rounded-2xl bg-medical-navy flex items-center justify-center text-white shadow-xl shadow-medical-navy/20">
              <BookOpen size={28} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Entry Panel */}
        <div className="lg:col-span-2 space-y-6">
           <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white/50 backdrop-blur-xl shadow-sm">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
                <Plus size={18} className="text-medical-teal" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-medical-navy">Observation Entry Terminal</h2>
              </div>
              <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Record Timestamp</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-medical-teal">
                      <Calendar size={18} />
                    </div>
                    <input type="date" value={form.journal_date}
                           onChange={(e) => setForm((p) => ({ ...p, journal_date: e.target.value }))}
                           className="w-full bg-white border border-slate-100 rounded-xl py-3.5 pl-12 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all" />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-8 p-6 rounded-2xl bg-slate-50/50 border border-slate-100">
                  <Slider label="Pain Threshold Analysis" field="pain_level" color="text-medical-navy" />
                  <Slider label="Bio-Energy Potential" field="energy_level" color="text-medical-navy" />
                  <Slider label="Cognitive-Affective State" field="mood_level" color="text-medical-navy" />
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Biological Discomfort Indicators</label>
                  <div className="flex flex-wrap gap-2">
                    {SYMPTOMS.map((s) => {
                      const active = form.symptoms.includes(s)
                      return (
                        <button key={s} type="button" onClick={() => toggleSymptom(s)}
                                className={`text-[9px] font-black py-2.5 px-4 rounded-xl uppercase tracking-widest transition-all border ${
                                  active ? 'bg-medical-navy text-medical-teal border-medical-teal shadow-lg shadow-medical-teal/10 scale-[1.02]' : 'bg-white text-slate-400 border-slate-100 hover:bg-slate-50'
                                }`}>
                          {s}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qualitative Observations</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-4 text-slate-300 group-focus-within:text-medical-teal">
                      <ClipboardList size={18} />
                    </div>
                    <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                              className="w-full bg-white border border-slate-100 rounded-xl py-3.5 pl-12 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all resize-none min-h-[140px]"
                              placeholder="Document systemic fluctuations or specific triggers..." />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full bg-medical-navy py-4 rounded-xl flex items-center justify-center gap-3 group shadow-xl shadow-medical-navy/20 active:scale-[0.98] transition-all disabled:opacity-50">
                  {saving ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck size={20} className="text-medical-teal" /> 
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Secure Archival Entry</span>
                    </>
                  )}
                </button>
              </form>
           </div>
        </div>

        {/* Recent Entries */}
        <div className="lg:col-span-3 space-y-6">
           <div className="flex items-center justify-between mb-2">
             <h2 className="text-[10px] font-black text-medical-navy uppercase tracking-[0.2em] flex items-center gap-2">
               <HistoryIcon size={16} className="text-medical-teal" /> Longitudinal Registry Audit
             </h2>
             <span className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">N-30 Cycle</span>
           </div>
           
           {entries.length === 0 ? (
             <div className="glass-card rounded-[3rem] border border-slate-100 bg-white/50 p-24 text-center">
               <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8 text-slate-200">
                 <Stethoscope size={40} />
               </div>
               <h3 className="text-xl font-black text-medical-navy uppercase tracking-tight mb-2">Null Historical References</h3>
               <p className="text-sm font-medium text-slate-400 uppercase tracking-tighter max-w-xs mx-auto">No longitudinal data detected in current profile. Begin systemic tracking to establish baseline analytics.</p>
             </div>
           ) : (
             <div className="space-y-4">
               {entries.map((entry) => (
                 <div key={entry.id} className="glass-card rounded-[2rem] border border-slate-100 bg-white p-8 group hover:border-medical-teal/30 hover:shadow-xl hover:shadow-medical-teal/5 transition-all">
                   <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-8 pb-6 border-b border-slate-50">
                     <div>
                       <div className="text-[9px] font-black text-medical-teal uppercase tracking-widest mb-1">Audit Reference</div>
                       <div className="text-lg font-black text-medical-navy uppercase tracking-tight flex items-center gap-3">
                         {new Date(entry.journal_date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                         <ChevronRight size={14} className="text-slate-200" />
                       </div>
                     </div>
                     <div className="flex gap-4">
                       {[
                         { label: 'PAIN', val: entry.pain_level, key: 'pain' },
                         { label: 'ENERGY', val: entry.energy_level, key: 'energy' },
                         { label: 'COGNITION', val: entry.mood_level, key: 'mood' },
                       ].map(({ label, val }) => (
                         <div key={label} className="text-center px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                           <div className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">{label}</div>
                           <div className={`text-sm font-black ${val && val <= 2 ? 'text-rose-500' : val && val >= 4 ? 'text-emerald-500' : 'text-medical-navy'}`}>
                             {val ? `${val}/5` : 'N/A'}
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>

                   {entry.symptoms && entry.symptoms.length > 0 && (
                     <div className="mb-6">
                       <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-3">Detected Indicators</div>
                       <div className="flex flex-wrap gap-2">
                         {entry.symptoms.map((s) => (
                           <span key={s} className="px-3 py-1.5 bg-rose-50 text-rose-600 text-[10px] font-black rounded-lg border border-rose-100 uppercase tracking-widest">
                             {s}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}

                   {entry.notes && (
                     <div className="p-6 rounded-2xl bg-medical-navy/[0.02] border border-slate-100 relative overflow-hidden">
                       <div className="absolute left-0 top-0 w-1 h-full bg-medical-teal/30" />
                       <div className="text-[9px] font-black text-medical-teal uppercase tracking-widest mb-2 flex items-center gap-2">
                         <ClipboardList size={10} /> Professional Remarks
                       </div>
                       <p className="text-sm font-bold text-slate-500 leading-relaxed uppercase tracking-tighter italic">&ldquo;{entry.notes}&rdquo;</p>
                     </div>
                   )}
                 </div>
               ))}
             </div>
           )}
        </div>
      </div>
    </div>
  )
}
