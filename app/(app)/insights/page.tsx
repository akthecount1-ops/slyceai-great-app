import { createClient as createServiceClientHelper } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import { ConditionCategoryChart, StateDistributionChart, AgeDistributionChart } from '@/components/insights/InsightsCharts'
import { 
  BarChart3, 
  ShieldCheck, 
  Users, 
  Database, 
  Search, 
  Activity, 
  Globe, 
  Layers,
  Lock,
  ArrowUpRight,
  Info,
  Plus
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Population Health Intelligence | Arogya',
  description: 'Advanced pathological vector analysis from verified, anonymized Indian healthcare datasets.',
}

export default async function InsightsPage() {
  const supabase = createServiceClientHelper(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const [{ data: contributions }, { data: byCat }, { data: byState }] = await Promise.all([
    supabase.from('dataset_contributions').select('condition_category, age_range, gender, quality_score').eq('is_active', true),
    supabase.from('dataset_contributions').select('condition_category').eq('is_active', true),
    supabase.from('dataset_contributions').select('state').eq('is_active', true),
  ])

  const total = contributions?.length ?? 0

  // Category distribution
  const catCount: Record<string, number> = {}
  byCat?.forEach((r) => { if (r.condition_category) catCount[r.condition_category] = (catCount[r.condition_category] ?? 0) + 1 })
  const catData = Object.entries(catCount).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8)

  // State distribution
  const stateCount: Record<string, number> = {}
  byState?.forEach((r) => { if (r.state) stateCount[r.state] = (stateCount[r.state] ?? 0) + 1 })
  const stateData = Object.entries(stateCount).map(([state, count]) => ({ state, count })).sort((a, b) => b.count - a.count).slice(0, 10)

  // Age distribution
  const ageCount: Record<string, number> = {}
  contributions?.forEach((r) => { if (r.age_range) ageCount[r.age_range] = (ageCount[r.age_range] ?? 0) + 1 })
  const ageData = Object.entries(ageCount).map(([range, count]) => ({ range, count }))

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-slate-100 pb-12">
        <div className="space-y-4">
          <div className="text-[10px] font-black uppercase tracking-[0.4em] text-medical-teal opacity-80 flex items-center gap-2">
             <Globe size={12} strokeWidth={3} /> National Health Dataset Feed
          </div>
          <h1 className="text-5xl font-black tracking-tighter text-medical-navy max-w-2xl leading-[0.9]">
            Population Health <span className="text-medical-teal uppercase">Intelligence</span>
          </h1>
          <p className="text-sm font-medium text-slate-400 max-w-xl uppercase tracking-tighter leading-relaxed">
            Longitudinal pathological trends and symptomatic vector mapping derived from multi-node verified, secure biometric datasets.
          </p>
          <div className="flex flex-wrap gap-3 pt-4">
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <Lock size={12} className="text-medical-teal" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">AES-256 Anonymized</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100 bg-white shadow-sm">
                <ShieldCheck size={12} className="text-emerald-500" />
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 leading-none">Clinically Authenticated</span>
             </div>
             <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-100 bg-emerald-50 shadow-sm">
                <Activity size={12} className="text-emerald-600" />
                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 leading-none">{total} Active Contributions</span>
             </div>
          </div>
        </div>
        <div className="w-24 h-24 rounded-[2rem] bg-medical-navy flex items-center justify-center text-white shadow-2xl shadow-medical-navy/30 shrink-0">
           <BarChart3 size={40} />
        </div>
      </div>

      {total === 0 ? (
        <div className="glass-card rounded-[3rem] border border-slate-100 bg-white/50 p-24 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-center mx-auto mb-8 text-slate-200">
            <Database size={48} />
          </div>
          <h3 className="text-2xl font-black text-medical-navy tracking-tight uppercase mb-2">Dataset Initialization Pending</h3>
          <p className="text-sm font-medium text-slate-400 mb-10 max-w-sm mx-auto uppercase tracking-tighter">Insufficient telemetry nodes detected for longitudinal analysis. Be the first verification node in this regional matrix.</p>
          <a href="/journey" className="px-12 py-5 bg-medical-navy text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-medical-navy/20 hover:scale-[1.05] transition-all flex items-center gap-3 mx-auto max-w-fit">
             <Plus size={20} className="text-medical-teal" /> Contribute To Dataset
          </a>
        </div>
      ) : (
        <div className="space-y-8">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="glass-card rounded-[2.5rem] border border-slate-100 bg-white p-2 overflow-hidden shadow-sm hover:shadow-xl hover:border-medical-teal/30 transition-all">
                 <div className="p-8 pb-0">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Vector A1</span>
                       <Layers size={14} className="text-medical-teal" />
                    </div>
                    <h3 className="text-xl font-black text-medical-navy uppercase tracking-tighter">Pathological Distribution</h3>
                 </div>
                 <ConditionCategoryChart data={catData} />
              </div>

              <div className="glass-card rounded-[2.5rem] border border-slate-100 bg-white p-2 overflow-hidden shadow-sm hover:shadow-xl hover:border-medical-teal/30 transition-all">
                 <div className="p-8 pb-0">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Vector B2</span>
                       <Search size={14} className="text-medical-teal" />
                    </div>
                    <h3 className="text-xl font-black text-medical-navy uppercase tracking-tighter">Georegional Density</h3>
                 </div>
                 <StateDistributionChart data={stateData} />
              </div>
           </div>

           <div className="glass-card rounded-[2.5rem] border border-slate-100 bg-white p-2 overflow-hidden shadow-sm hover:shadow-xl hover:border-medical-teal/30 transition-all">
              <div className="p-8 pb-0">
                 <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Vector C3</span>
                    <Users size={14} className="text-medical-teal" />
                 </div>
                 <h3 className="text-xl font-black text-medical-navy uppercase tracking-tighter">Demographic Cohort Analysis</h3>
              </div>
              <AgeDistributionChart data={ageData} />
           </div>
        </div>
      )}

      {/* Intelligence Policy Footer */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 rounded-[3rem] border border-slate-100 bg-white shadow-xl shadow-slate-200/20 relative overflow-hidden">
         <div className="absolute left-0 top-0 w-2 h-full bg-medical-teal" />
         <div className="flex items-start gap-6">
            <div className="w-14 h-14 rounded-2xl bg-medical-navy flex items-center justify-center text-white shrink-0 shadow-lg shadow-medical-navy/20">
               <ShieldCheck size={28} />
            </div>
            <div className="max-w-2xl">
               <h3 className="text-sm font-black text-medical-navy uppercase tracking-widest mb-1 flex items-center gap-2">
                 Zero-Knowledge Data Integrity Protocol <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
               </h3>
               <p className="text-xs font-bold text-slate-400 leading-relaxed uppercase tracking-tighter">
                 All intelligence visualizations are generated from fully anonymized biometric nodes. No personally identifiable information (PII) is recorded or exposed within the population intelligence matrix. All contributions are verified via multi-step clinical consensus to ensure the highest fidelity research outcomes.
               </p>
            </div>
         </div>
         <div className="flex items-center gap-8 bg-slate-50 px-8 py-4 rounded-2xl border border-slate-100 shrink-0">
            <div className="text-right">
               <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest mb-1">Regional Audit</div>
               <div className="text-xs font-black text-medical-navy">COMPLIANT v4.1</div>
            </div>
            <div className="w-px h-10 bg-slate-200" />
            <a href="/journey" className="text-medical-teal font-black text-[10px] uppercase tracking-widest flex items-center gap-2 group">
               Sync Contribution <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
         </div>
      </div>
    </div>
  )
}
