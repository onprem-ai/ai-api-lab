/**
 * Anthropic Messages API — non-streaming handler.
 *
 * Endpoint: POST {baseUrl}/messages
 * Spec: https://docs.anthropic.com/en/api/messages
 *
 * Same as the `anthropic` streaming handler but with `stream: false`.
 * Returns the full response in one shot.
 *
 * Key differences from OpenAI format:
 * - `system` is a top-level field, not a message role
 * - `max_tokens` is required
 * - Auth: `x-api-key` header (not Bearer token)
 * - Requires `anthropic-version: 2023-06-01` header
 * - Response: { content: [{ type: "text", text: "..." }], usage: { input_tokens, output_tokens } }
 */
import type { NonStreamingApiHandler } from '../types';
import { AUTH_ANTHROPIC, buildAuthHeaders } from '../types';
import { testAnthropicModelsEndpoint } from '../shared-health-checks';

interface AnthropicMessageResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export const anthropicSyncHandler: NonStreamingApiHandler = {
  type: 'anthropic-sync',
  label: 'Anthropic (Sync)',
  description: 'Non-streaming Anthropic Messages API (Claude models)',
  category: 'LLM',
  authConfig: AUTH_ANTHROPIC,
  streaming: false,
  ui: {
    requiresImage: false,
    requiresPrompt: true,
    requiresSystemPrompt: true,
    requiresMaxTokens: true,
  },
  testConnection: testAnthropicModelsEndpoint,
  async execute({ imageDataUri, apiBaseUrl, signal, prompt, systemPrompt, model, apiKey, maxTokens }) {
    const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');

    const messages: Array<Record<string, unknown>> = [];

    // Anthropic image format differs from OpenAI
    if (imageDataUri) {
      const mediaTypeMatch = imageDataUri.match(/^data:(image\/[^;]+);base64,/);
      const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/png';
      const base64Data = imageDataUri.substring(imageDataUri.indexOf(',') + 1);

      messages.push({
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mediaType,
              data: base64Data,
            },
          },
          { type: 'text', text: prompt || '' },
        ],
      });
    } else {
      messages.push({ role: 'user', content: prompt || '' });
    }

    const body: Record<string, unknown> = {
      model: model || 'claude-sonnet-4-6',
      messages,
      max_tokens: maxTokens || 4096,
      stream: false,
    };

    // Anthropic: system prompt is a top-level field, not a message
    if (systemPrompt?.trim()) {
      body.system = systemPrompt;
    }

    // Auth header built from handler's authConfig (x-api-key: {key})
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      ...buildAuthHeaders(AUTH_ANTHROPIC, apiKey ?? ''),
    };

    const response = await fetch(`${normalizedBaseUrl}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Anthropic API failed: ${response.status} ${errorText}`);
    }

    const data: AnthropicMessageResponse = await response.json();

    // Extract text from content blocks
    const textContent = data.content
      ?.filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    if (!textContent) {
      throw new Error('Anthropic API returned no text content.');
    }

    return textContent;
  },
};
