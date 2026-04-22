'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  Database, 
  FileText, 
  Bot, 
  ShieldCheck, 
  Bell, 
  Settings, 
  History,
  ArrowLeft,
  Activity
} from 'lucide-react'

const ADMIN_NAV = [
  { href: '/admin', icon: LayoutDashboard, label: 'Overview', exact: true },
  { href: '/admin/users', icon: Users, label: 'Users' },
  { href: '/admin/journeys', icon: Stethoscope, label: 'Health Journeys' },
  { href: '/admin/dataset', icon: Database, label: 'Dataset' },
  { href: '/admin/documents', icon: FileText, label: 'Documents' },
  { href: '/admin/ai', icon: Bot, label: 'AI Usage' },
  { href: '/admin/system', icon: ShieldCheck, label: 'System Health' },
  { href: '/admin/notifications', icon: Bell, label: 'Notifications' },
  { href: '/admin/settings', icon: Settings, label: 'Settings' },
  { href: '/admin/audit', icon: History, label: 'Audit Log' },
]

export default function AdminSidebar() {
  const pathname = usePathname()

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + '/')

  return (
    <aside className="w-64 h-screen flex flex-col fixed left-0 top-0 z-40 bg-zinc-950 border-r border-white/5">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-medical-teal flex items-center justify-center text-white shadow-lg shadow-medical-teal/20">
            <Activity size={24} />
          </div>
          <div>
            <div className="text-lg font-black tracking-tighter text-white">AROGYA</div>
            <div className="text-[10px] font-bold tracking-[0.2em] text-medical-teal uppercase">Control Center</div>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto flex flex-col gap-1.5 custom-scrollbar">
        {ADMIN_NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                active 
                  ? 'bg-medical-teal text-white shadow-md shadow-medical-teal/20' 
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={18} className={active ? 'text-white' : 'text-slate-500 group-hover:text-medical-teal'} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/5">
        <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-500 hover:text-white hover:bg-white/5 transition-all group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span>Back to Patient App</span>
        </Link>
      </div>
    </aside>
  )
}

