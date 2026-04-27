/**
 * OpenAI-compatible image generation handler.
 *
 * Spec: https://platform.openai.com/docs/api-reference/images/create
 * Endpoint: POST /v1/images/generations
 *
 * Works with any server implementing the OpenAI Images API:
 * - Our custom diffusers-based servers (FLUX.2, Z-Image-Turbo)
 * - OpenAI API directly
 * - Any compatible proxy
 *
 * Returns a data URI string that can be used directly as <img src>.
 * When the API returns b64_json, it's wrapped as "data:image/png;base64,...".
 * When the API returns a URL, it's returned as-is.
 */
import type { NonStreamingApiHandler, TestConnectionParams, TestConnectionResult } from '../types';
import { AUTH_BEARER, buildAuthHeaders } from '../types';
import { testPaddleHealthEndpoint } from '../shared-health-checks';

interface OpenAIImageResponse {
  created: number;
  data: Array<{
    b64_json?: string;
    url?: string;
    revised_prompt?: string;
  }>;
}

export const openaiImageHandler: NonStreamingApiHandler = {
  type: 'openai-image',
  label: 'OpenAI Image',
  description: 'OpenAI-compatible text-to-image generation (/v1/images/generations)',
  category: 'Image Gen',
  authConfig: AUTH_BEARER,
  streaming: false,
  ui: {
    requiresImage: false,
    requiresPrompt: true,
    requiresSystemPrompt: false,
    requiresMaxTokens: false,
  },

  async testConnection(params: TestConnectionParams): Promise<TestConnectionResult> {
    return testPaddleHealthEndpoint(params);
  },

  async execute({ apiBaseUrl, signal, prompt, apiKey, model }) {
    const baseUrl = (apiBaseUrl || 'http://localhost:8000').replace(/\/+$/, '');

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(AUTH_BEARER, apiKey ?? ''),
    };

    const body: Record<string, unknown> = {
      prompt: prompt || '',
      n: 1,
      size: '1024x1024',
      response_format: 'b64_json',
    };
    if (model) {
      body.model = model;
    }

    const response = await fetch(`${baseUrl}/v1/images/generations`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image generation failed: ${response.status} ${errorText}`);
    }

    const data: OpenAIImageResponse = await response.json();

    if (!data.data || data.data.length === 0) {
      throw new Error('API returned no image data.');
    }

    const imageData = data.data[0];

    if (imageData.b64_json) {
      return `data:image/png;base64,${imageData.b64_json}`;
    }

    if (imageData.url) {
      return imageData.url;
    }

    throw new Error('API response contains neither b64_json nor url.');
  },
};
