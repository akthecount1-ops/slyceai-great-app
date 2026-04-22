import { Resend } from 'resend'
import type { EmailProvider } from '../interfaces'

export class ResendEmailProvider implements EmailProvider {
  private client: Resend
  private defaultFrom: string

  constructor() {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) throw new Error('RESEND_API_KEY not configured')
    this.client = new Resend(apiKey)
    this.defaultFrom = process.env.RESEND_FROM_EMAIL || 'noreply@arogya.health'
  }

  async send(options: {
    to: string
    subject: string
    html: string
    from?: string
  }): Promise<{ id: string }> {
    const { data, error } = await this.client.emails.send({
      from: options.from ?? this.defaultFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })
    if (error) throw new Error(`Email send error: ${error.message}`)
    return { id: data?.id ?? '' }
  }

  async sendTemplate(
    template: string,
    to: string,
    variables: Record<string, unknown>
  ): Promise<{ id: string }> {
    // Resend supports React Email templates; for now we build HTML from template key
    const html = this.buildTemplateHtml(template, variables)
    return this.send({ to, subject: this.getTemplateSubject(template), html })
  }

  private getTemplateSubject(template: string): string {
    const subjects: Record<string, string> = {
      welcome: 'Welcome to Arogya — Your Personal Health Companion',
      doctor_verification: 'Arogya: Please verify your patient\'s health journey',
      password_reset: 'Arogya: Reset your password',
      weekly_summary: 'Your Weekly Health Summary from Arogya',
    }
    return subjects[template] ?? 'Arogya Health Platform'
  }

  private buildTemplateHtml(template: string, vars: Record<string, unknown>): string {
    const base = `
      <div style="font-family: 'Inter', sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; color: #f1f5f9; padding: 40px 32px; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="font-size: 28px; background: linear-gradient(135deg, #f97316, #22c55e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 0;">🌿 Arogya</h1>
          <p style="color: #94a3b8; font-size: 13px; margin: 4px 0 0;">AI-Powered Personal Health Platform</p>
        </div>
        {{BODY}}
        <div style="border-top: 1px solid #1e293b; margin-top: 40px; padding-top: 20px; text-align: center; color: #64748b; font-size: 12px;">
          <p>Arogya Health Platform · India's AI-powered personal health companion</p>
          <p>This email was sent from ${this.defaultFrom}</p>
        </div>
      </div>
    `

    const bodies: Record<string, string> = {
      welcome: `
        <h2 style="color: #f97316; font-size: 20px;">Namaste, ${vars.name ?? 'there'}! 🙏</h2>
        <p style="color: #cbd5e1; line-height: 1.6;">Welcome to Arogya — your AI-powered personal health companion built for India.</p>
        <p style="color: #cbd5e1; line-height: 1.6;">Start your health journey by completing your profile and logging your first vitals.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding" style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Complete Your Profile →</a>
      `,
      doctor_verification: `
        <h2 style="color: #22c55e; font-size: 20px;">Doctor Verification Request</h2>
        <p style="color: #cbd5e1; line-height: 1.6;">Your patient <strong>${vars.patientName}</strong> has requested you verify their health journey for condition: <strong>${vars.conditionName}</strong>.</p>
        <p style="color: #cbd5e1; line-height: 1.6;">This link expires in 7 days.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/verify-doctor/${vars.token}" style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: linear-gradient(135deg, #22c55e, #16a34a); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Verify Journey →</a>
      `,
      password_reset: `
        <h2 style="color: #f97316; font-size: 20px;">Reset Your Password</h2>
        <p style="color: #cbd5e1; line-height: 1.6;">We received a request to reset your password. Click below to proceed.</p>
        <a href="${vars.resetLink}" style="display: inline-block; margin-top: 24px; padding: 12px 28px; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Reset Password →</a>
        <p style="color: #64748b; font-size: 12px; margin-top: 16px;">If you didn't request this, please ignore this email.</p>
      `,
      weekly_summary: `
        <h2 style="color: #f97316; font-size: 20px;">Your Weekly Health Summary</h2>
        <p style="color: #cbd5e1;">Here's how your week looked, ${vars.name ?? 'health warrior'}:</p>
        <div style="background: #1e293b; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <p style="color: #94a3b8; margin: 0;">Vitals logged: <strong style="color: #f1f5f9;">${vars.vitalsCount ?? 0}</strong></p>
          <p style="color: #94a3b8; margin: 8px 0 0;">Journal entries: <strong style="color: #f1f5f9;">${vars.journalCount ?? 0}</strong></p>
          <p style="color: #94a3b8; margin: 8px 0 0;">Medicines taken: <strong style="color: #f1f5f9;">${vars.medicineAdherence ?? '—'}</strong></p>
        </div>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #f97316, #ea580c); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">View Dashboard →</a>
      `,
    }

    const body = bodies[template] ?? `<p style="color: #cbd5e1;">${JSON.stringify(vars)}</p>`
    return base.replace('{{BODY}}', body)
  }
}
