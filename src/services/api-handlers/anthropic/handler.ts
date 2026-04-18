/**
 * Anthropic Messages API — streaming handler.
 *
 * Endpoint: POST {baseUrl}/messages
 * Spec: https://docs.anthropic.com/en/api/messages (redirects to platform.claude.com)
 *
 * Uses SSE with event types: message_start, content_block_start,
 * content_block_delta (text_delta), content_block_stop, message_delta, message_stop.
 *
 * Key differences from OpenAI:
 * - `system` is a top-level field, not a message role
 * - `max_tokens` is required
 * - Auth header: `x-api-key` (not `Authorization: Bearer`)
 * - Requires `anthropic-version` header
 * - Image format: { type: "image", source: { type: "base64", media_type, data } }
 * - Response content is an array of blocks, not a single string
 */
import type { StreamingApiHandler } from '../types';
import { AUTH_ANTHROPIC } from '../types';
import { testAnthropicModelsEndpoint } from '../shared-health-checks';

export const anthropicHandler: StreamingApiHandler = {
  type: 'anthropic',
  label: 'Anthropic',
  description: 'Anthropic Messages API with SSE streaming (Claude models)',
  category: 'LLM',
  authConfig: AUTH_ANTHROPIC,
  streaming: true,
  anthropicFormat: true,
  ui: {
    requiresImage: false,
    requiresPrompt: true,
    requiresSystemPrompt: true,
    requiresMaxTokens: true,
  },
  testConnection: testAnthropicModelsEndpoint,
  buildMessages({ prompt, imageDataUri }) {
    // Anthropic uses a different message format:
    // - system prompt is NOT a message, it's a top-level param (handled in the streaming layer)
    // - images use { type: "image", source: { type: "base64", media_type, data } }
    const messages = [];

    if (imageDataUri) {
      // Extract media type and base64 data from data URI
      // Format: data:image/png;base64,iVBOR...
      const mediaTypeMatch = imageDataUri.match(/^data:(image\/[^;]+);base64,/);
      const mediaType = mediaTypeMatch ? mediaTypeMatch[1] : 'image/png';
      const base64Data = imageDataUri.substring(imageDataUri.indexOf(',') + 1);

      messages.push({
        role: 'user' as const,
        content: [
          {
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: mediaType,
              data: base64Data,
            },
          },
          { type: 'text' as const, text: prompt },
        ],
      });
    } else {
      messages.push({ role: 'user' as const, content: prompt });
    }

    return messages;
  },
};
