# Black Forest Labs (BFL) FLUX API

**Spec:** https://docs.bfl.ml/flux_2/flux2_text_to_image
**Integration Guide:** https://docs.bfl.ml/api_integration/integration_guidelines

## Base URL

`https://api.bfl.ai/v1`

Regional: `https://api.eu.bfl.ai/v1` (EU), `https://api.us.bfl.ai/v1` (US)

## Available Model Endpoints

| Model | Endpoint | Use Case |
|---|---|---|
| FLUX.2 [klein] 4B | `flux-2-klein-4b` | Real-time, sub-second |
| FLUX.2 [klein] 9B | `flux-2-klein-9b-preview` | Speed + quality balance |
| FLUX.2 [pro] | `flux-2-pro-preview` | Production at scale |
| FLUX.2 [max] | `flux-2-max` | Highest quality |
| FLUX.2 [flex] | `flux-2-flex` | Adjustable steps/guidance |

## Auth

Header: `x-key: $BFL_API_KEY` (NOT Bearer token)

## Step 1: Submit Request

```bash
curl -X POST https://api.bfl.ai/v1/flux-2-pro-preview \
  -H "accept: application/json" \
  -H "x-key: $BFL_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A serene landscape with mountains",
    "width": 1024,
    "height": 1024
  }'
```

**Request params:**
| Field | Type | Default | Description |
|---|---|---|---|
| `prompt` | string | required | Text description |
| `width` | int | 1024 | Multiple of 16 |
| `height` | int | 1024 | Multiple of 16 |
| `seed` | int | random | For reproducibility |
| `output_format` | string | "jpeg" | "jpeg" or "png" |
| `safety_tolerance` | int | 2 | 0-6 moderation level |
| `steps` | int | 50 | [flex] only, max 50 |
| `guidance` | float | 4.5 | [flex] only, 1.5-10 |

**Response:**
```json
{
  "id": "task-id",
  "polling_url": "https://api.bfl.ai/v1/get_result?id=task-id",
  "cost": 3.0
}
```

## Step 2: Poll for Result

```bash
curl -s https://api.bfl.ai/v1/get_result?id=task-id \
  -H "accept: application/json" \
  -H "x-key: $BFL_API_KEY"
```

**Response when ready:**
```json
{
  "status": "Ready",
  "result": {
    "sample": "https://delivery-eu.bfl.ai/..."
  }
}
```

**Status values:** `Pending`, `Processing`, `Ready`, `Error`, `Failed`

## Important Notes

- Image URLs expire after **10 minutes**
- **No CORS** on delivery URLs — cannot be used directly in browsers cross-origin
- Max resolution: 4MP (e.g. 2048x2048), min 64x64
- Max 24 concurrent requests (6 for kontext-max)
- Rate limit: use exponential backoff on HTTP 429
