import type { AIProvider, AIMessage, AIUsageStats } from '../interfaces'

/**
 * Multi-model AI provider with automatic waterfall fallback.
 *
 * Chain (in order — all verified free on OpenRouter as of April 2025):
 *  1. openrouter/free          — OpenRouter's own free router (auto-picks best available)
 *  2. google/gemma-3-27b-it:free
 *  3. openai/gpt-oss-120b:free
 *  4. nvidia/nemotron-3-super:free (renamed from previous)
 *  5. meta-llama/llama-3.1-8b-instruct:free
 *  6. mistralai/mistral-7b-instruct:free
 *
 * If a model fails (404/429/5xx/timeout) the next one is tried immediately.
 */

const MODELS = [
  'openrouter/auto',                         // OpenRouter's smart auto-router (free tier)
  'google/gemma-3-27b-it:free',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'qwen/qwen-2-7b-instruct:free',
]

export class OpenRouterAIProvider implements AIProvider {

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
        user_id: userId ?? null, feature, model,
        input_tokens: inputTokens, output_tokens: outputTokens,
        total_tokens: inputTokens + outputTokens,
        response_time_ms: responseTimeMs, status,
        error_message: errorMessage ?? null,
      })
    } catch {
      // non-critical
    }
  }

  /** Single model call. Returns null to signal "try next model", throws for hard failures. */
  private async tryModel(
    messages: object[],
    model: string,
    maxTokens: number
  ): Promise<{ content: string; usage: any; model: string } | null> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY not configured')

    // Manual timeout via Promise.race (AbortSignal.timeout has Node version issues)
    const fetchPromise = fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
        'X-Title': 'Slyceai Health',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    })

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('timeout')), 20000)
    )

    let response: Response
    try {
      response = await Promise.race([fetchPromise, timeoutPromise])
    } catch (err) {
      console.warn(`[AI] ${model} — network/timeout, trying next…`)
      return null
    }

    if (!response.ok) {
      if (response.status === 401) {
        const txt = await response.text()
        throw new Error(`OpenRouter auth error (401): ${txt}`)
      }
      const errBody = await response.text()
      console.warn(`[AI] ${model} returned ${response.status}: ${errBody.slice(0, 120)}, trying next…`)
      return null
    }

    const data = await response.json()
    const content: string = data.choices?.[0]?.message?.content?.trim() ?? ''
    if (!content) {
      console.warn(`[AI] ${model} returned empty content, trying next…`)
      return null
    }

    return { content, usage: data.usage ?? {}, model }
  }

  private async callWithFallback(
    messages: object[],
    maxTokens = 2048
  ): Promise<{ content: string; usage: any; model: string }> {
    let lastErr = ''
    for (const model of MODELS) {
      const result = await this.tryModel(messages, model, maxTokens)
      if (result) return result
    }
    throw new Error(`All AI models are currently unavailable. Last error: ${lastErr}`)
  }

  async chat(
    messages: AIMessage[],
    systemPrompt?: string,
    options?: { stream?: boolean; maxTokens?: number; temperature?: number }
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const start = Date.now()
    const formatted: object[] = []
    if (systemPrompt) formatted.push({ role: 'system', content: systemPrompt })
    formatted.push(...messages)

    try {
      const result = await this.callWithFallback(formatted, options?.maxTokens)
      const usage: AIUsageStats = {
        inputTokens: result.usage?.prompt_tokens ?? 0,
        outputTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0,
        model: result.model,
        responseTimeMs: Date.now() - start,
      }
      await this.logUsage('chat', result.model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content: result.content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('chat', 'fallback-chain', 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }

  async analyseDocument(
    fileBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const start = Date.now()
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${fileBase64}` } },
      ],
    }]

    try {
      const result = await this.callWithFallback(messages, 4096)
      const usage: AIUsageStats = {
        inputTokens: result.usage?.prompt_tokens ?? 0,
        outputTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0,
        model: result.model,
        responseTimeMs: Date.now() - start,
      }
      await this.logUsage('document_analysis', result.model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content: result.content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('document_analysis', 'fallback-chain', 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }

  async analyseImage(
    imageBase64: string,
    prompt: string
  ): Promise<{ content: string; usage: AIUsageStats }> {
    const start = Date.now()
    const messages = [{
      role: 'user',
      content: [
        { type: 'text', text: prompt },
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
      ],
    }]

    try {
      const result = await this.callWithFallback(messages, 2048)
      const usage: AIUsageStats = {
        inputTokens: result.usage?.prompt_tokens ?? 0,
        outputTokens: result.usage?.completion_tokens ?? 0,
        totalTokens: result.usage?.total_tokens ?? 0,
        model: result.model,
        responseTimeMs: Date.now() - start,
      }
      await this.logUsage('image_analysis', result.model, usage.inputTokens, usage.outputTokens, usage.responseTimeMs)
      return { content: result.content, usage }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      await this.logUsage('image_analysis', 'fallback-chain', 0, 0, Date.now() - start, undefined, 'error', msg)
      throw err
    }
  }
}
