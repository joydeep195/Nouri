import { useState } from 'react';
import { Search } from 'lucide-react';
import { TopBar } from '@/shared/ui/TopBar';
import { isValidBarcode, isValidGtin } from '../model/scan';

interface BarcodeEntryProps {
  onSubmit: (code: string) => void;
  onBack: () => void;
}

export default function BarcodeEntry({ onSubmit, onBack }: BarcodeEntryProps) {
  const [code, setCode] = useState('');
  const clean = code.replace(/\D/g, '');
  const valid = isValidGtin(clean);
  // Only complain once a full-length number has been typed.
  const showError = isValidBarcode(clean) && !valid && [8, 12, 13, 14].includes(clean.length);

  return (
    <main className="screen has-bar no-tabs">
      <TopBar title="Barcode number" onBack={onBack} />
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) onSubmit(clean);
        }}
      >
        <div className="banner">
          <Search size={18} aria-hidden="true" />
          <span>Type the numbers printed under the barcode. They&apos;re usually 8 or 13 digits.</span>
        </div>
        <input
          className="input big"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="8901234567890"
          value={code}
          maxLength={18}
          onChange={(e) => {
            setCode(e.target.value.replace(/[^\d ]/g, '').slice(0, 18));
          }}
          aria-label="Barcode number"
          aria-invalid={showError}
          aria-describedby={showError ? 'barcode-error' : undefined}
        />
        {showError && (
          <p id="barcode-error" className="field-error" role="alert" style={{ textAlign: 'center' }}>
            That number doesn&apos;t look right. Check the digits, especially the last one.
          </p>
        )}
        <div className="action-bar">
          <button className="btn btn-primary" type="submit" disabled={!valid}>
            <Search size={20} /> Look it up
          </button>
        </div>
      </form>
    </main>
  );
}
