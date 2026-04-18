# OpenAI Vision Language (VL)

**Base standard:** OpenAI Streaming Chat Completions (see **OpenAI** handler)

This API extends the base OpenAI chat completions standard with support for image inputs alongside text. All generic parameters (model, messages, stream, max_tokens, temperature, etc.) are identical to the base standard and documented there.

## Image Input Format

Images are passed as content parts in the user message. Instead of a plain string, `content` becomes an array of typed parts:

```json
{
  "model": "gpt-4o",
  "messages": [{
    "role": "user",
    "content": [
      { "type": "text", "text": "What's in this image?" },
      {
        "type": "image_url",
        "image_url": { "url": "data:image/png;base64,iVBOR..." }
      }
    ]
  }],
  "stream": true,
  "max_tokens": 4096
}
```

### Content Part Types

| Type | Fields | Description |
|---|---|---|
| `text` | `text: string` | Text portion of the prompt |
| `image_url` | `image_url: { url: string }` | Image as data URI or HTTP URL |

### Image URL Formats

- **Data URI** (inline): `data:image/png;base64,iVBOR...` — image embedded directly in the request
- **HTTP URL**: `https://example.com/photo.jpg` — image fetched by the API server

### Supported Image Types

PNG, JPEG, GIF, WebP (varies by model/server)

### Multiple Images

Multiple `image_url` parts can be included in a single message:

```json
{
  "role": "user",
  "content": [
    { "type": "text", "text": "Compare these two images." },
    { "type": "image_url", "image_url": { "url": "data:image/png;base64,..." } },
    { "type": "image_url", "image_url": { "url": "data:image/jpeg;base64,..." } }
  ]
}
```

## Response

Identical to the base OpenAI streaming response — no vision-specific changes to the output format.
