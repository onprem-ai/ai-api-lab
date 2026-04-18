import type { NonStreamingApiHandler } from '../types';
import { AUTH_BEARER, buildAuthHeaders } from '../types';
import { testPaddleHealthEndpoint } from '../shared-health-checks';

// --- Layout Parsing API response types ---

export interface LayoutParsingBlock {
  block_label: string;
  block_content: string;
  block_bbox: number[];
  block_id: number;
  block_order: number | null;
  block_polygon_points: number[][];
}

export interface LayoutParsingResult {
  prunedResult: {
    width: number;
    height: number;
    parsing_res_list: LayoutParsingBlock[];
  };
  markdown: {
    text: string;
    images: Record<string, string>;
  };
  outputImages: {
    layout_det_res: string;
  };
}

export interface LayoutParsingResponse {
  logId: string;
  result: {
    layoutParsingResults: LayoutParsingResult[];
  };
}

// --- Helpers ---

/** Extract raw base64 string from a data URI (strips the `data:...;base64,` prefix). */
function dataUriToBase64(dataUri: string): string {
  const commaIndex = dataUri.indexOf(',');
  if (commaIndex === -1) {
    throw new Error('Invalid data URI: missing comma separator');
  }
  return dataUri.substring(commaIndex + 1);
}

/** Extract concatenated markdown text from all parsing results. */
function extractMarkdownFromResponse(response: LayoutParsingResponse): string {
  const results = response.result?.layoutParsingResults;
  if (!results || results.length === 0) {
    return '';
  }
  return results
    .map((result) => result.markdown?.text ?? '')
    .filter((text) => text.length > 0)
    .join('\n\n');
}

// --- Handler ---

export const layoutParsingHandler: NonStreamingApiHandler = {
  type: 'paddleocr',
  label: 'Paddle OCR',
  description: 'PaddleX document layout parsing API (base64 image POST)',
  category: 'OCR',
  streaming: false,
  authConfig: AUTH_BEARER,
  ui: {
    requiresImage: true,
    requiresPrompt: false,
    requiresSystemPrompt: false,
    requiresMaxTokens: false,
  },
  testConnection: testPaddleHealthEndpoint,
  async execute({ imageDataUri, apiBaseUrl, signal, apiKey }) {
    if (!imageDataUri) {
      throw new Error('PaddleOCR requires an image.');
    }
    const base64Image = dataUriToBase64(imageDataUri);

    // fileType 1 = image (as shown in the API documentation)
    const requestBody = {
      file: base64Image,
      fileType: 1,
    };

    const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');

    // Auth header built from handler's authConfig (Authorization: Bearer {key})
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...buildAuthHeaders(AUTH_BEARER, apiKey ?? ''),
    };

    const response = await fetch(`${normalizedBaseUrl}/layout-parsing`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Layout parsing API failed: ${response.status} ${errorText}`);
    }

    const data: LayoutParsingResponse = await response.json();
    const markdownText = extractMarkdownFromResponse(data);

    if (!markdownText) {
      throw new Error('Layout parsing returned no text content.');
    }

    return markdownText;
  },
};
