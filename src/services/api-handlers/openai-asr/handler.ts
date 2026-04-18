/**
 * OpenAI-compatible audio transcription (ASR) handler.
 *
 * Endpoint: POST {baseUrl}/audio/transcriptions
 * Spec: https://platform.openai.com/docs/api-reference/audio/createTranscription
 * Also served by vLLM: https://docs.vllm.ai/en/v0.19.0/serving/openai_compatible_server/
 *
 * Works with any server exposing the OpenAI Whisper-compatible transcription API:
 * - OpenAI (Whisper, gpt-4o-transcribe)
 * - vLLM (CohereLabs/cohere-transcribe-03-2026, openai/whisper-large-v3, etc.)
 *
 * Request: multipart/form-data with `file` (audio blob) + `model` + optional `language`
 * Response: { "text": "transcribed text..." }
 *
 * Supported audio formats: flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm
 */
import type { NonStreamingApiHandler } from '../types';
import { AUTH_BEARER, buildAuthHeaders } from '../types';
import { testOpenaiModelsEndpoint } from '../shared-health-checks';

interface TranscriptionResponse {
  text: string;
}

export const openaiAsrHandler: NonStreamingApiHandler = {
  type: 'openai-asr',
  label: 'OpenAI ASR',
  description: 'OpenAI-compatible /v1/audio/transcriptions endpoint (Whisper, Cohere Transcribe via vLLM)',
  category: 'ASR',
  authConfig: AUTH_BEARER,
  streaming: false,
  ui: {
    requiresImage: false,
    requiresPrompt: false,
    requiresSystemPrompt: false,
    requiresMaxTokens: false,
    requiresAudioFile: true,
  },
  testConnection: testOpenaiModelsEndpoint,
  async execute({ apiBaseUrl, signal, apiKey, model, audioFile, language }) {
    const normalizedBaseUrl = apiBaseUrl.replace(/\/+$/, '');

    if (!audioFile) {
      throw new Error('Audio file is required for transcription.');
    }

    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('model', model || 'whisper-1');

    if (language) {
      // ISO 639-1 language code (e.g. "en", "ja", "zh")
      formData.append('language', language);
    }

    // Response format: json returns { text: "..." }
    formData.append('response_format', 'json');

    // Auth header built from handler's authConfig (Authorization: Bearer {key})
    const headers: Record<string, string> = buildAuthHeaders(AUTH_BEARER, apiKey ?? '');
    // Note: do NOT set Content-Type — the browser sets it with the multipart boundary automatically

    const response = await fetch(`${normalizedBaseUrl}/v1/audio/transcriptions`, {
      method: 'POST',
      headers,
      body: formData,
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription API failed: ${response.status} ${errorText}`);
    }

    const data: TranscriptionResponse = await response.json();

    if (!data.text) {
      throw new Error('Transcription API returned no text.');
    }

    return data.text;
  },
};
