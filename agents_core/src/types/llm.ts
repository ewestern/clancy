export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMCompletionRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
}

export interface LLMCompletionResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMProvider {
  /**
   * Generate a chat completion response
   */
  createCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse>;
  
  /**
   * Get the provider name
   */
  getProviderName(): string;
} 