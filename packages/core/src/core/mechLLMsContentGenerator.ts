/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  GenerateContentParameters,
  GenerateContentResponse,
  CountTokensParameters,
  CountTokensResponse,
  EmbedContentParameters,
  EmbedContentResponse,
  Content,
  Part,
  FinishReason,
} from '@google/genai';
import type { ContentGenerator } from './contentGenerator.js';
import { toContents } from '../code_assist/converter.js';

/**
 * mech-llms API request format (OpenAI-compatible)
 */
interface MechLLMsMessage {
  role: 'system' | 'user' | 'assistant' | 'function' | 'tool';
  content:
    | string
    | Array<{ type: string; text?: string; [key: string]: unknown }>;
  name?: string;
  function_call?: unknown;
  tool_calls?: unknown[];
}

interface MechLLMsRequest {
  model: string;
  messages: MechLLMsMessage[];
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  tools?: unknown[];
  tool_choice?: unknown;
  stream?: boolean;
}

/**
 * mech-llms API response format (OpenAI-compatible)
 */
interface MechLLMsResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
      tool_calls?: unknown[];
    };
    finish_reason: string | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
    reasoning_tokens?: number;
    cached_tokens?: number;
  };
}

/**
 * ContentGenerator implementation that routes requests to mech-llms service
 */
export class MechLLMsContentGenerator implements ContentGenerator {
  constructor(
    private readonly baseUrl: string,
    private readonly apiKey?: string,
  ) {}

  /**
   * Convert Gemini tools to OpenAI tools format
   * Handles various Gemini tool formats and converts to OpenAI-compatible format
   */
  private convertToOpenAITools(tools?: unknown[]): unknown[] | undefined {
    if (!tools || tools.length === 0) {
      return undefined;
    }

    interface FunctionDeclaration {
      name?: string;
      description?: string;
      parametersJsonSchema?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
    }

    const functionDeclarations: FunctionDeclaration[] = [];

    // Extract function declarations from various Gemini formats
    for (const tool of tools) {
      if (typeof tool !== 'object' || tool === null) continue;

      const toolObj = tool as Record<string, unknown>;

      // Handle { functionDeclarations: [...] } format
      if (Array.isArray(toolObj.functionDeclarations)) {
        functionDeclarations.push(...toolObj.functionDeclarations);
      }
      // Handle direct FunctionDeclaration format (has 'name' property)
      else if (toolObj.name) {
        functionDeclarations.push(toolObj);
      }
      // Handle { function: {...} } format (already partially OpenAI-formatted)
      else if (toolObj.function && typeof toolObj.function === 'object') {
        functionDeclarations.push(toolObj.function);
      }
    }

    // Filter out any declarations without a name and convert to OpenAI format
    return functionDeclarations
      .filter((func) => func.name)
      .map((func) => ({
        type: 'function',
        function: {
          name: func.name,
          description: func.description || '',
          // Map Gemini's parametersJsonSchema to OpenAI's parameters
          parameters: func.parametersJsonSchema ||
            func.parameters || {
              type: 'object',
              properties: {},
            },
        },
      }));
  }

  /**
   * Convert Gemini Content[] format to mech-llms messages format
   */
  private convertToMechLLMsMessages(contents: Content[]): MechLLMsMessage[] {
    return contents.map((content) => {
      const role =
        content.role === 'model'
          ? 'assistant'
          : (content.role as 'system' | 'user' | 'assistant');

      // Convert parts array to content string or multipart array
      let messageContent: string | Array<{ type: string; text?: string }>;

      if (content.parts && content.parts.length > 0) {
        // Check if all parts are simple text
        const allText = content.parts.every(
          (part) => typeof part.text === 'string',
        );

        if (allText) {
          // Simple text message
          messageContent = content.parts
            .map((part) => part.text || '')
            .join('\n');
        } else {
          // Multipart message (text, images, etc.)
          messageContent = content.parts.map((part) => {
            if (part.text) {
              return { type: 'text', text: part.text };
            } else if (part.inlineData) {
              return {
                type: 'image',
                image: part.inlineData,
              };
            } else if (part.functionCall) {
              // Handle function calls
              return {
                type: 'function_call',
                function_call: part.functionCall,
              };
            } else if (part.functionResponse) {
              // Handle function responses
              return {
                type: 'function_response',
                function_response: part.functionResponse,
              };
            }
            return { type: 'text', text: '' };
          });
        }
      } else {
        messageContent = '';
      }

      return {
        role,
        content: messageContent,
      };
    });
  }

  /**
   * Convert mech-llms response to Gemini GenerateContentResponse format
   */
  private convertFromMechLLMsResponse(
    response: MechLLMsResponse,
  ): GenerateContentResponse {
    const choice = response.choices[0];
    const content = choice?.message?.content || '';

    // Build parts array
    const parts: Part[] = [];
    if (content) {
      parts.push({ text: content });
    }

    // Add tool calls if present
    if (choice?.message?.tool_calls) {
      for (const toolCall of choice.message.tool_calls) {
        parts.push({
          functionCall: toolCall as unknown,
        });
      }
    }

    // Map finish_reason string to FinishReason type
    let finishReason: FinishReason | undefined;
    if (choice?.finish_reason === 'stop') {
      finishReason = 'STOP' as FinishReason;
    } else if (choice?.finish_reason === 'length') {
      finishReason = 'MAX_TOKENS' as FinishReason;
    } else if (choice?.finish_reason) {
      finishReason = 'OTHER' as FinishReason;
    }

    return {
      candidates: [
        {
          content: {
            parts,
            role: 'model',
          },
          finishReason,
          index: 0,
        },
      ],
      usageMetadata: {
        promptTokenCount: response.usage.prompt_tokens,
        candidatesTokenCount: response.usage.completion_tokens,
        totalTokenCount: response.usage.total_tokens,
      },
      modelVersion: response.model,
    } as GenerateContentResponse;
  }

