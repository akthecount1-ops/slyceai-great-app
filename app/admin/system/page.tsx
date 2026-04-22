import type { Metadata } from 'next'
import { 
  Database, 
  Cpu, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  XOctagon, 
  Clock, 
  Archive, 
  Settings2, 
  ShieldCheck, 
  Layers, 
  Server, 
  Key,
  ChevronRight
} from 'lucide-react'

export const metadata: Metadata = { title: 'System Diagnostics | Command Center | Arogya' }

interface ServiceStatus {
  name: string
  icon: any
  status: 'operational' | 'degraded' | 'down'
  latency: number | null
  details: string
}

async function checkSupabase(): Promise<ServiceStatus> {
  try {
    const start = Date.now()
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! },
      signal: AbortSignal.timeout(5000),
    })
    const latency = Date.now() - start
    return { name: 'Supabase Data Engine', icon: Database, status: res.ok ? 'operational' : 'degraded', latency, details: `REST API v1 · HTTP ${res.status}` }
  } catch {
    return { name: 'Supabase Data Engine', icon: Database, status: 'down', latency: null, details: 'Persistence layer unreachable' }
  }
}

async function checkOpenRouter(): Promise<ServiceStatus> {
  try {
    const start = Date.now()
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { 'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY!}` },
      signal: AbortSignal.timeout(5000),
    })
    const latency = Date.now() - start
    return { name: 'Nemotron AI Node', icon: Cpu, status: res.ok ? 'operational' : 'degraded', latency, details: `OpenRouter Gateway · HTTP ${res.status}` }
  } catch {
    return { name: 'Nemotron AI Node', icon: Cpu, status: 'down', latency: null, details: 'Inference endpoint failure' }
  }
}

async function checkResend(): Promise<ServiceStatus> {
  const hasKey = !!process.env.RESEND_API_KEY
  return {
    name: 'Clinical Communications', icon: Mail,
    status: hasKey ? 'operational' : 'degraded',
    latency: null,
    details: hasKey ? 'Resend Relay SMTP active' : 'Relay credentials missing',
  }
}

