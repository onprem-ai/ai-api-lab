import { useState, useRef, useEffect, useCallback } from 'react';
import { useLLMStream } from '@/hooks/useLLMStream';
import { useStore } from '@/store/useStore';
import { ApiTypeWarning } from '@/components/ApiTypeWarning';
import { getApiHandler } from '@/services/api-handlers/registry';
import { AUTH_BEARER } from '@/services/api-handlers/types';
import { SystemPromptInput, UserPromptInput, MaxTokensInput } from '@/components/PromptInputs';
import type { LLMMessage } from '@/services/llmService';

export function Text() {
  const [prompt, setPrompt] = useState<string>('Write a long poem');
  const { stream, cancel, metrics, reset, output } = useLLMStream();
  const { apiUrl, apiKey, model, systemPrompt, setSystemPrompt, maxTokens, setMaxTokens, charsPerToken, apiType } = useStore();

  const outputRef = useRef<HTMLTextAreaElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // Ref to track the current prompt value for use in memoized functions
  const promptRef = useRef(prompt);
  useEffect(() => {
    promptRef.current = prompt;
  }, [prompt]);

  // Ref to track the current system prompt value for use in memoized functions
  const systemPromptRef = useRef(systemPrompt);
  useEffect(() => {
    systemPromptRef.current = systemPrompt;
  }, [systemPrompt]);

  // Ref to track the current maxTokens value for use in memoized functions
  const maxTokensRef = useRef(maxTokens);
  useEffect(() => {
    maxTokensRef.current = maxTokens;
  }, [maxTokens]);

  // Auto-scroll output to bottom when content changes
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  // Reset output and metrics on new conversation (when output is cleared)
  useEffect(() => {
    if (!metrics.isStreaming && output === '') {
      reset();
    }
  }, [output, metrics.isStreaming, reset]);

  // Handle Cancel
  const handleCancel = () => {
    cancel();
  };

  // Handle Send - keeps prompt in input and cancels any ongoing stream
  const handleSend = useCallback(async () => {
    if (!promptRef.current.trim()) return;

    // Use defaults if store values are empty
    const baseUrl = apiUrl || 'http://localhost:3000';
    const modelName = model || 'gpt-3.5-turbo';

    const messages: LLMMessage[] = [];

    // Add system prompt if provided
    if (systemPromptRef.current.trim()) {
      messages.push({ role: 'system', content: systemPromptRef.current });
    }

    messages.push({ role: 'user', content: promptRef.current });

    try {
      // Cancel any ongoing stream and wait for it to complete
      if (metrics.isStreaming) {
        cancel();
        // Wait for the stream to actually stop by waiting for isStreaming to become false
        await new Promise(resolve => {
          const checkStopped = () => {
            if (!metrics.isStreaming) {
              resolve(undefined);
            } else {
              setTimeout(checkStopped, 10);
            }
          };
          checkStopped();
        });
      }

      // Look up handler's authConfig for correct auth header format
      const handler = apiType ? getApiHandler(apiType) : undefined;
      const authConfig = handler?.authConfig ?? AUTH_BEARER;

      await stream(messages, modelName, baseUrl, apiKey, maxTokens, charsPerToken, undefined, authConfig);
    } catch (error) {
      // Error is handled in metrics.errorMessage
      console.error('Stream error:', error);
    }
  }, [apiUrl, apiKey, model, apiType, metrics.isStreaming, cancel, stream, maxTokens, charsPerToken]);

  // Keyboard shortcut handler for Alt+Enter / Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isSendShortcut = isMac
        ? (e.metaKey && e.key === 'Enter')
        : (e.altKey && e.key === 'Enter');

      if (isSendShortcut && document.activeElement === promptInputRef.current) {
        e.preventDefault();
        handleSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSend, metrics.isStreaming]);

  return (
    <div className="max-w-6xl mx-auto py-8">
      <ApiTypeWarning pageId="llm" />
      <div className="flex items-center gap-8">

        {/* LEFT SIDE */}
        <div className="flex-1 min-w-0">
          <SystemPromptInput value={systemPrompt} onChange={setSystemPrompt} />
          <UserPromptInput value={prompt} onChange={setPrompt} textareaRef={promptInputRef} />
          <MaxTokensInput value={maxTokens} onChange={setMaxTokens} />
        </div>

        {/* CENTER COLUMN (ARROW) */}
        <div className="shrink-0">
          <button
            onClick={metrics.isStreaming ? handleCancel : handleSend}
            disabled={!prompt.trim()}
            className="group flex flex-col items-center justify-center gap-2 cursor-pointer"
            title={metrics.isStreaming ? "Cancel stream" : "Send (Alt+Enter)"}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-white/10 transition-colors">
              <div className="absolute inset-0 bg-white rounded-full opacity-5" />
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                {metrics.isStreaming ? (
                  <>
                    <line
                      x1="6"
                      y1="6"
                      x2="6"
                      y2="18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                    <line
                      x1="18"
                      y1="6"
                      x2="18"
                      y2="18"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </>
                ) : (
                  <path
                    d="M8 4L16 12L8 20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>
            <span className="text-xs text-subtle">
              {metrics.isStreaming ? 'Cancel' : 'Send'}
            </span>
          </button>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 min-w-0">
          {/* Error Message */}
          {metrics.errorMessage && (
            <div className="mt-2 p-2 bg-destructive/20 text-destructive text-sm rounded-sm">
              {metrics.errorMessage}
            </div>
          )}

          <div className="text-xs font-semibold mb-1 text-subtle">Output</div>
          <textarea
            ref={outputRef}
            className="w-full h-64 p-3 border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Output text goes here..."
            readOnly
            value={output}
          />

          {/* Metrics */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-sm mb-4">

            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground text-subtle">Elapsed</span>
              <span className="font-mono font-medium">{metrics.elapsedSeconds.toFixed(3)}s</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground text-subtle">Tokens/sec</span>
                <span className="group relative inline-flex">
                  <span className="text-muted-foreground">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg z-10 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                    <p className="font-medium mb-1">Tokens per Second</p>
                    <p className="text-muted-foreground">
                      Number of tokens generated per second during streaming.
                    </p>
                  </div>
                </span>
              </div>
              <span className="font-mono font-medium">{metrics.tokensPerSecond.toFixed(2)}</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground text-subtle">Tokens Out</span>
                <span className="group relative inline-flex">
                  <span className="text-muted-foreground">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg z-10 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                    <p className="font-medium mb-1">Tokens Out</p>
                    <p className="text-muted-foreground">
                      {metrics.completionTokens !== undefined
                        ? `Actual: ${metrics.completionTokens} tokens from API`
                        : `Estimated: ${metrics.outputTokens.toFixed(0)} tokens (output chars / 5)`}
                    </p>
                  </div>
                </span>
              </div>
              <span className="font-mono font-medium">{metrics.completionTokens !== undefined ? metrics.completionTokens : metrics.outputTokens.toFixed(0)}</span>
            </div>

            

            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground text-subtle">TTFT</span>
              <span className="font-mono font-medium">{metrics.timeToFirstToken} ms</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground text-subtle">Tps Prompt</span>
                <span className="group relative inline-flex">
                  <span className="text-muted-foreground">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg z-10 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                    <p className="font-medium mb-1">Tokens per Second (Input)</p>
                    <p className="text-muted-foreground">
                      Input tokens / time to first token. Shows how fast the model processed the prompt.
                    </p>
                  </div>
                </span>
              </div>
              <span className="font-mono font-medium">{metrics.promptTokens !== undefined ? metrics.promptTokensPerSecond.toFixed(2) : '~' + metrics.promptTokensPerSecond.toFixed(2)}</span>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground text-subtle">Tokens In</span>
                <span className="group relative inline-flex">
                  <span className="text-muted-foreground">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-popover text-popover-foreground text-xs rounded shadow-lg z-10 opacity-0 group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
                    <p className="font-medium mb-1">Tokens In</p>
                    <p className="text-muted-foreground">
                      {metrics.promptTokens !== undefined
                        ? `Actual: ${metrics.promptTokens} tokens from API`
                        : `Estimated: ${metrics.inputTokens.toFixed(0)} tokens (input chars / 5)`}
                    </p>
                  </div>
                </span>
              </div>
              <span className="font-mono font-medium">{metrics.promptTokens !== undefined ? metrics.promptTokens : '~' + metrics.inputTokens.toFixed(0)}</span>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
