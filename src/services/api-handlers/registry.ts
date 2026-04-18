import type { ApiHandler } from './types';
import { openaiCompatibleHandler } from './openai/handler';
import { openaiVisionHandler } from './openai-vl/handler';
import { openaiAsrHandler } from './openai-asr/handler';
import { anthropicHandler } from './anthropic/handler';
import { anthropicVisionHandler } from './anthropic-vl/handler';
import { layoutParsingHandler } from './paddleocr/handler';
import { bflHandler } from './bfl/handler';
import { ltxHandler } from './ltx/handler';

// ---------------------------------------------------------------------------
// Handler Registry
// ---------------------------------------------------------------------------

const HANDLER_MAP = new Map<string, ApiHandler>();

function registerHandler(handler: ApiHandler) {
  HANDLER_MAP.set(handler.type, handler);
}

// Register all handlers
registerHandler(openaiCompatibleHandler);
registerHandler(openaiVisionHandler);
registerHandler(openaiAsrHandler);
registerHandler(anthropicHandler);
registerHandler(anthropicVisionHandler);
registerHandler(layoutParsingHandler);
registerHandler(bflHandler);
registerHandler(ltxHandler);

/** Get a handler by its type identifier. */
export function getApiHandler(handlerType: string): ApiHandler | undefined {
  return HANDLER_MAP.get(handlerType);
}

/** Get all registered handlers. */
export function getAllHandlers(): ApiHandler[] {
  return Array.from(HANDLER_MAP.values());
}

// ---------------------------------------------------------------------------
// Model-to-Handler Config (separate from handler definitions)
//
// Each entry maps a model name pattern to the handler types it supports.
// Order matters: first match wins. The first handler in the list is the default.
// Models that don't match any pattern fall back to DEFAULT_HANDLER_TYPE.
//
// See docs/adr/001-api-type-system.md for naming conventions.
// ---------------------------------------------------------------------------

interface ModelHandlerMapping {
  /** Regex tested against the model name (case-insensitive) */
  modelPattern: RegExp;
  /** Handler types this model supports, in priority order (first = default) */
  handlerTypes: string[];
}

const MODEL_HANDLER_CONFIG: ModelHandlerMapping[] = [
  // PaddleOCR / PaddleX models → layout parsing + openai-vl fallback
  {
    modelPattern: /paddle|pp-|PP-/i,
    handlerTypes: ['paddleocr', 'openai-vl'],
  },
  // Anthropic Claude models → anthropic + anthropic-vl
  {
    modelPattern: /claude/i,
    handlerTypes: ['anthropic', 'anthropic-vl'],
  },
  // ASR / transcription models (Cohere Transcribe, Whisper) → openai-asr
  {
    modelPattern: /whisper|transcribe|asr/i,
    handlerTypes: ['openai-asr', 'openai'],
  },
  // FLUX image generation models → bfl
  {
    modelPattern: /flux/i,
    handlerTypes: ['bfl'],
  },
  // LTX video generation models → ltx
  {
    modelPattern: /ltx/i,
    handlerTypes: ['ltx'],
  },
  // Add more mappings here as new handlers/models are added
];

const DEFAULT_HANDLER_TYPE = 'openai';

/**
 * Get all handlers available for a given model name.
 * Returns handlers in priority order (first = suggested default).
 * Always includes at least the fallback handler.
 *
 * @param fallbackType — handler type to use when no model pattern matches (default: 'openai')
 */
export function getHandlersForModel(modelName: string, fallbackType?: string): ApiHandler[] {
  for (const mapping of MODEL_HANDLER_CONFIG) {
    if (mapping.modelPattern.test(modelName)) {
      const handlers = mapping.handlerTypes
        .map((type) => HANDLER_MAP.get(type))
        .filter((handler): handler is ApiHandler => handler !== undefined);

      if (handlers.length > 0) {
        return handlers;
      }
    }
  }

  // Fallback: return specified fallback or default handler
  const fallback = HANDLER_MAP.get(fallbackType ?? DEFAULT_HANDLER_TYPE);
  return fallback ? [fallback] : [];
}

/**
 * Get the default (first priority) handler type for a given model name.
 *
 * @param fallbackType — handler type to use when no model pattern matches (default: 'openai')
 */
export function getDefaultHandlerType(modelName: string, fallbackType?: string): string {
  const handlers = getHandlersForModel(modelName, fallbackType);
  return handlers.length > 0 ? handlers[0].type : (fallbackType ?? DEFAULT_HANDLER_TYPE);
}
