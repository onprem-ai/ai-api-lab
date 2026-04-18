/**
 * Shared testConnection implementations reused across handlers with the same API format.
 *
 * Each function hits the real configured endpoint — never external status pages.
 * This ensures we test what the user actually pointed at.
 */
import type { TestConnectionParams, TestConnectionResult } from './types';
import { AUTH_BEARER, AUTH_ANTHROPIC, buildAuthHeaders } from './types';

/** Replace sensitive header values with [REDACTED] for display */
function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const redacted = { ...headers };
  for (const key of Object.keys(redacted)) {
    const lower = key.toLowerCase();
    if (lower.includes('auth') || lower.includes('key') || lower.includes('token')) {
      redacted[key] = '[REDACTED]';
    }
  }
  return redacted;
}

/**
 * OpenAI-compatible: GET {baseUrl}/v1/models
 * Readiness probe — confirms the server is up AND a model is loaded.
 * Used by: openai, openai-sync, openai-asr
 * Source: https://github.com/vllm-project/vllm/issues/6073
 */
export async function testOpenaiModelsEndpoint({ apiBaseUrl, apiKey }: TestConnectionParams): Promise<TestConnectionResult> {
  const url = apiBaseUrl.replace(/\/+$/, '') + '/v1/models';
  const requestHeaders: Record<string, string> = buildAuthHeaders(AUTH_BEARER, apiKey);

  try {
    const response = await fetch(url, { method: 'GET', headers: requestHeaders });
    const responseBody = await response.json().catch(() => null);

    return {
      url,
      method: 'GET',
      requestHeaders: redactHeaders(requestHeaders),
      requestBody: null,
      statusCode: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody,
      error: response.ok ? null : `API returned status ${response.status}`,
    };
  } catch (error) {
    return {
      url,
      method: 'GET',
      requestHeaders: redactHeaders(requestHeaders),
      requestBody: null,
      statusCode: null,
      responseHeaders: null,
      responseBody: null,
      error: error instanceof Error ? error.message : 'Network request failed',
    };
  }
}

/**
 * Anthropic: GET {baseUrl}/v1/models
 * Uses x-api-key header + anthropic-version header (not Bearer token).
 * Used by: anthropic, anthropic-sync
 * Source: https://docs.anthropic.com/en/api/models-list
 */
export async function testAnthropicModelsEndpoint({ apiBaseUrl, apiKey }: TestConnectionParams): Promise<TestConnectionResult> {
  const url = apiBaseUrl.replace(/\/+$/, '') + '/v1/models';
  const requestHeaders: Record<string, string> = {
    'anthropic-version': '2023-06-01',
    ...buildAuthHeaders(AUTH_ANTHROPIC, apiKey),
  };

  try {
    const response = await fetch(url, { method: 'GET', headers: requestHeaders });
    const responseBody = await response.json().catch(() => null);

    return {
      url,
      method: 'GET',
      requestHeaders: redactHeaders(requestHeaders),
      requestBody: null,
      statusCode: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody,
      error: response.ok ? null : `API returned status ${response.status}`,
    };
  } catch (error) {
    return {
      url,
      method: 'GET',
      requestHeaders: redactHeaders(requestHeaders),
      requestBody: null,
      statusCode: null,
      responseHeaders: null,
      responseBody: null,
      error: error instanceof Error ? error.message : 'Network request failed',
    };
  }
}

/**
 * PaddleX: GET {baseUrl}/health
 * Liveness probe — 2xx = service is alive. Uses Bearer token auth.
 * Used by: paddleocr
 * Source: https://github.com/PaddlePaddle/PaddleOCR/issues/17667
 */
export async function testPaddleHealthEndpoint({ apiBaseUrl, apiKey }: TestConnectionParams): Promise<TestConnectionResult> {
  const url = apiBaseUrl.replace(/\/+$/, '') + '/health';
  const requestHeaders: Record<string, string> = buildAuthHeaders(AUTH_BEARER, apiKey);

  try {
    const response = await fetch(url, { method: 'GET', headers: requestHeaders });
    // PaddleX /health may return empty body — try JSON, fall back to text
    const contentType = response.headers.get('content-type') || '';
    let responseBody: unknown = null;
    if (contentType.includes('application/json')) {
      responseBody = await response.json().catch(() => null);
    } else {
      const text = await response.text();
      responseBody = text || null;
    }

    return {
      url,
      method: 'GET',
      requestHeaders: redactHeaders(requestHeaders),
      requestBody: null,
      statusCode: response.status,
      responseHeaders: Object.fromEntries(response.headers.entries()),
      responseBody,
      error: response.ok ? null : `API returned status ${response.status}`,
    };
  } catch (error) {
    return {
      url,
      method: 'GET',
      requestHeaders: redactHeaders(requestHeaders),
      requestBody: null,
      statusCode: null,
      responseHeaders: null,
      responseBody: null,
      error: error instanceof Error ? error.message : 'Network request failed',
    };
  }
}
