# OpenAI Non-Streaming Chat Completions

**Spec:** https://platform.openai.com/docs/api-reference/chat/create

Same as the streaming variant but with `"stream": false`. Returns the full response in a single JSON object.

## Endpoint

`POST {baseUrl}/chat/completions`

## Request

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": false,
  "max_tokens": 4096,
  "temperature": 0
}
```

## Response

```json
{
  "id": "chatcmpl-abc123",
  "object": "chat.completion",
  "created": 1677858242,
  "model": "gpt-4o",
  "choices": [{
    "index": 0,
    "message": {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    },
    "finish_reason": "stop"
  }],
  "usage": {
    "prompt_tokens": 13,
    "completion_tokens": 9,
    "total_tokens": 22
  }
}
```

## When to Use

- Testing API connectivity without streaming complexity
- Measuring total latency (time-to-complete, not time-to-first-token)
- Simpler error handling (single response vs SSE stream)
