# Layout Parsing API (PaddleOCR)

**Endpoint:** `POST {baseUrl}/layout-parsing`
**Source:** PaddleOCR PP-StructureV2 layout parsing service
**Docs:** https://paddlepaddle.github.io/PaddleX/latest/en/pipeline_usage/tutorials/ocr_pipelines/layout_parsing.html

## Request

```bash
# Image
curl -X POST http://192.168.0.155:38471/layout-parsing \
  -H "Content-Type: application/json" \
  -d '{
    "file": "'$(base64 -w0 /path/to/image.png)'",
    "fileType": 1
  }'

# PDF
curl -X POST http://192.168.0.155:38471/layout-parsing \
  -H "Content-Type: application/json" \
  -d '{
    "file": "'$(base64 -w0 /path/to/document.pdf)'",
    "fileType": 0
  }'
```

| Field      | Type   | Description                          |
|------------|--------|--------------------------------------|
| `file`     | string | Raw base64-encoded image or PDF (no data URI prefix) |
| `fileType` | number | `0` = PDF, `1` = image (optional — auto-detected if omitted) |

## Response

```json
{
  "logId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "result": {
    "layoutParsingResults": [{
      "prunedResult": {
        "width": 800,
        "height": 1100,
        "parsing_res_list": [
          {
            "block_label": "header",
            "block_content": "Annual Report 2026",
            "block_bbox": [120, 30, 680, 80],
            "block_id": 0,
            "block_order": null,
            "block_polygon_points": [[120,30],[680,30],[680,80],[120,80]]
          }
        ]
      },
      "markdown": {
        "text": "Full document as Markdown...",
        "images": {}
      },
      "outputImages": {
        "layout_det_res": "base64-encoded-visualization-image..."
      }
    }]
  }
}
```

## Key Fields

| Field | Description |
|-------|-------------|
| `parsing_res_list` | Each detected block with label, content, bounding box, and reading order |
| `block_label` | One of: `header`, `text`, `table`, `formula`, `chart`, `image`, `footer`, `seal` |
| `block_content` | Recognized content (plain text, HTML table, LaTeX formula) |
| `block_order` | Reading order (`null` for headers/footers) |
| `block_bbox` | Bounding box `[x1, y1, x2, y2]` |
| `block_polygon_points` | Corner points of the detected region |
| `markdown.text` | Full document as Markdown (tables as HTML, formulas as LaTeX) |
| `outputImages.layout_det_res` | Base64 visualization of detected layout regions |
