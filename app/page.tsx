'use client'

import Link from 'next/link'
import { 
  Stethoscope, 
  ShieldCheck, 
  Activity, 
  BrainCircuit, 
  Database, 
  ArrowRight,
  HeartPulse,
  Leaf
} from 'lucide-react'

const FEATURES = [
  { label: 'Health Tracking', icon: Activity },
  { label: 'AI Diagnostics', icon: BrainCircuit },
  { label: 'Secure Records', icon: Database },
  { label: 'Ayurveda & Wellness', icon: Leaf },
  { label: 'Privacy First', icon: ShieldCheck },
  { label: 'Vitals Analysis', icon: HeartPulse }
]

export default function HomePage() {
  return (
    <main style={{
      minHeight: '100vh',
      position: 'relative',
      padding: '12vh 0 80px', /* Uses vh for top padding to naturally center on tall screens */
      background: 'var(--bg-primary)',
    }}>
      {/* Soft warm gradient orbs */}
      <div style={{
        position: 'absolute', top: '-10%', left: '-10%', width: '60vw', height: '60vw',
        background: 'radial-gradient(circle, rgba(13,148,136,0.04), transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', right: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(26,26,26,0.03), transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none'
      }} />

      <div style={{
        position: 'relative', zIndex: 10,
        textAlign: 'center', padding: '0 24px',
        maxWidth: '1000px', width: '100%',
        margin: '0 auto', /* Centers horizontally only */
        animation: 'fadeIn 0.6s ease-out'
      }}>
        <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }`}</style>

        {/* Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '20px',
            background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)', marginBottom: '24px',
            transition: 'transform 0.3s ease'
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
            <Stethoscope size={36} strokeWidth={1.5} style={{ color: '#0d9488' }} />
          </div>
          
          <h1 style={{
            fontSize: 'clamp(48px, 8vw, 84px)',
            fontWeight: 600,
            color: '#1a1a1a',
            letterSpacing: '-0.03em',
            margin: '0 0 16px',
            lineHeight: 1.1,
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            Slyce<span style={{ color: '#0d9488', fontStyle: 'italic', fontWeight: 500 }}>ai</span>
          </h1>
          <p style={{
            fontSize: 'clamp(18px, 3vw, 22px)',
            fontWeight: 400,
            color: '#6b6b6b',
            letterSpacing: '0.01em',
            margin: 0
          }}>
            Know your body. Own your life.
          </p>
        </div>

        <p style={{
          fontSize: 'clamp(16px, 2.5vw, 18px)',
          color: '#5a5652',
          fontWeight: 400,
          fontStyle: 'italic',
          maxWidth: '640px',
          margin: '0 auto 48px',
          lineHeight: 1.6,
          animation: 'fadeIn 0.6s 0.1s both'
        }}>
          "Your body kept the score while you were busy losing — now it's time to win it back."
        </p>

        {/* Actions */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          alignItems: 'center', justifyContent: 'center',
          marginBottom: '64px',
          animation: 'fadeIn 0.6s 0.2s both'
        }}>
          {/* Use CSS media queries for layout to avoid client/server hydration mismatch on window.innerWidth */}
          <style>{`
            .action-buttons { flex-direction: column; width: 100%; max-width: 320px; }
            @media (min-width: 640px) { .action-buttons { flex-direction: row; width: auto; max-width: none; } }
          `}</style>
          <div className="action-buttons" style={{ display: 'flex', gap: '16px' }}>
            <Link href="/auth/register" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              background: '#1a1a1a', color: '#ffffff',
              padding: '16px 32px', borderRadius: '14px',
              fontSize: '15px', fontWeight: 500, textDecoration: 'none',
              transition: 'all 0.2s', boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
              width: '100%'
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; e.currentTarget.style.background = '#2d2d2d' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'; e.currentTarget.style.background = '#1a1a1a' }}>
              Create Account <ArrowRight size={18} style={{ color: '#0d9488' }} />
            </Link>
            
            <Link href="/auth/login" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              background: '#ffffff', color: '#1a1a1a', border: '1px solid #d9d5ce',
              padding: '16px 32px', borderRadius: '14px',
              fontSize: '15px', fontWeight: 500, textDecoration: 'none',
              transition: 'all 0.2s',
              width: '100%'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f5f1eb'; e.currentTarget.style.borderColor = '#c4bfb7' }}
            onMouseLeave={e => { e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.borderColor = '#d9d5ce' }}>
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <style>{`
          .features-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 24px;
            padding: 60px 0 40px;
            border-top: 1px solid #d9d5ce;
            animation: fadeIn 0.6s 0.3s both;
            width: 100%;
          }
          @media (min-width: 768px) {
            .features-grid {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          @media (min-width: 1024px) {
            .features-grid {
              grid-template-columns: repeat(6, 1fr);
            }
          }
        `}</style>
        <div className="features-grid">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '12px',
                  background: '#ffffff', border: '1px solid #d9d5ce',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#6b6b6b', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.color = '#0d9488'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#d9d5ce'; e.currentTarget.style.color = '#6b6b6b'; e.currentTarget.style.transform = 'translateY(0)' }}>
                   <Icon size={22} strokeWidth={1.75} />
                </div>
                <span style={{ fontSize: '13px', fontWeight: 500, color: '#5a5652', textAlign: 'center' }}>
                  {f.label}
                </span>
              </div>
            )
          })}
        </div>

      </div>
    </main>
  )
}
