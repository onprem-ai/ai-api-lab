# Anthropic Vision Language (VL)

**Base standard:** Anthropic Messages API (see **Anthropic** handler)

This API extends the base Anthropic Messages standard with support for image inputs alongside text. All generic parameters (model, system, messages, max_tokens, stream, etc.) are identical to the base standard and documented there.

## Image Input Format

Anthropic uses a different image format than OpenAI. Images are passed as content blocks in the user message using the `image` type with a `source` object:

```json
{
  "model": "claude-sonnet-4-6",
  "max_tokens": 4096,
  "messages": [{
    "role": "user",
    "content": [
      {
        "type": "image",
        "source": {
          "type": "base64",
          "media_type": "image/png",
          "data": "iVBOR..."
        }
      },
      { "type": "text", "text": "What's in this image?" }
    ]
  }],
  "stream": true
}
```

### Content Block Types

| Type | Fields | Description |
|---|---|---|
| `text` | `text: string` | Text portion of the prompt |
| `image` | `source: { type, media_type, data }` | Base64-encoded image |

### Image Source Object

| Field | Type | Description |
|---|---|---|
| `type` | `"base64"` | Source encoding (currently only `base64` supported) |
| `media_type` | string | MIME type: `image/png`, `image/jpeg`, `image/gif`, `image/webp` |
| `data` | string | Raw base64 data (without the `data:...;base64,` prefix) |

### Key Differences from OpenAI VL

| Aspect | OpenAI | Anthropic |
|---|---|---|
| Content type | `image_url` | `image` |
| Image field | `image_url: { url }` | `source: { type, media_type, data }` |
| Data format | Full data URI or HTTP URL | Raw base64 string + separate media_type |
| URL support | Data URI and HTTP URL | Base64 only (no URL fetch) |

### Multiple Images

Multiple `image` blocks can be included in a single message:

```json
{
  "role": "user",
  "content": [
    { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "..." } },
    { "type": "image", "source": { "type": "base64", "media_type": "image/jpeg", "data": "..." } },
    { "type": "text", "text": "Compare these two images." }
  ]
}
```

## Response

Identical to the base Anthropic streaming response — no vision-specific changes to the output format.
