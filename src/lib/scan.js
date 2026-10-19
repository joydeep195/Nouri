// Works out what a scanned code means: a product barcode, a QR code carrying a barcode
// (GS1 Digital Link, used on newer packaging), or just a web link.

const toGtin13 = (code) => (code.length === 14 && code.startsWith('0') ? code.slice(1) : code);

export function parseScan(raw) {
  const v = String(raw || '').trim();
  const digits = v.replace(/\s/g, '');
  if (/^\d{8,14}$/.test(digits)) return { type: 'barcode', code: toGtin13(digits) };

  const digitalLink = /\/01\/(\d{8,14})(?:[/?#]|$)/.exec(v);
  if (digitalLink) return { type: 'barcode', code: toGtin13(digitalLink[1]) };

  const elementString = /^(?:\][A-Za-z]\d)?\(?01\)?(\d{14})/.exec(v);
  if (elementString) return { type: 'barcode', code: toGtin13(elementString[1]) };

  if (/^https?:\/\//i.test(v)) return { type: 'url', url: v };
  return { type: 'text', text: v };
}

/** Other spellings of the same barcode to try when the first lookup misses (UPC-A vs EAN-13). */
export function barcodeVariants(code) {
  const out = [code];
  if (code.length === 12) out.push(`0${code}`);
  if (code.length === 13 && code.startsWith('0')) out.push(code.slice(1));
  return out;
}

export const isValidBarcode = (code) => /^\d{8,14}$/.test(code);
