'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Medicine, MedicineLog } from '@/lib/types'
import { 
  Pill, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Trash2, 
  ClipboardList, 
  Info,
  ShieldCheck,
  Zap,
  Activity,
  Timer
} from 'lucide-react'

const TIME_OPTIONS = ['Morning', 'Afternoon', 'Evening', 'Night', 'Before Meals', 'After Meals']

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [logs, setLogs] = useState<MedicineLog[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ medicine_name: '', dose: '', frequency: '', time_of_day: [] as string[], start_date: '', notes: '' })
  const today = new Date().toISOString().split('T')[0]
  const supabase = createClient()

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [med, log] = await Promise.all([
      supabase.from('medicines').select('*').eq('user_id', user.id).eq('is_active', true).order('created_at', { ascending: false }),
      supabase.from('medicine_logs').select('*').eq('user_id', user.id).eq('log_date', today),
    ])
    setMedicines((med.data as Medicine[]) ?? [])
    setLogs((log.data as MedicineLog[]) ?? [])
  }, [supabase, today])

  useEffect(() => { load() }, [load])

  const toggleTime = (t: string) => {
    setForm((p) => ({ ...p, time_of_day: p.time_of_day.includes(t) ? p.time_of_day.filter((x) => x !== t) : [...p.time_of_day, t] }))
  }

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('medicines').insert({ user_id: user.id, ...form, start_date: form.start_date || null })
    setForm({ medicine_name: '', dose: '', frequency: '', time_of_day: [], start_date: '', notes: '' })
    setShowForm(false)
    await load()
    setSaving(false)
  }

  const toggleTaken = async (medicineId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const existing = logs.find((l) => l.medicine_id === medicineId)
    if (existing) {
      await supabase.from('medicine_logs').update({ taken: !existing.taken }).eq('id', existing.id)
    } else {
      await supabase.from('medicine_logs').insert({ medicine_id: medicineId, user_id: user.id, log_date: today, taken: true })
    }
    await load()
  }

  const handleStop = async (id: string) => {
    if (!confirm('Mark this medicine as stopped?')) return
    await supabase.from('medicines').update({ is_active: false }).eq('id', id)
    await load()
  }

  const takenCount = medicines.filter((m) => logs.find((l) => l.medicine_id === m.id)?.taken).length
  const adherence = medicines.length > 0 ? Math.round((takenCount / medicines.length) * 100) : 0

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-teal mb-2">Pharmacological Oversight</div>
          <h1 className="text-4xl font-black tracking-tighter text-medical-navy">
            Clinical <span className="text-medical-teal uppercase">Protocol Management</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-3">
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <ShieldCheck size={12} className="text-medical-teal" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Regimen Verified</span>
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <Activity size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Surveillance Active</span>
             </div>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="px-8 py-4 bg-medical-navy text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-medical-navy/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-3">
           <Plus size={18} className="text-medical-teal" /> Enroll New Protocol
        </button>
      </div>

      {/* Today's Summary */}
      <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white/50 backdrop-blur-xl shadow-xl shadow-slate-200/20">
        <div className="px-8 py-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-6">
             <div className="w-16 h-16 rounded-2xl bg-medical-navy flex items-center justify-center text-white shadow-lg shadow-medical-navy/20">
                <Zap size={28} className={adherence === 100 ? "text-emerald-400" : "text-medical-teal"} />
             </div>
             <div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Adherence Efficiency</div>
                <div className="text-3xl font-black text-medical-navy tracking-tighter">{adherence}% <span className="text-xs text-slate-300 ml-1 font-bold">COMPLIANCE</span></div>
             </div>
          </div>
          <div className="flex-1 max-w-md w-full">
            <div className="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">
               <span>Intake Progress</span>
               <span>{takenCount} / {medicines.length} Units</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
              <div className="h-full transition-all duration-1000 ease-out rounded-full bg-gradient-to-r from-medical-navy to-medical-teal shadow-[0_0_10px_rgba(45,212,191,0.3)]"
                   style={{ width: `${adherence}%` }} />
            </div>
          </div>
          <div className="hidden md:block text-right">
             <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Status Report</div>
             <div className={`text-xs font-black uppercase tracking-widest ${adherence === 100 ? 'text-emerald-500' : 'text-medical-teal'}`}>
                {adherence === 100 ? 'OPTIMAL COMPLIANCE' : 'INTAKE PENDING'}
             </div>
          </div>
        </div>
      </div>

      {/* Add Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 backdrop-blur-md bg-medical-navy/40 animate-fade-in">
          <div className="glass-card rounded-[2.5rem] p-10 w-full max-w-xl shadow-2xl border border-white/20 bg-white/90">
            <div className="flex items-center gap-4 mb-8">
               <div className="w-12 h-12 rounded-2xl bg-medical-teal/10 flex items-center justify-center text-medical-teal shadow-inner">
                  <Pill size={24} />
               </div>
               <div>
                  <h3 className="text-2xl font-black text-medical-navy tracking-tighter uppercase">Protocol Enrollment</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initialize new clinical medication record</p>
               </div>
            </div>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pharmacological Identity</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-medical-teal">
                    <ClipboardList size={18} />
                  </div>
                  <input required className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3.5 pl-12 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all placeholder:text-slate-300" 
                         placeholder="Medicine Name (e.g. Atorvastatin)" value={form.medicine_name}
                         onChange={(e) => setForm((p) => ({ ...p, medicine_name: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unit Dosage</label>
                <input className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all placeholder:text-slate-300" 
                       placeholder="e.g. 500mg" value={form.dose}
                       onChange={(e) => setForm((p) => ({ ...p, dose: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequency Vector</label>
                <input className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all placeholder:text-slate-300" 
                       placeholder="e.g. Twice Daily" value={form.frequency}
                       onChange={(e) => setForm((p) => ({ ...p, frequency: e.target.value }))} />
              </div>
              <div className="md:col-span-2 space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Temporal Allocation</label>
                <div className="flex flex-wrap gap-2">
                  {TIME_OPTIONS.map((t) => {
                    const active = form.time_of_day.includes(t)
                    return (
                      <button key={t} type="button" onClick={() => toggleTime(t)}
                              className={`text-[10px] font-black py-2.5 px-4 rounded-xl uppercase tracking-widest transition-all border ${
                                active ? 'bg-medical-navy text-medical-teal border-medical-teal shadow-lg shadow-medical-teal/10' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-white'
                              }`}>{t}</button>
                    )
                  })}
                </div>
              </div>
              <div className="md:col-span-1 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Start</label>
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-medical-teal">
                    <Calendar size={18} />
                  </div>
                  <input type="date" className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3.5 pl-12 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all" 
                         value={form.start_date} onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))} />
                </div>
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Administrative Remarks</label>
                <textarea className="w-full bg-slate-50/50 border border-slate-100 rounded-xl py-3.5 px-4 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all resize-none min-h-[80px]" 
                          placeholder="Supplemental instructions..."
                          value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
              <div className="md:col-span-2 flex gap-4 mt-4">
                <button type="button" onClick={() => setShowForm(false)}
                        className="flex-1 py-4 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 transition-all">
                  Abort
                </button>
                <button type="submit" disabled={saving} className="flex-1 py-4 bg-medical-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-navy/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50">
                  {saving ? 'COMMITTING...' : 'INITIALIZE PROTOCOL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* List */}
      {medicines.length === 0 ? (
        <div className="glass-card rounded-[3rem] border border-slate-100 bg-white/50 p-24 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center mx-auto mb-8 text-slate-200">
            <Pill size={48} />
          </div>
          <h3 className="text-2xl font-black text-medical-navy tracking-tight uppercase mb-2 text-center">Protocol Registry Empty</h3>
          <p className="text-sm font-medium text-slate-400 mb-10 max-w-sm mx-auto uppercase tracking-tighter">No active pharmacological protocols detected. Initialize enrollment to begin adherence tracking.</p>
          <button onClick={() => setShowForm(true)} className="px-12 py-5 bg-medical-navy text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-medical-navy/20 hover:scale-[1.05] transition-all">
            Start Enrollment Sequence
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {medicines.map((med) => {
            const taken = logs.find((l) => l.medicine_id === med.id)?.taken ?? false
            return (
              <div key={med.id} className={`glass-card rounded-[2rem] p-8 border-2 transition-all group overflow-hidden relative ${
                taken ? 'bg-emerald-50/10 border-emerald-500/20' : 'bg-white border-slate-100 hover:border-medical-teal/30 hover:shadow-xl hover:shadow-medical-teal/5'
              }`}>
                {taken && <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700" />}
                
                <div className="flex items-start justify-between mb-6">
                  <div className={`p-4 rounded-2xl ${taken ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-medical-navy text-white shadow-lg shadow-medical-navy/10'}`}>
                    <Pill size={24} />
                  </div>
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                    taken ? 'bg-emerald-100/50 text-emerald-600 border-emerald-200/50' : 'bg-slate-100/50 text-slate-400 border-slate-200/50'
                  }`}>
                    {taken ? <><CheckCircle2 size={12} /> VERIFIED</> : <><Timer size={12} /> PENDING</>}
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-xl font-black text-medical-navy tracking-tight uppercase leading-tight line-clamp-1">{med.medicine_name}</h3>
                  <div className="flex items-center gap-3 mt-2">
                     <div className="px-2 py-0.5 rounded bg-slate-100 text-[9px] font-black text-slate-500 uppercase tracking-widest">{med.dose || 'UNSPECIFIED UNIT'}</div>
                     <div className="w-1 h-1 rounded-full bg-slate-200" />
                     <div className="text-[10px] font-bold text-medical-teal uppercase tracking-widest">{med.frequency || 'STANDARD SEQUENCE'}</div>
                  </div>
                  {med.time_of_day && med.time_of_day.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-4">
                      {med.time_of_day.map((t) => (
                        <span key={t} className="px-3 py-1 bg-medical-navy/5 text-medical-navy text-[9px] font-black rounded-lg border border-medical-navy/10 uppercase tracking-widest">{t}</span>
                      ))}
                    </div>
                  )}
                </div>

                {med.notes && (
                  <div className="mb-8 p-4 rounded-xl bg-slate-50 border border-slate-100 italic">
                    <p className="text-[10px] font-bold text-slate-500 line-clamp-2 uppercase tracking-tighter leading-relaxed">&ldquo;{med.notes}&rdquo;</p>
                  </div>
                )}

                <div className="flex gap-3 mt-auto relative z-10">
                  <button onClick={() => toggleTaken(med.id)}
                          className={`flex-[2] py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 ${
                            taken ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-medical-teal text-white hover:bg-medical-teal/90'
                          }`}>
                    {taken ? <><Clock size={14} /> Revert Protocol</> : <><CheckCircle2 size={14} /> Confirm Intake</>}
                  </button>
                  <button onClick={() => handleStop(med.id)}
                          className="flex-1 py-4 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 hover:bg-rose-100 transition-all flex items-center justify-center group/btn">
                    <Trash2 size={16} className="group-hover/btn:scale-110 transition-transform" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Security Disclaimer */}
      <div className="flex items-center gap-4 p-8 rounded-[2rem] border border-slate-100 bg-white/50 backdrop-blur-xl">
         <div className="w-12 h-12 rounded-2xl bg-medical-teal/10 flex items-center justify-center text-medical-teal shrink-0 shadow-inner">
            <Info size={24} />
         </div>
         <div className="max-w-2xl">
            <h4 className="text-[10px] font-black text-medical-navy uppercase tracking-widest mb-1">Administrative Oversight Notice</h4>
            <p className="text-[11px] font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">
              Verify all pharmacological inputs with your supervising clinician before enrollment. This platform maintains a technical record of your adherence but does not serve as a clinical diagnostic or prescribing authority. All adherence logs are stored in an encrypted medical vault.
            </p>
         </div>
      </div>
    </div>
  )
}
