/**
 * Black Forest Labs (BFL) FLUX image generation handler.
 *
 * Spec: https://docs.bfl.ml/flux_2/flux2_text_to_image
 * Integration guide: https://docs.bfl.ml/api_integration/integration_guidelines
 *
 * Async 2-step API:
 * 1. POST https://api.bfl.ai/v1/{model-endpoint} → { id, polling_url }
 * 2. GET {polling_url} → poll until { status: "Ready", result: { sample: "image-url" } }
 *
 * Auth: `x-key` header (not Bearer token)
 * Note: result.sample URLs expire after 10 minutes and have no CORS — must be fetched server-side
 *       or proxied. For our lab/testing purposes we return the URL directly.
 *
 * Available models:
 * - flux-2-klein-4b (fastest, sub-second)
 * - flux-2-klein-9b-preview (speed/quality balance)
 * - flux-2-pro-preview (production quality)
 * - flux-2-max (highest quality)
 * - flux-2-flex (adjustable steps/guidance)
 */
import type { NonStreamingApiHandler } from '../types';
import { AUTH_BFL, buildAuthHeaders } from '../types';

interface BflSubmitResponse {
  id: string;
  polling_url: string;
  cost: number;
}

interface BflPollResponse {
  status: 'Ready' | 'Error' | 'Failed' | 'Pending' | 'Processing';
  result?: {
    sample: string; // URL to generated image (expires in 10 min)
  };
}

const BFL_DEFAULT_BASE_URL = 'https://api.bfl.ai/v1';
const BFL_POLL_INTERVAL_MS = 1000;
const BFL_MAX_POLL_ATTEMPTS = 120; // 2 minutes max

export const bflHandler: NonStreamingApiHandler = {
  type: 'bfl',
  label: 'BFL FLUX',
  description: 'Black Forest Labs FLUX text-to-image generation (async polling)',
  category: 'Image Gen',
  authConfig: AUTH_BFL,
  streaming: false,
  ui: {
    requiresImage: false,
    requiresPrompt: true,
    requiresSystemPrompt: false,
    requiresMaxTokens: false,
  },
  async execute({ apiBaseUrl, signal, prompt, apiKey, model }) {
    const baseUrl = (apiBaseUrl || BFL_DEFAULT_BASE_URL).replace(/\/+$/, '');
    // Model determines the endpoint path (e.g. "flux-2-pro-preview")
    const modelEndpoint = model || 'flux-2-pro-preview';

    // --- Step 1: Submit generation request ---
    // Auth header built from handler's authConfig (x-key: {key})
    const submitHeaders: Record<string, string> = {
      'accept': 'application/json',
      'Content-Type': 'application/json',
      ...buildAuthHeaders(AUTH_BFL, apiKey ?? ''),
    };

    const submitBody: Record<string, unknown> = {
      prompt: prompt || '',
      width: 1024,
      height: 1024,
    };

    const submitResponse = await fetch(`${baseUrl}/${modelEndpoint}`, {
      method: 'POST',
      headers: submitHeaders,
      body: JSON.stringify(submitBody),
      signal,
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`BFL API submit failed: ${submitResponse.status} ${errorText}`);
    }

    const submitData: BflSubmitResponse = await submitResponse.json();

    if (!submitData.polling_url) {
      throw new Error('BFL API did not return a polling URL.');
    }

    // --- Step 2: Poll for result ---
    const pollHeaders: Record<string, string> = {
      'accept': 'application/json',
      ...buildAuthHeaders(AUTH_BFL, apiKey ?? ''),
    };

    for (let attempt = 0; attempt < BFL_MAX_POLL_ATTEMPTS; attempt++) {
      // Check if cancelled
      if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }

      await new Promise((resolve) => setTimeout(resolve, BFL_POLL_INTERVAL_MS));

      const pollResponse = await fetch(submitData.polling_url, {
        method: 'GET',
        headers: pollHeaders,
        signal,
      });

      if (!pollResponse.ok) {
        const errorText = await pollResponse.text();
        throw new Error(`BFL polling failed: ${pollResponse.status} ${errorText}`);
      }

      const pollData: BflPollResponse = await pollResponse.json();

      if (pollData.status === 'Ready') {
        const imageUrl = pollData.result?.sample;
        if (!imageUrl) {
          throw new Error('BFL returned Ready status but no image URL.');
        }
        // Return the image URL — the consuming page can display it as an <img>
        // Note: URL expires in 10 minutes, no CORS (see API.md)
        return imageUrl;
      }

      if (pollData.status === 'Error' || pollData.status === 'Failed') {
        throw new Error(`BFL image generation failed with status: ${pollData.status}`);
      }

      // Still processing — continue polling
    }

    throw new Error(`BFL image generation timed out after ${BFL_MAX_POLL_ATTEMPTS} poll attempts.`);
  },
};
