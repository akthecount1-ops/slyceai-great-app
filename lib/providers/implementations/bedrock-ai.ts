import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type ContentBlock,
} from '@aws-sdk/client-bedrock-runtime'
import type { AIProvider, AIMessage, AIUsageStats } from '../interfaces'

/**
 * AWS Bedrock AI provider — Amazon Nova Pro (us-east-1)
 * ============================================================
 * Uses ABSK REST auth (Bearer token via BEDROCK_API_KEY) or
 * @aws-sdk/client-bedrock-runtime with SigV4 signing as fallback.
 *
 * Required env vars:
 *   BEDROCK_API_KEY        — ABSK key (preferred)
 *   AWS_ACCESS_KEY_ID      — IAM access key (SDK fallback)
 *   AWS_SECRET_ACCESS_KEY  — IAM secret key (SDK fallback)
 *   AWS_REGION             — defaults to 'us-east-1'
 *   BEDROCK_MODEL_ID       — defaults to 'us.anthropic.claude
 * -sonnet-4-6'
 */

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-6'

function createBedrockClient(): BedrockRuntimeClient {
  const region = process.env.AWS_REGION || 'ap-south-1'
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const sessionToken = process.env.AWS_SESSION_TOKEN

  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      'AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set in environment variables'
    )
  }

  return new BedrockRuntimeClient({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {}),
    },
  })
}

export class BedrockAIProvider implements AIProvider {
  private client: BedrockRuntimeClient | null = null
  private model: string
  private apiKey: string | null = null
  private region: string

  constructor() {
    this.region = process.env.AWS_REGION || 'us-east-1'
    this.model = process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL
    this.apiKey = process.env.BEDROCK_API_KEY || null

    // Only initialize SDK client if no ABSK key is provided
    if (!this.apiKey?.startsWith('ABSK')) {
      try {
        this.client = createBedrockClient()
      } catch (e) {
        console.warn('[Bedrock] SDK client initialization failed, will check for API Key fallback')
      }
    }
  }

