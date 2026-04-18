# OpenAI Audio Transcription (ASR) API

**Spec:** https://platform.openai.com/docs/api-reference/audio/createTranscription
**vLLM docs:** https://docs.vllm.ai/en/v0.19.0/serving/openai_compatible_server/

## Compatible Servers

- OpenAI API (Whisper, gpt-4o-transcribe)
- vLLM (`vllm serve CohereLabs/cohere-transcribe-03-2026 --trust-remote-code`)
- Any OpenAI Whisper-compatible server

## Request

```bash
curl -X POST http://localhost:8000/v1/audio/transcriptions \
  -H "Authorization: Bearer $API_KEY" \
  -F "file=@audio.wav" \
  -F "model=CohereLabs/cohere-transcribe-03-2026" \
  -F "language=en" \
  -F "response_format=json"
```

| Field | Type | Required | Description |
|---|---|---|---|
| `file` | file | Yes | Audio file (flac, mp3, mp4, mpeg, mpga, m4a, ogg, wav, webm) |
| `model` | string | Yes | Model identifier |
| `language` | string | No | ISO 639-1 code (e.g. "en", "ja", "zh") |
| `response_format` | string | No | `json` (default), `text`, `verbose_json` |
| `temperature` | number | No | Sampling temperature 0-1 |
| `prompt` | string | No | Optional hint text to guide transcription |

## Response

```json
{
  "text": "The transcribed text content..."
}
```
