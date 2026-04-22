import { createClient as createServiceClient } from '@supabase/supabase-js'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Doctor Verification | Arogya',
  description: 'Verify your patient\'s health journey on Arogya',
}

interface Props {
  params: Promise<{ token: string }>
}

export default async function DoctorVerifyPage({ params }: Props) {
  const { token } = await params

  const supabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: verification, error } = await supabase
    .from('doctor_verifications')
    .select('*, health_journeys(*)')
    .eq('verification_token', token)
    .single()

  if (error || !verification) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Invalid Verification Link</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            This verification link is invalid or has expired.
          </p>
        </div>
      </div>
    )
  }

  const isExpired = new Date(verification.token_expires_at) < new Date()

  const journey = verification.health_journeys as Record<string, unknown>

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
         style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute inset-0 opacity-10"
           style={{ background: 'radial-gradient(ellipse at 30% 50%, #22c55e, transparent 60%)' }} />
      <div className="relative z-10 w-full max-w-lg page-enter">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌿</div>
          <h1 className="text-2xl font-bold gradient-text">Arogya Health Platform</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Doctor Verification Portal</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {verification.is_verified ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--arogya-green)' }}>Already Verified</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This health journey has already been verified on{' '}
                {verification.verified_at ? new Date(verification.verified_at).toLocaleDateString('en-IN') : '—'}.
              </p>
            </div>
          ) : isExpired ? (
            <div className="text-center">
              <div className="text-5xl mb-4">⏰</div>
              <h2 className="text-xl font-semibold mb-2" style={{ color: '#f87171' }}>Link Expired</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                This verification link expired on {new Date(verification.token_expires_at).toLocaleDateString('en-IN')}.
                Please ask the patient to send a new verification request.
              </p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Verify Patient Health Journey</h2>

              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Doctor</div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{verification.doctor_name}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{verification.doctor_speciality}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Reg: {verification.doctor_registration_number}</div>
                </div>

                <div className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)' }}>
                  <div className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Health Journey</div>
                  <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>{String(journey?.title ?? '')}</div>
                  <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Condition: {String(journey?.condition_name ?? '')}</div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Category: {String(journey?.condition_category ?? '')}</div>
                </div>
              </div>

              <DoctorVerifyForm verificationId={verification.id} journeyId={String(journey?.id ?? '')} />
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DoctorVerifyForm({ verificationId, journeyId }: { verificationId: string; journeyId: string }) {
  return (
    <form action="/api/verify-doctor" method="POST" className="flex flex-col gap-4">
      <input type="hidden" name="verificationId" value={verificationId} />
      <input type="hidden" name="journeyId" value={journeyId} />
      <div>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          Your Notes (optional)
        </label>
        <textarea name="doctorNotes" className="input-field resize-none" rows={3}
                  placeholder="Add clinical notes or observations..." />
      </div>
      <div className="flex items-start gap-2">
        <input type="checkbox" id="confirm-verify" name="confirmed" required className="mt-1" />
        <label htmlFor="confirm-verify" className="text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
          I confirm that I am a licensed medical professional and I have reviewed this patient&apos;s health journey to the best of my knowledge.
        </label>
      </div>
      <button type="submit" className="btn-brand w-full py-3 text-base">
        ✅ Verify Health Journey
      </button>
      <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
        By verifying, your name and registration number will be recorded as a verified attestation.
      </p>
    </form>
  )
}
