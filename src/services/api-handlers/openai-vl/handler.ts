/**
 * OpenAI-compatible Vision Language handler.
 *
 * Extends the base OpenAI streaming handler with vision-specific metadata.
 * The underlying buildMessages and streaming logic are identical — the base
 * handler already supports the multi-part content format for images.
 */
import { openaiCompatibleHandler } from '../openai/handler';
import type { StreamingApiHandler } from '../types';

export const openaiVisionHandler: StreamingApiHandler = {
  ...openaiCompatibleHandler,
  type: 'openai-vl',
  label: 'OpenAI VL',
  description: 'OpenAI-compatible vision-language API (text + image input)',
  category: 'Vision',
  ui: {
    ...openaiCompatibleHandler.ui,
    requiresImage: false, // images are optional — model handles text-only too
  },
};
