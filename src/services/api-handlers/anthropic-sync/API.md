# Anthropic Non-Streaming Messages API

**Spec:** https://docs.anthropic.com/en/api/messages

Same as the streaming Anthropic handler but with `"stream": false`. Returns the full response in a single JSON object.

## Endpoint

`POST {baseUrl}/messages` (default: `https://api.anthropic.com/v1`)

## Request Headers

```
Content-Type: application/json
x-api-key: $ANTHROPIC_API_KEY
anthropic-version: 2023-06-01
```

## Request

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 1024,
  "system": "You are a helpful assistant.",
  "messages": [
    { "role": "user", "content": "Hello, Claude" }
  ],
  "stream": false
}
```

## Response

```json
{
  "id": "msg_013Zva2CMHLNrqzjvN47Jknj",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-sonnet-4-6",
  "stop_reason": "end_turn",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 25
  }
}
```

## Key Differences from OpenAI

- `system` is a **top-level field**, not a message with `role: "system"`
- `max_tokens` is **required**
- Auth: `x-api-key` header, not `Authorization: Bearer`
- Response `content` is an **array of blocks**, not a single string
- `stop_reason` values: `end_turn`, `max_tokens`, `stop_sequence`, `tool_use`
