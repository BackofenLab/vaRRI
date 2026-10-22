// Bound allocations before asking the browser to create a raster canvas.
export const MAX_PNG_DIMENSION = 16384;
export const MAX_PNG_PIXELS = 64 * 1024 * 1024;
export const MAX_PNG_DPI = 100000;

export function validatePNGOptions({ width, height, dpi = 96 }) {
  if (![width, height].every(value => Number.isInteger(value) && value > 0 && value <= MAX_PNG_DIMENSION)) {
    throw new Error(`PNG width and height must be whole numbers between 1 and ${MAX_PNG_DIMENSION} pixels.`);
  }
  if (width * height > MAX_PNG_PIXELS) {
    throw new Error('PNG resolution must not exceed 64 megapixels. Reduce the width or height.');
  }
  if (!Number.isFinite(dpi) || dpi < 1 || dpi > MAX_PNG_DPI) {
    throw new Error(`PNG DPI must be between 1 and ${MAX_PNG_DPI}.`);
  }
  return { width, height, dpi };
}
