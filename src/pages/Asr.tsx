import { useState, useRef, useCallback, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { ApiTypeWarning } from '@/components/ApiTypeWarning';
import { getApiHandler } from '@/services/api-handlers/registry';
import type { NonStreamingApiHandler } from '@/services/api-handlers/types';
import { SamplePickerModal, type SampleFile } from '@/components/SamplePickerModal';

/**
 * Audio formats accepted by the OpenAI /v1/audio/transcriptions endpoint.
 * Spec: https://platform.openai.com/docs/api-reference/audio/createTranscription
 */
const ACCEPTED_AUDIO_TYPES = [
  'audio/flac', 'audio/mp3', 'audio/mpeg', 'audio/mp4', 'audio/m4a',
  'audio/ogg', 'audio/wav', 'audio/webm', 'audio/x-wav',
];
const ACCEPTED_AUDIO_EXTENSIONS = '.flac,.mp3,.mp4,.mpeg,.mpga,.m4a,.ogg,.wav,.webm';
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25MB per OpenAI spec

const HANDLER_TYPE = 'openai-asr';

/**
 * ISO 639-1 language codes supported by Cohere Transcribe and Whisper.
 * Displayed in the language selector dropdown.
 */
const LANGUAGES = [
  { code: '', label: 'Auto-detect' },
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'es', label: 'Spanish' },
  { code: 'it', label: 'Italian' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'nl', label: 'Dutch' },
  { code: 'pl', label: 'Polish' },
  { code: 'el', label: 'Greek' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ko', label: 'Korean' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'vi', label: 'Vietnamese' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

export function Asr() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState('');
  const [audioFileSize, setAudioFileSize] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState('');
  const [language, setLanguage] = useState('');
  const [showSampleModal, setShowSampleModal] = useState(false);

  const [outputText, setOutputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const recordingChunksRef = useRef<Float32Array[]>([]);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { apiUrl, apiKey, model } = useStore();

  const loadAudioFile = useCallback((file: File) => {
    setFileError('');
    const isAcceptedType = ACCEPTED_AUDIO_TYPES.includes(file.type) ||
      /\.(flac|mp3|mp4|mpeg|mpga|m4a|ogg|wav|webm)$/i.test(file.name);
    if (!isAcceptedType) {
      setFileError(`Unsupported format: ${file.type || file.name.split('.').pop()}. Use: flac, mp3, mp4, ogg, wav, webm.`);
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFileError(`File too large: ${formatFileSize(file.size)}. Maximum is 25MB.`);
      return;
    }
    setAudioFile(file);
    setAudioFileName(file.name);
    setAudioFileSize(file.size);
    setAudioDuration(null);

    // Get duration from audio element
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => {
      setAudioDuration(audio.duration);
      URL.revokeObjectURL(url);
    });
    audio.addEventListener('error', () => {
      URL.revokeObjectURL(url);
    });
    audioElementRef.current = audio;
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadAudioFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveFile = () => {
    setAudioFile(null);
    setAudioFileName('');
    setAudioFileSize(0);
    setAudioDuration(null);
    setFileError('');
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
    if (file) loadAudioFile(file);
  };

  const handleSelectSample = useCallback(async (sample: SampleFile) => {
    setFileError('');
    try {
      const response = await fetch(`/samples/${sample.fileName}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], sample.fileName, { type: blob.type || 'audio/wav' });
      loadAudioFile(file);
      setShowSampleModal(false);
    } catch {
      setFileError(`Failed to load sample: ${sample.fileName}`);
      setShowSampleModal(false);
    }
  }, [loadAudioFile]);

  const handleStartRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      recordingChunksRef.current = [];

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0);
        recordingChunksRef.current.push(new Float32Array(data));
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      recordingStreamRef.current = stream;
      audioContextRef.current = audioCtx;

      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration((d) => d + 1);
      }, 1000);
    } catch {
      setFileError('Microphone access denied or unavailable.');
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    const stream = recordingStreamRef.current;
    const audioCtx = audioContextRef.current;
    if (stream) stream.getTracks().forEach((t) => t.stop());

    const sampleRate = audioCtx?.sampleRate ?? 44100;
    if (audioCtx) audioCtx.close();
    recordingStreamRef.current = null;
    audioContextRef.current = null;

    // Merge chunks into a single PCM buffer
    const chunks = recordingChunksRef.current;
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    const pcm = new Float32Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      pcm.set(chunk, offset);
      offset += chunk.length;
    }
    recordingChunksRef.current = [];

    // Encode as 16-bit PCM WAV
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
    const dataSize = pcm.length * numChannels * (bitsPerSample / 8);
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    const writeString = (off: number, str: string) => {
      for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i));
    };
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, numChannels * (bitsPerSample / 8), true);
    view.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);

    let pos = 44;
    for (let i = 0; i < pcm.length; i++) {
      const s = Math.max(-1, Math.min(1, pcm[i]));
      view.setInt16(pos, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      pos += 2;
    }

    const blob = new Blob([buffer], { type: 'audio/wav' });
    const file = new File([blob], 'recording.wav', { type: 'audio/wav' });
    loadAudioFile(file);
    setIsRecording(false);
    setRecordingDuration(0);
  }, [loadAudioFile]);

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (recordingStreamRef.current) recordingStreamRef.current.getTracks().forEach((t) => t.stop());
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = useCallback(async () => {
    if (!audioFile) return;

    const handler = getApiHandler(HANDLER_TYPE) as NonStreamingApiHandler | undefined;
    if (!handler) {
      setErrorMessage(`Handler "${HANDLER_TYPE}" not found in registry.`);
      return;
    }

    if (abortControllerRef.current) abortControllerRef.current.abort();

    setOutputText('');
    setErrorMessage('');
    setIsLoading(true);
    setElapsedMs(0);

    const startTime = Date.now();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const apiBaseUrl = apiUrl || 'http://localhost:8000';
      const resultText = await handler.execute({
        apiBaseUrl,
        signal: abortController.signal,
        apiKey: apiKey || undefined,
        model: model || undefined,
        audioFile,
        language: language || undefined,
      });
      setElapsedMs(Date.now() - startTime);
      setOutputText(resultText);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      const message = error instanceof Error ? error.message : 'Transcription request failed';
      setErrorMessage(message);
      console.error('ASR transcription error:', error);
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [audioFile, apiUrl, apiKey, model, language]);

  const isProcessing = isLoading;
  const isSendDisabled = !audioFile;

  return (
    <div className="max-w-6xl mx-auto py-8">
      <ApiTypeWarning pageId="asr" />
      <div className="flex items-center gap-8">

        {/* LEFT — Audio Upload */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <input
              type="file"
              ref={fileInputRef}
              accept={ACCEPTED_AUDIO_EXTENSIONS}
              className="hidden"
              onChange={handleFileSelect}
            />

            {audioFile ? (
              <div className="border border-border rounded-sm p-4">
                <div className="flex flex-col items-center justify-center py-8">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" className="text-muted-foreground mb-3">
                    <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
                  </svg>
                  <span className="text-sm font-medium">{audioFileName}</span>
                  <span className="text-xs text-subtle mt-1">
                    {formatFileSize(audioFileSize)}
                    {audioDuration !== null && ` · ${formatDuration(audioDuration)}`}
                  </span>
                </div>
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={handleRemoveFile}
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
                className={`border-2 border-dashed rounded-sm p-6 min-h-[300px] flex flex-col items-center justify-center text-center transition-colors ${
                  isRecording
                    ? 'border-destructive bg-destructive/5'
                    : isDragOver
                      ? 'border-ring bg-muted/40'
                      : 'border-border hover:bg-muted/30'
                } ${isRecording ? '' : 'cursor-pointer'}`}
                onClick={isRecording ? undefined : () => fileInputRef.current?.click()}
              >
                {isRecording ? (
                  <>
                    <div className="relative mb-3">
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-destructive animate-pulse">
                        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor"/>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </div>
                    <p className="text-sm text-destructive font-medium mb-1">Recording...</p>
                    <p className="text-xs text-subtle mb-3 font-mono">{formatDuration(recordingDuration)}</p>
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="text-xs bg-destructive text-white px-4 py-2 rounded-sm hover:bg-destructive/90"
                    >
                      Stop Recording
                    </button>
                  </>
                ) : (
                  <>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-muted-foreground mb-3">
                      <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    <p className="text-sm text-subtle mb-2">
                      {isDragOver ? 'Drop audio file here' : 'Drag & drop audio file here'}
                    </p>
                    <p className="text-xs text-subtle mb-3">flac, mp3, mp4, ogg, wav, webm · max 25MB</p>
                    <div className="flex items-center justify-center gap-3">
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
                      <span className="text-xs text-subtle">or</span>
                      <span
                        role="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRecording();
                        }}
                        className="text-xs bg-primary text-primary-foreground px-4 py-2 rounded-sm hover:bg-primary/90 inline-flex items-center gap-1.5"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                          <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Record
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {fileError && (
              <p className="mt-1 text-xs text-destructive">{fileError}</p>
            )}
          </div>

          {/* Language Selector */}
          <div>
            <label htmlFor="asr-language" className="text-xs font-semibold text-subtle mb-1 block">
              Language
            </label>
            <select
              id="asr-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 border rounded-sm text-sm bg-background"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}{lang.code ? ` (${lang.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CENTER — Send/Cancel */}
        <div className="shrink-0">
          <button
            onClick={isProcessing ? handleCancel : handleSend}
            disabled={!isProcessing && isSendDisabled}
            className="group flex flex-col items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title={isProcessing ? 'Cancel' : 'Transcribe'}
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
              {isProcessing ? 'Cancel' : 'Transcribe'}
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
            Transcription
            {isLoading && <span className="ml-2 text-subtle animate-pulse">Transcribing...</span>}
          </div>
          <div className="w-full min-h-[300px] p-3 border rounded-sm text-sm overflow-y-auto">
            {outputText ? (
              <p className="whitespace-pre-wrap">{outputText}</p>
            ) : (
              <p className="text-muted-foreground">Transcribed text will appear here...</p>
            )}
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-sm mb-4">
            <div className="flex flex-col">
              <span className="text-xs text-muted-foreground text-subtle">Elapsed</span>
              <span className="font-mono font-medium">{(elapsedMs / 1000).toFixed(3)}s</span>
            </div>
            {audioDuration !== null && elapsedMs > 0 && (
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground text-subtle">RTFx</span>
                <span className="font-mono font-medium">{(audioDuration / (elapsedMs / 1000)).toFixed(1)}x</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <SamplePickerModal
        open={showSampleModal}
        onClose={() => setShowSampleModal(false)}
        onSelect={handleSelectSample}
        showAudio
      />
    </div>
  );
}
