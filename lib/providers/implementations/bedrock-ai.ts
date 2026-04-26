import {
  BedrockRuntimeClient,
  ConverseCommand,
  type Message,
  type ContentBlock,
} from '@aws-sdk/client-bedrock-runtime'
import type { AIProvider, AIMessage, AIUsageStats } from '../interfaces'

/**
 * AWS Bedrock AI provider — Claude Sonnet 4.5 (ap-south-1)
 * ============================================================
 * Uses @aws-sdk/client-bedrock-runtime with SigV4 signing.
 * Equivalent to Python boto3:
 *   bedrock = boto3.client('bedrock-runtime', region_name='ap-south-1')
 *   bedrock.converse(modelId=..., messages=..., system=...)
 *
 * Required env vars:
 *   AWS_ACCESS_KEY_ID      — IAM access key
 *   AWS_SECRET_ACCESS_KEY  — IAM secret key
 *   AWS_SESSION_TOKEN      — (only needed for temporary/STS credentials)
 *   AWS_REGION             — defaults to 'ap-south-1'
 *   BEDROCK_MODEL_ID       — defaults to 'us.anthropic.claude-sonnet-4-5-20251001-v1:0'
 */

const DEFAULT_MODEL = 'us.anthropic.claude-sonnet-4-5-20251001-v1:0'

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
  private client: BedrockRuntimeClient
  private model: string

  constructor() {
    this.client = createBedrockClient()
    this.model = process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL
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

  async chat(
    messages: AIMessage[],
    systemPrompt?: string,
    options?: { stream?: boolean; maxTokens?: number; temperature?: number }
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const start = Date.now()
    const model = this.model

    // Bedrock Converse API: system messages go in the top-level `system` field
    // Messages array must ONLY contain user/assistant turns
    const converseMessages: Message[] = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: [{ text: m.content } as ContentBlock],
      }))

    try {
      const command = new ConverseCommand({
        modelId: model,
        messages: converseMessages,
        ...(systemPrompt
          ? { system: [{ text: systemPrompt }] }
          : {}),
        inferenceConfig: {
          maxTokens: options?.maxTokens ?? 2048,
          temperature: options?.temperature ?? 0.7,
        },
      })

      const response = await this.client.send(command)

      const content =
        response.output?.message?.content
          ?.map((c) => ('text' in c ? c.text ?? '' : ''))
          .join('')
          .trim() ?? ''

      if (!content) throw new Error('Bedrock returned empty content')

      const inputTokens = response.usage?.inputTokens ?? 0
      const outputTokens = response.usage?.outputTokens ?? 0

      const usage: AIUsageStats = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        responseTimeMs: Date.now() - start,
      }

      await this.logUsage('chat', model, inputTokens, outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      console.error('[Bedrock] chat error:', msg)
      await this.logUsage('chat', model, 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }

  async analyseDocument(
    fileBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const start = Date.now()
    const model = this.model

    // Determine Bedrock document format
    const formatMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'text/plain': 'txt',
      'text/html': 'html',
      'text/csv': 'csv',
      'application/msword': 'doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    }
    const format = formatMap[mimeType] ?? 'txt'

    const converseMessages: Message[] = [
      {
        role: 'user',
        content: [
          {
            document: {
              format: format as 'pdf' | 'txt' | 'html' | 'csv' | 'doc' | 'docx',
              name: 'uploaded-document',
              source: {
                bytes: Buffer.from(fileBase64, 'base64'),
              },
            },
          } as unknown as ContentBlock,
          { text: prompt } as ContentBlock,
        ],
      },
    ]

    try {
      const command = new ConverseCommand({
        modelId: model,
        messages: converseMessages,
        inferenceConfig: { maxTokens: 4096 },
      })

      const response = await this.client.send(command)
      const content =
        response.output?.message?.content
          ?.map((c) => ('text' in c ? c.text ?? '' : ''))
          .join('')
          .trim() ?? ''

      if (!content) throw new Error('Bedrock returned empty content')

      const inputTokens = response.usage?.inputTokens ?? 0
      const outputTokens = response.usage?.outputTokens ?? 0
      const usage: AIUsageStats = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        responseTimeMs: Date.now() - start,
      }

      await this.logUsage('document_analysis', model, inputTokens, outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('document_analysis', model, 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }

  async analyseImage(
    imageBase64: string,
    prompt: string
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const start = Date.now()
    const model = this.model

    // Detect image format from base64 magic bytes
    const format: 'jpeg' | 'png' | 'gif' | 'webp' =
      imageBase64.startsWith('/9j') ? 'jpeg'
      : imageBase64.startsWith('iVBOR') ? 'png'
      : imageBase64.startsWith('R0lGOD') ? 'gif'
      : imageBase64.startsWith('UklGR') ? 'webp'
      : 'jpeg'

    const converseMessages: Message[] = [
      {
        role: 'user',
        content: [
          {
            image: {
              format,
              source: {
                bytes: Buffer.from(imageBase64, 'base64'),
              },
            },
          } as unknown as ContentBlock,
          { text: prompt } as ContentBlock,
        ],
      },
    ]

    try {
      const command = new ConverseCommand({
        modelId: model,
        messages: converseMessages,
        inferenceConfig: { maxTokens: 2048 },
      })

      const response = await this.client.send(command)
      const content =
        response.output?.message?.content
          ?.map((c) => ('text' in c ? c.text ?? '' : ''))
          .join('')
          .trim() ?? ''

      if (!content) throw new Error('Bedrock returned empty content')

      const inputTokens = response.usage?.inputTokens ?? 0
      const outputTokens = response.usage?.outputTokens ?? 0
      const usage: AIUsageStats = {
        inputTokens,
        outputTokens,
        totalTokens: inputTokens + outputTokens,
        model,
        responseTimeMs: Date.now() - start,
      }

      await this.logUsage('image_analysis', model, inputTokens, outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('image_analysis', model, 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }
}
