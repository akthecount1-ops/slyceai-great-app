'use client'

import { useState, useEffect } from 'react'
import AppSidebar from './AppSidebar'
import AppHeader from './AppHeader'
import { Menu, X } from 'lucide-react'

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => { if (window.innerWidth > 768) setIsSidebarOpen(false) }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>

      {/* Sidebar — desktop sticky, mobile overlay */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'} md:sticky md:top-0 md:h-screen md:block`}
        style={{ width: '260px', flexShrink: 0 }}
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

      {/* Main column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, width: '100%' }}>

        {/* Fixed header */}
        <div
          className="fixed top-0 right-0 z-30 left-0 md:left-[260px]"
          style={{ height: 'var(--header-height)' }}
        >
          <AppHeader>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="md:hidden flex items-center justify-center mr-2"
              style={{
                width: 36, height: 36, borderRadius: 9,
                border: '1px solid rgba(0,0,0,0.12)',
                background: 'rgba(255,255,255,0.7)',
                color: '#5a5652', cursor: 'pointer', flexShrink: 0,
              }}
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </AppHeader>
        </div>

        {/* Scrollable page content */}
        <main
          style={{
            flex: 1,
            paddingTop: 'var(--header-height)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
          } as React.CSSProperties}
        >
          <div style={{ width: '100%', maxWidth: 1200, margin: '0 auto' }}>
            {children}
          </div>
        </main>

      </div>
    </div>
  )
}
