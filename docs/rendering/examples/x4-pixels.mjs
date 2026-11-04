/**
 * Tutorial conversion, not a device driver or a file-format header.
 * Input: portrait 480x800, RGBA bytes, top-left origin.
 * Output: native 800x480, 100 bytes/row, MSB first, white=1, black=0.
 * Rotation happens exactly once here: portrait (x,y) -> native (y,479-x).
 */
export function packX4(rgba, width = 480, height = 800, threshold = 160) {
  if (width !== 480 || height !== 800) {
    throw new RangeError('packX4 expects portrait 480x800 pixels; do not pre-rotate.');
  }
  if (!(rgba instanceof Uint8Array || rgba instanceof Uint8ClampedArray)) {
    throw new TypeError('rgba must be a Uint8Array or Uint8ClampedArray.');
  }
  if (rgba.length !== width * height * 4) {
    throw new RangeError('rgba must contain exactly 480x800x4 bytes.');
  }
  if (!Number.isInteger(threshold) || threshold < 0 || threshold > 255) {
    throw new RangeError('threshold must be an integer from 0 to 255.');
  }

  const frame = new Uint8Array(100 * 480).fill(0xff);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      const alpha = rgba[offset + 3] / 255;
      // A simple sRGB grayscale threshold, with transparency composited on white.
      const gray = (0.2126 * rgba[offset] + 0.7152 * rgba[offset + 1]
        + 0.0722 * rgba[offset + 2]) * alpha + 255 * (1 - alpha);
      if (gray < threshold) {
        const nativeRow = 479 - x;
        frame[nativeRow * 100 + (y >> 3)] &= ~(0x80 >> (y & 7));
      }
    }
  }
  return frame;
}
