import type { StreamingApiHandler } from '../types';
import { AUTH_BEARER } from '../types';
import { testOpenaiModelsEndpoint } from '../shared-health-checks';

export const openaiCompatibleHandler: StreamingApiHandler = {
  type: 'openai',
  label: 'OpenAI',
  description: 'OpenAI-compatible streaming chat completions API',
  category: 'LLM',
  authConfig: AUTH_BEARER,
  streaming: true,
  ui: {
    requiresImage: false,
    requiresPrompt: true,
    requiresSystemPrompt: true,
    requiresMaxTokens: true,
  },
  testConnection: testOpenaiModelsEndpoint,
  extraBody: {
    temperature: 0,
    repetition_penalty: 1.1,
  },
  buildMessages({ prompt, systemPrompt, imageDataUri }) {
    const messages = [];

    if (systemPrompt.trim()) {
      messages.push({ role: 'system' as const, content: systemPrompt });
    }

    if (imageDataUri) {
      messages.push({
        role: 'user' as const,
        content: [
          { type: 'text' as const, text: prompt },
          { type: 'image_url' as const, image_url: { url: imageDataUri } },
        ],
      });
    } else {
      messages.push({ role: 'user' as const, content: prompt });
    }

    return messages;
  },
};
