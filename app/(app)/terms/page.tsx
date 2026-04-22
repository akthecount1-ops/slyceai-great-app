import type { Metadata } from 'next'
import { FileText, ChevronRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms & Conditions | Arogya',
  description: 'Terms and conditions governing the use of the Arogya Health platform.',
}

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing and using the Arogya Health platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our Service. These terms apply to all users, including patients, caregivers, and visitors.',
  },
  {
    title: '2. Nature of the Service',
    content:
      'Arogya Health is a personal health management platform that helps individuals track their health vitals, medicines, symptoms, and medical documents. The AI-powered insights and recommendations provided are for general informational and wellness purposes only. They do NOT constitute medical advice, diagnosis, or treatment. Always consult a qualified healthcare professional for medical decisions.',
  },
  {
    title: '3. User Responsibilities',
    content:
      'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate health information to enable the platform to function effectively. You must not share your account with others or use the platform for any unlawful purpose.',
  },
  {
    title: '4. Health Data and Privacy',
    content:
      'All health data you enter is stored securely and is used solely to personalize your health experience. We do not sell, share, or disclose your health information to third parties without your explicit consent, except as required by law. Please review our Privacy Policy for complete details on data handling.',
  },
  {
    title: '5. AI Recommendations Disclaimer',
    content:
      'The AI-generated insights, diet plans, ayurvedic herb suggestions, yoga recommendations, and health tips are generated based on aggregated health data and general wellness knowledge. These are supplementary tools and should never replace professional medical advice. Arogya Health is not liable for decisions made solely on the basis of AI recommendations.',
  },
  {
    title: '6. Intellectual Property',
    content:
      'All content on the Arogya Health platform including text, design, logos, graphics, and software is the intellectual property of Arogya Health and is protected under applicable copyright and trademark laws. You may not reproduce, distribute, or create derivative works without our express written permission.',
  },
  {
    title: '7. Limitation of Liability',
    content:
      'Arogya Health and its operators shall not be liable for any indirect, incidental, special, or consequential damages arising from the use or inability to use the Service. Our total liability to you for any claim arising from use of the Service shall not exceed the amount you paid (if any) for the Service in the preceding 12 months.',
  },
  {
    title: '8. Modifications to Terms',
    content:
      'We reserve the right to update these Terms and Conditions at any time. Changes will be communicated via notifications on the platform. Continued use of the Service after such changes constitutes your acceptance of the revised terms.',
  },
  {
    title: '9. Governing Law',
    content:
      'These Terms and Conditions shall be governed by and construed in accordance with the laws of India. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts located in New Delhi, India.',
  },
  {
    title: '10. Contact Us',
    content:
      'If you have any questions about these Terms and Conditions, please contact us at legal@arogya.health. We strive to respond to all inquiries within 3 business days.',
  },
]

export default function TermsPage() {
  return (
    <div style={{ maxWidth: '740px', margin: '0 auto', paddingTop: '32px', paddingBottom: '80px' }}>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'var(--medical-navy)' }}
        >
          <FileText size={20} style={{ color: 'var(--medical-teal)' }} />
        </div>
        <div>
          <h1
            className="font-black m-0 leading-tight"
            style={{ fontSize: '22px', color: 'var(--medical-navy)' }}
          >
            Terms &amp; Conditions
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            Last updated: April 20, 2026
          </p>
        </div>
      </div>

      <div className="w-full h-px mb-6 mt-4" style={{ background: 'var(--border)' }} />

      {/* Intro notice */}
      <div
        className="rounded-2xl p-4 mb-6 flex gap-3"
        style={{ background: '#fffbeb', border: '1.5px solid #fde68a' }}
      >
        <span style={{ fontSize: '20px', flexShrink: 0 }}>⚠️</span>
        <p style={{ fontSize: '13.5px', color: '#92400e', margin: 0, lineHeight: 1.6 }}>
          Please read these Terms and Conditions carefully before using the Arogya Health platform. By creating an account or using our services, you acknowledge that you have read, understood, and agree to be bound by these terms.
        </p>
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-4">
        {SECTIONS.map((section, i) => (
          <div
            key={i}
            className="rounded-2xl p-5 border"
            style={{
              background: '#ffffff',
              borderColor: 'var(--border)',
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center mt-0.5 shrink-0"
                style={{ background: 'var(--medical-navy)' }}
              >
                <ChevronRight size={13} style={{ color: 'var(--medical-teal)' }} />
              </div>
              <div>
                <h2
                  style={{
                    fontSize: '15px',
                    fontWeight: 800,
                    color: 'var(--medical-navy)',
                    margin: '0 0 8px',
                  }}
                >
                  {section.title}
                </h2>
                <p
                  style={{
                    fontSize: '13.5px',
                    color: '#475569',
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {section.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div
        className="mt-8 rounded-2xl p-5"
        style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)' }}
      >
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
          🔒 Your trust matters to us. Arogya Health is committed to transparency and protecting your health data.
          <br />
          Questions? Email us at{' '}
          <a href="mailto:legal@arogya.health" style={{ color: 'var(--medical-teal)', fontWeight: 600 }}>
            legal@arogya.health
          </a>
        </p>
      </div>
    </div>
  )
}
