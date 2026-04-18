import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { useStore } from '@/store/useStore';
import { ApiTypeWarning } from '@/components/ApiTypeWarning';
import { getApiHandler } from '@/services/api-handlers/registry';
import type { NonStreamingApiHandler } from '@/services/api-handlers/types';

const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

/** The fixed handler type for this page */
const HANDLER_TYPE = 'paddleocr';

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

export function PaddleOcr() {
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageFileSize, setImageFileSize] = useState<number>(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [imageError, setImageError] = useState<string>('');
  const [showSampleModal, setShowSampleModal] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const [outputText, setOutputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [elapsedMs, setElapsedMs] = useState<number>(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { apiUrl, apiKey } = useStore();

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputText]);

  // Close sample modal on Escape
  useEffect(() => {
    if (!showSampleModal) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSampleModal(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showSampleModal]);

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
    if (file) loadImageFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
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
    if (file) loadImageFile(file);
  };

  const handleSelectSample = useCallback(async (sample: SampleImage) => {
    setImageError('');
    try {
      const dataUri = await fetchSampleImageAsDataUri(sample.fileName);
      setImageDataUri(dataUri);
      setImageFileName(sample.fileName);
      setImageFileSize(0);
      setShowSampleModal(false);
    } catch {
      setImageError(`Failed to load sample image: ${sample.fileName}`);
      setShowSampleModal(false);
    }
  }, []);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!imageDataUri) return;

    const handler = getApiHandler(HANDLER_TYPE) as NonStreamingApiHandler | undefined;
    if (!handler) {
      setErrorMessage(`Handler "${HANDLER_TYPE}" not found in registry.`);
      return;
    }

    // Cancel any ongoing request
    if (abortControllerRef.current) abortControllerRef.current.abort();

    setOutputText('');
    setErrorMessage('');
    setIsLoading(true);
    setElapsedMs(0);

    const startTime = Date.now();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const apiBaseUrl = apiUrl || 'http://localhost:38471';
      const resultText = await handler.execute({
        apiBaseUrl,
        signal: abortController.signal,
        apiKey: apiKey || undefined,
        imageDataUri,
      });
      setElapsedMs(Date.now() - startTime);
      setOutputText(resultText);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const message = error instanceof Error ? error.message : 'Request failed';
      setErrorMessage(message);
      console.error('PaddleOCR error:', error);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [imageDataUri, apiUrl]);

  const isProcessing = isLoading;
  const isSendDisabled = !imageDataUri;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <ApiTypeWarning pageId="paddle-ocr" />
      <div className="flex items-center gap-8">

        {/* LEFT SIDE — Image Upload */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            {imageDataUri ? (
              <div className="border border-border rounded-sm p-2">
                <img
                  src={imageDataUri}
                  alt={imageFileName}
                  className="w-full max-h-[400px] object-contain rounded-sm bg-muted/20 cursor-pointer hover:opacity-80 transition-opacity"
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
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-sm p-6 min-h-[460px] flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${
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
        </div>

        {/* CENTER — Send/Cancel Button */}
        <div className="shrink-0">
          <button
            onClick={isProcessing ? handleCancel : handleSend}
            disabled={!isProcessing && isSendDisabled}
            className="group flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={isProcessing ? 'Cancel' : 'Send'}
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

        {/* RIGHT SIDE — Output */}
        <div className="flex-1 min-w-0">
          {errorMessage && (
            <div className="mt-2 p-2 bg-destructive/20 text-destructive text-sm rounded-sm">
              {errorMessage}
            </div>
          )}

          <div className="text-xs font-semibold mb-1 text-subtle">
            Output
            {isLoading && <span className="ml-2 text-subtle animate-pulse">Processing...</span>}
          </div>
          <div
            ref={outputRef}
            className="w-full h-[460px] p-3 border rounded-sm text-sm overflow-y-auto"
          >
            {outputText ? (
              <article className="api-standards-doc prose prose-sm dark:prose-invert max-w-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                >
                  {outputText}
                </ReactMarkdown>
              </article>
            ) : (
              <p className="text-muted-foreground">Parsed document text will appear here...</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm mb-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground text-subtle">Elapsed</span>
              <span className="font-mono font-medium">{(elapsedMs / 1000).toFixed(3)}s</span>
            </div>
          </div>
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
