// PNG pHYs stores pixels per metre, before IDAT. Preserve the encoded pixels.
// https://www.w3.org/TR/png-3/#11pHYs
function densityChunk(dpi) {
  const chunk = new Uint8Array(21);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, 9);
  chunk.set([112, 72, 89, 115], 4); // pHYs
  const pixelsPerMetre = Math.round(dpi / 0.0254);
  view.setUint32(8, pixelsPerMetre);
  view.setUint32(12, pixelsPerMetre);
  chunk[16] = 1; // unit: metre
  let crc = 0xffffffff;
  for (const byte of chunk.subarray(4, 17)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  view.setUint32(17, (crc ^ 0xffffffff) >>> 0);
  return chunk;
}

export function setPNGDensity(bytes, dpi) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (!signature.every((byte, index) => bytes[index] === byte)) throw new Error('Invalid PNG image.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const parts = [bytes.subarray(0, 8)];
  let inserted = false;
  for (let offset = 8; offset < bytes.length;) {
    if (offset + 12 > bytes.length) throw new Error('Incomplete PNG image.');
    const end = offset + 12 + view.getUint32(offset);
    if (end > bytes.length) throw new Error('Incomplete PNG chunk.');
    const type = String.fromCharCode(...bytes.subarray(offset + 4, offset + 8));
    if (type === 'IDAT' && !inserted) {
      parts.push(densityChunk(dpi));
      inserted = true;
    }
    if (type !== 'pHYs') parts.push(bytes.subarray(offset, end));
    offset = end;
  }
  if (!inserted) throw new Error('PNG image has no pixel data.');
  return parts;
}
