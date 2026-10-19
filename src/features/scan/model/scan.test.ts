import { describe, expect, it } from 'vitest';
import { barcodeVariants, isValidBarcode, isValidGtin, parseScan, upcEToUpcA } from './scan';

describe('parseScan', () => {
  it('reads plain barcodes', () => {
    expect(parseScan('5449000000996')).toEqual({ type: 'barcode', code: '5449000000996' });
    expect(parseScan(' 5449 0000 00996 ')).toEqual({ type: 'barcode', code: '5449000000996' });
  });

  it('reads GS1 Digital Link QR codes', () => {
    expect(parseScan('https://id.gs1.org/01/09506000134352/10/ABC')).toEqual({
      type: 'barcode',
      code: '9506000134352',
    });
  });

  it('reads GS1 element strings', () => {
    expect(parseScan('(01)05449000000996(17)250101')).toEqual({ type: 'barcode', code: '5449000000996' });
  });

  it('treats other links and text as non-products', () => {
    expect(parseScan('https://example.com/promo').type).toBe('url');
    expect(parseScan('hello').type).toBe('text');
    expect(parseScan(['javascript', 'alert(1)'].join(':')).type).toBe('text');
    expect(parseScan(null).type).toBe('text');
  });
});

describe('barcode helpers', () => {
  it('suggests UPC/EAN spellings', () => {
    expect(barcodeVariants('012345678905')).toEqual(['012345678905', '0012345678905']);
    expect(barcodeVariants('0012345678905')).toEqual(['0012345678905', '012345678905']);
  });

  it('accepts 8 to 14 digits', () => {
    expect(isValidBarcode('12345670')).toBe(true);
    expect(isValidBarcode('1234567')).toBe(false);
    expect(isValidBarcode('12a45670')).toBe(false);
  });
});

describe('check digits', () => {
  it('accepts real EAN-13, UPC-A and EAN-8 codes', () => {
    for (const code of ['5449000000996', '3017620422003', '012345678905', '96385074']) {
      expect(isValidGtin(code), code).toBe(true);
    }
  });

  it('rejects misreads and wrong lengths', () => {
    expect(isValidGtin('5449000000997')).toBe(false);
    expect(isValidGtin('123456789')).toBe(false);
    expect(isValidGtin('abcdefgh')).toBe(false);
  });

  it('understands UPC-E', () => {
    expect(upcEToUpcA('04252614')).toBe('042100005264');
    expect(upcEToUpcA('01234565')).toBe('012345000065');
    expect(isValidGtin('04252614')).toBe(true);
    expect(barcodeVariants('04252614')).toEqual(['04252614', '042100005264', '0042100005264']);
  });
});
