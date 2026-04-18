# Anthropic Messages API

**Spec:** https://docs.anthropic.com/en/api/messages (redirects to https://platform.claude.com/docs/en/api/messages)

## Endpoint

`POST {baseUrl}/messages` (default base: `https://api.anthropic.com/v1`)

## Request Headers

```
Content-Type: application/json
x-api-key: $ANTHROPIC_API_KEY
anthropic-version: 2023-06-01
```

Note: Anthropic uses `x-api-key`, NOT `Authorization: Bearer`.

## Request Body

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "system": "You are a helpful assistant",
  "messages": [
    { "role": "user", "content": "Hello, Claude" }
  ],
  "stream": false,
  "temperature": 0.7
}
```

Key differences from OpenAI:
- `system` is a **top-level field**, not a message with `role: "system"`
- `max_tokens` is **required** (not optional)

For vision (image input) support, see the **Anthropic VL** handler which extends this standard.

## Response (Non-Streaming)

```json
{
  "id": "msg_013Zva...",
  "type": "message",
  "role": "assistant",
  "content": [
    { "type": "text", "text": "Hello! How can I help?" }
  ],
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 25
  }
}
```

## Streaming (SSE)

Set `"stream": true`. Event types in order:

1. `message_start` — contains message metadata + input token usage
2. `content_block_start` — new content block begins
3. `content_block_delta` — incremental text: `{ "delta": { "type": "text_delta", "text": "chunk" } }`
4. `content_block_stop` — block complete
5. `message_delta` — stop_reason + output token usage
6. `message_stop` — stream complete

```
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"! I'm Claude"}}
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":25}}
data: {"type":"message_stop"}
```
