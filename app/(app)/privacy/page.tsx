import type { Metadata } from 'next'
import { ShieldCheck, Lock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy | Arogya',
  description: 'How Arogya Health collects, uses, and protects your personal health data.',
}

const SECTIONS = [
  {
    emoji: '📋',
    title: 'Information We Collect',
    content: [
      'Personal identification information (name, email address, date of birth)',
      'Health vitals (blood pressure, pulse rate, oxygen saturation, blood sugar)',
      'Symptom journal entries and health notes',
      'Medicine schedules and dosage information',
      'Medical documents uploaded to the platform',
      'Device and usage data (browser type, IP address, pages visited)',
    ],
  },
  {
    emoji: '🎯',
    title: 'How We Use Your Information',
    content: [
      'To provide personalized AI-driven health insights and recommendations',
      'To generate diet plans, yoga suggestions, and Ayurvedic herb guidance',
      'To send medicine reminders and health alerts',
      'To maintain and improve the Arogya Health platform',
      'To ensure platform security and prevent unauthorized access',
      'To comply with legal obligations when required',
    ],
  },
  {
    emoji: '🔒',
    title: 'Data Security',
    content: [
      'All data is encrypted in transit using TLS 1.3 protocol',
      'Health data is stored in encrypted databases (AES-256 encryption)',
      'Access to your data is restricted to authorized personnel only',
      'Regular security audits and penetration testing are conducted',
      'We do not store payment card information on our servers',
      'Two-factor authentication is available for additional security',
    ],
  },
  {
    emoji: '🤝',
    title: 'Data Sharing',
    content: [
      'We never sell your personal health data to third parties',
      'Data may be shared with service providers under strict confidentiality agreements',
      'Aggregated, anonymized data may be used for health research',
      'We may disclose data when required by law or court order',
      'Emergency health data may be shared with first responders if you consent',
    ],
  },
  {
    emoji: '⚙️',
    title: 'Your Rights',
    content: [
      'Right to access: Request a copy of all data we hold about you',
      'Right to rectification: Correct inaccurate or incomplete data',
      'Right to erasure: Request deletion of your account and health data',
      'Right to portability: Export your health data in a standard format',
      'Right to object: Opt out of certain data processing activities',
      'Right to withdraw consent at any time without penalty',
    ],
  },
  {
    emoji: '🍪',
    title: 'Cookies and Tracking',
    content: [
      'We use essential cookies to maintain your login session',
      'Analytics cookies help us understand platform usage patterns',
      'No third-party advertising cookies are used on the platform',
      'You can manage cookie preferences in your browser settings',
      'Disabling essential cookies may affect platform functionality',
    ],
  },
  {
    emoji: '📅',
    title: 'Data Retention',
    content: [
      'Active account data is retained for the duration of your account',
      'After account deletion, personal data is removed within 30 days',
      'Anonymized usage logs may be retained for up to 2 years',
      'Legal and compliance records are retained as required by law',
      'Backup data may persist for up to 90 days after deletion requests',
    ],
  },
]

export default function PrivacyPage() {
  return (
    <div style={{ maxWidth: '740px', margin: '0 auto', paddingTop: '32px', paddingBottom: '80px' }}>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--medical-navy)' }}
        >
          <ShieldCheck size={20} style={{ color: 'var(--medical-teal)' }} />
        </div>
        <div>
          <h1
            className="font-black m-0 leading-tight"
            style={{ fontSize: '22px', color: 'var(--medical-navy)' }}
          >
            Privacy Policy
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Last updated: April 20, 2026
          </p>
        </div>
      </div>

      <div className="w-full h-px mb-6 mt-4" style={{ background: 'var(--border)' }} />

      {/* Trust badge */}
      <div
        className="rounded-2xl p-4 mb-6 flex gap-3 items-start"
        style={{ background: '#f0fdfa', border: '1.5px solid #99f6e4' }}
      >
        <Lock size={18} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ fontSize: '13.5px', color: '#134e4a', margin: 0, lineHeight: 1.6 }}>
          At Arogya Health, your privacy is our highest priority. We are committed to protecting your personal health information with the same care you take of your health. This policy explains exactly what data we collect, how it is used, and the rights you have.
        </p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-5">
        {SECTIONS.map((section, i) => (
          <div
            key={i}
            className="rounded-2xl border overflow-hidden"
            style={{ background: 'var(--bg-card)fff', borderColor: 'var(--border)' }}
          >
            {/* Section header */}
            <div
              className="flex items-center gap-3 px-5 py-4 border-b"
              style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}
            >
              <span style={{ fontSize: '20px' }}>{section.emoji}</span>
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: 800,
                  color: 'var(--medical-navy)',
                  margin: 0,
                }}
              >
                {section.title}
              </h2>
            </div>

            {/* Bullet list */}
            <ul className="px-5 py-4 m-0 flex flex-col gap-2.5" style={{ listStyle: 'none', padding: '16px 20px' }}>
              {section.content.map((item, j) => (
                <li key={j} className="flex items-start gap-3">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ background: 'var(--medical-teal)' }}
                  />
                  <span style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.65 }}>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Contact section */}
      <div
        className="mt-8 rounded-2xl p-5 text-center"
        style={{ background: 'var(--medical-navy)' }}
      >
        <ShieldCheck size={24} style={{ color: 'var(--medical-teal)', margin: '0 auto 10px' }} />
        <h3 style={{ color: 'var(--bg-card)fff', fontWeight: 800, fontSize: '16px', margin: '0 0 8px' }}>
          Questions About Your Privacy?
        </h3>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '13.5px', margin: '0 0 14px' }}>
          Our dedicated Privacy team is here to help with any questions or data requests.
        </p>
        <a
          href="mailto:privacy@arogya.health"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-white transition-all hover:scale-[1.03]"
          style={{
            background: 'var(--medical-teal)',
            fontSize: '14px',
            textDecoration: 'none',
            boxShadow: '0 4px 12px rgba(13,148,136,0.4)',
          }}
        >
          Contact Privacy Team
        </a>
      </div>
    </div>
  )
}
