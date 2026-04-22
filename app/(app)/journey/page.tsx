'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { HealthJourney } from '@/lib/types'
import { 
  Activity, 
  ChevronRight, 
  ShieldCheck, 
  Stethoscope, 
  Compass, 
  Map, 
  Zap, 
  TrendingUp, 
  AlertCircle, 
  FileCheck, 
  Plus, 
  Calendar,
  Layers,
  Search,
  Timer
} from 'lucide-react'

const CATEGORIES = ['Chronic Pathology', 'Traumatic Injury', 'Cognitive-Affective', 'Autoimmune Protocol', 'Systemic Infection', 'Post-Op Recovery', 'Non-Standard']
const STATUSES = ['ACTIVE_PHASE', 'OPTIMIZED', 'SURVEILLANCE', 'RELAPSED']

export default function JourneyPage() {
  const [journeys, setJourneys] = useState<HealthJourney[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '', condition_name: '', condition_category: 'Chronic Pathology',
    start_date: '', current_status: 'ACTIVE_PHASE', recovery_percentage: 0,
    consent_given: false,
  })
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('health_journeys')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setJourneys((data as HealthJourney[]) ?? [])
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('health_journeys').insert({ user_id: user.id, ...form, start_date: form.start_date || null })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  const handleVerify = async (journeyId: string) => {
    await supabase.from('health_journeys').update({
      patient_verified: true,
      patient_verified_at: new Date().toISOString(),
    }).eq('id', journeyId)
    await load()
  }

  const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
    ACTIVE_PHASE: { label: 'CRITICAL PHASE', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    OPTIMIZED: { label: 'RECOVERED', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    SURVEILLANCE: { label: 'UNDER MONITORING', color: 'text-medical-teal', bg: 'bg-medical-teal/5' },
    RELAPSED: { label: 'ACUTE RELAPSE', color: 'text-rose-600', bg: 'bg-rose-50' }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-teal mb-2">Longitudinal Progression</div>
          <h1 className="text-4xl font-black tracking-tighter text-medical-navy">
            Clinical <span className="text-medical-teal uppercase">Trajectory Mapping</span>
          </h1>
          <div className="flex items-center gap-4 mt-3">
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <Map size={12} className="text-medical-teal" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Mapping Active Progression</span>
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Diagnostic Verification Protocol</span>
             </div>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="px-8 py-4 bg-medical-navy text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-medical-navy/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
           <Plus size={18} className="text-medical-teal" /> Initialize New Trajectory
        </button>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-medical-navy/40 animate-fade-in">
          <div className="glass-card rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl border border-white/20 bg-white/90 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-medical-teal/10 flex items-center justify-center text-medical-teal shadow-inner">
                  <Compass size={24} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-medical-navy tracking-tighter uppercase">Trajectory Initialization</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Setup new health progression sequence</p>
               </div>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objective Classification</label>
                <input required className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all placeholder:text-slate-300" 
                       placeholder="e.g. Type II Diabetes Management" value={form.title}
                       onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pathological Identifier</label>
                <input required className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all placeholder:text-slate-300" 
                       placeholder="Exact medical name" value={form.condition_name}
                       onChange={(e) => setForm((p) => ({ ...p, condition_name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Category</label>
                <select className="w-full bg-white border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-medical-navy outline-none" 
                        value={form.condition_category}
                        onChange={(e) => setForm((p) => ({ ...p, condition_category: e.target.value }))}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sequence Status</label>
                <select className="w-full bg-white border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-medical-navy outline-none" 
                        value={form.current_status}
                        onChange={(e) => setForm((p) => ({ ...p, current_status: e.target.value }))}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Start Date</label>
                <input type="date" className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-medical-navy outline-none" 
                       value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-3 p-4 rounded-xl bg-slate-50">
                <div className="flex justify-between items-center">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Therapeutic Progression (%)</label>
                   <span className="text-xs font-black text-medical-teal">{form.recovery_percentage}%</span>
                </div>
                <input type="range" min="0" max="100" value={form.recovery_percentage}
                       onChange={(e) => setForm((p) => ({ ...p, recovery_percentage: parseInt(e.target.value) }))}
                       className="w-full h-1.5 bg-white rounded-full appearance-none cursor-pointer accent-medical-navy" />
              </div>
              <label className="md:col-span-2 flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${form.consent_given ? 'bg-medical-teal border-medical-teal' : 'border-slate-300'}`}>
                  {form.consent_given && <FileCheck size={12} className="text-white" />}
                </div>
                <input type="checkbox" checked={form.consent_given} className="hidden"
                       onChange={(e) => setForm((p) => ({ ...p, consent_given: e.target.checked }))} />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide group-hover:text-medical-navy transition-colors">Confirm anonymized diagnostic data contribution to National AI Dataset</span>
              </label>
              <div className="md:col-span-2 flex gap-4 mt-6">
                <button type="button" onClick={() => setShowForm(false)}
                        className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                  Terminate
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-medical-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-navy/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  {saving ? 'PROCESSING...' : 'INITIALIZE SEQUENCE'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {journeys.length === 0 ? (
        <div className="glass-card rounded-[3rem] border border-slate-100 bg-white/50 p-24 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center mx-auto mb-8 text-slate-200">
            <Layers size={48} />
          </div>
          <h3 className="text-2xl font-black text-medical-navy tracking-tight uppercase mb-2">Zero Active Trajectories</h3>
          <p className="text-sm font-medium text-slate-400 mb-10 max-w-sm mx-auto uppercase tracking-tighter">No longitudinal sequences detected in current profile. Initialize a trajectory to begin therapeutic mapping.</p>
          <button onClick={() => setShowForm(true)} className="px-12 py-5 bg-medical-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-navy/20 hover:scale-[1.05] transition-all flex items-center gap-3 mx-auto">
             <Activity size={20} className="text-medical-teal" /> Start First Sequence
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {journeys.map((journey) => {
             const config = statusConfig[journey.current_status] || statusConfig.SURVEILLANCE
             return (
              <div key={journey.id} className="glass-card rounded-[2.5rem] border border-slate-100 bg-white p-10 hover:shadow-2xl hover:shadow-medical-teal/5 transition-all group overflow-hidden relative">
                <div className="absolute right-0 top-0 w-48 h-48 bg-medical-teal/5 rounded-full -mr-24 -mt-24 group-hover:scale-150 transition-transform duration-1000" />
                
                <div className="flex flex-col lg:flex-row items-start justify-between gap-10">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                       <h3 className="text-2xl font-black text-medical-navy tracking-tighter uppercase leading-tight">{journey.title}</h3>
                       <div className={`px-4 py-1.5 rounded-lg border ${config.bg} ${config.color} text-[9px] font-black uppercase tracking-widest border-transparent`}>
                         {config.label}
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-lg border border-slate-100">
                          <Search size={14} className="text-medical-teal" />
                          <span className="text-[11px] font-black text-medical-navy uppercase tracking-tight">{journey.condition_name}</span>
                       </div>
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{journey.condition_category}</div>
                    </div>
                    
                    {/* Recovery Bar */}
                    <div className="pt-6">
                      <div className="flex justify-between items-end mb-3">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sequence Progress</span>
                           <span className="text-xs font-black text-medical-teal uppercase tracking-widest">{journey.recovery_percentage}% Optimized</span>
                        </div>
                        <TrendingUp size={20} className="text-medical-teal" />
                      </div>
                      <div className="w-full h-3 bg-slate-50 border border-slate-100 rounded-full overflow-hidden p-0.5">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-medical-navy via-medical-teal to-emerald-400 shadow-[0_0_12px_rgba(45,212,191,0.4)]"
                             style={{ width: `${journey.recovery_percentage}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 min-w-[280px]">
                    <div className="p-6 rounded-3xl bg-slate-50/50 border border-slate-100 space-y-4">
                       <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Clinical Authority</span>
                          <ShieldCheck size={14} className="text-medical-teal" />
                       </div>
                       <div className="space-y-2">
                          <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${journey.patient_verified ? 'bg-emerald-50 border-emerald-200/50' : 'bg-white border-slate-100 opacity-60'}`}>
                             <span className={`text-[9px] font-black uppercase tracking-widest ${journey.patient_verified ? 'text-emerald-600' : 'text-slate-400'}`}>Subject Validation</span>
                             {journey.patient_verified ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Timer size={12} className="text-slate-300" />}
                          </div>
                          <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${journey.doctor_verified ? 'bg-emerald-50 border-emerald-200/50' : 'bg-white border-slate-100 opacity-60'}`}>
                             <span className={`text-[9px] font-black uppercase tracking-widest ${journey.doctor_verified ? 'text-emerald-600' : 'text-slate-400'}`}>Clinical Verification</span>
                             {journey.doctor_verified ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Timer size={12} className="text-slate-300" />}
                          </div>
                       </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {!journey.patient_verified && (
                        <button onClick={() => handleVerify(journey.id)}
                                className="flex-1 py-3 bg-white border border-emerald-200 text-emerald-600 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all">
                          Self-Authenticate
                        </button>
                      )}
                      {!journey.doctor_verified && (
                        <button className="flex-1 py-3 bg-medical-navy text-medical-teal rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-medical-navy/90 transition-all border border-medical-teal/20">
                          Invite Auditor
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-6 border-t border-slate-50 flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      {journey.consent_given && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-100 rounded-lg">
                           <FileCheck size={12} className="text-indigo-500" />
                           <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">National Bio-Dataset Active</span>
                        </div>
                      )}
                      {journey.start_date && (
                        <div className="flex items-center gap-2 text-slate-300">
                           <Calendar size={12} />
                           <span className="text-[10px] font-bold uppercase tracking-tighter">Initialized: {new Date(journey.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      )}
                   </div>
                   <div className="text-[9px] font-black text-slate-200 uppercase tracking-widest">Transaction ID: {journey.id.substring(0,8)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Trajectory Footer Policy */}
      <div className="flex items-start gap-4 p-8 rounded-[2rem] border border-slate-100 bg-white/50 backdrop-blur-xl">
         <div className="w-12 h-12 rounded-2xl bg-medical-teal/10 flex items-center justify-center text-medical-teal shrink-0 shadow-inner">
            <Layers size={24} />
         </div>
         <div className="max-w-3xl">
            <h4 className="text-[10px] font-black text-medical-navy uppercase tracking-widest mb-1">Trajectory Surveillance Notice</h4>
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">
              Clinical trajectory records represent the high-fidelity mapping of your therapeutic progression. These records are subject to auditing by medical authorities when verification is requested. Contributing your anonymized progression to the National Bio-Dataset helps accelerate clinical AI research for the entire Indian subcontinent. 
            </p>
         </div>
      </div>
    </div>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
