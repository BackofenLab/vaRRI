import { setPNGDensity } from './png-density.js';

function loadImage(session, src, signal) {
  return new Promise((resolve, reject) => {
    const img = new (session.window?.Image || globalThis.Image)();
    const cleanup = () => {
      img.onload = img.onerror = null;
      signal?.removeEventListener('abort', abort);
    };
    const abort = () => {
      cleanup();
      img.src = '';
      reject(signal.reason);
    };
    img.onload = () => { cleanup(); resolve(img); };
    img.onerror = () => { cleanup(); reject(new Error('Could not load the SVG for PNG export.')); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    else img.src = src;
  });
}

export async function rasterizePNG(session, svg, { width, height, dpi, signal }) {
  signal?.throwIfAborted();
  const BlobClass = session.window?.Blob || globalThis.Blob;
  const urls = session.window?.URL || globalThis.URL;
  const source = urls.createObjectURL(new BlobClass([svg], { type: 'image/svg+xml' }));
  let img;
  try {
    try { img = await loadImage(session, source, signal); }
    catch (error) {
      signal?.throwIfAborted();
      img = await loadImage(session, 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg), signal);
    }
  } finally { urls.revokeObjectURL(source); }
  signal?.throwIfAborted();
  const canvas = session.dom.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  try {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not create the PNG canvas. Reduce the resolution and try again.');
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise((resolve, reject) => canvas.toBlob(result => {
      if (result) resolve(result);
      else reject(new Error('Could not encode the PNG. Reduce the resolution and try again.'));
    }, 'image/png'));
    signal?.throwIfAborted();
    const bytes = new Uint8Array(await blob.arrayBuffer());
    signal?.throwIfAborted();
    return new BlobClass(setPNGDensity(bytes, dpi), { type: 'image/png' });
  } finally {
    // Release the potentially large bitmap, including after encoding failures.
    canvas.width = canvas.height = 0;
  }
}
