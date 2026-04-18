import { useState, useRef, useCallback } from 'react';
import type { LLMMessage, StreamResult, LLMRequest } from '@/services/llmService';
import { streamCompletion } from '@/services/llmService';
import type { AuthConfig } from '@/services/api-handlers/types';
import { AUTH_BEARER } from '@/services/api-handlers/types';

/**
 * Metrics for tracking streaming LLM responses
 */
export interface StreamingMetrics {
  tokens: number; // character count (not chunk count)
  tokensPerSecond: number; // tokens per second (output)
  timeToFirstToken: number; // ms to first character
  elapsedMs: number;
  elapsedSeconds: number; // seconds passed (raw value)
  isStreaming: boolean;
  errorMessage?: string;
  outputChars: number; // number of characters in output
  // Input metrics
  inputChars: number; // number of characters in input (system + user prompt)
  inputTokens: number; // estimated tokens (inputChars / charsPerToken), updated from API
  // Output metrics
  outputTokens: number; // estimated tokens (outputChars / charsPerToken), updated from API
  // Prompt tokens per second (inputTokens / timeToFirstTokenSeconds)
  promptTokensPerSecond: number;
  // Token usage from API response
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

/**
 * Custom hook for streaming LLM responses with real-time metrics
 *
 * @returns {
 *   stream: Function to initiate streaming
 *   cancel: Function to cancel the stream
 *   metrics: Current streaming metrics
 *   reset: Function to reset state and metrics
 *   output: Accumulated output text
 * }
 */
export function useLLMStream() {
  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const firstTokenTimeRef = useRef<number>(0);
  const promptTokensRef = useRef<number | undefined>(undefined);
  const completionTokensRef = useRef<number | undefined>(undefined);
  const totalTokensRef = useRef<number | undefined>(undefined);
  const [metrics, setMetrics] = useState<StreamingMetrics>({
    tokens: 0,
    tokensPerSecond: 0,
    timeToFirstToken: 0,
    elapsedMs: 0,
    elapsedSeconds: 0,
    isStreaming: false,
    errorMessage: undefined,
    outputChars: 0,
    inputChars: 0,
    inputTokens: 0,
    outputTokens: 0,
    promptTokensPerSecond: 0,
  });
  const [output, setOutput] = useState<string>('');

  /**
   * Reset state and metrics
   */
  const reset = useCallback(() => {
    setOutput('');
    setMetrics({
      tokens: 0,
      tokensPerSecond: 0,
      timeToFirstToken: 0,
      elapsedMs: 0,
      elapsedSeconds: 0,
      isStreaming: false,
      errorMessage: undefined,
      outputChars: 0,
      inputChars: 0,
      inputTokens: 0,
      outputTokens: 0,
      promptTokensPerSecond: 0,
    });
    promptTokensRef.current = undefined;
    completionTokensRef.current = undefined;
    totalTokensRef.current = undefined;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Stream completions from an LLM API
   */
  const stream = useCallback(async (
    messages: LLMMessage[],
    model: string,
    apiBaseUrl: string,
    apiKey: string,
    maxTokens?: number,
    charsPerToken: number = 5,
    extraBody?: Partial<LLMRequest>,
    authConfig: AuthConfig = AUTH_BEARER,
  ): Promise<string> => {
    // Reset state for new stream
    reset();

    // Calculate input characters from messages, handling both string and vision content array formats
    const inputChars = messages.reduce((acc, msg) => {
      if (typeof msg.content === 'string') {
        return acc + msg.content.length;
      }
      // For content arrays, sum the text parts only (images don't count as text chars)
      return acc + msg.content.reduce((partAcc, part) => {
        return part.type === 'text' ? partAcc + part.text.length : partAcc;
      }, 0);
    }, 0);
    const inputTokens = inputChars / charsPerToken; // Estimate: 1 token = charsPerToken characters

    // Create new abort controller for this stream
    abortControllerRef.current = new AbortController();

    // Track timing
    const startTime = Date.now();
    startTimeRef.current = startTime;
    let firstTokenReceived = false;

    let fullOutput = '';
    let outputChars = 0;

    // Mark as streaming immediately (before the async loop starts)
    // This ensures isStreaming is true before any await in handleSend completes
    setMetrics({
      tokens: 0,
      tokensPerSecond: 0,
      timeToFirstToken: 0,
      elapsedMs: 0,
      elapsedSeconds: 0,
      isStreaming: true,
      errorMessage: undefined,
      outputChars: 0,
      inputChars,
      inputTokens,
      outputTokens: 0,
      promptTokensPerSecond: 0,
    });

    try {
      // Get the generator
      const generator = streamCompletion(messages, model, apiBaseUrl, apiKey, abortControllerRef.current.signal, maxTokens, extraBody, authConfig);

      // Consume the generator and capture usage data
      // The generator returns { promptTokens, completionTokens, totalTokens } on completion
      let streamResult: StreamResult | undefined;

      // Read all chunks using next() to capture the return value
      while (true) {
        const { value, done } = await generator.next();
        if (done) {
          streamResult = value as StreamResult;
          break;
        }
        const chunk = value;

        // Mark first token time if not already set
        if (!firstTokenReceived) {
          firstTokenReceived = true;
          const now = Date.now();
          firstTokenTimeRef.current = now - startTime;
          // Calculate prompt tokens per second: inputTokens / timeToFirstTokenSeconds
          const timeToFirstTokenSeconds = firstTokenTimeRef.current / 1000;
          const promptTokensPerSecond = inputTokens / timeToFirstTokenSeconds;
          setMetrics((prev) => ({
            ...prev,
            promptTokensPerSecond,
            timeToFirstToken: firstTokenTimeRef.current,
          }));
        }

        // Update output and character count
        fullOutput += chunk;
        outputChars = fullOutput.length;

        // Calculate metrics - use tokens (chars / charsPerToken) instead of characters
        const now = Date.now();
        const elapsedMs = now - startTime;
        const elapsedSeconds = elapsedMs / 1000;
        const outputTokens = outputChars / charsPerToken;
        const tokensPerSecond = outputTokens / elapsedSeconds;

        // Update metrics with estimated tokens
        setMetrics((prev) => ({
          ...prev,
          tokens: outputChars,
          tokensPerSecond,
          timeToFirstToken: firstTokenTimeRef.current,
          elapsedMs,
          elapsedSeconds,
          isStreaming: true,
          outputChars,
          inputChars,
          inputTokens,
          outputTokens,
        }));

        // Update output
        setOutput(fullOutput);
      }

      console.log('Stream result:', streamResult);

      // Extract usage data from the generator's return value
      const promptTokens = streamResult?.promptTokens;
      const completionTokens = streamResult?.completionTokens;
      const totalTokens = streamResult?.totalTokens;

      // Stream completed successfully - update with actual API data
      const finalElapsedMs = Date.now() - startTime;
      const finalElapsedSeconds = finalElapsedMs / 1000;
      const finalOutputTokens = outputChars / charsPerToken;
      const finalTokensPerSecond = finalOutputTokens / finalElapsedSeconds;
      // Calculate prompt TPS using actual prompt tokens if available, otherwise use estimate
      const finalPromptTokens = promptTokens !== undefined ? promptTokens : inputTokens;
      const finalPromptTokensPerSecond = firstTokenTimeRef.current > 0 ? finalPromptTokens / (firstTokenTimeRef.current / 1000) : 0;

      setMetrics({
        tokens: outputChars,
        tokensPerSecond: finalTokensPerSecond,
        timeToFirstToken: firstTokenTimeRef.current,
        elapsedMs: finalElapsedMs,
        elapsedSeconds: finalElapsedSeconds,
        isStreaming: false,
        errorMessage: undefined,
        outputChars,
        inputChars,
        inputTokens: promptTokens ? promptTokens : inputTokens,
        outputTokens: completionTokens ?? finalOutputTokens,
        promptTokensPerSecond: finalPromptTokensPerSecond,
        promptTokens,
        completionTokens,
        totalTokens,
      });

      return fullOutput;
    } catch (error) {
      // Handle AbortError
      if (error instanceof Error && error.name === 'AbortError') {
        // Stream was cancelled
        const cancelledElapsedMs = Date.now() - startTime;
        const cancelledElapsedSeconds = cancelledElapsedMs / 1000;
        const cancelledOutputTokens = outputChars / charsPerToken;
        setMetrics({
          tokens: outputChars,
          tokensPerSecond: cancelledOutputTokens / cancelledElapsedSeconds,
          timeToFirstToken: firstTokenTimeRef.current,
          elapsedMs: cancelledElapsedMs,
          elapsedSeconds: cancelledElapsedSeconds,
          isStreaming: false,
          errorMessage: error instanceof Error ? error.message : 'An unknown error occurred',
          outputChars,
          inputChars,
          inputTokens,
          outputTokens: cancelledOutputTokens,
          promptTokensPerSecond: firstTokenTimeRef.current > 0 ? inputTokens / (firstTokenTimeRef.current / 1000) : 0,
          promptTokens: undefined,
          completionTokens: undefined,
          totalTokens: undefined,
        });
        return fullOutput;
      }

      // Set error message for other errors
      const errorElapsedMs = Date.now() - startTime;
      const errorElapsedSeconds = errorElapsedMs / 1000;
      const errorOutputTokens = outputChars / charsPerToken;
      setMetrics({
        tokens: outputChars,
        tokensPerSecond: errorOutputTokens / errorElapsedSeconds,
        timeToFirstToken: firstTokenTimeRef.current,
        elapsedMs: errorElapsedMs,
        elapsedSeconds: errorElapsedSeconds,
        isStreaming: false,
        errorMessage: error instanceof Error ? error.message : 'An unknown error occurred',
        outputChars,
        inputChars,
        inputTokens,
        outputTokens: errorOutputTokens,
        promptTokensPerSecond: firstTokenTimeRef.current > 0 ? inputTokens / (firstTokenTimeRef.current / 1000) : 0,
        promptTokens: undefined,
        completionTokens: undefined,
        totalTokens: undefined,
      });

      throw error;
    }
  }, [reset]);

  /**
   * Cancel the current stream
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  return {
    stream,
    cancel,
    metrics,
    reset,
    output,
  };
}
