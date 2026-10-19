import { describe, expect, it } from 'vitest';
import { isAcceptableImage, MAX_IMAGE_BYTES } from './files';

const file = (type: string, size: number, name = 'photo') => ({ type, size, name });

describe('isAcceptableImage', () => {
  it('accepts common phone photo formats', () => {
    for (const t of ['image/jpeg', 'image/png', 'image/heic', 'image/webp'])
      expect(isAcceptableImage(file(t, 1000))).toBe(true);
    expect(isAcceptableImage(file('', 1000, 'IMG_1.HEIC'))).toBe(true);
  });

  it('rejects non-images, empty and oversized files', () => {
    expect(isAcceptableImage(file('image/svg+xml', 1000))).toBe(false);
    expect(isAcceptableImage(file('text/html', 1000))).toBe(false);
    expect(isAcceptableImage(file('', 1000, 'notes.txt'))).toBe(false);
    expect(isAcceptableImage(file('image/jpeg', 0))).toBe(false);
    expect(isAcceptableImage(file('image/jpeg', MAX_IMAGE_BYTES + 1))).toBe(false);
  });
});
