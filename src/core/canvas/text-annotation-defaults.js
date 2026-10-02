function measureDefaultText(container, text, size) {
  const probe = container.svg.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'text');
  probe.textContent = text;
  probe.setAttribute('font-family', 'Tahoma, Geneva, sans-serif');
  probe.setAttribute('font-size', String(size));
  probe.setAttribute('font-weight', 'bold');
  container.plot.appendChild(probe);
  try {
    const bounds = probe.getBBox();
    if (Number.isFinite(bounds.width) && bounds.width > 0 && Number.isFinite(bounds.height) && bounds.height > 0) {
      return { width: bounds.width + 6, height: bounds.height + 4 };
    }
  } catch { /* Detached or synthetic SVGs may not expose text metrics. */ }
  finally { probe.remove(); }
  return { width: size * String(text).length * 0.6 + 6, height: size * 1.2 + 4 };
}

/** Choose the initial terminal offset without moving or refitting the RNA. */
export function defaultTextOffset(container, terminal, preferred, size, text) {
  const matrix = container.plot.getScreenCTM?.();
  const viewport = container.svg.getBoundingClientRect?.();
  if (!matrix || !viewport?.width || !viewport?.height) return preferred;
  const scale = Math.hypot(matrix.a, matrix.b);
  if (!Number.isFinite(scale) || !scale) return preferred;
  // Names vary in length and glyph width; measure the same font as the final bar.
  const bounds = measureDefaultText(container, text, size);
  const width = bounds.width * scale;
  const height = bounds.height * scale;
  const obstacles = Array.from(container.plot.querySelectorAll(
    'text[label_type="label"], circle[node_type="nucleotide"]')).map(node => node.getBoundingClientRect());
  const candidates = [preferred];
  for (const radius of [24, 32]) {
    for (let step = 0; step < 16; step++) {
      const angle = step * Math.PI / 8;
      candidates.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
    }
  }
  const score = offset => {
    const localX = terminal.x + offset.x, localY = terminal.y + offset.y;
    const x = matrix.a * localX + matrix.c * localY + matrix.e;
    const y = matrix.b * localX + matrix.d * localY + matrix.f;
    const left = x - width / 2, right = x + width / 2;
    const top = y - height / 2, bottom = y + height / 2;
    const overflow = Math.max(viewport.left - left, 0) + Math.max(right - viewport.right, 0) +
      Math.max(viewport.top - top, 0) + Math.max(bottom - viewport.bottom, 0);
    const overlap = obstacles.reduce((sum, box) => sum +
      Math.max(0, Math.min(right, box.right + 2) - Math.max(left, box.left - 2)) *
      Math.max(0, Math.min(bottom, box.bottom + 2) - Math.max(top, box.top - 2)), 0);
    return overflow * 1e6 + overlap * 1e3 + Math.hypot(offset.x - preferred.x, offset.y - preferred.y);
  };
  return candidates.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best);
}
