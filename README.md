> **Work in Progress** — This project is under active development. APIs, UI, and features may change without notice.

# AI API Lab

A browser-based tool for testing and comparing AI APIs. Connect to any OpenAI-compatible, Anthropic, or custom API endpoint and interactively test text generation, vision, OCR, and more — with real-time streaming metrics.

Built by [onprem.ai](https://onprem.ai).

## Features

- **LLM Testing** — streaming chat completions with live token metrics (tokens/sec, TTFT, prompt TPS)
- **Vision (LLM-VL)** — test vision-language models with image + text input (drag & drop, sample images)
- **OCR** — PaddleOCR layout parsing (images & PDFs) with structured markdown output
- **API Standards** — built-in documentation for each supported API format
- **Config Bookmarks** — save and load API configurations for quick switching
- **Shareable URLs** — copy a pre-configured URL (with API key) to share setups
- **Connection Health Check** — live connectivity indicator with detailed request/response debugging

## Supported API Types

| Category | Handler | Description |
|---|---|---|
| LLM | OpenAI | OpenAI-compatible streaming chat completions |
| LLM | OpenAI (Sync) | Non-streaming variant |
| LLM | Anthropic | Anthropic Messages API with SSE streaming |
| LLM | Anthropic (Sync) | Non-streaming variant |
| LLM | OpenAI ASR | Audio transcription (Whisper-compatible) |
| Vision | OpenAI VL | OpenAI-compatible vision-language (text + image) |
| Vision | Anthropic VL | Anthropic vision-language (text + image) |
| OCR | PaddleOCR | PaddleOCR/PaddleX layout parsing (images & PDFs) |
| Image Gen | BFL | Black Forest Labs (FLUX) image generation |
| Video Gen | LTX | LTX video generation |

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173), configure your API endpoint on the connection page (plug icon), and start testing.

## Tech Stack

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Zustand (state management)
- Radix UI (select component)
- React Router

## Project Structure

```
src/
├── components/          # Shared UI components
├── hooks/               # Custom hooks (useLLMStream)
├── pages/               # Route pages (Text, LlmOcr, PaddleOcr, LlmApi, ApiStandards)
├── services/
│   ├── api-handlers/    # Modular API handler system
│   │   ├── openai/      # Each handler: handler.ts + API.md
│   │   ├── anthropic/
│   │   ├── openai-vl/
│   │   ├── ...
│   │   ├── registry.ts  # Handler registration & model-to-handler mapping
│   │   └── types.ts     # Shared types (AuthConfig, ApiHandler, etc.)
│   └── llmService.ts    # Streaming SSE client
├── store/               # Zustand store (config, bookmarks, connection state)
└── utils/               # Shared utilities
```

## License

MIT — see [LICENSE](LICENSE).
