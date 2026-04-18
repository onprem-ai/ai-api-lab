// LLM Service Layer for OpenAI-compatible streaming API

import type { AuthConfig } from '@/services/api-handlers/types';
import { AUTH_BEARER, buildAuthHeaders } from '@/services/api-handlers/types';

// Vision content part types (OpenAI format)
export interface TextContentPart {
  type: 'text';
  text: string;
}

export interface ImageUrlContentPart {
  type: 'image_url';
  image_url: { url: string };
}

export type ContentPart = TextContentPart | ImageUrlContentPart;

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentPart[];
}

export interface LLMRequest {
  messages: LLMMessage[];
  model: string;
  stream: boolean;
  max_tokens?: number;
  temperature?: number;
  repetition_penalty?: number;
  stream_options?: {
    include_usage: boolean;
  };
}

export interface LLMUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface LLMResponseChunk {
  choices: {
    delta: {
      content?: string;
    };
    finish_reason?: string;
  }[];
}

export interface LLMResponse {
  usage?: LLMUsage;
}

export interface StreamResult {
  content: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export async function* streamCompletion(
  messages: LLMMessage[],
  model: string,
  apiBaseUrl: string,
  apiKey: string,
  signal?: AbortSignal,
  maxTokens?: number,
  extraBody?: Partial<LLMRequest>,
  authConfig: AuthConfig = AUTH_BEARER,
): AsyncGenerator<string, StreamResult, unknown> {
  // If a signal is provided, use it directly (for external abort control)
  // Otherwise create a local abort controller
  const abortController = signal ? undefined : new AbortController();
  const finalSignal = signal ?? abortController?.signal;

  try {
    const body: LLMRequest = {
      messages,
      model,
      stream: true,
      stream_options: {
        include_usage: true,
      },
      ...extraBody,
    };
    if (maxTokens !== undefined && maxTokens > 0) {
      body.max_tokens = maxTokens;
    }

    // Auth header built from authConfig — no more hardcoded Bearer
    const response = await fetch(`${apiBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...buildAuthHeaders(authConfig, apiKey),
      },
      body: JSON.stringify(body),
      signal: finalSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Create a readable stream from the response
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let buffer = '';
    let done = false;
    let fullContent = '';
    let promptTokens: number | undefined = undefined;
    let completionTokens: number | undefined = undefined;
    let totalTokens: number | undefined = undefined;

    while (!done) {
      const { value, done: doneReading } = await reader.read();
      done = doneReading;

      if (value) {
        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();

          // Skip empty lines or non-data lines
          if (!trimmedLine.startsWith('data: ')) {
            continue;
          }

          // Extract JSON from "data: " prefix
          const dataStr = trimmedLine.slice(6);
          let json;
          try {
            json = JSON.parse(dataStr);
          } catch {
            continue; // Skip non-JSON lines like [DONE]
          }

          // Check if this is a usage response (empty choices with usage)
          // This can come as a separate chunk with only usage, or as part of the final chunk
          // Some APIs return usage in different formats
          if (json.usage) {
            const usage: LLMUsage = json.usage;
            promptTokens = usage.prompt_tokens;
            completionTokens = usage.completion_tokens;
            totalTokens = usage.total_tokens;
            console.log('Usage data captured:', usage);
          } else if (json.choices?.[0]?.delta?.content === null && json.usage) {
            // Some APIs return null content with usage in same chunk
            const usage: LLMUsage = json.usage;
            promptTokens = usage.prompt_tokens;
            completionTokens = usage.completion_tokens;
            totalTokens = usage.total_tokens;
            console.log('Usage data (null content) captured:', usage);
          }
          // Note: If no usage data, we still process the chunk content normally
          // and just don't capture token usage

          const chunk: LLMResponseChunk = json as LLMResponseChunk;

          // Extract content from delta if available
          const content = chunk.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            yield content;
          }

          // Check for finish reason - stream ends here
          // Note: finish_reason comes before usage chunk, so we don't set done=true here
          // We let the loop continue until we process the usage chunk
          if (chunk.choices?.[0]?.finish_reason === 'stop') {
            // Mark that we've seen stop, but continue to process any remaining chunks (like usage)
          }
        }
      }
    }

    // Return the full result including usage
    return {
      content: fullContent,
      promptTokens,
      completionTokens,
      totalTokens,
    };
  } catch (error) {
    // Re-throw AbortError as-is, wrap others
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        content: '',
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
      };
    }
    throw error;
  } finally {
    // Only abort the local controller, not the external one
    abortController?.abort();
  }
}
