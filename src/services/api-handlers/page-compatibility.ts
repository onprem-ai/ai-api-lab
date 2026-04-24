/**
 * Centralized page compatibility map.
 *
 * Defines which API handler types support which application pages.
 * Used by the shared ApiTypeWarning component to show/hide warnings.
 *
 * Page IDs match route paths (without leading slash):
 *   "llm"        → /llm
 *   "llm-vl"     → /llm-vl
 *   "paddle-ocr" → /paddle-ocr
 *   "asr"        → /asr
 */

/** All known page IDs in the application */
export type PageId = 'llm' | 'llm-vl' | 'paddle-ocr' | 'asr';

/**
 * Maps each handler type to the set of pages it supports.
 * If a handler type is not listed here, it supports no pages.
 */
const HANDLER_SUPPORTED_PAGES: Record<string, PageId[]> = {
  'openai':        ['llm'],
  'openai-vl':     ['llm-vl'],
  'openai-asr':    ['asr'],
  'anthropic':     ['llm'],
  'anthropic-vl':  ['llm-vl'],
  'paddleocr':     ['paddle-ocr'],
  'bfl':           [],
  'ltx':           [],
};

/** Map page IDs to their route paths */
export const PAGE_ROUTES: Record<PageId, string> = {
  'llm':        '/llm',
  'llm-vl':     '/llm-vl',
  'paddle-ocr': '/paddle-ocr',
  'asr':        '/asr',
};

/** Human-readable page labels for warning messages */
export const PAGE_LABELS: Record<PageId, string> = {
  'llm':        'LLM',
  'llm-vl':     'LLM-VL',
  'paddle-ocr': 'Paddle OCR',
  'asr':        'ASR',
};

/**
 * Check whether a given API type supports a specific page.
 * Returns true if the handler type is known and lists the page,
 * or if no API type is selected (empty string = no restriction).
 */
export function isPageSupportedByApiType(pageId: PageId, apiType: string): boolean {
  // No API type selected → no restriction, all pages accessible without warning
  if (!apiType) return true;

  const supportedPages = HANDLER_SUPPORTED_PAGES[apiType];
  if (!supportedPages) return false;

  return supportedPages.includes(pageId);
}

/**
 * Get all pages supported by a given API type.
 */
export function getSupportedPages(apiType: string): PageId[] {
  if (!apiType) return [];
  return HANDLER_SUPPORTED_PAGES[apiType] ?? [];
}

/**
 * Get all handler types that support a given page.
 */
export function getSupportedHandlerTypes(pageId: PageId): string[] {
  return Object.entries(HANDLER_SUPPORTED_PAGES)
    .filter(([, pages]) => pages.includes(pageId))
    .map(([handlerType]) => handlerType);
}
