// ============================================================
// PROVIDER ABSTRACTION INTERFACES
// Every provider must implement one of these interfaces.
// Application code NEVER imports vendor SDKs directly.
// ============================================================

export interface DatabaseProvider {
  query(table: string, filters?: Record<string, unknown>): Promise<unknown[]>
  findOne(table: string, id: string): Promise<unknown | null>
  insert(table: string, data: Partial<Record<string, unknown>>): Promise<unknown>
  update(table: string, id: string, data: Partial<Record<string, unknown>>): Promise<unknown>
  delete(table: string, id: string): Promise<void>
  rpc(functionName: string, params?: Record<string, unknown>): Promise<unknown>
}

export interface StorageProvider {
  upload(
    bucket: string,
    path: string,
    file: Buffer | Blob,
    options?: { contentType?: string }
  ): Promise<{ path: string; url: string }>
  getSignedUrl(bucket: string, path: string, expiresIn?: number): Promise<string>
  delete(bucket: string, path: string): Promise<void>
  list(bucket: string, prefix?: string): Promise<{ name: string; size: number }[]>
}

export interface EmailProvider {
  send(options: {
    to: string
    subject: string
    html: string
    from?: string
  }): Promise<{ id: string }>
  sendTemplate(
    template: string,
    to: string,
    variables: Record<string, unknown>
  ): Promise<{ id: string }>
}

export interface AIMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

export interface AIUsageStats {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  model: string
  responseTimeMs: number
}

export interface AIProvider {
  chat(
    messages: AIMessage[],
    systemPrompt?: string,
    options?: { stream?: boolean; maxTokens?: number; temperature?: number }
  ): Promise<{ content: string; usage: AIUsageStats }>
  analyseDocument(
    fileBase64: string,
    mimeType: string,
    prompt: string
  ): Promise<{ content: string; usage: AIUsageStats }>
  analyseImage(
    imageBase64: string,
    prompt: string
  ): Promise<{ content: string; usage: AIUsageStats }>
}

export interface AuthProvider {
  signUp(
    email: string,
    password: string,
    metadata?: Record<string, unknown>
  ): Promise<{ userId: string }>
  signIn(
    email: string,
    password: string
  ): Promise<{ token: string; userId: string }>
  signOut(): Promise<void>
  getUser(): Promise<{ id: string; email: string } | null>
  resetPassword(email: string): Promise<void>
}
