import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useLLMStream } from '@/hooks/useLLMStream';
import { useStore } from '@/store/useStore';
import { ApiTypeWarning } from '@/components/ApiTypeWarning';
import { SystemPromptInput, UserPromptInput, MaxTokensInput } from '@/components/PromptInputs';
import { getHandlersForModel, getDefaultHandlerType, getApiHandler } from '@/services/api-handlers/registry';
import type { StreamingApiHandler, NonStreamingApiHandler } from '@/services/api-handlers/types';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface SampleImage {
  fileName: string;
  label: string;
  description: string;
}

const SAMPLE_IMAGES: SampleImage[] = [
  { fileName: 'receipt.jpg', label: 'Receipt', description: 'Store receipt with items' },
  { fileName: 'invoice.png', label: 'Invoice', description: 'Business invoice document' },
  { fileName: 'handwritten-note.jpg', label: 'Handwritten Note', description: 'Handwritten text on paper' },
  { fileName: 'form.png', label: 'Form', description: 'Filled-out paper form' },
];

async function fetchSampleImageAsDataUri(fileName: string): Promise<string> {
  const response = await fetch(`/samples/${fileName}`);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function LlmOcr() {
  const [prompt, setPrompt] = useState<string>('Extract all text from this image.');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageFileSize, setImageFileSize] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState<string>('');
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const { stream, cancel, metrics, reset, output } = useLLMStream();
  const { apiUrl, apiKey, model, systemPrompt, setSystemPrompt, maxTokens, setMaxTokens, charsPerToken } = useStore();

  // --- Handler selection driven by model name (VL fallback for this page) ---
  const VL_FALLBACK_HANDLER = 'openai-vl';
  const availableHandlers = useMemo(() => getHandlersForModel(model, VL_FALLBACK_HANDLER), [model]);
  const [selectedHandlerType, setSelectedHandlerType] = useState<string>(() => getDefaultHandlerType(model, VL_FALLBACK_HANDLER));
  const activeHandler = useMemo(() => getApiHandler(selectedHandlerType), [selectedHandlerType]);

  // Reset handler selection when model changes (picks new default)
  useEffect(() => {
    setSelectedHandlerType(getDefaultHandlerType(model, VL_FALLBACK_HANDLER));
  }, [model]);

  // --- Non-streaming state (shared by all non-streaming handlers) ---
  const [nonStreamingOutput, setNonStreamingOutput] = useState<string>('');
  const [nonStreamingLoading, setNonStreamingLoading] = useState(false);
  const [nonStreamingError, setNonStreamingError] = useState<string>('');
  const [nonStreamingElapsedMs, setNonStreamingElapsedMs] = useState<number>(0);
  const nonStreamingAbortRef = useRef<AbortController | null>(null);

  const outputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // Refs for memoized callbacks
  const selectedHandlerTypeRef = useRef(selectedHandlerType);
  useEffect(() => { selectedHandlerTypeRef.current = selectedHandlerType; }, [selectedHandlerType]);

  const promptRef = useRef(prompt);
  useEffect(() => { promptRef.current = prompt; }, [prompt]);

  const systemPromptRef = useRef(systemPrompt);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);

  const maxTokensRef = useRef(maxTokens);
  useEffect(() => { maxTokensRef.current = maxTokens; }, [maxTokens]);

  const imageDataUriRef = useRef(imageDataUri);
  useEffect(() => { imageDataUriRef.current = imageDataUri; }, [imageDataUri]);

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

  // Validate and load an image file into state
  const loadImageFile = useCallback(async (file: File) => {
    setImageError('');

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError(`Unsupported file type: ${file.type}. Use PNG, JPEG, GIF, or WebP.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setImageError(`File too large: ${formatFileSize(file.size)}. Maximum is 20MB.`);
      return;
    }

    const dataUri = await fileToDataUri(file);
    setImageDataUri(dataUri);
    setImageFileName(file.name);
    setImageFileSize(file.size);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadImageFile(file);
    }
    // Reset input so the same file can be re-selected
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setImageDataUri(null);
    setImageFileName('');
    setImageFileSize(0);
    setImageError('');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      loadImageFile(file);
    }
  };

  const handleSelectSample = useCallback(async (sample: SampleImage) => {
    setImageError('');
    try {
      const dataUri = await fetchSampleImageAsDataUri(sample.fileName);
      setImageDataUri(dataUri);
      setImageFileName(sample.fileName);
      setImageFileSize(0); // Size unknown for fetched samples
      setShowSampleModal(false);
    } catch {
      setImageError(`Failed to load sample image: ${sample.fileName}`);
      setShowSampleModal(false);
    }
  }, []);

  // Close sample modal on Escape key
  useEffect(() => {
    if (!showSampleModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSampleModal(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showSampleModal]);

  // Handle Cancel — cancels both streaming and non-streaming requests
  const handleCancel = () => {
    cancel();
    if (nonStreamingAbortRef.current) {
      nonStreamingAbortRef.current.abort();
      nonStreamingAbortRef.current = null;
      setNonStreamingLoading(false);
    }
  };

  // Handle Send — dispatches to the active handler via the registry
  const handleSend = useCallback(async () => {
    const handler = getApiHandler(selectedHandlerTypeRef.current);
    if (!handler) return;

    // --- Non-streaming handler path ---
    if (!handler.streaming) {
      const nonStreamingHandler = handler as NonStreamingApiHandler;

      // Validate required inputs based on handler UI requirements
      if (handler.ui.requiresImage && !imageDataUriRef.current) {
        setNonStreamingError(`${handler.label} requires an image. Please upload one first.`);
        return;
      }
      if (handler.ui.requiresPrompt && !promptRef.current.trim()) {
        setNonStreamingError(`${handler.label} requires a prompt.`);
        return;
      }

      // Cancel any ongoing operations
      if (metrics.isStreaming) cancel();
      if (nonStreamingAbortRef.current) nonStreamingAbortRef.current.abort();

      // Reset previous state
      reset();
      setNonStreamingOutput('');
      setNonStreamingError('');
      setNonStreamingLoading(true);
      setNonStreamingElapsedMs(0);

      const startTime = Date.now();
      const abortController = new AbortController();
      nonStreamingAbortRef.current = abortController;

      try {
        const apiBaseUrl = apiUrl || 'http://localhost:38471';
        const resultText = await nonStreamingHandler.execute({
          apiBaseUrl,
          signal: abortController.signal,
          apiKey: apiKey || undefined,
          model: model || undefined,
          prompt: promptRef.current,
          systemPrompt: systemPromptRef.current,
          maxTokens: maxTokensRef.current,
          imageDataUri: imageDataUriRef.current || undefined,
        });

        setNonStreamingElapsedMs(Date.now() - startTime);
        setNonStreamingOutput(resultText);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        const errorMessage = error instanceof Error ? error.message : 'Request failed';
        setNonStreamingError(errorMessage);
        console.error(`${handler.label} error:`, error);
      } finally {
        setNonStreamingLoading(false);
        nonStreamingAbortRef.current = null;
      }
      return;
    }

    // --- Streaming handler path ---
    const streamingHandler = handler as StreamingApiHandler;

    if (!promptRef.current.trim()) return;

    // Clear non-streaming state when using streaming path
    setNonStreamingOutput('');
    setNonStreamingError('');

    const messages = streamingHandler.buildMessages({
      prompt: promptRef.current,
      systemPrompt: systemPromptRef.current,
      imageDataUri: imageDataUriRef.current,
    });

    try {
      if (metrics.isStreaming) {
        cancel();
        await new Promise(resolve => {
          const checkStopped = () => {
            if (!metrics.isStreaming) resolve(undefined);
            else setTimeout(checkStopped, 10);
          };
          checkStopped();
        });
      }

      const openaiBaseUrl = apiUrl || 'http://localhost:3000';
      const modelName = model || 'gpt-3.5-turbo';
      await stream(messages, modelName, openaiBaseUrl, apiKey, maxTokens, charsPerToken, streamingHandler.extraBody, streamingHandler.authConfig);
    } catch (error) {
      console.error('Stream error:', error);
    }
  }, [apiUrl, apiKey, model, metrics.isStreaming, cancel, stream, maxTokens, charsPerToken, reset]);

  // Keyboard shortcut handler for Alt+Enter / Cmd+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const isSendShortcut = isMac
        ? (e.metaKey && e.key === 'Enter')
        : (e.altKey && e.key === 'Enter');

      if (isSendShortcut && document.activeElement === outputRef.current) {
        e.preventDefault();
        handleSend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSend, metrics.isStreaming]);

  // Derive display values from active handler
  const isStreaming = activeHandler?.streaming ?? true;
  const isProcessing = metrics.isStreaming || nonStreamingLoading;
  const displayOutput = isStreaming ? output : nonStreamingOutput;
  const displayError = isStreaming ? metrics.errorMessage : nonStreamingError;

  // Send button disabled logic — driven by handler UI requirements
  const isSendDisabled = (() => {
    if (!activeHandler) return true;
    if (activeHandler.ui.requiresImage && !imageDataUri) return true;
    if (activeHandler.ui.requiresPrompt && !prompt.trim()) return true;
    return false;
  })();

  return (
    <div className="max-w-6xl mx-auto py-8">
      <ApiTypeWarning pageId="llm-vl" />
      <div className="flex items-center gap-8">

        {/* LEFT SIDE */}
        <div className="flex-1 min-w-0">
          {/* Image Upload / Preview */}
          <div className="mb-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {imageDataUri ? (
              /* Image Preview State */
              <div className="border border-border rounded-sm p-2">
                <img
                  src={imageDataUri}
                  alt={imageFileName}
                  className="w-full max-h-48 object-contain rounded-sm bg-muted/20 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setShowImagePreview(true)}
                  title="Click to view full size"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-subtle truncate">
                    {imageFileName} ({formatFileSize(imageFileSize)})
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-xs text-destructive hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              /* Empty Drop Zone State */
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-sm p-6 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? 'border-ring bg-muted/40'
                    : 'border-border hover:bg-muted/30'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <p className="text-sm text-subtle mb-2">
                  {isDragOver ? 'Drop image here' : 'Drag & drop image here'}
                </p>
                <div className="flex items-center justify-center gap-3 mt-2">
                  <span className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-sm hover:bg-primary/90">
                    Select File
                  </span>
                  <span className="text-xs text-subtle">or</span>
                  <span
                    role="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSampleModal(true);
                    }}
                    className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-sm hover:bg-primary/90"
                  >
                    Select Example
                  </span>
                </div>
              </div>
            )}

            {imageError && (
              <p className="mt-1 text-xs text-destructive">{imageError}</p>
            )}
          </div>

          {/* Prompt inputs — same layout as /llm page */}
          <SystemPromptInput value={systemPrompt} onChange={setSystemPrompt} />
          <UserPromptInput
            value={prompt}
            onChange={setPrompt}
            textareaRef={promptInputRef}
            placeholder="Describe what you want to extract from the image..."
          />
          <MaxTokensInput value={maxTokens} onChange={setMaxTokens} />

          {/* API Type Dropdown — only shown when multiple handlers match the model */}
          {availableHandlers.length > 1 && (
            <div className="mt-4">
              <label className="text-xs font-semibold mb-1 text-subtle block">API Type</label>
              <select
                value={selectedHandlerType}
                onChange={(e) => setSelectedHandlerType(e.target.value)}
                className="w-full p-2 border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background"
              >
                {availableHandlers.map((handler) => (
                  <option key={handler.type} value={handler.type}>
                    {handler.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-subtle mt-1">
                {activeHandler?.description}
              </p>
            </div>
          )}
        </div>

        {/* CENTER COLUMN (ARROW) */}
        <div className="shrink-0">
          <button
            onClick={isProcessing ? handleCancel : handleSend}
            disabled={!isProcessing && isSendDisabled}
            className="group flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={isProcessing ? 'Cancel' : 'Send (Alt+Enter)'}
          >
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
              <div className="absolute inset-0 bg-white rounded-full opacity-5" />
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-primary"
              >
                {isProcessing ? (
                  <>
                    <line x1="6" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    <line x1="18" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </>
                ) : (
                  <path d="M8 4L16 12L8 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
            <span className="text-xs text-subtle">
              {isProcessing ? 'Cancel' : 'Send'}
            </span>
          </button>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex-1 min-w-0">
          {/* Error Message */}
          {displayError && (
            <div className="mt-2 p-2 bg-destructive/20 text-destructive text-sm rounded-sm">
              {displayError}
            </div>
          )}

          <div className="text-xs font-semibold mb-1 text-subtle">
            Output
            {nonStreamingLoading && <span className="ml-2 text-subtle animate-pulse">Processing...</span>}
          </div>
          <textarea
            ref={outputRef}
            className="w-full h-64 p-3 border rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Output text goes here..."
            readOnly
            value={displayOutput}
          />

          {/* Metrics — adapted based on streaming vs non-streaming handler */}
          {isStreaming ? (
            /* Streaming handler metrics */
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
          ) : (
            /* Non-streaming handler metrics — elapsed time only */
            <div className="mt-3 grid grid-cols-3 gap-2 text-sm mb-4">
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground text-subtle">Elapsed</span>
                <span className="font-mono font-medium">{(nonStreamingElapsedMs / 1000).toFixed(3)}s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Preview Lightbox */}
      {showImagePreview && imageDataUri && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setShowImagePreview(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowImagePreview(false);
          }}
        >
          <button
            type="button"
            onClick={() => setShowImagePreview(false)}
            className="absolute top-4 right-4 text-white/80 hover:text-white text-2xl leading-none z-10"
          >
            &times;
          </button>
          <img
            src={imageDataUri}
            alt={imageFileName}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-sm"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Sample Images Modal */}
      {showSampleModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowSampleModal(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setShowSampleModal(false);
          }}
        >
          <div
            className="bg-background border border-border rounded-sm p-5 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold">Select Sample Image</h3>
              <button
                type="button"
                onClick={() => setShowSampleModal(false)}
                className="text-subtle hover:text-foreground text-lg leading-none"
              >
                &times;
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {SAMPLE_IMAGES.map((sample) => (
                <button
                  key={sample.fileName}
                  type="button"
                  onClick={() => handleSelectSample(sample)}
                  className="border border-border rounded-sm p-3 text-center hover:bg-muted/40 transition-colors cursor-pointer"
                >
                  <img
                    src={`/samples/${sample.fileName}`}
                    alt={sample.label}
                    className="w-full h-20 object-contain rounded-sm bg-muted/20 mb-2"
                  />
                  <div className="text-xs font-medium">{sample.label}</div>
                  <div className="text-xs text-subtle mt-0.5">{sample.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
