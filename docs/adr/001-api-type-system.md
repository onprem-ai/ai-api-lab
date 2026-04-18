# ADR-001: API Type System & Handler Registry

**Status:** Accepted
**Date:** 2026-04-15

## Context

The app needs to support various AI model APIs that differ fundamentally in protocol, vendor, and I/O modality (text, image, audio, video). There is no industry standard — each vendor ships their own REST format. We need a system that:

- Cleanly identifies each vendor+protocol combination
- Drives page accessibility (not every page works with every API)
- Supports health checks per API
- Is easy to extend with new vendors
- Can be set via URL param for shareable links

## Decision

### ApiType as the Central Routing Concept

`ApiType` is a string enum that uniquely identifies a vendor+protocol combination. It is the single source of truth that drives:

1. Which **handlers** are available
2. Which **pages** are accessible
3. Which **UI fields** are shown (prompt, image upload, audio upload, etc.)
4. Which **health check** endpoint to call

### Naming Convention: `vendor[-suffix]`

```
vendor          — base name, identifies the vendor or protocol family
vendor-suffix   — variant of the same vendor (e.g. streaming vs sync)
```

**Rules:**
- Streaming is the default/common case → gets the short name (e.g. `openai`)
- Non-streaming variant → `-sync` suffix (e.g. `openai-sync`)
- Task-specific variants → use standard ML task abbreviations as suffix

### Standard ML Task Abbreviations

Use established abbreviations from HuggingFace / ML community:

| Abbreviation | Full Name | Direction |
|---|---|---|
| **ASR** | Automatic Speech Recognition | audio → text |
| **TTS** | Text-to-Speech | text → audio |
| **OCR** | Optical Character Recognition | image → text |
| **VL** | Vision-Language | image+text → text |
| **VQA** | Visual Question Answering | image+text → text |
| **NER** | Named Entity Recognition | text → structured text |
| **MT** | Machine Translation | text → text |
| **QA** | Question Answering | text → text |

### Current ApiType Registry

| ApiType | Vendor | Protocol | I/O |
|---|---|---|---|
| `openai` | OpenAI (+ compatibles: vLLM, Ollama, etc.) | Streaming chat completions | text → text (streamed) |
| `openai-sync` | OpenAI (+ compatibles) | Non-streaming chat completions | text → text |
| `openai-asr` | OpenAI-compatible (vLLM) | `/v1/audio/transcriptions` | audio → text |
| `anthropic` | Anthropic | Streaming Messages API | text → text (streamed) |
| `anthropic-sync` | Anthropic | Non-streaming Messages API | text → text |
| `paddleocr` | PaddleOCR / PaddleX | Layout parsing REST | image → structured text |
| `bfl` | Black Forest Labs | Async image generation (polled) | text → image |
| `ltx` | Lightricks | Video generation | text → video |

### Resolution Priority

ApiType is resolved from (highest priority first):

1. **URL param** `?apiType=paddleocr` — explicit override, shareable links
2. **Store setting** — user picked it in the UI
3. **Model-to-ApiType mapping** — config-based default from model name
4. **Fallback:** `openai`

### Common Entrypoint Params

These are shared across all ApiTypes — the minimum to connect to any API:

| Param | Description | Example |
|---|---|---|
| `api_url` | Base URL of the API server | `http://192.168.0.155:38471` |
| `auth` | Full auth header value (flexible per vendor) | `Bearer sk-xxx`, `x-key abc`, or empty |
| `model` | Model identifier (pass-through, some handlers ignore it) | `PP-StructureV2`, `gpt-4o` |

**Why full auth header instead of just a key:**
- OpenAI: `Authorization: Bearer sk-xxx`
- BFL: `x-key: abc123`
- PaddleX local: empty (no auth)
- Avoids hardcoding auth scheme assumptions per handler

## File Structure

```
src/services/api-handlers/
  types.ts                           — ApiHandler union type, UI requirements interface
  registry.ts                        — handler map + MODEL_HANDLER_CONFIG
  openai/handler.ts                  — streaming chat completions
  openai-sync/handler.ts             — non-streaming chat completions
  openai-asr/handler.ts              — audio transcription
  anthropic/handler.ts               — streaming messages
  anthropic-sync/handler.ts          — non-streaming messages
  paddleocr/handler.ts + API.md      — PaddleX layout parsing
  bfl/handler.ts + API.md            — FLUX image generation
  ltx/handler.ts + API.md            — LTX video generation
```

Each handler directory may contain:
- `handler.ts` — handler implementation (required)
- `API.md` — vendor API documentation (recommended)
- `types.ts` — vendor-specific request/response types (if complex)
- `openapi.json` — OpenAPI schema (if available)

## Adding a New ApiType

1. Create directory `src/services/api-handlers/{api-type}/`
2. Implement `handler.ts` — either `StreamingApiHandler` or `NonStreamingApiHandler`
3. Add API documentation in `API.md`
4. In `registry.ts`: register the handler + add model patterns to `MODEL_HANDLER_CONFIG`
5. No changes needed in page components

## Consequences

- **Positive:** Clear, extensible system. Each vendor is isolated. Pages adapt automatically.
- **Positive:** URL param support makes testing and sharing easy.
- **Positive:** Standard ML abbreviations keep names short and recognizable.
- **Negative:** Handler interface may need evolution as new I/O modalities are added (audio input, video output, polling patterns).
