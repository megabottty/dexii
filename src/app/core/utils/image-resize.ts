/** Fits (width, height) inside a square of `maxEdge`, never scaling up. */
export function fitWithin(width: number, height: number, maxEdge: number): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge || longest === 0) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export class UnreadableImageError extends Error {
  constructor() {
    super("That photo format can't be used here (usually HEIC from an iPhone). Please choose a JPG or PNG, or set your camera to \"Most Compatible\".");
    this.name = 'UnreadableImageError';
  }
}

/**
 * Reads an image file and returns it as a JPEG data URI no larger than `maxEdge`
 * on its longest side. Keeps photos small enough to store inline.
 */
export function resizeImageFile(file: File, { maxEdge = 1024, quality = 0.82 } = {}): Promise<{ url: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('Please choose an image file.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read that file.'));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const { width, height } = fitWithin(image.width, image.height, maxEdge);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('Could not process that image.')); return; }
        ctx.drawImage(image, 0, 0, width, height);
        resolve({ url: canvas.toDataURL('image/jpeg', quality), width, height });
      };
      image.onerror = () => reject(new UnreadableImageError());
      image.src = String(reader.result || '');
    };
    reader.readAsDataURL(file);
  });
}
