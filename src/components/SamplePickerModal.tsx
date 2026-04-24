import { useEffect } from 'react';

export interface SampleFile {
  fileName: string;
  label: string;
  description: string;
  /** Optional thumbnail for non-image files (e.g. PDFs) */
  thumbFileName?: string;
}

export const SAMPLE_IMAGES: SampleFile[] = [
  { fileName: 'receipt.jpg', label: 'Receipt', description: 'Store receipt with items' },
  { fileName: 'invoice.png', label: 'Invoice', description: 'Business invoice document' },
  { fileName: 'handwritten-note.jpg', label: 'Handwritten Note', description: 'Handwritten text on paper' },
  { fileName: 'form.png', label: 'Form', description: 'Filled-out paper form' },
  { fileName: 'cv_de.thumb.png', label: 'CV (German)', description: 'PDF page as image' },
];

export const SAMPLE_PDFS: SampleFile[] = [
  { fileName: 'cv_de.pdf', label: 'CV (German)', description: 'PDF curriculum vitae', thumbFileName: 'cv_de.thumb.png' },
];

export const SAMPLE_AUDIO: SampleFile[] = [
  { fileName: 'voxpopuli_en.wav', label: 'VoxPopuli EN', description: 'EU Parliament speech (English, 6s)' },
];

interface SamplePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sample: SampleFile) => void;
  showPdfs?: boolean;
  showAudio?: boolean;
}

function AudioSampleGrid({ samples, onSelect }: { samples: SampleFile[]; onSelect: (s: SampleFile) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {samples.map((sample) => (
        <button
          key={sample.fileName}
          type="button"
          onClick={() => onSelect(sample)}
          className="border border-border rounded-sm p-3 text-center hover:bg-muted/40 transition-colors cursor-pointer"
        >
          <div className="w-full h-20 flex items-center justify-center rounded-sm bg-muted/20 mb-2">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-muted-foreground">
              <path d="M9 18V5l12-2v13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="18" r="3" stroke="currentColor" strokeWidth="1.5"/>
              <circle cx="18" cy="16" r="3" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
          <div className="text-xs font-medium">{sample.label}</div>
          <div className="text-xs text-subtle mt-0.5">{sample.description}</div>
        </button>
      ))}
    </div>
  );
}

function SampleGrid({ samples, onSelect }: { samples: SampleFile[]; onSelect: (s: SampleFile) => void }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {samples.map((sample) => (
        <button
          key={sample.fileName}
          type="button"
          onClick={() => onSelect(sample)}
          className="border border-border rounded-sm p-3 text-center hover:bg-muted/40 transition-colors cursor-pointer"
        >
          <img
            src={`/samples/${sample.thumbFileName ?? sample.fileName}`}
            alt={sample.label}
            className="w-full h-20 object-contain rounded-sm bg-muted/20 mb-2"
          />
          <div className="text-xs font-medium">{sample.label}</div>
          <div className="text-xs text-subtle mt-0.5">{sample.description}</div>
        </button>
      ))}
    </div>
  );
}

export function SamplePickerModal({ open, onClose, onSelect, showPdfs = false, showAudio = false }: SamplePickerModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
      onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
    >
      <div
        className="bg-background border border-border rounded-sm p-5 w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-semibold">Select Sample</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-subtle hover:text-foreground text-lg leading-none"
          >
            &times;
          </button>
        </div>

        {!showAudio && (
          <>
            {showPdfs && <h4 className="text-xs font-semibold text-subtle mb-2">Images</h4>}
            <SampleGrid samples={SAMPLE_IMAGES} onSelect={onSelect} />
          </>
        )}

        {!showAudio && showPdfs && (
          <>
            <h4 className="text-xs font-semibold text-subtle mb-2 mt-4">PDFs</h4>
            <SampleGrid samples={SAMPLE_PDFS} onSelect={onSelect} />
          </>
        )}

        {showAudio && (
          <>
            <h4 className="text-xs font-semibold text-subtle mb-2 mt-4">Audio</h4>
            <AudioSampleGrid samples={SAMPLE_AUDIO} onSelect={onSelect} />
          </>
        )}
      </div>
    </div>
  );
}
