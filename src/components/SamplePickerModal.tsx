import { useEffect, useState, useRef, useCallback } from 'react';

export interface SampleFile {
  fileName: string;
  label: string;
  description: string;
  thumbFileName?: string;
  source?: string;
  expectedText?: string;
  category?: string;
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

const SWISSDIAL_SOURCE = 'SwissDial corpus — ETH Zurich (gitlab.inf.ethz.ch/ou-mtc-public/swiss-dial-samples)';

export const SAMPLE_AUDIO: SampleFile[] = [
  // --- VoxPopuli ---
  {
    fileName: 'voxpopuli_en.wav',
    label: 'VoxPopuli EN',
    description: 'EU Parliament speech (English, 6s)',
    source: 'VoxPopuli dataset — European Parliament recordings (CC0)',
    expectedText: 'This is not something which is either combated nor by the by the commission nor by the European Parliament.',
    category: 'VoxPopuli',
  },

  // --- SwissDial Sample 1: "Die Schweizer treffen im Final auf Russland…" (real speech) ---
  { fileName: 'ch_ag_1682.wav', label: 'AG — Aargau', description: 'Swiss German, real speech', source: SWISSDIAL_SOURCE, category: 'SwissDial — Sport (real speech)',
    expectedText: "D'Schwizer träffe em Final of Russland, die hend em Halbfinal d'Slowakei em Penaltyschüsse mit drü zo zwoi usegschosse." },
  { fileName: 'ch_be_1682.wav', label: 'BE — Bern', description: 'Swiss German, real speech', source: SWISSDIAL_SOURCE, category: 'SwissDial — Sport (real speech)',
    expectedText: 'D Schwizer träffä im Finau uf Russland, wod Slowakei im angerä Haubfinau mit drü zu zwöi nach Penaltyschiesse het besiegt.' },
  { fileName: 'ch_bs_1682.wav', label: 'BS — Basel', description: 'Swiss German, real speech', source: SWISSDIAL_SOURCE, category: 'SwissDial — Sport (real speech)',
    expectedText: 'D Schwiizer träffe im Final uf Russland, wo d Slowakei im andere Halbfinal mit drei zu zwei nach em Penaltyschiesse besiegt het.' },
  { fileName: 'ch_gr_1682.wav', label: 'GR — Graubünden', description: 'Swiss German, real speech', source: SWISSDIAL_SOURCE, category: 'SwissDial — Sport (real speech)',
    expectedText: 'D Schwizer treffen im Final uf Russland, wo d Slowakei im andera Halbfinal mit drei zu zwei noch Penaltyschüssa nieder grunga het.' },
  { fileName: 'ch_lu_1682.wav', label: 'LU — Luzern', description: 'Swiss German, real speech', source: SWISSDIAL_SOURCE, category: 'SwissDial — Sport (real speech)',
    expectedText: 'D Schwiizer träffed em Final uf Rossland. Die hend d Slowakei em andere Halbfinal mit emene drü zo zwoi em Penaltyschiesse bezwonge.' },
  { fileName: 'ch_sg_1682.wav', label: 'SG — St. Gallen', description: 'Swiss German, real speech', source: SWISSDIAL_SOURCE, category: 'SwissDial — Sport (real speech)',
    expectedText: 'dSchwiizer treffed im Final uf Russland, wo dSlowakei im andere Halbfinal mit drü zwei nochem Penaltyschüsse abegrunge het.' },
  { fileName: 'ch_ws_1682.wav', label: 'VS — Valais', description: 'Swiss German, real speech', source: SWISSDIAL_SOURCE, category: 'SwissDial — Sport (real speech)',
    expectedText: "D'Schwizer träffunt im Final uf Russland, wa d'Slowakei im andru Halbfinal mit drii zu zwei nah Penaltyschiessu nidergrungu het." },
  { fileName: 'ch_zh_1682.wav', label: 'ZH — Zürich', description: 'Swiss German, real speech', source: SWISSDIAL_SOURCE, category: 'SwissDial — Sport (real speech)',
    expectedText: 'D Schwizer träffed im Finale uf Russland, wo d Slowakei im andere Halbfinale mit drü zu zwei im Penaltyschüsse besiegt hät.' },

  // --- SwissDial Example 3: "Die besten Kuchen…" (TTS) ---
  { fileName: 'ag_2.wav', label: 'AG — Aargau', description: 'Swiss German, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Kuchen (TTS)',
    expectedText: 'Die beschte Chüeche woni jemols gässe han, send die wo mini Muetter bache het.' },
  { fileName: 'be_2.wav', label: 'BE — Bern', description: 'Swiss German, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Kuchen (TTS)',
    expectedText: 'Die beschte Chüeche, woni je ha gässe, si die, wo mini Mueter bachet het.' },
  { fileName: 'bs_2.wav', label: 'BS — Basel', description: 'Swiss German, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Kuchen (TTS)',
    expectedText: 'Die beste Küeche, wo ich je gässe ha, sind die, wo mini Mueter backe het.' },
  { fileName: 'gr_2.wav', label: 'GR — Graubünden', description: 'Swiss German, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Kuchen (TTS)',
    expectedText: 'Dia besta Kuacha, wo i jemols gessa han, sind dia, welli mini Muatter bacha het.' },
  { fileName: 'lu_2.wav', label: 'LU — Luzern', description: 'Swiss German, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Kuchen (TTS)',
    expectedText: 'Die beschte Chueche woni jeh gässe ha, sind die wo mini Muetter backe hed.' },
  { fileName: 'sg_2.wav', label: 'SG — St. Gallen', description: 'Swiss German, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Kuchen (TTS)',
    expectedText: 'Di beste Chüeche, woni jemols gesse ha, sind die, wo mini Muetter bache het.' },
  { fileName: 'ws_2.wav', label: 'VS — Valais', description: 'Swiss German, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Kuchen (TTS)',
    expectedText: 'Die beschtu Chiechu, wani jemals gässu ha, sind die, wa mini Müetter gibachu het.' },
  { fileName: 'zh_2.wav', label: 'ZH — Zürich', description: 'Swiss German, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Kuchen (TTS)',
    expectedText: 'Di beste Chüeche woni je gässe han sind die wo mini Mueter bached hät.' },

  // --- SwissDial Code-Switching: Bernese + English (TTS) ---
  { fileName: 'cs_be_0.wav', label: 'CS — Age', description: 'Bernese + English code-switch, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Code-Switching BE↔EN (TTS)',
    expectedText: 'Mir läbe im Age vor Technik.' },
  { fileName: 'cs_be_1.wav', label: 'CS — Cakes', description: 'Bernese + English code-switch, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Code-Switching BE↔EN (TTS)',
    expectedText: 'Die beschtä Cakes, woni je ha gässä, si die, wo mini Mueter bachet het.' },
  { fileName: 'cs_be_2.wav', label: 'CS — Patience', description: 'Bernese + English code-switch, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Code-Switching BE↔EN (TTS)',
    expectedText: 'Mi Fahrlehrer seit, i söu meh Patience ha.' },
  { fileName: 'cs_be_3.wav', label: 'CS — Thanks', description: 'Bernese + English code-switch, TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Code-Switching BE↔EN (TTS)',
    expectedText: 'Versuech bitte chli weniger luut z si, thanks.' },

  // --- SwissDial Bergen/Schneefallgrenze (MT pipeline TTS) ---
  { fileName: 'be_8.wav', label: 'BE — Bern', description: 'Swiss German, MT pipeline TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Bergen/Schnee (MT pipeline)',
    expectedText: 'idä bärgä einzelni schauer wahrschinlech. schneefaugränzä um zwöitusigdrühundert meter.' },
  { fileName: 'sg_8.wav', label: 'SG — St. Gallen', description: 'Swiss German, MT pipeline TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Bergen/Schnee (MT pipeline)',
    expectedText: 'i de berge einzelni schauer wohrschinli. schneefallgrenze um zweituusigdrühundert meter.' },
  { fileName: 'ws_8.wav', label: 'VS — Valais', description: 'Swiss German, MT pipeline TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Bergen/Schnee (MT pipeline)',
    expectedText: 'ine bärgu einzelni schauer wahrschinli. schneefallgränzu um zweitüüsigdriihunert meter.' },
  { fileName: 'zh_8.wav', label: 'ZH — Zürich', description: 'Swiss German, MT pipeline TTS', source: SWISSDIAL_SOURCE, category: 'SwissDial — Bergen/Schnee (MT pipeline)',
    expectedText: 'ide berge einzelni schauer wahrschindli. schneefallgränze um zweitusigdrühundert meter.' },
];

interface SamplePickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (sample: SampleFile) => void;
  showPdfs?: boolean;
  showAudio?: boolean;
}

