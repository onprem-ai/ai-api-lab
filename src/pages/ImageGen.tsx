import { useState, useRef, useCallback } from 'react';
import { useStore } from '@/store/useStore';
import { ApiTypeWarning } from '@/components/ApiTypeWarning';
import { ExamplePromptsModal } from '@/components/ExamplePromptsModal';
import { getApiHandler } from '@/services/api-handlers/registry';
import type { NonStreamingApiHandler } from '@/services/api-handlers/types';

const IMAGE_SIZES = [
  '256x256',
  '512x512',
  '768x768',
  '1024x1024',
  '1024x1536',
  '1536x1024',
];

const DEFAULT_SIZE = '1024x1024';

const GRID_DELAYS = [0, 0.2, 0.8, 0.2, 0.4, 0.6, 0, 0.2, 0.4];

function GeneratingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 h-[280px]">
      <style>{`
        @keyframes imagegen-grid {
          0%   { transform: scale(0); }
          40%  { transform: scale(1); }
          80%  { transform: scale(1); }
          100% { transform: scale(0); }
        }
      `}</style>
      <div className="grid grid-cols-3 gap-[2px] w-[80px] h-[80px]">
        {GRID_DELAYS.map((delay, i) => (
          <div
            key={i}
            className="bg-primary/70 rounded-[1px]"
            style={{
              transformOrigin: 'center center',
              animation: `imagegen-grid 2s ${delay}s infinite linear`,
              transform: 'scale(0)',
            }}
          />
        ))}
      </div>
      <span className="text-xs text-subtle animate-pulse">Generating…</span>
    </div>
  );
}

export function ImageGen() {
  const [prompt, setPrompt] = useState('');
  const [size, setSize] = useState(DEFAULT_SIZE);
  const [imageResult, setImageResult] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);
  const [showExamples, setShowExamples] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const startTimeRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { apiUrl, apiKey, model, apiType } = useStore();

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setIsLoading(false);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;

    const handler = getApiHandler(apiType) as NonStreamingApiHandler | undefined;
    if (!handler) {
      setErrorMessage(`Handler "${apiType}" not found in registry.`);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();

    setImageResult('');
    setErrorMessage('');
    setIsLoading(true);
    setElapsedMs(0);
    startTimeRef.current = Date.now();
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsedMs(Date.now() - startTimeRef.current), 100);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const apiBaseUrl = apiUrl || 'http://localhost:8000';
      const resultString = await handler.execute({
        apiBaseUrl,
        signal: abortController.signal,
        apiKey: apiKey || undefined,
        model: model || undefined,
        prompt: prompt.trim(),
      });
      setElapsedMs(Date.now() - startTimeRef.current);
      setImageResult(resultString);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        return;
      }
      const message = error instanceof Error ? error.message : 'Image generation failed';
      setErrorMessage(message);
      console.error('Image generation error:', error);
    } finally {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [prompt, apiUrl, apiKey, model, apiType]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const isSendDisabled = !prompt.trim();

  return (
    <div className="max-w-6xl mx-auto py-8">
      <ApiTypeWarning pageId="image-gen" />
      <div className="flex items-center gap-8">

        {/* LEFT — Prompt & Settings */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="image-prompt" className="text-xs font-semibold text-subtle">
                Prompt
              </label>
              <button
                type="button"
                onClick={() => setShowExamples(true)}
                className="text-xs text-subtle hover:text-foreground hover:underline inline-flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>
                </svg>
                Examples
              </button>
            </div>
            <textarea
              id="image-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={4}
              placeholder="Describe the image you want to generate..."
              className="w-full px-3 py-2 border rounded-sm text-sm bg-background resize-y min-h-[100px]"
            />
            <p className="text-xs text-subtle mt-1">Ctrl+Enter to generate</p>
          </div>

          {/* Size Selector */}
          <div>
            <label htmlFor="image-size" className="text-xs font-semibold text-subtle mb-1 block">
              Size
            </label>
            <select
              id="image-size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm text-sm bg-background"
            >
              {IMAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        {/* CENTER — Generate/Cancel */}
        <div className="shrink-0">
          <button
            onClick={isLoading ? handleCancel : handleGenerate}
            disabled={!isLoading && isSendDisabled}
            className="group flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={isLoading ? 'Cancel' : 'Generate'}
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
                {isLoading ? (
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
              {isLoading ? 'Cancel' : 'Generate'}
            </span>
          </button>
        </div>

        {/* RIGHT — Output */}
        <div className="flex-1 min-w-0">
          {errorMessage && (
            <div className="mt-2 p-2 bg-destructive/20 text-destructive text-sm rounded-sm">
              {errorMessage}
            </div>
          )}

          <div className="text-xs font-semibold mb-1 text-subtle">
            Generated Image
          </div>
          <div className="w-full min-h-[300px] p-3 border rounded-sm flex items-center justify-center overflow-hidden">
            {imageResult ? (
              <img
                src={imageResult}
                alt="Generated image"
                className="max-w-full max-h-[500px] rounded-sm"
              />
            ) : isLoading ? (
              <GeneratingAnimation />
            ) : (
              <p className="text-muted-foreground text-sm">Generated image will appear here...</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm mb-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground text-subtle">Elapsed</span>
              <span className="font-mono font-medium">{(elapsedMs / 1000).toFixed(3)}s</span>
            </div>
            {imageResult && elapsedMs > 0 && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground text-subtle">Pixels / sec</span>
                <span className="font-mono font-medium">
                  {(() => {
                    const [w, h] = size.split('x').map(Number);
                    return Math.round((w * h) / (elapsedMs / 1000)).toLocaleString();
                  })()}
                </span>
              </div>
            )}
            {imageResult && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground text-subtle">Size</span>
                <span className="font-mono font-medium">{size}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <ExamplePromptsModal
        open={showExamples}
        onClose={() => setShowExamples(false)}
        onSelect={(selectedPrompt) => setPrompt(selectedPrompt)}
      />
    </div>
  );
}