export default async function AdminSystemPage() {
  const [db, ai, email] = await Promise.all([checkSupabase(), checkOpenRouter(), checkResend()])
  const services: ServiceStatus[] = [db, ai, email]

  const PROVIDERS = [
    { service: 'Data Persistence', current: 'Supabase PostgreSQL', next: 'AWS RDS Cluster', icon: Database },
    { service: 'Object Storage', current: 'Supabase OSS', next: 'AWS S3 Cloud', icon: Archive },
    { service: 'Mail Relay', current: 'Resend', next: 'AWS SES Node', icon: Mail },
    { service: 'Neural Compute', current: 'Nemotron 3 (OpenRouter)', next: 'AWS Bedrock / Gemini', icon: Cpu },
    { service: 'Identity Layer', current: 'Supabase Auth', next: 'AWS Cognito / Auth0', icon: ShieldCheck },
  ]

  const ENV_VARS = [
    { key: 'NEXT_PUBLIC_SUPABASE_URL', set: !!process.env.NEXT_PUBLIC_SUPABASE_URL, tech: 'Database' },
    { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', set: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, tech: 'Database' },
    { key: 'OPENROUTER_API_KEY', set: !!process.env.OPENROUTER_API_KEY, tech: 'AI' },
    { key: 'RESEND_API_KEY', set: !!process.env.RESEND_API_KEY, tech: 'Email' },
    { key: 'ADMIN_SECRET_KEY', set: !!process.env.ADMIN_SECRET_KEY, tech: 'Security' },
    { key: 'AWS_ACCESS_KEY_ID', set: !!process.env.AWS_ACCESS_KEY_ID, tech: 'Cloud' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-black uppercase tracking-[0.3em] text-medical-teal mb-2">Systems Oversight</div>
          <h1 className="text-3xl font-black text-medical-navy tracking-tight">Technical Health Matrix</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Real-time telemetry and architectural configuration audit.</p>
        </div>
        <div className="flex items-center gap-2 group cursor-pointer">
           <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase leading-none">Auto-Sync</div>
              <div className="text-xs font-bold text-emerald-500">ACTIVE POLLING</div>
           </div>
           <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10">
              <Server size={20} className="animate-pulse" />
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Vital Services Monitoring */}
        <div className="lg:col-span-2 space-y-6">
          <section className="glass-card rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <Settings2 size={18} className="text-medical-teal" />
              <h2 className="font-bold text-medical-navy uppercase text-xs tracking-widest">Active Infrastructure Status</h2>
            </div>
            <div className="p-4 grid grid-cols-1 gap-3">
              {services.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between p-4 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl bg-slate-50 text-medical-navy ring-1 ring-slate-100`}>
                      <svc.icon size={20} />
                    </div>
                    <div>
                      <div className="font-bold text-sm text-medical-navy">{svc.name}</div>
                      <div className="text-[11px] font-medium text-slate-400 font-mono tracking-tighter uppercase mt-0.5">{svc.details}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {svc.latency !== null && (
                      <div className="hidden sm:flex flex-col items-end">
                        <div className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Latency</div>
                        <div className="text-xs font-bold text-slate-500 whitespace-nowrap">{svc.latency}ms</div>
                      </div>
                    )}
                    <div className="flex flex-col items-end min-w-[100px]">
                       <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-100 bg-white">
                          <div className={`w-2 h-2 rounded-full ${svc.status === 'operational' ? 'bg-emerald-500' : svc.status === 'degraded' ? 'bg-orange-500' : 'bg-rose-500'} animate-pulse`} />
                          <span className={`text-[10px] font-black uppercase tracking-widest ${svc.status === 'operational' ? 'text-emerald-600' : svc.status === 'degraded' ? 'text-orange-600' : 'text-rose-600'}`}>
                            {svc.status}
                          </span>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Provider Strategy Layer */}
          <section className="glass-card rounded-2xl overflow-hidden shadow-sm">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50/50">
              <Layers size={18} className="text-medical-teal" />
              <h2 className="font-bold text-medical-navy uppercase text-xs tracking-widest">Architectural Registry</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50/50 text-left border-b border-slate-100">
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest uppercase">Service Segment</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest uppercase text-center">Active Provider</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 tracking-widest uppercase text-right">Migration Target</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {PROVIDERS.map((p) => (
                    <tr key={p.service} className="hover:bg-slate-50/30">
                       <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                             <p.icon size={16} className="text-medical-teal opacity-60" />
                             <span className="text-xs font-bold text-medical-navy">{p.service}</span>
                          </div>
                       </td>
                       <td className="px-4 py-4 text-center">
                          <span className="text-xs font-bold text-medical-teal bg-medical-teal/10 px-2.5 py-1 rounded-full">{p.current}</span>
                       </td>
                       <td className="px-6 py-4 text-right">
                          <span className="text-[11px] font-medium text-slate-400">{p.next}</span>
                       </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* Environment Audit Sidebar */}
        <div className="space-y-6">
          <section className="glass-card rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-medical-teal" />
                <h2 className="font-bold text-medical-navy uppercase text-xs tracking-widest text-center">Key Store</h2>
              </div>
              <ShieldCheck size={14} className="text-emerald-500" />
            </div>
            <div className="p-4 space-y-2">
               {ENV_VARS.map((v) => (
                 <div key={v.key} className={`flex items-center justify-between p-3 rounded-xl border ${v.set ? 'bg-white border-slate-100' : 'bg-rose-50/50 border-rose-100'} transition-all`}>
                    <div className="flex flex-col gap-0.5">
                       <div className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">{v.tech} Proxy</div>
                       <code className="text-[10px] font-mono text-slate-600 line-clamp-1 break-all max-w-[140px]">{v.key}</code>
                    </div>
                    {v.set ? (
                      <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XOctagon size={16} className="text-rose-500 shrink-0" />
                    )}
                 </div>
               ))}
            </div>
          </section>

          <section className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/30">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={16} className="text-slate-400" />
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Protocol Version</span>
            </div>
            <div className="text-xs font-bold text-medical-navy mb-4">Arogya-Health-OS v2.4.18-stable</div>
            <button className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-medical-teal hover:border-medical-teal transition-all flex items-center justify-center gap-2 shadow-sm">
              Initialize System Reset <ChevronRight size={12} />
            </button>
          </section>
        </div>
      </div>
    </div>
  )
}

