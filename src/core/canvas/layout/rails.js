import { getGraphNucleotideByNumber, getNodeDistance } from './graph-access.js';

/**
 * Build a straight two-rail template from the current live geometry.
 * Loop-to-loop increments use max(d1,d2), exactly as requested in issue
 * #59; uninterrupted stack increments use Fornac's backbone rest length.
 * The template itself is centered at the origin so it can subsequently be
 * fitted to the freely translating and rotating force-layout component.
 */
export function createLinearHelixRailTemplate(container, group) {
  const graph = container && container.graph;
  if (!graph || !Array.isArray(graph.nodes) || !group?.pairs?.length) return null;
  const rawMultiplier = Number(container.options?.linkDistanceMultiplier);
  const multiplier = Number.isFinite(rawMultiplier) && rawMultiplier > 0 ? rawMultiplier : 15;
  const pairNodes = group.pairs.map(pair => ({
    pair,
    first: getGraphNucleotideByNumber(graph, pair[0]),
    second: getGraphNucleotideByNumber(graph, pair[1])
  }));
  if (pairNodes.some(column => !column.first || !column.second || column.first.fixed || column.second.fixed || getNodeDistance(column.first, column.second) === null)) return null;
  const offsets = [0];
  const intervals = [];
  for (let index = 1; index < pairNodes.length; index++) {
    const previous = pairNodes[index - 1];
    const current = pairNodes[index];
    const firstGap = current.pair[0] - previous.pair[0] - 1;
    const secondGap = previous.pair[1] - current.pair[1] - 1;
    const isLoop = firstGap > 0 || secondGap > 0;
    const measured = Math.max(getNodeDistance(previous.first, current.first), getNodeDistance(previous.second, current.second));
    const span = isLoop && Number.isFinite(measured) && measured > 0 ? measured : multiplier;
    intervals.push({
      span,
      isLoop,
      gaps: [firstGap, secondGap]
    });
    offsets.push(offsets[offsets.length - 1] + span);
  }
  const meanOffset = offsets.reduce((sum, value) => sum + value, 0) / offsets.length;
  const points = [];
  pairNodes.forEach((column, index) => {
    const along = offsets[index] - meanOffset;
    points.push({
      node: column.first,
      x: along,
      y: -multiplier / 2
    });
    points.push({
      node: column.second,
      x: along,
      y: multiplier / 2
    });
  });
  const template = {
    kind: group.kind,
    sequence: group.sequence,
    pairs: group.pairs.map(pair => pair.slice()),
    points,
    intervals,
    railGap: multiplier
  };
  const ordinaryFit = fitLinearHelixRailTemplate(template, 'x', 'y', 1);
  const reflectedFit = fitLinearHelixRailTemplate(template, 'x', 'y', -1);
  template.reflection = reflectedFit && (!ordinaryFit || reflectedFit.error < ordinaryFit.error) ? -1 : 1;
  return template;
}

/**
 * Fit a translated/rotated copy of one possibly reflected rail template
 * to a requested pair of live node-coordinate fields.
 */
export function fitLinearHelixRailTemplate(template, xField, yField, reflection) {
  if (!template || !Array.isArray(template.points) || template.points.length < 4) {
    return null;
  }
  const live = template.points.map(point => point.node);
  if (live.some(node => !node || ![node[xField], node[yField]].every(Number.isFinite))) {
    return null;
  }
  const center = live.reduce((sum, node) => ({
    x: sum.x + node[xField],
    y: sum.y + node[yField]
  }), {
    x: 0,
    y: 0
  });
  center.x /= live.length;
  center.y /= live.length;
  let dot = 0;
  let cross = 0;
  template.points.forEach(point => {
    const templateY = reflection * point.y;
    const liveX = point.node[xField] - center.x;
    const liveY = point.node[yField] - center.y;
    dot += point.x * liveX + templateY * liveY;
    cross += point.x * liveY - templateY * liveX;
  });
  const angle = Math.atan2(cross, dot);
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  let error = 0;
  const targets = template.points.map(point => {
    const templateY = reflection * point.y;
    const target = {
      x: center.x + cosine * point.x - sine * templateY,
      y: center.y + sine * point.x + cosine * templateY
    };
    const deltaX = point.node[xField] - target.x;
    const deltaY = point.node[yField] - target.y;
    error += deltaX * deltaX + deltaY * deltaY;
    return target;
  });
  return {
    angle,
    center,
    error,
    targets
  };
}

/**
 * Project one live helix onto the closest translated/rotated copy of its
 * straight template (2-D orthogonal Procrustes fit). Current and previous
 * coordinate clouds are projected separately, preserving the rigid body's
 * translational and rotational velocity instead of zeroing it each tick.
 */
export function projectLinearHelixRailTemplate(template) {
  if (!template || !Array.isArray(template.points)) return false;
  const live = template.points.map(point => point.node);
  if (live.some(node => !node || node.fixed)) return false;
  const reflection = template.reflection === -1 ? -1 : 1;
  const currentFit = fitLinearHelixRailTemplate(template, 'x', 'y', reflection);
  if (!currentFit) return false;
  const previousFit = fitLinearHelixRailTemplate(template, 'px', 'py', reflection) || currentFit;
  template.points.forEach((point, index) => {
    point.node.x = currentFit.targets[index].x;
    point.node.y = currentFit.targets[index].y;
    point.node.px = previousFit.targets[index].x;
    point.node.py = previousFit.targets[index].y;
    point.node.varriLinearHelix = true;
    point.node.varriLinearHelixKind = template.kind;
  });
  template.angle = currentFit.angle;
  template.center = currentFit.center;
  template.previousAngle = previousFit.angle;
  template.previousCenter = previousFit.center;
  return true;
}
