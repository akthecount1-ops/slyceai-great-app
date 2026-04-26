'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Menu, X } from 'lucide-react'

const AppSidebar = dynamic(() => import('./AppSidebar'), { 
  ssr: false,
  loading: () => <div style={{ width: 'var(--sidebar-width)', height: '100%', background: 'var(--bg-card)', borderRight: '1px solid var(--border)', flexShrink: 0 }} />
})

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 768) setIsSidebarOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)', overflow: 'hidden' }}>

      {/* Sidebar — desktop sticky, mobile overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:sticky md:top-0 md:h-screen md:block`}
        style={{ width: 'var(--sidebar-width)', flexShrink: 0 }}
      >
        <AppSidebar onMobileClose={() => setIsSidebarOpen(false)} />
      </div>

      {/* Mobile backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main column — full width, no header */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Mobile hamburger row */}
        <div className="md:hidden flex items-center px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', flexShrink: 0 }}>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            style={{
              width: 36, height: 36, borderRadius: 9,
              border: '1px solid rgba(0,0,0,0.12)',
              background: 'rgba(255,255,255,0.7)',
              color: '#5a5652', cursor: 'pointer', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginLeft: 10 }}>Arogya</span>
        </div>

        {/* Scrollable page content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          } as React.CSSProperties}
        >
          {children}
        </main>

      </div>
    </div>
  )
}
