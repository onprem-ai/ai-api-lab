# OpenAI Streaming Chat Completions

**Spec:** https://platform.openai.com/docs/api-reference/chat/create

## Compatible Servers

Any server implementing the OpenAI chat completions API:
- OpenAI API
- vLLM (`vllm serve model-name`)
- Ollama (`ollama serve`)
- LM Studio, LocalAI, llama.cpp server, etc.

## Endpoint

`POST {baseUrl}/chat/completions`

## Request Headers

```
Content-Type: application/json
Authorization: Bearer $API_KEY
```

## Request Body

```json
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "You are a helpful assistant." },
    { "role": "user", "content": "Hello!" }
  ],
  "stream": true,
  "max_tokens": 4096,
  "temperature": 0,
  "stream_options": { "include_usage": true }
}
```

For vision (image input) support, see the **OpenAI VL** handler which extends this standard.

## Streaming Response (SSE)

```
data: {"choices":[{"delta":{"content":"Hello"},"index":0}]}
data: {"choices":[{"delta":{"content":"!"},"index":0}]}
data: {"choices":[{"delta":{},"finish_reason":"stop","index":0}]}
data: {"usage":{"prompt_tokens":10,"completion_tokens":5,"total_tokens":15}}
data: [DONE]
```

Each `data:` line is a JSON object with:
- `choices[0].delta.content` — incremental text chunk
- `choices[0].finish_reason` — `"stop"` when complete
- `usage` — token counts (when `stream_options.include_usage: true`)

## Key Parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| `model` | string | required | Model identifier |
| `messages` | array | required | Conversation messages |
| `stream` | boolean | false | Enable SSE streaming |
| `max_tokens` | integer | model-dependent | Max output tokens |
| `temperature` | number | 1.0 | Sampling temperature (0-2) |
| `top_p` | number | 1.0 | Nucleus sampling |
| `frequency_penalty` | number | 0 | Penalize repeated tokens |
| `presence_penalty` | number | 0 | Penalize tokens already in context |
| `stop` | string/array | null | Stop sequences |