function AudioSampleCard({ sample, onSelect }: { sample: SampleFile; onSelect: (s: SampleFile) => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handlePlay = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPlaying && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      return;
    }
    const audio = new Audio(`/samples/${sample.fileName}`);
    audio.onended = () => { setIsPlaying(false); audioRef.current = null; };
    audio.play();
    audioRef.current = audio;
    setIsPlaying(true);
  }, [isPlaying, sample.fileName]);

  useEffect(() => {
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } };
  }, []);

  return (
    <div className="border border-border rounded-sm p-3 hover:bg-muted/40 transition-colors">
      <div className="flex items-start gap-3">
        {/* Play button */}
        <button
          type="button"
          onClick={handlePlay}
          className="shrink-0 w-9 h-9 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center transition-colors mt-0.5"
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-foreground">
              <rect x="6" y="4" width="4" height="16" rx="1"/>
              <rect x="14" y="4" width="4" height="16" rx="1"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-foreground ml-0.5">
              <path d="M6 4l14 8-14 8z"/>
            </svg>
          )}
        </button>

        {/* Info + select */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium">{sample.label}</span>
            <button
              type="button"
              onClick={() => onSelect(sample)}
              className="shrink-0 text-xs text-primary hover:underline cursor-pointer"
            >
              Use
            </button>
          </div>
          <div className="text-xs text-subtle mt-0.5">{sample.description}</div>
          {sample.expectedText && (
            <div className="text-xs text-subtle mt-1.5 italic leading-relaxed line-clamp-2" title={sample.expectedText}>
              &ldquo;{sample.expectedText}&rdquo;
            </div>
          )}
          {sample.source && (
            <div className="text-[10px] text-subtle/60 mt-1.5 leading-tight">
              Source: {sample.source}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function groupByCategory(samples: SampleFile[]): Map<string, SampleFile[]> {
  const groups = new Map<string, SampleFile[]>();
  for (const s of samples) {
    const key = s.category ?? '';
    const list = groups.get(key) ?? [];
    list.push(s);
    groups.set(key, list);
  }
  return groups;
}

function AudioSampleGrid({ samples, onSelect }: { samples: SampleFile[]; onSelect: (s: SampleFile) => void }) {
  const grouped = groupByCategory(samples);
  return (
    <div className="space-y-4">
      {[...grouped.entries()].map(([category, items]) => (
        <div key={category}>
          {category && <h5 className="text-xs font-semibold text-subtle mb-2">{category}</h5>}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {items.map((sample) => (
              <AudioSampleCard key={sample.fileName} sample={sample} onSelect={onSelect} />
            ))}
          </div>
        </div>
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
        className={`bg-background border border-border rounded-sm p-5 w-full ${showAudio ? 'max-w-7xl max-h-[85vh] flex flex-col' : 'max-w-2xl'}`}
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
          <div className="overflow-y-auto flex-1 pr-1">
            <AudioSampleGrid samples={SAMPLE_AUDIO} onSelect={onSelect} />
          </div>
        )}
      </div>
    </div>
  );
}
