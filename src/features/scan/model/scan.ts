// Works out what a scanned code means: a product barcode, a QR code carrying a barcode
// (GS1 Digital Link, used on newer packaging), or just a web link.

export type ScanResult =
  { type: 'barcode'; code: string } | { type: 'url'; url: string } | { type: 'text'; text: string };

const MAX_SCAN_LENGTH = 2048;
const toGtin13 = (code: string) => (code.length === 14 && code.startsWith('0') ? code.slice(1) : code);

export function parseScan(raw: string | null | undefined): ScanResult {
  const v = (raw ?? '').trim().slice(0, MAX_SCAN_LENGTH);
  const digits = v.replace(/\s/g, '');
  if (/^\d{8,14}$/.test(digits)) return { type: 'barcode', code: toGtin13(digits) };

  const digitalLink = /\/01\/(\d{8,14})(?:[/?#]|$)/.exec(v);
  if (digitalLink?.[1]) return { type: 'barcode', code: toGtin13(digitalLink[1]) };

  const elementString = /^(?:\][A-Za-z]\d)?\(?01\)?(\d{14})/.exec(v);
  if (elementString?.[1]) return { type: 'barcode', code: toGtin13(elementString[1]) };

  if (/^https?:\/\//i.test(v)) return { type: 'url', url: v };
  return { type: 'text', text: v };
}

/** GS1 mod-10 check digit, valid for EAN-8, UPC-A, EAN-13 and GTIN-14. */
function gs1CheckDigitOk(code: string): boolean {
  const digits = Array.from({ length: code.length }, (_, i) => code.charCodeAt(i) - 48);
  const check = digits.pop();
  const sum = digits.reverse().reduce((s, d, i) => s + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

/** Expands an 8-digit UPC-E code (number system 0 or 1) to its 12-digit UPC-A form. */
export function upcEToUpcA(code: string): string | null {
  if (!/^[01]\d{7}$/.test(code)) return null;
  const [s, d1, d2, d3, d4, d5, d6, c] = Array.from({ length: 8 }, (_, i) => code.charAt(i));
  if (d6 === undefined) return null;
  let body: string;
  if ('012'.includes(d6)) body = `${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === '3') body = `${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === '4') body = `${d1}${d2}${d3}${d4}00000${d5}`;
  else body = `${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${s}${body}${c}`;
}

/** True when the number is a real product barcode (right length and check digit). */
export function isValidGtin(code: string): boolean {
  if (!/^(\d{8}|\d{12,14})$/.test(code)) return false;
  if (gs1CheckDigitOk(code)) return true;
  const upcA = code.length === 8 ? upcEToUpcA(code) : null;
  return upcA != null && gs1CheckDigitOk(upcA);
}

/** Other spellings of the same barcode to try when the first lookup misses (UPC-A/E vs EAN-13). */
export function barcodeVariants(code: string): string[] {
  const out = [code];
  if (code.length === 12) out.push(`0${code}`);
  if (code.length === 13 && code.startsWith('0')) out.push(code.slice(1));
  // An 8-digit code can be EAN-8 or UPC-E (some are valid as both), so try the UPC-A form too.
  const upcA = code.length === 8 ? upcEToUpcA(code) : null;
  if (upcA && gs1CheckDigitOk(upcA)) out.push(upcA, `0${upcA}`);
  return out;
}

/** 8-14 digits; use isValidGtin to also check the check digit. */
export const isValidBarcode = (code: string): boolean => /^\d{8,14}$/.test(code);
