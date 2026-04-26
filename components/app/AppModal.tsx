'use client'

import React from 'react'
import { X } from 'lucide-react'

interface AppModalProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  onClose: () => void
  maxWidth?: string
}

export default function AppModal({ title, subtitle, children, onClose, maxWidth = '460px' }: AppModalProps) {
  // Prevent click inside modal from closing it
  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation()
  }

  return (
    <div 
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        backdropFilter: 'blur(2px)'
      }}
      onClick={onClose}
    >
      <div 
        style={{
          background: 'var(--bg-card)', borderRadius: '12px',
          border: '0.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          padding: '24px', width: maxWidth, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto',
          animation: 'cardIn 0.2s ease',
        }}
        onClick={handleContentClick}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px' }}>{title}</h2>
            {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>{subtitle}</p>}
          </div>
          <button 
            onClick={onClose} 
            style={{ 
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', 
              display: 'flex', padding: '6px', borderRadius: '50%', transition: 'background 0.1s' 
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <X size={18} />
          </button>
        </div>
        
        <div style={{ marginTop: '20px' }}>
          {children}
        </div>
      </div>
      <style>{`
        @keyframes cardIn { 
          from { opacity: 0; transform: translateY(10px) scale(0.98); } 
          to { opacity: 1; transform: translateY(0) scale(1); } 
        }
      `}</style>
    </div>
  )
}
