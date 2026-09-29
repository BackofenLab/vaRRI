

const SVG_STYLE_PROPS = ['fill', 'fill-opacity', 'fill-rule', 'stroke', 'stroke-width', 'stroke-opacity', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'stroke-miterlimit', 'font-family', 'font-size', 'font-weight', 'font-style', 'text-anchor', 'dominant-baseline', 'alignment-baseline', 'opacity', 'visibility', 'display', 'marker-start', 'marker-end', 'marker-mid', 'color'];

/**
 * Walk `originalEl` and `cloneEl` in parallel, reading computed styles
 * from `originalEl` (which has all browser CSS applied) and writing them
 * as an inline `style` attribute on `cloneEl`.
 *
 * This makes every element carry its own fully-resolved presentation
 * values so the exported SVG is self-contained — no external stylesheet
 * is required.  In particular:
 *  - class-based rules (`.fornac-node`, `.fornac-link`, etc.) are baked in
 *  - relative units (`0.4em` font-size) are resolved to absolute pixels
 *  - inline `style` overrides from vaRRI (strand colours, highlights) are
 *    already included in the computed value, so nothing is lost
 *
 * @param {Element} originalEl  Live DOM element (inside the visible SVG).
 * @param {Element} cloneEl     Corresponding cloned element.
 */
export function inlineComputedStyles(session, originalEl, cloneEl) {
  if (!originalEl || originalEl.nodeType !== 1) return;

  // Leave <style> and <defs> subtrees alone — they hold definitions, not
  // rendered shapes, and rewriting their style attributes would break them.
  const tag = (originalEl.tagName || '').toLowerCase();
  if (tag === 'style' || tag === 'defs') return;
  const computed = session.window.getComputedStyle(originalEl);
  let inlined = '';
  for (const prop of SVG_STYLE_PROPS) {
    const val = computed.getPropertyValue(prop);
    if (val) inlined += `${prop}:${val};`;
  }
  if (inlined) cloneEl.setAttribute('style', inlined);

  // Recurse into child elements in lock-step.
  const origKids = originalEl.children;
  const cloneKids = cloneEl.children;
  for (let i = 0; i < origKids.length; i++) {
    if (cloneKids[i]) inlineComputedStyles(session, origKids[i], cloneKids[i]);
  }
}

/**
 * Build a self-contained SVG string from the current visualisation.
 *
 * Strategy:
 *  1. Clone the live SVG element (preserves all D3 transforms and vaRRI
 *     DOM modifications).
 *  2. Walk original + clone in parallel and inline every computed
 *     presentation property so the file is fully self-contained.
 *  3. Set explicit pixel width/height on the root so viewers render at
 *     the same size as the browser display.
 *  4. Prepend a white background rect to match the container's background.
 *  5. Serialise with XMLSerializer (namespace-aware).
 *
 * @param {string} containerId  ID of the container element.
 * @returns {string}  Full SVG markup.
 */
