'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ShieldCheck, Lock, ArrowRight, Stethoscope, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError) {
      setError(signInError.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      background: 'var(--bg-primary)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Soft warm gradient orbs */}
      <div style={{
        position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw',
        background: 'radial-gradient(circle, rgba(13,148,136,0.04), transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', bottom: '-10%', left: '-10%', width: '40vw', height: '40vw',
        background: 'radial-gradient(circle, rgba(26,26,26,0.03), transparent 70%)',
        borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none'
      }} />

      <div style={{
        position: 'relative', zIndex: 10,
        width: '100%', maxWidth: '420px',
        animation: 'fadeIn 0.5s ease-out'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '16px',
            background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
          }}>
             <Stethoscope size={32} strokeWidth={1.5} style={{ color: '#0d9488' }} />
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 600, color: '#1a1a1a',
            margin: '0 0 8px', letterSpacing: '-0.02em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
          }}>
            Slyce<span style={{ color: '#0d9488', fontStyle: 'italic', fontWeight: 500 }}>ai</span>
          </h1>
          <p style={{ fontSize: '15px', color: '#6b6b6b', margin: 0, fontWeight: 400 }}>
            Know your body. Own your life.
          </p>
        </div>

        {/* Login Card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '24px',
          padding: '40px 32px',
          border: '1px solid #d9d5ce',
          boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', top: '16px', right: '16px',
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '4px 10px', borderRadius: '8px',
            background: '#f5f1eb', border: '1px solid #e8e4dd'
          }}>
             <ShieldCheck size={14} style={{ color: '#0d9488' }} />
             <span style={{ fontSize: '11px', fontWeight: 600, color: '#5a5652' }}>Secure</span>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginTop: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label htmlFor="email" style={{ fontSize: '13.5px', fontWeight: 500, color: '#3d3d3d', marginLeft: '4px' }}>
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%', background: '#ffffff', border: '1px solid #d9d5ce',
                  borderRadius: '12px', padding: '14px 16px', fontSize: '15px',
                  color: '#1a1a1a', outline: 'none', transition: 'all 0.2s',
                  fontFamily: 'inherit'
                }}
                placeholder="you@example.com"
                required
                onFocus={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#d9d5ce'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginLeft: '4px' }}>
                <label htmlFor="password" style={{ fontSize: '13.5px', fontWeight: 500, color: '#3d3d3d' }}>
                  Password
                </label>
                <Link href="/auth/forgot-password" style={{ fontSize: '13px', fontWeight: 500, color: '#0d9488', textDecoration: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%', background: '#ffffff', border: '1px solid #d9d5ce',
                    borderRadius: '12px', padding: '14px 44px 14px 16px', fontSize: '15px',
                    color: '#1a1a1a', outline: 'none', transition: 'all 0.2s',
                    fontFamily: 'inherit'
                  }}
                  placeholder="••••••••"
                  required
                  onFocus={e => { e.currentTarget.style.borderColor = '#0d9488'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(13,148,136,0.1)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#d9d5ce'; e.currentTarget.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: '#9a9690', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px'
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#3d3d3d'}
                  onMouseLeave={e => e.currentTarget.style.color = '#9a9690'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '12px 16px', borderRadius: '12px', background: '#fff1f2',
                border: '1px solid #ffe4e6', display: 'flex', alignItems: 'flex-start', gap: '10px',
                color: '#e11d48'
              }}>
                <Lock size={16} style={{ marginTop: '2px', flexShrink: 0 }} />
                <span style={{ fontSize: '13.5px', fontWeight: 500, lineHeight: 1.4 }}>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                background: '#1a1a1a', color: '#ffffff', height: '52px', borderRadius: '14px',
                fontSize: '15px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.2s', border: 'none', opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 14px rgba(0,0,0,0.1)'
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)'; e.currentTarget.style.background = '#2d2d2d' } }}
              onMouseLeave={e => { if (!loading) { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.1)'; e.currentTarget.style.background = '#1a1a1a' } }}
            >
              {loading ? 'Signing in...' : (
                <>Sign In <ArrowRight size={18} style={{ color: '#0d9488' }} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e8e4dd', textAlign: 'center' }}>
            <p style={{ fontSize: '14px', color: '#6b6b6b', margin: 0 }}>
              Don't have an account?{' '}
              <Link href="/auth/register" style={{ fontWeight: 600, color: '#0d9488', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                Create Account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
