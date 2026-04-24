'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Heart, Pill, BookOpen, MessageSquare } from 'lucide-react'

const NAV = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/vitals', icon: Heart, label: 'Vitals' },
  { href: '/medicines', icon: Pill, label: 'Medicines' },
  { href: '/journal', icon: BookOpen, label: 'Journal' },
  { href: '/chat', icon: MessageSquare, label: 'Chat' },
]

export default function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(239,236,230,0.96)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(0,0,0,0.08)',
        paddingBottom: 'env(safe-area-inset-bottom, 8px)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'stretch',
        paddingTop: 8, paddingBottom: 8,
      }}>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 3,
                textDecoration: 'none',
                minHeight: 52,
                transition: 'all 0.15s',
              }}
            >
              <div style={{
                width: 40, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 12,
                background: active ? 'rgba(13,148,136,0.12)' : 'transparent',
                transition: 'all 0.2s ease',
              }}>
                <Icon
                  size={20}
                  strokeWidth={active ? 2.2 : 1.75}
                  style={{ color: active ? '#0d9488' : '#9a9690', transition: 'all 0.2s' }}
                />
              </div>
              <span style={{
                fontSize: 10,
                fontWeight: active ? 700 : 500,
                color: active ? '#0d9488' : '#9a9690',
                letterSpacing: '0.02em',
                transition: 'all 0.2s',
              }}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