export function buildSVGString(session, containerId) {
  const container = session.dom.getElementById(containerId);
  const svgEl = container && container.querySelector('svg');
  if (!svgEl) throw new Error('No SVG found in container');

  // Clone the live SVG so we can annotate it without touching the DOM.
  const clone = svgEl.cloneNode(true);

  // Inline all computed presentation styles before any other annotation
  // so that class-based CSS rules, relative units, and inherited values
  // are all baked into the clone as plain inline style attributes.
  inlineComputedStyles(session, svgEl, clone);

  // Required namespace declarations for a standalone SVG file.
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

  // Derive pixel dimensions from the rendered element so the exported
  // file renders at the same size as what the user sees in the browser.
  const w = svgEl.clientWidth || container.clientWidth || 800;
  const h = svgEl.clientHeight || container.clientHeight || 600;
  clone.setAttribute('width', w);
  clone.setAttribute('height', h);

  // Keep (or synthesise) the viewBox so the internal coordinate space
  // of the renderer maps 1:1 to the exported pixel dimensions.
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${w} ${h}`);
  }

  // White background rect — matches the container's background: #fff
  // so the exported image looks identical to the on-screen visualisation.
  const bg = session.dom.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bg.setAttribute('width', '100%');
  bg.setAttribute('height', '100%');
  bg.setAttribute('fill', 'white');
  clone.insertBefore(bg, clone.firstChild);
  return new (session.window?.XMLSerializer || globalThis.XMLSerializer)().serializeToString(clone);
}

/**
 * Trigger a browser download of the current visualisation as an SVG file.
 *
 * @param {string} containerId  ID of the container element.
 * @param {string} [filename="vaRRI_output.svg"]
 */
export function downloadSVG(session, containerId, filename = 'vaRRI_output.svg') {
  const svgStr = buildSVGString(session, containerId);
  const blob = new (session.window?.Blob || globalThis.Blob)([svgStr], {
    type: 'image/svg+xml'
  });
  triggerDownload(session, (session.window?.URL || globalThis.URL).createObjectURL(blob), filename);
}

/**
 * Trigger a browser download of the current visualisation as a PNG image.
 *
 * Rasterises the SVG to a canvas at `scale` × the rendered size and
 * converts it to a PNG data URL.  A white background is painted on the
 * canvas before the image is drawn so the result matches the on-screen
 * appearance.
 *
 * @param {string} containerId  ID of the container element.
 * @param {string} [filename="vaRRI_output.png"]
 * @param {number} [scale=2]  Resolution multiplier (2 = retina quality).
 */
export function downloadPNG(session, containerId, filename = 'vaRRI_output.png', scale = 2) {
  const svgStr = buildSVGString(session, containerId);
  const blob = new (session.window?.Blob || globalThis.Blob)([svgStr], {
    type: 'image/svg+xml'
  });
  const url = (session.window?.URL || globalThis.URL).createObjectURL(blob);

  // Determine the rendered pixel size from the live container so that
  // canvas dimensions are correct regardless of the SVG's naturalWidth.
  const container = session.dom.getElementById(containerId);
  const svgEl = container && container.querySelector('svg');
  const w = svgEl && svgEl.clientWidth || container && container.clientWidth || 800;
  const h = svgEl && svgEl.clientHeight || container && container.clientHeight || 600;
  function rasterise(imgEl, canvasW, canvasH) {
    const canvas = session.dom.createElement('canvas');
    canvas.width = canvasW;
    canvas.height = canvasH;
    const ctx = canvas.getContext('2d');
    // White background to match the container's CSS background colour.
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.drawImage(imgEl, 0, 0, canvasW, canvasH);
    return canvas.toDataURL('image/png');
  }
  const img = new (session.window?.Image || globalThis.Image)();
  img.onload = () => {
    const dataUrl = rasterise(img, w * scale, h * scale);
    (session.window?.URL || globalThis.URL).revokeObjectURL(url);
    triggerDownload(session, dataUrl, filename);
  };
  img.onerror = () => {
    // Fallback: load the SVG via a data URI instead of a blob URL.
    (session.window?.URL || globalThis.URL).revokeObjectURL(url);
    const dataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
    const imgFallback = new (session.window?.Image || globalThis.Image)();
    imgFallback.onload = () => {
      triggerDownload(session, rasterise(imgFallback, w * scale, h * scale), filename);
    };
    imgFallback.src = dataUri;
  };
  img.src = url;
}

/**
 * Create a hidden `<a>` element and programmatically click it to download.
 *
 * @param {string} href  URL or data URI.
 * @param {string} filename
 */
export function triggerDownload(session, href, filename) {
  const a = session.dom.createElement('a');
  a.href = href;
  a.download = filename;
  a.style.display = 'none';
  session.dom.body.appendChild(a);
  a.click();
  session.dom.body.removeChild(a);
}
