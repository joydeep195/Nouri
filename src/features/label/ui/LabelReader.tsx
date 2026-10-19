import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Camera, Crop, ImageUp, RotateCcw, Sun, Type } from 'lucide-react';
import type { Product } from '@/features/product/model/types';
import { MAX_IMAGE_BYTES, isAcceptableImage } from '@/shared/lib/files';
import { logger } from '@/shared/lib/logger';
import { TopBar } from '@/shared/ui/TopBar';
import { readLabelPhoto, type LabelReading, type OcrProgress } from '../model/ocr';
import IngredientsForm from './IngredientsForm';
import './label.css';

type Stage = 'pick' | 'reading' | 'review';

interface LabelReaderProps {
  base?: Partial<Product> | undefined;
  onResult: (product: Product) => void;
  onBack: () => void;
  onType: (base?: Partial<Product>) => void;
}

function progressView(p: OcrProgress): { pct: number; text: string } {
  if (p.stage === 'read') {
    return { pct: 35 + Math.round(p.progress * 65), text: `Reading the label… ${Math.round(p.progress * 100)}%` };
  }
  if (p.stage === 'load') return { pct: 8 + Math.round(p.progress * 27), text: 'Getting the reader ready…' };
  return { pct: 4, text: 'Preparing the photo…' };
}

/** Photo of an ingredients label → text (read on the phone) → quick review → score. */
export default function LabelReader({ base, onResult, onBack, onType }: LabelReaderProps) {
  const [stage, setStage] = useState<Stage>('pick');
  const [preview, setPreview] = useState<string | null>(null);
  const [progress, setProgress] = useState<OcrProgress>({ stage: 'prepare', progress: 0 });
  const [read, setRead] = useState<LabelReading | null>(null);
  const [error, setError] = useState('');
  const runId = useRef(0);

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!isAcceptableImage(file)) {
      setError(`Please choose a photo (JPEG, PNG or HEIC) under ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
      return;
    }
    const id = ++runId.current;
    setError('');
    setPreview(URL.createObjectURL(file));
    setStage('reading');
    setProgress({ stage: 'prepare', progress: 0 });
    try {
      const result = await readLabelPhoto(file, (p) => {
        if (id === runId.current) setProgress(p);
      });
      if (id !== runId.current) return;
      setRead(result);
      setStage('review');
    } catch (err) {
      if (id !== runId.current) return;
      logger.error('Label reading failed', err);
      setError("Couldn't read that photo. Try again with a clearer, well-lit picture of the ingredients.");
      setStage('pick');
    }
  };

  const inputs = (
    <>
      <input
        id="label-camera"
        className="file-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => void onFile(e)}
      />
      <input id="label-library" className="file-input" type="file" accept="image/*" onChange={(e) => void onFile(e)} />
    </>
  );

  if (stage === 'review' && read) {
    const little = read.ingredients.replace(/[^a-z]/gi, '').length < 12;
    return (
      <IngredientsForm
        title="Check the label"
        source="label"
        base={base}
        initial={{
          name: base?.name ?? '',
          ingredients: little ? read.text.trim() : read.ingredients,
          nutrition: read.nutrition,
        }}
        banner={little ? 'little' : 'review'}
        onSubmit={onResult}
        onBack={onBack}
        topRight={
          <button
            type="button"
            className="icon-btn"
            aria-label="Retake photo"
            onClick={() => {
              setRead(null);
              setStage('pick');
            }}
          >
            <RotateCcw size={19} />
          </button>
        }
      />
    );
  }

  if (stage === 'reading') {
    const { pct, text } = progressView(progress);
    return (
      <main className="screen has-bar no-tabs">
        <TopBar
          title="Reading label"
          onBack={() => {
            runId.current++;
            setStage('pick');
          }}
        />
        <div className="preview">
          {preview && <img src={preview} alt="The label you chose" />}
          <div className="shimmer" />
        </div>
        <div
          className="progress"
          role="progressbar"
          aria-label="Reading the label"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="progress-text" aria-live="polite">
          {text}
        </p>
      </main>
    );
  }

  return (
    <main className="screen has-bar no-tabs">
      <TopBar title="Read a label" onBack={onBack} />
      <div className="label-art" aria-hidden="true">
        <i />
        <i style={{ width: '92%' }} />
        <i style={{ width: '80%' }} />
        <i style={{ width: '88%' }} />
        <i style={{ width: '60%' }} />
        <i style={{ width: '74%' }} />
        <div className="scan-laser" />
      </div>
      <h2 className="label-title">Snap the ingredients list</h2>
      <p className="label-sub">The text is read on your phone. Include the nutrition table too if it fits.</p>

      {error && (
        <div className="banner warn" role="alert" style={{ marginBottom: 16 }}>
          <span>{error}</span>
        </div>
      )}

      <div className="photo-tips">
        <div className="photo-tip">
          <span>
            <Crop size={17} />
          </span>
          Fill the frame with the ingredients
        </div>
        <div className="photo-tip">
          <span>
            <Sun size={17} />
          </span>
          Good light, no glare, hold steady
        </div>
        <div className="photo-tip">
          <span>
            <Type size={17} />
          </span>
          Flatten curved packs if you can
        </div>
      </div>

      <div className="action-bar" style={{ flexDirection: 'column' }}>
        <label className="btn btn-primary" htmlFor="label-camera">
          <Camera size={20} /> Take a photo
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="btn btn-secondary" htmlFor="label-library" style={{ flex: 1 }}>
            <ImageUp size={19} /> From photos
          </label>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => {
              onType(base);
            }}
          >
            <Type size={19} /> Type it
          </button>
        </div>
      </div>
      {inputs}
    </main>
  );
}
