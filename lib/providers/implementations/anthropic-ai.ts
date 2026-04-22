import Anthropic from '@anthropic-ai/sdk'
import type { AIProvider, AIMessage, AIUsageStats } from '../interfaces'

/**
 * Anthropic Claude implementation of AIProvider.
 * Logs every call to api_usage_log via direct Supabase service role client.
 * Swap to Bedrock/OpenAI/Gemini by replacing this file and updating registry.ts.
 */
export class AnthropicAIProvider implements AIProvider {
  private client: Anthropic
  private defaultModel = 'claude-opus-4-5'

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')
    this.client = new Anthropic({ apiKey })
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
    // Import createClient inline to avoid circular deps — never exposed to app code
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
      // Non-fatal: logging failure should not break the main request
      console.warn('[AI Usage Log] Failed to log API usage')
    }
  }

  async chat(
    messages: AIMessage[],
    systemPrompt?: string,
    options?: { stream?: boolean; maxTokens?: number; temperature?: number }
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const start = Date.now()
    const model = this.defaultModel
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: options?.maxTokens ?? 2048,
        system: systemPrompt,
        messages: messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      })

      const content = response.content[0].type === 'text' ? response.content[0].text : ''
      const usage: AIUsageStats = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        model,
        responseTimeMs: Date.now() - start,
      }

      await this.logUsage('chat', model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
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
    const model = this.defaultModel
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: mimeType as 'application/pdf',
                  data: fileBase64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      })

      const content = response.content[0].type === 'text' ? response.content[0].text : ''
      const usage: AIUsageStats = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        model,
        responseTimeMs: Date.now() - start,
      }
      await this.logUsage('document_analysis', model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err: unknown) {
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
    const model = this.defaultModel
    try {
      const response = await this.client.messages.create({
        model,
        max_tokens: 2048,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: imageBase64,
                },
              },
              { type: 'text', text: prompt },
            ],
          },
        ],
      })

      const content = response.content[0].type === 'text' ? response.content[0].text : ''
      const usage: AIUsageStats = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        model,
        responseTimeMs: Date.now() - start,
      }
      await this.logUsage('image_analysis', model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content, usage }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('image_analysis', model, 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }
}
