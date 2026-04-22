'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Vital } from '@/lib/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts'
import { 
  Heart, 
  Activity, 
  Wind, 
  Droplets, 
  Save, 
  History as HistoryIcon, 
  LineChart as ChartIcon,
  ChevronRight,
  Plus,
  StickyNote,
  Timer,
  Stethoscope,
  Database,
  ArrowUpRight,
  ClipboardList
} from 'lucide-react'

const EMPTY_FORM = { bp_systolic: '', bp_diastolic: '', pulse: '', oxygen: '', blood_sugar: '', notes: '' }

export default function VitalsPage() {
  const [vitals, setVitals] = useState<Vital[]>([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const load = useCallback(async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('vitals')
      .select('*')
      .eq('user_id', user.id)
      .order('recorded_at', { ascending: false })
      .limit(30)
    setVitals((data as Vital[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('vitals').insert({
      user_id: user.id,
      bp_systolic: form.bp_systolic ? parseInt(form.bp_systolic) : null,
      bp_diastolic: form.bp_diastolic ? parseInt(form.bp_diastolic) : null,
      pulse: form.pulse ? parseInt(form.pulse) : null,
      oxygen: form.oxygen ? parseFloat(form.oxygen) : null,
      blood_sugar: form.blood_sugar ? parseFloat(form.blood_sugar) : null,
      notes: form.notes || null,
    })

    setForm(EMPTY_FORM)
    await load()
    setSaving(false)
  }

  const chartData = [...vitals].reverse().map((v) => ({
    date: new Date(v.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    systolic: v.bp_systolic,
    diastolic: v.bp_diastolic,
    pulse: v.pulse,
    oxygen: v.oxygen,
    sugar: v.blood_sugar,
  }))

  const latest = vitals[0]

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-teal mb-2">Physiological Telemetry</div>
          <h1 className="text-4xl font-black tracking-tighter text-medical-navy">
            Clinical <span className="text-medical-teal uppercase">Vitals Monitor</span>
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-3">
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <Database size={12} className="text-medical-teal" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Diagnostic Feed v2.0</span>
             </div>
             <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <Activity size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Real-time Stream Active</span>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
           <div className="text-right">
              <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Archive Integrity</div>
              <div className="text-xs font-bold text-medical-navy">{vitals.length} Historical Logs</div>
           </div>
           <div className="w-14 h-14 rounded-2xl bg-medical-navy flex items-center justify-center text-white shadow-xl shadow-medical-navy/20">
              <Activity size={28} />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Entry Panel */}
        <div className="lg:col-span-1 space-y-6">
           <div className="glass-card rounded-3xl overflow-hidden border border-slate-100 bg-white/50 backdrop-blur-xl shadow-sm">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center gap-3 bg-slate-50/30">
                <Plus size={18} className="text-medical-teal" />
                <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-medical-navy">Metric Intake Terminal</h2>
              </div>
              <form onSubmit={handleSave} className="p-8 flex flex-col gap-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Vascular Pressure (mmHg)</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative group">
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest pointer-events-none group-focus-within:text-medical-teal">SYS</div>
                       <input type="number" placeholder="120" value={form.bp_systolic}
                             onChange={(e) => setForm((p) => ({ ...p, bp_systolic: e.target.value }))}
                             className="w-full bg-white border border-slate-100 rounded-xl py-3.5 pl-14 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all text-center tabular-nums" />
                    </div>
                    <div className="relative group">
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-300 uppercase tracking-widest pointer-events-none group-focus-within:text-medical-teal">DIA</div>
                       <input type="number" placeholder="80" value={form.bp_diastolic}
                             onChange={(e) => setForm((p) => ({ ...p, bp_diastolic: e.target.value }))}
                             className="w-full bg-white border border-slate-100 rounded-xl py-3.5 pl-14 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all text-center tabular-nums" />
                    </div>
                  </div>
                </div>

                {[
                  { key: 'pulse', label: 'Myocardial Pulse (bpm)', icon: Heart, color: 'text-rose-500', bg: 'bg-rose-50' },
                  { key: 'oxygen', label: 'Oxygen Saturation (%)', icon: Wind, color: 'text-blue-500', bg: 'bg-blue-50' },
                  { key: 'blood_sugar', label: 'Serum Glucose (mg/dL)', icon: Droplets, color: 'text-amber-500', bg: 'bg-amber-50' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">{field.label}</label>
                    <div className="relative group">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${field.color} p-1.5 rounded-lg ${field.bg} transition-transform group-focus-within:scale-110`}>
                        <field.icon size={14} />
                      </div>
                      <input type="number" step="0.1" placeholder="Enter Reading"
                             value={(form as Record<string, string>)[field.key]}
                             onChange={(e) => setForm((p) => ({ ...p, [field.key]: e.target.value }))}
                             className="w-full bg-white border border-slate-100 rounded-xl py-3.5 pl-14 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all tabular-nums" />
                    </div>
                  </div>
                ))}

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Diagnostic Observation Notes</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-4 text-slate-300 group-focus-within:text-medical-teal">
                      <ClipboardList size={16} />
                    </div>
                    <textarea placeholder="Append clinical indicators..." value={form.notes}
                              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                              className="w-full bg-white border border-slate-100 rounded-xl py-3.5 pl-14 text-sm font-bold text-medical-navy focus:ring-2 focus:ring-medical-teal/20 focus:border-medical-teal outline-none transition-all resize-none min-h-[120px]" />
                  </div>
                </div>

                <button type="submit" disabled={saving} className="w-full bg-medical-navy py-4 rounded-xl flex items-center justify-center gap-3 group shadow-xl shadow-medical-navy/20 active:scale-[0.98] transition-all disabled:opacity-50">
                  {saving ? (
                    <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save size={20} className="text-medical-teal" /> 
                      <span className="text-[10px] font-black text-white uppercase tracking-[0.25em]">Commit to Archive</span>
                    </>
                  )}
                </button>
              </form>
           </div>
        </div>

        {/* Display & Trend Analysis */}
        <div className="lg:col-span-2 space-y-8">
          {/* Latest Metric Summary */}
          {latest && (
            <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white/50 backdrop-blur-xl shadow-xl shadow-slate-200/20">
              <div className="px-8 py-5 border-b border-slate-100 bg-medical-navy flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-medical-teal animate-pulse" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[.3em]">Latest Physiological Observation</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5">
                   <Timer size={12} className="text-medical-teal" />
                   <span className="text-[9px] font-black text-white/50 uppercase tracking-widest">
                     {new Date(latest.recorded_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                   </span>
                </div>
              </div>
              <div className="p-10 grid grid-cols-2 md:grid-cols-4 gap-10">
                {[
                  { label: 'Blood Pressure', value: latest.bp_systolic && latest.bp_diastolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : '—', unit: 'mmHG', icon: Activity, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                  { label: 'Pulse Rate', value: latest.pulse ?? '—', unit: 'BPM', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-50' },
                  { label: 'Oxygen Level', value: latest.oxygen ?? '—', unit: 'SPO2%', icon: Wind, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Serum Glucose', value: latest.blood_sugar ?? '—', unit: 'MG/DL', icon: Droplets, color: 'text-amber-600', bg: 'bg-amber-50' },
                ].map((v) => (
                  <div key={v.label} className="flex flex-col items-center text-center group">
                    <div className={`w-14 h-14 rounded-2xl ${v.bg} ${v.color} flex items-center justify-center mb-5 shadow-sm group-hover:scale-110 transition-transform`}>
                      <v.icon size={26} />
                    </div>
                    <div className="text-2xl font-black text-medical-navy tabular-nums tracking-tighter leading-none mb-2">{v.value}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{v.label}</div>
                    <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">{v.unit}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Graphical Trends */}
          {chartData.length > 1 && (
            <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white shadow-sm">
              <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
                <div className="flex items-center gap-3">
                  <ChartIcon size={18} className="text-medical-teal" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-medical-navy">Trend Vector Analysis</h2>
                </div>
                <div className="px-3 py-1 rounded-full bg-medical-teal/10 text-medical-teal text-[9px] font-black uppercase tracking-widest border border-medical-teal/20">
                  30 Day Window
                </div>
              </div>
              <div className="p-8 h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorSys" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                      axisLine={false}
                      tickLine={false}
                      dy={10}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 900 }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#0f172a', border: 'none', borderRadius: '16px', padding: '12px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 900, padding: '4px 0', textTransform: 'uppercase' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.1em' }}
                    />
                    <Area type="monotone" dataKey="systolic" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorSys)" name="Systolic BP" />
                    <Area type="monotone" dataKey="pulse" stroke="#e11d48" strokeWidth={3} fillOpacity={1} fill="url(#colorPulse)" name="Pulse Rate" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Record Archive Table */}
      <div className="glass-card rounded-[2rem] overflow-hidden border border-slate-100 bg-white shadow-sm">
        <div className="px-8 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <HistoryIcon size={18} className="text-medical-teal" />
             <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-medical-navy">Audit Log Repository</h2>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
             <span className="text-[9px] font-black uppercase tracking-widest">Protocol Verified</span>
          </div>
        </div>
        {loading ? (
          <div className="p-20 text-center">
            <div className="w-10 h-10 border-4 border-slate-100 border-t-medical-teal rounded-full animate-spin mx-auto mb-6" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Retrieving Secure Records...</p>
          </div>
        ) : vitals.length === 0 ? (
          <div className="p-24 text-center">
             <div className="w-20 h-20 bg-slate-50 border border-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-8 text-slate-300">
               <Stethoscope size={40} />
             </div>
             <h3 className="text-xl font-black text-medical-navy uppercase tracking-tight mb-2">Zero Observation Data</h3>
             <p className="text-sm font-medium text-slate-400 mb-10 max-w-xs mx-auto uppercase tracking-tighter">Please commit your first physical observation to initialize clinical history.</p>
             <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="px-10 py-4 bg-medical-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-medical-navy/20 hover:scale-[1.02] transition-all">
               Initialize Terminal
             </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  {['AUDIT TIMESTAMP', 'PRESSURE (SYS/DIA)', 'MYOCARDIAL PULSE', 'OXYGEN SAT', 'GLUCOSE', 'CLINICAL REMARKS'].map((h) => (
                    <th key={h} className="text-left px-8 py-5 text-[9px] font-black text-slate-400 tracking-[0.2em] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {vitals.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-6">
                       <div className="text-xs font-black text-medical-navy uppercase tracking-tight">{new Date(v.recorded_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                       <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">{new Date(v.recorded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-3">
                          <div className={`text-sm font-black tracking-tight ${v.bp_systolic && v.bp_systolic > 140 ? 'text-rose-600' : 'text-medical-navy'}`}>
                             {v.bp_systolic && v.bp_diastolic ? `${v.bp_systolic}/${v.bp_diastolic}` : <span className="opacity-20">—</span>}
                          </div>
                          {v.bp_systolic && v.bp_systolic > 140 && <ArrowUpRight size={14} className="text-rose-500" />}
                       </div>
                    </td>
                    <td className="px-8 py-6 text-sm font-black text-rose-600 tabular-nums">{v.pulse ?? <span className="opacity-20">—</span>}</td>
                    <td className="px-8 py-6 text-sm font-black text-blue-600 tabular-nums">{v.oxygen ? `${v.oxygen}%` : <span className="opacity-20">—</span>}</td>
                    <td className="px-8 py-6 text-sm font-black text-amber-600 tabular-nums">{v.blood_sugar ? `${v.blood_sugar} mg/dL` : <span className="opacity-20">—</span>}</td>
                    <td className="px-8 py-6 min-w-[250px]">
                       <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-2 uppercase tracking-tighter">
                          {v.notes ?? <span className="italic opacity-30">Null Reference</span>}
                       </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