  async generateContent(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<GenerateContentResponse> {
    const contents = toContents(request.contents);
    const messages = this.convertToMechLLMsMessages(contents);

    // Add system instruction as first message if present
    if (request.config?.systemInstruction) {
      const systemInstruction = request.config.systemInstruction as
        | string
        | { text: string }
        | Content;
      const systemText =
        typeof systemInstruction === 'string'
          ? systemInstruction
          : 'text' in systemInstruction
            ? systemInstruction.text
            : (systemInstruction as Content).parts?.[0]?.text || '';

      messages.unshift({
        role: 'system',
        content: systemText,
      });
    }

    const mechRequest: MechLLMsRequest = {
      model: request.model,
      messages,
      temperature: request.config?.temperature,
      max_tokens: request.config?.maxOutputTokens,
      top_p: request.config?.topP,
      tools: this.convertToOpenAITools(request.config?.tools as unknown[]),
      stream: false,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mechRequest),
      signal: request.config?.abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`mech-llms API error (${response.status}): ${errorText}`);
    }

    const mechResponse: MechLLMsResponse = await response.json();
    return this.convertFromMechLLMsResponse(mechResponse);
  }

  async generateContentStream(
    request: GenerateContentParameters,
    _userPromptId: string,
  ): Promise<AsyncGenerator<GenerateContentResponse>> {
    const contents = toContents(request.contents);
    const messages = this.convertToMechLLMsMessages(contents);

    // Add system instruction
    if (request.config?.systemInstruction) {
      const systemInstruction = request.config.systemInstruction as
        | string
        | { text: string }
        | Content;
      const systemText =
        typeof systemInstruction === 'string'
          ? systemInstruction
          : 'text' in systemInstruction
            ? systemInstruction.text
            : (systemInstruction as Content).parts?.[0]?.text || '';

      messages.unshift({
        role: 'system',
        content: systemText,
      });
    }

    const mechRequest: MechLLMsRequest = {
      model: request.model,
      messages,
      temperature: request.config?.temperature,
      max_tokens: request.config?.maxOutputTokens,
      top_p: request.config?.topP,
      tools: this.convertToOpenAITools(request.config?.tools as unknown[]),
      stream: true,
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(mechRequest),
      signal: request.config?.abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`mech-llms API error (${response.status}): ${errorText}`);
    }

    return this.processStreamResponse(response, request.model);
  }

  private async *processStreamResponse(
    response: Response,
    model: string,
  ): AsyncGenerator<GenerateContentResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let accumulatedText = '';
    let totalUsage: MechLLMsResponse['usage'] | undefined;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim() === '') continue;
          if (line.trim() === 'data: [DONE]') continue;

          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              // Handle errors in stream
              if (data.error) {
                throw new Error(data.error);
              }

              // Extract content delta
              const delta = data.choices?.[0]?.delta;
              if (delta?.content) {
                accumulatedText += delta.content;

                // Yield chunk as GenerateContentResponse
                yield {
                  candidates: [
                    {
                      content: {
                        parts: [{ text: accumulatedText }],
                        role: 'model',
                      },
                      index: 0,
                    },
                  ],
                } as GenerateContentResponse;
              }

              // Capture usage metadata from final chunk
              if (data.usage) {
                totalUsage = data.usage;
              }
            } catch (parseError) {
              console.error('Failed to parse SSE chunk:', parseError);
            }
          }
        }
      }

      // Yield final response with complete metadata
      if (totalUsage) {
        yield {
          candidates: [
            {
              content: {
                parts: [{ text: accumulatedText }],
                role: 'model',
              },
              finishReason: 'STOP',
              index: 0,
            },
          ],
          usageMetadata: {
            promptTokenCount: totalUsage.prompt_tokens,
            candidatesTokenCount: totalUsage.completion_tokens,
            totalTokenCount: totalUsage.total_tokens,
          },
          modelVersion: model,
        } as GenerateContentResponse;
      }
    } finally {
      reader.releaseLock();
    }
  }

  async countTokens(
    request: CountTokensParameters,
  ): Promise<CountTokensResponse> {
    // mech-llms doesn't have a token counting endpoint
    // Estimate using simple heuristic: ~4 characters per token
    const contents = toContents(request.contents);

    const textLength = contents
      .flatMap((content) => content.parts || [])
      .map((part) => part.text || '')
      .join('').length;

    const estimatedTokens = Math.ceil(textLength / 4);

    return {
      totalTokens: estimatedTokens,
    };
  }

  async embedContent(
    _request: EmbedContentParameters,
  ): Promise<EmbedContentResponse> {
    // mech-llms doesn't currently support embeddings
    // For now, throw an error - this can be implemented later if needed
    throw new Error(
      'Embedding generation not supported by mech-llms. Use Gemini API for embeddings.',
    );
  }
}
