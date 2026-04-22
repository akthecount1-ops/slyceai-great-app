/**
 * AWS SES Email Provider — STUB (Ready to Activate)
 *
 * TO ACTIVATE:
 * 1. Fill in AWS credentials in .env.local (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_SES_FROM_EMAIL)
 * 2. In /lib/providers/registry.ts, replace:
 *    import { ResendEmailProvider } from './implementations/resend-email'
 *    export const email: EmailProvider = new ResendEmailProvider()
 *    WITH:
 *    import { AWSSESEmailProvider } from './implementations/aws-ses-email'
 *    export const email: EmailProvider = new AWSSESEmailProvider()
 *
 * Nothing else in the application needs to change.
 */

import {
  SESClient,
  SendEmailCommand,
} from '@aws-sdk/client-ses'
import type { EmailProvider } from '../interfaces'

export class AWSSESEmailProvider implements EmailProvider {
  private client: SESClient
  private defaultFrom: string

  constructor() {
    const region = process.env.AWS_REGION || 'ap-south-1'
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
    this.defaultFrom = process.env.AWS_SES_FROM_EMAIL || 'noreply@arogya.health'

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials not configured')
    }

    this.client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    })
  }

  async send(options: {
    to: string
    subject: string
    html: string
    from?: string
  }): Promise<{ id: string }> {
    const command = new SendEmailCommand({
      Source: options.from ?? this.defaultFrom,
      Destination: { ToAddresses: [options.to] },
      Message: {
        Subject: { Data: options.subject, Charset: 'UTF-8' },
        Body: { Html: { Data: options.html, Charset: 'UTF-8' } },
      },
    })

    const response = await this.client.send(command)
    return { id: response.MessageId ?? '' }
  }

  async sendTemplate(
    template: string,
    to: string,
    variables: Record<string, unknown>
  ): Promise<{ id: string }> {
    // AWS SES supports native templates but we build HTML here for consistency
    const html = `<p>Template: ${template}</p><pre>${JSON.stringify(variables, null, 2)}</pre>`
    return this.send({
      to,
      subject: `Arogya — ${template}`,
      html,
    })
  }
}
