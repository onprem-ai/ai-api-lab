import type { LLMMessage, LLMRequest } from '@/services/llmService';

/**
 * Declares which UI input fields a handler needs.
 * Consumer pages read these flags to show/hide form fields dynamically.
 */
export interface ApiHandlerUiRequirements {
  requiresImage: boolean;
  requiresPrompt: boolean;
  requiresSystemPrompt: boolean;
  requiresMaxTokens: boolean;
  /** Handler needs an audio file upload (e.g. ASR/transcription) */
  requiresAudioFile?: boolean;
}

/**
 * Describes how a handler authenticates with its API.
 * Each handler declares its auth config; pages and shared utilities
 * use `buildAuthHeaders()` to produce the correct header from a raw key.
 */
export interface AuthConfig {
  /** HTTP header name (e.g. 'Authorization', 'x-api-key', 'x-key') */
  headerName: string;
  /** Value prefix prepended to the raw key (e.g. 'Bearer ', or '' for raw key) */
  valuePrefix: string;
}

/** OpenAI-compatible: Authorization: Bearer {key} */
export const AUTH_BEARER: AuthConfig = { headerName: 'Authorization', valuePrefix: 'Bearer ' };
/** Anthropic: x-api-key: {key} (no prefix) */
export const AUTH_ANTHROPIC: AuthConfig = { headerName: 'x-api-key', valuePrefix: '' };
/** Black Forest Labs: x-key: {key} (no prefix) */
export const AUTH_BFL: AuthConfig = { headerName: 'x-key', valuePrefix: '' };

/**
 * Builds the auth header dict from an AuthConfig and a raw API key.
 * Returns empty object if apiKey is falsy (no auth needed).
 */
export function buildAuthHeaders(authConfig: AuthConfig, apiKey: string): Record<string, string> {
  if (!apiKey) return {};
  return { [authConfig.headerName]: `${authConfig.valuePrefix}${apiKey}` };
}

/**
 * Common execution params passed to all non-streaming handlers.
 * Each handler uses only the params it needs.
 */
export interface ApiHandlerExecuteParams {
  apiBaseUrl: string;
  signal?: AbortSignal;
  /** Raw API key — handler uses its own authConfig to build the correct header */
  apiKey?: string;
  /** Model identifier — some handlers use it, some ignore it */
  model?: string;
  /** User prompt text */
  prompt?: string;
  /** System prompt text */
  systemPrompt?: string;
  /** Max tokens for generation */
  maxTokens?: number;
  /** Image as data URI (for vision/OCR handlers) */
  imageDataUri?: string;
  /** Audio file blob (for ASR handlers) */
  audioFile?: File;
  /** Language hint (ISO 639-1, for ASR handlers) */
  language?: string;
}

/**
 * Params passed to a handler's testConnection function.
 * The handler decides which endpoint to hit and how to authenticate.
 */
export interface TestConnectionParams {
  /** Base URL configured by the user (e.g. "http://localhost:38471", "https://api.anthropic.com/v1") */
  apiBaseUrl: string;
  /** API key from the store (raw value, handler decides how to use it) */
  apiKey: string;
}

/**
 * Result returned by a handler's testConnection function.
 * Captures full request/response details for debugging on the config page.
 */
export interface TestConnectionResult {
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: unknown | null;
  statusCode: number | null;
  responseHeaders: Record<string, string> | null;
  responseBody: unknown | null;
  /** null = success, string = error message */
  error: string | null;
}

/**
 * Common metadata shared by all handler types.
 */
interface ApiHandlerBase {
  /** Unique handler identifier — matches directory name and ApiType enum */
  type: string;
  label: string;
  description: string;
  /** Category for grouping in UI (e.g. "LLM", "OCR", "ASR", "Image Gen", "Video Gen") */
  category: string;
  /** Auth config — determines which HTTP header and value format to use for API key */
  authConfig: AuthConfig;
  ui: ApiHandlerUiRequirements;
  /**
   * Tests connectivity to this handler's API endpoint.
   * Each handler owns its test logic — correct endpoint, auth headers, response validation.
   * If omitted, no health check is available for this handler.
   */
  testConnection?: (params: TestConnectionParams) => Promise<TestConnectionResult>;
}

/**
 * Streaming handler — delegates to a streaming layer (useLLMStream or Anthropic SSE).
 * Only needs to build the message array; the streaming hook handles the rest.
 */
export interface StreamingApiHandler extends ApiHandlerBase {
  streaming: true;
  /**
   * When true, the streaming layer should use Anthropic SSE format instead of OpenAI SSE.
   * This affects: endpoint path (/messages vs /chat/completions), headers (x-api-key vs Authorization),
   * request body (system as top-level field), and SSE event parsing (content_block_delta vs choices delta).
   */
  anthropicFormat?: boolean;
  buildMessages: (params: {
    prompt: string;
    systemPrompt: string;
    imageDataUri: string | null;
  }) => LLMMessage[];
  /** Extra body fields merged into the LLM request (e.g. temperature) */
  extraBody?: Partial<LLMRequest>;
}

/**
 * Non-streaming handler — makes a single request and returns the full text result.
 */
export interface NonStreamingApiHandler extends ApiHandlerBase {
  streaming: false;
  execute: (params: ApiHandlerExecuteParams) => Promise<string>;
}

export type ApiHandler = StreamingApiHandler | NonStreamingApiHandler;
