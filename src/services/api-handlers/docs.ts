/**
 * Centralized import of all API handler documentation files.
 * Uses Vite's ?raw import to get markdown content as strings.
 *
 * Adding a new handler's docs:
 * 1. Create API.md in the handler's directory
 * 2. Import it here with ?raw suffix
 * 3. Add it to the API_HANDLER_DOCS map
 */

import openaiDoc from './openai/API.md?raw';
import openaiVlDoc from './openai-vl/API.md?raw';
import openaiAsrDoc from './openai-asr/API.md?raw';
import anthropicDoc from './anthropic/API.md?raw';
import anthropicVlDoc from './anthropic-vl/API.md?raw';
import paddleocrDoc from './paddleocr/API.md?raw';
import ltxDoc from './ltx/API.md?raw';

/** Map of handler type → raw markdown content */
export const API_HANDLER_DOCS: Record<string, string> = {
  'openai': openaiDoc,
  'openai-vl': openaiVlDoc,
  'openai-asr': openaiAsrDoc,
  'anthropic': anthropicDoc,
  'anthropic-vl': anthropicVlDoc,
  'paddleocr': paddleocrDoc,
  'ltx': ltxDoc,
};
