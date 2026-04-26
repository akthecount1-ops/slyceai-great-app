'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Menu, X } from 'lucide-react'

const AppSidebar = dynamic(() => import('./AppSidebar'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%', background: 'var(--bg-card)' }} />
})

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setIsSidebarOpen(false)
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isSidebarOpen])

  return (
    <div style={{
      display: 'flex',
      minHeight: '100dvh',
      background: 'var(--bg-page)',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* ── Desktop sidebar — stays in normal flow ── */}
      {!isMobile && (
        <div style={{
          width: 'var(--sidebar-width)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          borderRight: '0.5px solid var(--border)',
        }}>
          <AppSidebar onMobileClose={() => setIsSidebarOpen(false)} />
        </div>
      )}

      {/* ── Mobile sidebar — fixed overlay, slides in ── */}
      {isMobile && (
        <>
          {/* Backdrop — dark only, NO blur so content is visible behind */}
          {isSidebarOpen && (
            <div
              onClick={() => setIsSidebarOpen(false)}
              style={{
                position: 'fixed', inset: 0, zIndex: 40,
                background: 'rgba(0,0,0,0.40)',
              }}
            />
          )}

          {/* Sidebar panel */}
          <div style={{
            position: 'fixed',
            top: 0, left: 0, bottom: 0,
            width: '280px',
            zIndex: 50,
            transform: isSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
            boxShadow: isSidebarOpen ? '4px 0 24px rgba(0,0,0,0.18)' : 'none',
          }}>
            <AppSidebar onMobileClose={() => setIsSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* ── Main content column ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, minHeight: '100dvh' }}>

        {/* Mobile top bar with hamburger */}
        {isMobile && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '10px 16px',
            borderBottom: '0.5px solid var(--border)',
            background: 'var(--bg-card)',
            flexShrink: 0,
            position: 'sticky', top: 0, zIndex: 30,
          }}>
            <button
              onClick={() => setIsSidebarOpen(prev => !prev)}
              aria-label={isSidebarOpen ? 'Close menu' : 'Open menu'}
              style={{
                width: 36, height: 36, borderRadius: 8,
                border: '0.5px solid var(--border)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Arogya</span>
          </div>
        )}

        {/* Page content */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
        } as React.CSSProperties}>
          {children}
        </main>

      </div>
    </div>
  )
}
