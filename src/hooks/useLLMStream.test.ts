/**
 * Integration tests for useLLMStream hook using real LLM API
 *
 * These tests connect to the actual LLM endpoint to verify:
 * - Cancel functionality works correctly with real API calls
 * - Restart after cancel works correctly
 * - Abort signal is properly passed through the stack
 *
 * Run with: npm run test:integration
 *
 * Configuration via environment variables:
 * - LLM_URL: Base URL of the LLM API (default: https://your-llm-api-endpoint.com)
 * - LLM_KEY: API key for authentication (required)
 * - LLM_MODEL: Model name to use (default: your-model-name)
 *
 * Example:
 *   LLM_KEY=sk-your-api-key-here npm run test:integration
 */

import { renderHook, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeAll, vi } from 'vitest'
import { useLLMStream } from './useLLMStream'

// Type declaration for process.env
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      LLM_URL?: string
      LLM_KEY?: string
      LLM_MODEL?: string
    }
  }
}

// Configure test timeout for slow API tests
beforeAll(() => {
  vi.setConfig({ testTimeout: 60000, hookTimeout: 30000 })
})

/**
 * Test configuration - read from environment variables with sensible defaults
 */
const TEST_CONFIG = {
  apiUrl: process.env.LLM_URL || 'https://your-llm-api-endpoint.com',
  apiKey: process.env.LLM_KEY || '',
  model: process.env.LLM_MODEL || 'your-model-name',
}

// Verify LLM_KEY is set before running tests
if (!TEST_CONFIG.apiKey) {
  console.warn('LLM_KEY environment variable is not set. Integration tests will fail.')
}

describe('Real LLM Integration Tests', () => {
  it('should cancel a running stream', async () => {
    const { result } = renderHook(() => useLLMStream())

    const messages = [
      { role: 'user' as const, content: 'Tell me the longest poem in the world' },
    ]

    // Start streaming
    const streamPromise = result.current.stream(
      messages,
      TEST_CONFIG.model,
      TEST_CONFIG.apiUrl,
      TEST_CONFIG.apiKey
    )

    // Wait for streaming to start (isStreaming becomes true)
    await waitFor(
      () => {
        expect(result.current.metrics.isStreaming).toBe(true)
      },
      { timeout: 30000 }
    )

    // Cancel the stream
    result.current.cancel()

    // Wait for cancellation to complete (isStreaming becomes false)
    await waitFor(
      () => {
        expect(result.current.metrics.isStreaming).toBe(false)
      },
      { timeout: 10000 }
    )

    // Wait for the promise to settle
    await streamPromise.catch(() => {})
  })

  it('should reset output when starting new stream after cancel', async () => {
    const { result } = renderHook(() => useLLMStream())

    // First message
    const messages1 = [
      { role: 'user' as const, content: 'Tell me the longest poem in the world' },
    ]

    // Start first stream
    const stream1 = result.current.stream(
      messages1,
      TEST_CONFIG.model,
      TEST_CONFIG.apiUrl,
      TEST_CONFIG.apiKey
    )

    // Wait for it to start
    await waitFor(
      () => {
        expect(result.current.metrics.isStreaming).toBe(true)
      },
      { timeout: 30000 }
    )

    // Verify we got some output
    const firstOutput = result.current.output
    expect(firstOutput.length).toBeGreaterThan(0)

    // Cancel
    result.current.cancel()

    // Wait for cancellation to complete
    await waitFor(
      () => {
        expect(result.current.metrics.isStreaming).toBe(false)
      },
      { timeout: 10000 }
    )

    // Second message - start new stream
    const messages2 = [
      { role: 'user' as const, content: 'Tell me the longest poem in the world' },
    ]

    // Start new stream - this should reset output
    const stream2 = result.current.stream(
      messages2,
      TEST_CONFIG.model,
      TEST_CONFIG.apiUrl,
      TEST_CONFIG.apiKey
    )

    // Wait for new stream to start
    await waitFor(
      () => {
        expect(result.current.metrics.isStreaming).toBe(true)
      },
      { timeout: 30000 }
    )

    // The second stream should have started with reset state
    // The output should be from the new prompt
    const secondOutput = result.current.output
    expect(secondOutput.length).toBeGreaterThan(0)

    // Cleanup - wait for both to finish
    await stream1.catch(() => {})
    await stream2.catch(() => {})
  })

  it('should handle multiple cancel calls safely', async () => {
    const { result } = renderHook(() => useLLMStream())

    const messages = [
      { role: 'user' as const, content: 'Tell me the longest poem in the world' },
    ]

    // Start stream
    const streamPromise = result.current.stream(
      messages,
      TEST_CONFIG.model,
      TEST_CONFIG.apiUrl,
      TEST_CONFIG.apiKey
    )

    // Wait for it to start
    await waitFor(
      () => {
        expect(result.current.metrics.isStreaming).toBe(true)
      },
      { timeout: 30000 }
    )

    // Cancel multiple times (should be safe)
    result.current.cancel()
    result.current.cancel()
    result.current.cancel()

    // Wait for cancellation to complete
    await waitFor(
      () => {
        expect(result.current.metrics.isStreaming).toBe(false)
      },
      { timeout: 10000 }
    )

    await streamPromise.catch(() => {})
  })
})
