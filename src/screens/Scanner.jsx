import { useEffect, useRef, useState } from 'react';
import { Camera, Check, CameraOff, Flashlight, FlashlightOff, Hash, ImageUp, ScanText, X } from 'lucide-react';
import { cameraErrorMessage, detectFromImage, getDetector, openCamera } from '../lib/barcode.js';

export default function Scanner({ onDetected, onClose, onLabel, onCode }) {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  onDetectedRef.current = onDetected;

  const [status, setStatus] = useState('starting'); // starting | live | found | error
  const [error, setError] = useState('');
  const [torch, setTorch] = useState({ supported: false, on: false });
  const [attempt, setAttempt] = useState(0);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    let stopped = false;
    let stream;
    let timer;
    setStatus('starting');

    (async () => {
      try {
        const [s, detector] = await Promise.all([openCamera(), getDetector()]);
        if (stopped) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        const video = videoRef.current;
        video.srcObject = s;
        await video.play().catch(() => {});

        const track = s.getVideoTracks()[0];
        trackRef.current = track;
        const caps = track.getCapabilities?.() ?? {};
        setTorch({ supported: !!caps.torch, on: false });
        if (caps.focusMode?.includes?.('continuous')) {
          track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        }
        setStatus('live');

        const tick = async () => {
          if (stopped) return;
          if (video.readyState >= 2) {
            try {
              const codes = await detector.detect(video);
              const hit = codes.find((c) => c.rawValue);
              if (hit && !stopped) {
                stopped = true;
                navigator.vibrate?.(40);
                video.pause();
                setStatus('found');
                setTimeout(() => onDetectedRef.current(hit.rawValue), 450);
                return;
              }
            } catch {
              // a bad frame, keep going
            }
          }
          timer = setTimeout(tick, 120);
        };
        tick();
      } catch (err) {
        if (!stopped) {
          setError(cameraErrorMessage(err));
          setStatus('error');
        }
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
      trackRef.current = null;
    };
  }, [attempt]);

  const toggleTorch = async () => {
    const next = !torch.on;
    try {
      await trackRef.current?.applyConstraints({ advanced: [{ torch: next }] });
      setTorch((t) => ({ ...t, on: next }));
    } catch {
      setTorch({ supported: false, on: false });
    }
  };

  const fromPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setPhotoBusy(true);
    try {
      const raw = await detectFromImage(file);
      if (raw) onDetectedRef.current(raw);
      else {
        setError("We couldn't find a barcode in that photo. Get closer so the barcode fills most of the picture, or read the ingredients label instead.");
        setStatus('error');
      }
    } catch {
      setError("Couldn't read that photo. Try another one.");
      setStatus('error');
    } finally {
      setPhotoBusy(false);
    }
  };

  const photoInput = (
    <input id="barcode-photo" className="file-input" type="file" accept="image/*" onChange={fromPhoto} />
  );

  return (
    <div className="scanner" role="dialog" aria-label="Barcode scanner">
      <video ref={videoRef} playsInline muted autoPlay />

      {(status === 'live' || status === 'found') && (
        <>
          <div className={`scan-frame ${status === 'found' ? 'found' : ''}`}>
            <i />
            <i />
            <i />
            <i />
            <div className="scan-laser" />
            {status === 'found' && (
              <div className="scan-found">
                <span>
                  <Check size={34} strokeWidth={3} />
                </span>
              </div>
            )}
          </div>
          <p className="scan-hint">{status === 'found' ? 'Got it!' : 'Point at the barcode or QR code'}</p>
        </>
      )}

      {status === 'starting' && (
        <div className="scan-center">
          <div>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p>Opening camera…</p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="scan-center">
          <div>
            <CameraOff size={44} style={{ opacity: 0.8 }} />
            <h2 style={{ marginTop: 14 }}>Can't scan right now</h2>
            <p>{error}</p>
            <div className="btn-row">
              <button className="btn btn-white" onClick={() => setAttempt((a) => a + 1)}>
                <Camera size={20} /> Try the camera again
              </button>
              <label className="btn btn-secondary" htmlFor="barcode-photo" style={{ cursor: 'pointer' }}>
                <ImageUp size={20} /> {photoBusy ? 'Reading photo…' : 'Use a photo of the barcode'}
              </label>
            </div>
          </div>
        </div>
      )}

      <div className="scan-top">
        <button className="glass-btn" onClick={onClose} aria-label="Close scanner">
          <X size={22} />
        </button>
        {torch.supported && status === 'live' && (
          <button className={`glass-btn ${torch.on ? 'on' : ''}`} onClick={toggleTorch} aria-label="Flashlight">
            {torch.on ? <FlashlightOff size={20} /> : <Flashlight size={20} />}
          </button>
        )}
      </div>

      <div className="scan-panel">
        <button onClick={onLabel}>
          <ScanText size={18} /> Read label
        </button>
        <button onClick={onCode}>
          <Hash size={18} /> Type number
        </button>
      </div>
      {photoInput}
    </div>
  );
}
