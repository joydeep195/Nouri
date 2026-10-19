import { useEffect, useRef, useState } from 'react';
import { Camera, Crop, ImageUp, RotateCcw, Sun, Type } from 'lucide-react';
import { readLabelPhoto } from '../lib/ocr.js';
import { TopBar } from '../components/ui.jsx';
import IngredientsForm from './IngredientsForm.jsx';

/** Photo of an ingredients label → text (read on the phone) → quick review → score. */
export default function LabelReader({ base, onResult, onBack, onType }) {
  const [stage, setStage] = useState('pick'); // pick | reading | review
  const [preview, setPreview] = useState(null);
  const [progress, setProgress] = useState({ stage: 'prepare', progress: 0 });
  const [read, setRead] = useState(null);
  const [error, setError] = useState('');
  const runId = useRef(0);

  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview]);

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const id = ++runId.current;
    setError('');
    setPreview(URL.createObjectURL(file));
    setStage('reading');
    setProgress({ stage: 'prepare', progress: 0 });
    try {
      const result = await readLabelPhoto(file, (p) => id === runId.current && setProgress(p));
      if (id !== runId.current) return;
      setRead(result);
      setStage('review');
    } catch (err) {
      if (id !== runId.current) return;
      console.error(err);
      setError("Couldn't read that photo. Check your internet connection the first time you use this (the reader needs to download once), then try again.");
      setStage('pick');
    }
  };

  const inputs = (
    <>
      <input id="label-camera" className="file-input" type="file" accept="image/*" capture="environment" onChange={onFile} />
      <input id="label-library" className="file-input" type="file" accept="image/*" onChange={onFile} />
    </>
  );

  if (stage === 'review' && read) {
    const little = read.ingredients.replace(/[^a-z]/gi, '').length < 12;
    return (
      <IngredientsForm
        title="Check the label"
        source="label"
        base={base}
        initial={{ name: base?.name ?? '', ingredients: little ? read.text.trim() : read.ingredients, nutrition: read.nutrition }}
        banner={little ? 'little' : 'review'}
        onSubmit={onResult}
        onBack={onBack}
        topRight={
          <button
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
    const pct =
      progress.stage === 'read' ? 35 + Math.round(progress.progress * 65) : progress.stage === 'load' ? 8 + Math.round((progress.progress || 0) * 27) : 4;
    const text =
      progress.stage === 'read'
        ? `Reading the label… ${Math.round(progress.progress * 100)}%`
        : progress.stage === 'load'
          ? 'Getting the reader ready…'
          : 'Preparing the photo…';
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
          {preview && <img src={preview} alt="Your label photo" />}
          <div className="shimmer" />
        </div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <p className="progress-text">{text}</p>
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
      <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', textAlign: 'center' }}>Snap the ingredients list</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-2)', margin: '8px 0 20px', lineHeight: 1.5, fontSize: 15 }}>
        The text is read on your phone. Include the nutrition table too if it fits.
      </p>

      {error && (
        <div className="banner warn" style={{ marginBottom: 16 }}>
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
          <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => onType(base)}>
            <Type size={19} /> Type it
          </button>
        </div>
      </div>
      {inputs}
    </main>
  );
}
