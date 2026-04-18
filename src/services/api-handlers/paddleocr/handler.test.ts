/**
 * Integration test for PaddleOCR layout parsing handler.
 *
 * Hits the real PaddleX endpoint to verify:
 * - Handler sends correct request format (base64 image + fileType)
 * - Handler extracts markdown text from response
 * - Health check (GET /health) works
 *
 * Run with: npm run test:integration:paddleocr
 *
 * Configuration via environment variables:
 * - PADDLE_URL: Base URL of the PaddleX service (default: http://192.168.0.155:38471)
 *
 * Example:
 *   PADDLE_URL=http://192.168.0.155:38471 npm run test:integration:paddleocr
 */

import { describe, it, expect } from 'vitest'
import { layoutParsingHandler } from './handler'
import { testPaddleHealthEndpoint } from '../shared-health-checks'
import fs from 'fs'
import path from 'path'

const PADDLE_URL = process.env.PADDLE_URL || 'http://192.168.0.155:31492'

// Create a small test image as data URI (1x1 white PNG)
const TINY_PNG_BASE64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
const TINY_PNG_DATA_URI = `data:image/png;base64,${TINY_PNG_BASE64}`

/**
 * Load a sample image from public/samples as a data URI.
 * Falls back to the tiny 1x1 PNG if no sample images exist.
 */
function loadSampleImageDataUri(): string {
  const samplesDir = path.resolve(__dirname, '../../../../public/samples')
  try {
    const files = fs.readdirSync(samplesDir)
    const imageFile = files.find(f => /\.(png|jpg|jpeg)$/i.test(f))
    if (imageFile) {
      const buffer = fs.readFileSync(path.join(samplesDir, imageFile))
      const ext = path.extname(imageFile).toLowerCase()
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg'
      return `data:${mimeType};base64,${buffer.toString('base64')}`
    }
  } catch {
    // samples dir doesn't exist, use fallback
  }
  return TINY_PNG_DATA_URI
}

describe('PaddleOCR handler integration', () => {
  it('health check returns success', async () => {
    const result = await testPaddleHealthEndpoint({ apiBaseUrl: PADDLE_URL, apiKey: '' })

    expect(result.error).toBeNull()
    expect(result.statusCode).toBe(200)
    expect(result.url).toBe(`${PADDLE_URL}/health`)
  })

  it('extracts text from an image via layout-parsing endpoint', async () => {
    const imageDataUri = loadSampleImageDataUri()

    const resultText = await layoutParsingHandler.execute({
      apiBaseUrl: PADDLE_URL,
      imageDataUri,
    })

    // Should return some non-empty string (markdown text)
    expect(typeof resultText).toBe('string')
    expect(resultText.length).toBeGreaterThan(0)
  }, 30_000) // layout parsing can be slow

  it('throws when no image is provided', async () => {
    await expect(
      layoutParsingHandler.execute({ apiBaseUrl: PADDLE_URL })
    ).rejects.toThrow('PaddleOCR requires an image')
  })
})
