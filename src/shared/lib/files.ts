// Guards for files the user picks (label and barcode photos).

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const IMAGE_TYPES = /^image\/(jpeg|png|webp|heic|heif|gif|bmp|avif)$/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|webp|heic|heif|gif|bmp|avif)$/i;

/** True for a non-empty image no bigger than MAX_IMAGE_BYTES. */
export function isAcceptableImage(file: Pick<File, 'size' | 'type' | 'name'>): boolean {
  if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) return false;
  // Some Android galleries report an empty type, so fall back to the file extension.
  return IMAGE_TYPES.test(file.type) || (file.type === '' && IMAGE_EXTENSIONS.test(file.name));
}
