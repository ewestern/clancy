import OpenAI from 'openai';
import type { LLMProvider, LLMCompletionRequest, LLMCompletionResponse } from '../../types/llm.js';

export class OpenAIProvider implements LLMProvider {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({
      apiKey,
    });
  }

  async createCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    try {
      const requestParams: any = {
        model: request.model,
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      };

      if (request.temperature !== undefined) {
        requestParams.temperature = request.temperature;
      }
      if (request.maxTokens !== undefined) {
        requestParams.max_tokens = request.maxTokens;
      }

      const response = await this.client.chat.completions.create(requestParams);

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new Error('No response content from OpenAI');
      }

      const result: LLMCompletionResponse = {
        content: choice.message.content,
      };

      if (response.usage) {
        result.usage = {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        };
      }

      return result;
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  getProviderName(): string {
    return 'openai';
  }
} 