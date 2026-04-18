/**
 * OpenAI-compatible non-streaming chat completions handler.
 *
 * Endpoint: POST {baseUrl}/chat/completions
 * Spec: https://platform.openai.com/docs/api-reference/chat/create
 *
 * Same as the `openai` handler but with `stream: false`.
 * Returns the full response in one shot — useful for testing latency without streaming overhead.
 */
import type { NonStreamingApiHandler } from '../types';
import { AUTH_BEARER, buildAuthHeaders } from '../types';
import { testOpenaiModelsEndpoint } from '../shared-health-checks';

interface OpenAiChatResponse {
  choices: {
    message: {
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export const openaiSyncHandler: NonStreamingApiHandler = {
  type: 'openai-sync',
  label: 'OpenAI Compatible (Sync)',
  description: 'Non-streaming OpenAI-compatible chat completions API',
  category: 'LLM',
  authConfig: AUTH_BEARER,
  streaming: false,
  ui: {
    requiresImage: false,
    requiresPrompt: true,
    requiresSystemPrompt: true,
    requiresMaxTokens: true,
  },
  testConnection: testOpenaiModelsEndpoint,
  async execute({ imageDataUri, apiBaseUrl, signal, prompt, systemPrompt, model, apiKey, maxTokens }) {
    const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');

    const messages: Array<Record<string, unknown>> = [];

    if (systemPrompt?.trim()) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Build user message: vision format if image is present, plain text otherwise
    if (imageDataUri) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: prompt || '' },
          { type: 'image_url', image_url: { url: imageDataUri } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt || '' });
    }

    const body: Record<string, unknown> = {
      model: model || 'gpt-3.5-turbo',
      messages,
      stream: false,
      temperature: 0,
    };
    if (maxTokens && maxTokens > 0) {
      body.max_tokens = maxTokens;
    }

    // Auth header built from handler's authConfig (Authorization: Bearer {key})
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(AUTH_BEARER, apiKey ?? ''),
    };

    const response = await fetch(`${normalizedBaseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenAI API failed: ${response.status} ${errorText}`);
    }

    const data: OpenAiChatResponse = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('OpenAI API returned no content in response.');
    }

    return content;
  },
};
