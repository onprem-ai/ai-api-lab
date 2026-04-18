/**
 * Anthropic Vision Language handler.
 *
 * Extends the base Anthropic streaming handler with vision-specific metadata.
 * The underlying buildMessages and streaming logic are identical — the base
 * handler already supports the Anthropic image content block format.
 */
import { anthropicHandler } from '../anthropic/handler';
import type { StreamingApiHandler } from '../types';

export const anthropicVisionHandler: StreamingApiHandler = {
  ...anthropicHandler,
  type: 'anthropic-vl',
  label: 'Anthropic VL',
  description: 'Anthropic vision-language API (text + image input)',
  category: 'Vision',
  ui: {
    ...anthropicHandler.ui,
    requiresImage: false,
  },
};
