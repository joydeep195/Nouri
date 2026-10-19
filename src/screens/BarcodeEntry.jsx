import { useState } from 'react';
import { Search } from 'lucide-react';
import { TopBar } from '../components/ui.jsx';
import { isValidBarcode } from '../lib/scan.js';

export default function BarcodeEntry({ onSubmit, onBack }) {
  const [code, setCode] = useState('');
  const clean = code.replace(/\D/g, '');
  const valid = isValidBarcode(clean);

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
          <Search size={18} />
          <span>Type the numbers printed under the barcode. They're usually 8 or 13 digits.</span>
        </div>
        <input
          className="input big"
          inputMode="numeric"
          autoComplete="off"
          autoFocus
          placeholder="8901234567890"
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, '').slice(0, 18))}
          aria-label="Barcode number"
        />
        <div className="action-bar">
          <button className="btn btn-primary" type="submit" disabled={!valid}>
            <Search size={20} /> Look it up
          </button>
        </div>
      </form>
    </main>
  );
}
