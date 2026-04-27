import { useState, useRef, useCallback, useEffect, useImperativeHandle, forwardRef } from 'react';

export interface AudioRecorderHandle {
  getRecordingFile: () => File | null;
  hasRecording: () => boolean;
}

interface AudioRecorderProps {
  onCancel: () => void;
}

type RecorderState = 'idle' | 'recording' | 'paused';

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(mins)}:${pad(secs)}`;
}

export const AudioRecorder = forwardRef<AudioRecorderHandle, AudioRecorderProps>(
  function AudioRecorder({ onCancel }, ref) {
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState('');
    const [recorderState, setRecorderState] = useState<RecorderState>('idle');
    const [duration, setDuration] = useState(0);
    const [audioLevel, setAudioLevel] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState('');

    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const levelFrameRef = useRef<number>(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const playbackAudioRef = useRef<HTMLAudioElement | null>(null);
    const mimeTypeRef = useRef<string>('audio/webm');

    const buildBlob = useCallback((): Blob | null => {
      if (chunksRef.current.length === 0) return null;
      return new Blob(chunksRef.current, { type: mimeTypeRef.current });
    }, []);

    useImperativeHandle(ref, () => ({
      getRecordingFile: () => {
        // Flush pending data from active recorder
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.requestData();
        }
        const blob = buildBlob();
        if (!blob) return null;
        const extension = mimeTypeRef.current.includes('webm') ? 'webm' : 'ogg';
        return new File([blob], `recording.${extension}`, { type: mimeTypeRef.current });
      },
      hasRecording: () => chunksRef.current.length > 0,
    }), [buildBlob]);

    // --- Device enumeration ---

    const refreshDevices = useCallback(async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = allDevices.filter((d) => d.kind === 'audioinput');
        setDevices(audioInputs);
        setSelectedDeviceId((prev) => {
          if (prev && audioInputs.some((d) => d.deviceId === prev)) return prev;
          return audioInputs.length > 0 ? audioInputs[0].deviceId : '';
        });
      } catch {
        // Permission not yet granted
      }
    }, []);

    useEffect(() => {
      refreshDevices();
      navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
      return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    }, [refreshDevices]);

    // --- Mic preview (level meter) ---

    const startPreview = useCallback(async (deviceId: string) => {
      if (levelFrameRef.current) cancelAnimationFrame(levelFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current && !mediaRecorderRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      analyserRef.current = null;
      audioContextRef.current = null;

      if (!deviceId) return;

      try {
        const constraints: MediaTrackConstraints = { channelCount: 1 };
        if (deviceId) constraints.deviceId = { exact: deviceId };
        const stream = await navigator.mediaDevices.getUserMedia({ audio: constraints });
        refreshDevices();

        const audioCtx = new AudioContext();
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        streamRef.current = stream;
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const updateLevel = () => {
          if (!analyserRef.current) return;
          const data = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteTimeDomainData(data);
          let max = 0;
          for (let i = 0; i < data.length; i++) {
            const amplitude = Math.abs(data[i] - 128);
            if (amplitude > max) max = amplitude;
          }
          setAudioLevel(max / 128);
          levelFrameRef.current = requestAnimationFrame(updateLevel);
        };
        levelFrameRef.current = requestAnimationFrame(updateLevel);
        setError('');
      } catch {
        setError('Microphone access denied or unavailable.');
      }
    }, [refreshDevices]);

    useEffect(() => {
      if (selectedDeviceId && recorderState === 'idle') {
        startPreview(selectedDeviceId);
      }
    }, [selectedDeviceId, recorderState, startPreview]);

    // --- Cleanup ---

    useEffect(() => {
      return () => {
        if (levelFrameRef.current) cancelAnimationFrame(levelFrameRef.current);
        if (timerRef.current) clearInterval(timerRef.current);
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
        }
        if (audioContextRef.current) audioContextRef.current.close();
        if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
        if (playbackAudioRef.current) {
          playbackAudioRef.current.pause();
          playbackAudioRef.current = null;
        }
      };
    }, []);

    // --- Recording controls ---

    const handleStartRecording = useCallback(() => {
      const stream = streamRef.current;
      if (!stream) return;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      mimeTypeRef.current = mimeType;

      // Only clear chunks on first start, not on resume
      if (recorderState === 'idle') {
        chunksRef.current = [];
        setDuration(0);
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;

      setRecorderState('recording');
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }, [recorderState]);

    const handlePauseRecording = useCallback(() => {
      const recorder = mediaRecorderRef.current;
      if (recorder && recorder.state === 'recording') {
        recorder.requestData();
        recorder.stop();
        mediaRecorderRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setRecorderState('paused');
    }, []);

    const handleResumeRecording = useCallback(() => {
      const stream = streamRef.current;
      if (!stream) return;

      const recorder = new MediaRecorder(stream, { mimeType: mimeTypeRef.current });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.start(250);
      mediaRecorderRef.current = recorder;

      setRecorderState('recording');
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    }, []);

    const handleReset = useCallback(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (playbackAudioRef.current) {
        playbackAudioRef.current.pause();
        playbackAudioRef.current = null;
        setIsPlaying(false);
      }
      chunksRef.current = [];
      setDuration(0);
      setRecorderState('idle');
    }, []);

    // --- Playback ---

    const handlePlay = useCallback(() => {
      if (isPlaying && playbackAudioRef.current) {
        playbackAudioRef.current.pause();
        playbackAudioRef.current = null;
        setIsPlaying(false);
        return;
      }

      // Pause recording first if active
      if (recorderState === 'recording') {
        handlePauseRecording();
      }

      const blob = buildBlob();
      if (!blob) return;

      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsPlaying(false);
        playbackAudioRef.current = null;
      };
      audio.play();
      playbackAudioRef.current = audio;
      setIsPlaying(true);
    }, [isPlaying, recorderState, handlePauseRecording, buildBlob]);

    const handleCancel = useCallback(() => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (levelFrameRef.current) cancelAnimationFrame(levelFrameRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (playbackAudioRef.current) playbackAudioRef.current.pause();
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      mediaRecorderRef.current = null;
      analyserRef.current = null;
      audioContextRef.current = null;
      onCancel();
    }, [onCancel]);

    const hasChunks = chunksRef.current.length > 0 || recorderState !== 'idle';
    const levelPercent = audioLevel > 0.001
      ? Math.min(100, Math.max(0, (1 + Math.log10(audioLevel) / 2)) * 100)
      : 0;

    return (
      <div className="flex flex-col items-center justify-center gap-4 py-4 w-full">
        {/* Mic icon */}
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
          className={recorderState === 'recording' ? 'text-destructive animate-pulse' : 'text-muted-foreground'}
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor"/>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          <line x1="12" y1="19" x2="12" y2="22" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>

        {/* Device selector */}
        {devices.length > 0 && (
          <select
            value={selectedDeviceId}
            onChange={(e) => setSelectedDeviceId(e.target.value)}
            disabled={recorderState !== 'idle'}
            className="w-64 px-3 py-1.5 border rounded-sm text-xs bg-background disabled:opacity-50"
          >
            {devices.map((device) => (
              <option key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId.slice(0, 8)}…`}
              </option>
            ))}
          </select>
        )}

        {/* Level meter */}
        <div className="w-64 flex flex-col items-center gap-1">
          <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-75 ${
                recorderState === 'recording' ? 'bg-destructive' : 'bg-primary'
              }`}
              style={{ width: `${levelPercent}%` }}
            />
          </div>
          <span className="text-xs text-subtle">
            {audioLevel < 0.01 ? 'No audio detected' : 'Mic active'}
          </span>
        </div>

        {/* Duration counter */}
        <span className="text-2xl font-mono font-medium tabular-nums">
          {formatDuration(duration)}
          {recorderState === 'paused' && duration > 0 && (
            <span className="text-sm text-subtle ml-2">paused</span>
          )}
        </span>

        {/* Controls */}
        <div className="flex items-center gap-3">
          {/* Record / Pause toggle */}
          {recorderState === 'idle' && (
            <button
              type="button"
              onClick={handleStartRecording}
              disabled={!streamRef.current}
              className="text-xs bg-destructive text-white px-5 py-2 rounded-sm hover:bg-destructive/90 disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8"/>
              </svg>
              Record
            </button>
          )}

          {recorderState === 'recording' && (
            <button
              type="button"
              onClick={handlePauseRecording}
              className="text-xs bg-muted text-foreground px-4 py-2 rounded-sm hover:bg-muted/80 inline-flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1"/>
                <rect x="14" y="4" width="4" height="16" rx="1"/>
              </svg>
              Pause
            </button>
          )}

          {recorderState === 'paused' && (
            <button
              type="button"
              onClick={handleResumeRecording}
              className="text-xs bg-destructive text-white px-4 py-2 rounded-sm hover:bg-destructive/90 inline-flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="12" r="8"/>
              </svg>
              Resume
            </button>
          )}

          {/* Play / Stop playback */}
          {hasChunks && recorderState !== 'recording' && (
            <button
              type="button"
              onClick={handlePlay}
              className="text-xs bg-muted text-foreground px-4 py-2 rounded-sm hover:bg-muted/80 inline-flex items-center gap-1.5"
            >
              {isPlaying ? (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                  Stop
                </>
              ) : (
                <>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 4l14 8-14 8z"/>
                  </svg>
                  Play
                </>
              )}
            </button>
          )}

          {/* Reset */}
          {hasChunks && recorderState !== 'recording' && (
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-subtle hover:text-foreground hover:underline"
            >
              Reset
            </button>
          )}
        </div>

        {/* Back link */}
        <button
          type="button"
          onClick={handleCancel}
          className="text-xs text-subtle hover:text-foreground hover:underline"
        >
          ← Back
        </button>

        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    );
  },
);
