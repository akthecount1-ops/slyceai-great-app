import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { ShieldCheck } from 'lucide-react'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'superadmin'].includes(profile.role)) {
    redirect('/dashboard')
  }

  return (
    <div className="flex" style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      <AdminSidebar />
      <main className="flex-1 ml-64 min-h-screen">
        <div className="border-b px-6 py-3 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10 border-slate-200">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-medical-teal" />
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Administrative Command</span>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-right">
               <div className="text-xs font-bold text-medical-navy">{profile.name}</div>
               <div className="text-[10px] font-bold text-medical-teal uppercase tracking-tighter">{profile.role}</div>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[10px] font-black text-slate-400">
               {profile.name?.charAt(0) || 'A'}
             </div>
          </div>
        </div>
        <div className="p-8 animate-fade-in">{children}</div>
      </main>
    </div>
  )
}