  private async logUsage(
    feature: string,
    model: string,
    inputTokens: number,
    outputTokens: number,
    responseTimeMs: number,
    userId?: string,
    status: 'success' | 'error' = 'success',
    errorMessage?: string
  ) {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      await supabase.from('api_usage_log').insert({
        user_id: userId ?? null,
        feature,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        response_time_ms: responseTimeMs,
        status,
        error_message: errorMessage ?? null,
      })
    } catch {
      console.warn('[Bedrock] Usage log write failed (non-fatal)')
    }
  }

  private async callRest(payload: any): Promise<{ content: string; usage: AIUsageStats; start: number }> {
    const start = Date.now()
    const endpoint = `https://bedrock-runtime.${this.region}.amazonaws.com/model/${this.model}/converse`

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Bedrock REST error (${response.status}): ${errorText}`)
    }

    const data = await response.json()
    const content =
      data.output?.message?.content
        ?.map((c: any) => c.text ?? '')
        .join('')
        .trim() ?? ''

    if (!content) throw new Error('Bedrock REST returned empty content')

    const inputTokens = data.usage?.inputTokens ?? 0
    const outputTokens = data.usage?.outputTokens ?? 0

    return {
      content,
      start,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model: this.model,
        responseTimeMs: Date.now() - start,
      },
    }
  }

  async chat(
    messages: AIMessage[],
    systemPrompt?: string,
    options?: { stream?: boolean; maxTokens?: number; temperature?: number }
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const converseMessages: Message[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: [{ text: m.content } as ContentBlock],
      }))

    const payload = {
      messages: converseMessages,
      ...(systemPrompt ? { system: [{ text: systemPrompt }] } : {}),
      inferenceConfig: {
        maxTokens: options?.maxTokens ?? 2048,
        temperature: options?.temperature ?? 0.7,
      },
    }

    // Path 1: ABSK REST (Simplified)
    if (this.apiKey?.startsWith('ABSK')) {
      const result = await this.callRest(payload)
      await this.logUsage('chat', this.model, result.usage.inputTokens, result.usage.outputTokens, result.usage.responseTimeMs)
      return { content: result.content, usage: result.usage }
    }

    // Path 2: AWS SDK (SigV4)
    if (!this.client) throw new Error('Bedrock provider not configured (no Client or API Key)')
    const start = Date.now()
    try {
      const command = new ConverseCommand({
        modelId: this.model,
        ...payload
      })
      const response = await this.client.send(command)
      const content = response.output?.message?.content?.map((c) => ('text' in c ? c.text ?? '' : '')).join('').trim() ?? ''

      const usage: AIUsageStats = {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
        totalTokens: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
        model: this.model,
        responseTimeMs: Date.now() - start,
      }
      await this.logUsage('chat', this.model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('chat', this.model, 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }

  async analyseDocument(
    fileBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const formatMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'text/html': 'html',
      'text/csv': 'csv',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    }
    const format = formatMap[mimeType] ?? 'txt'

    // REST Payload
    if (this.apiKey?.startsWith('ABSK')) {
      const payload = {
        messages: [{
          role: 'user',
          content: [
            { document: { format, name: 'doc', source: { bytes: fileBase64 } } },
            { text: prompt }
          ]
        }],
        inferenceConfig: { maxTokens: 4096 }
      }
      const result = await this.callRest(payload)
      await this.logUsage('document_analysis', this.model, result.usage.inputTokens, result.usage.outputTokens, result.usage.responseTimeMs)
      return { content: result.content, usage: result.usage }
    }

    // SDK path
    if (!this.client) throw new Error('Bedrock provider not configured')
    const start = Date.now()
    try {
      const command = new ConverseCommand({
        modelId: this.model,
        messages: [{
          role: 'user',
          content: [
            { document: { format: format as any, name: 'doc', source: { bytes: Buffer.from(fileBase64, 'base64') } } },
            { text: prompt }
          ]
        }],
        inferenceConfig: { maxTokens: 4096 }
      })
      const response = await this.client.send(command)
      const content = response.output?.message?.content?.map((c) => ('text' in c ? c.text ?? '' : '')).join('').trim() ?? ''
      const usage: AIUsageStats = {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
        totalTokens: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
        model: this.model,
        responseTimeMs: Date.now() - start,
      }
      await this.logUsage('document_analysis', this.model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('document_analysis', this.model, 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }

  async analyseImage(
    imageBase64: string,
    prompt: string
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const format: 'jpeg' | 'png' | 'gif' | 'webp' =
      imageBase64.startsWith('/9j') ? 'jpeg'
        : imageBase64.startsWith('iVBOR') ? 'png'
          : imageBase64.startsWith('R0lGOD') ? 'gif'
            : imageBase64.startsWith('UklGR') ? 'webp'
              : 'jpeg'

    // REST path
    if (this.apiKey?.startsWith('ABSK')) {
      const payload = {
        messages: [{
          role: 'user',
          content: [
            { image: { format, source: { bytes: imageBase64 } } },
            { text: prompt }
          ]
        }],
        inferenceConfig: { maxTokens: 4096 }
      }
      const result = await this.callRest(payload)
      await this.logUsage('image_analysis', this.model, result.usage.inputTokens, result.usage.outputTokens, result.usage.responseTimeMs)
      return { content: result.content, usage: result.usage }
    }

    // SDK path
    if (!this.client) throw new Error('Bedrock provider not configured')
    const start = Date.now()
    try {
      const command = new ConverseCommand({
        modelId: this.model,
        messages: [{
          role: 'user',
          content: [
            { image: { format, source: { bytes: Buffer.from(imageBase64, 'base64') } } },
            { text: prompt }
          ]
        }],
        inferenceConfig: { maxTokens: 4096 }
      })
      const response = await this.client.send(command)
      const content = response.output?.message?.content?.map((c) => ('text' in c ? c.text ?? '' : '')).join('').trim() ?? ''
      const usage: AIUsageStats = {
        inputTokens: response.usage?.inputTokens ?? 0,
        outputTokens: response.usage?.outputTokens ?? 0,
        totalTokens: (response.usage?.inputTokens ?? 0) + (response.usage?.outputTokens ?? 0),
        model: this.model,
        responseTimeMs: Date.now() - start,
      }
      await this.logUsage('image_analysis', this.model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('image_analysis', this.model, 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }
}
