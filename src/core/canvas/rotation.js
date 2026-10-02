

/**
 * Normalise a rotation angle to the range [-180, 180].
 *
 * @param {number} degrees
 * @returns {number}
 */
export function normaliseRotationDegrees(degrees) {
  if (!Number.isFinite(degrees)) {
    throw new Error('Rotation degrees must be a finite number');
  }
  let value = degrees % 360;
  if (value > 180) value -= 360;
  if (value < -180) value += 360;
  return value;
}

/**
 * Resolve the element that should host the rotation layer.
 *
 * If the canvas plot group exists, rotate inside that group so that
 * pan/zoom transforms stay in screen-space and dragging keeps expected
 * directions after rotation.
 *
 * @param {SVGSVGElement} svgEl
 * @returns {SVGElement}
 */
export function getRotationHost(svgEl) {
  const fornacPlot = svgEl.querySelector('.fornac-plot');
  return fornacPlot || svgEl;
}

/**
 * Ensure a host element has a dedicated layer that can be rotated.
 *
 * @param {SVGElement} hostEl
 * @returns {SVGGElement}
 */
export function ensureRotationLayer(session, hostEl) {
  let layer = Array.from(hostEl.children).find(child => child.tagName && child.tagName.toLowerCase() === 'g' && child.getAttribute('data-varri-rotation-layer') === 'true');
  if (!layer) {
    layer = session.dom.createElementNS('http://www.w3.org/2000/svg', 'g');
    layer.setAttribute('data-varri-rotation-layer', 'true');
    const textLayer = Array.from(hostEl.children).find(child => child.hasAttribute('data-varri-text-layer'));
    hostEl.insertBefore(layer, textLayer || null);
  }
  const nodesToMove = Array.from(hostEl.childNodes).filter(node => {
    if (node === layer) return false;
    // Free text mirrors the RNA rotation as a sibling, so its bounds never
    // change the RNA rotation pivot or the graph's viewport fitting.
    if (node.nodeType === 1 && node.hasAttribute('data-varri-text-layer')) return false;
    if (hostEl.tagName && hostEl.tagName.toLowerCase() === 'svg' && node.nodeType === 1 && node.tagName && node.tagName.toLowerCase() === 'defs') {
      return false;
    }
    return true;
  });
  nodesToMove.forEach(node => layer.appendChild(node));
  return layer;
}

/**
 * Compute the centre of an SVG element's bounding box.
 *
 * @param {SVGGraphicsElement} el
 * @returns {{x:number, y:number}|null}
 */
export function getBBoxCenter(el) {
  try {
    const bbox = el.getBBox();
    if (!Number.isFinite(bbox.x) || !Number.isFinite(bbox.y) || !Number.isFinite(bbox.width) || !Number.isFinite(bbox.height)) {
      return null;
    }
    return {
      x: bbox.x + bbox.width / 2,
      y: bbox.y + bbox.height / 2
    };
  } catch (err) {
    return null;
  }
}

/** Counterrotate local glyphs without changing their positioned parent group. */
export function counterrotateTextLabels(layer, target, fallback = { x: 0, y: 0 }) {
  layer.querySelectorAll('text').forEach(textEl => {
    const transformEl = textEl.closest('[data-varri-text-bar]') || textEl;
    if (!transformEl.hasAttribute('data-varri-base-transform')) {
      transformEl.setAttribute('data-varri-base-transform', transformEl.getAttribute('transform') || '');
    }
    const baseTransform = transformEl.getAttribute('data-varri-base-transform') || '';
    if (target === 0) {
      if (baseTransform) transformEl.setAttribute('transform', baseTransform);
      else transformEl.removeAttribute('transform');
      return;
    }
    const textCenter = getBBoxCenter(textEl) || fallback;
    const transformParts = baseTransform ? [baseTransform] : [];
    transformParts.push(`rotate(${-target} ${textCenter.x} ${textCenter.y})`);
    transformEl.setAttribute('transform', transformParts.join(' '));
  });
}

/** Apply the current RNA rotation to newly added or restyled annotation text. */
export function syncTextAnnotationRotation(svgEl, textLayer) {
  const rotationLayer = getRotationHost(svgEl).querySelector('[data-varri-rotation-layer]');
  const transform = rotationLayer?.getAttribute('transform');
  if (transform) textLayer.setAttribute('transform', transform);
  else textLayer.removeAttribute('transform');
  counterrotateTextLabels(textLayer, Number(svgEl.getAttribute('data-varri-rotation') || 0));
}

/**
 * Rotate the current visualisation around its bounding-box centre while
 * keeping text labels horizontally aligned.
 *
 * @param {string} containerId  ID of the container element.
 * @param {number} degrees  Rotation amount.
 * @param {Object} [options]
 * @param {'delta'|'absolute'} [options.mode='delta']
 * @returns {number}  Applied absolute angle in degrees (normalised).
 */
export function rotateVisualization(session, containerId, degrees, options = {}) {
  const container = session.dom.getElementById(containerId);
  const svgEl = container && container.querySelector('svg');
  if (!svgEl) throw new Error('No SVG found in container');
  const amount = Number(degrees);
  if (!Number.isFinite(amount)) {
    throw new Error('Rotation degrees must be a finite number');
  }
  const mode = options.mode === 'absolute' ? 'absolute' : 'delta';
  const current = Number(svgEl.getAttribute('data-varri-rotation') || 0);
  const target = normaliseRotationDegrees(mode === 'absolute' ? amount : current + amount);
  const hostEl = getRotationHost(svgEl);
  const layer = ensureRotationLayer(session, hostEl);
  const center = getBBoxCenter(layer);
  if (!center) return current;
  layer.setAttribute('transform', `rotate(${target} ${center.x} ${center.y})`);
  svgEl.setAttribute('data-varri-rotation', String(target));
  counterrotateTextLabels(layer, target, center);
  const textLayer = hostEl.querySelector('[data-varri-text-layer]');
  if (textLayer) syncTextAnnotationRotation(svgEl, textLayer);
  return target;
}
