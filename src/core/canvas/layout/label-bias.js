import { LINEAR_HELIX_LABEL_BIAS_GAIN, LINEAR_HELIX_LABEL_BIAS_MAX_STEP, LINEAR_HELIX_LABEL_BIAS_TARGET } from './constants.js';
import { resolveGraphLinkNode } from './graph-access.js';
import { listVisibleIndexLabelPositions } from '../../model/labels.js';

/**
 * Match retained number labels to paired rail nodes and their mates.
 * The label link fixes distance but not which side of the rail wins,
 * so these records provide a transient, direction-only settling hint.
 */
export function collectLinearHelixIndexLabelBiases(container, v, templates) {
  const graph = container && container.graph;
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.links)) return [];
  const visiblePositions = listVisibleIndexLabelPositions(v);
  const partnerByNode = new Map();
  templates.forEach(template => {
    for (let index = 0; index + 1 < template.points.length; index += 2) {
      const first = template.points[index].node;
      const second = template.points[index + 1].node;
      partnerByNode.set(first, second);
      partnerByNode.set(second, first);
    }
  });
  const rawMultiplier = Number(container.options?.linkDistanceMultiplier);
  const multiplier = Number.isFinite(rawMultiplier) && rawMultiplier > 0 ? rawMultiplier : 15;
  const seenLabels = new Set();
  const biases = [];
  graph.links.forEach(link => {
    if (link?.linkType !== 'label_link') return;
    const source = resolveGraphLinkNode(graph, link.source);
    const target = resolveGraphLinkNode(graph, link.target);
    const label = source?.nodeType === 'label' ? source : target?.nodeType === 'label' ? target : null;
    const anchor = source?.nodeType === 'nucleotide' ? source : target?.nodeType === 'nucleotide' ? target : null;
    const partner = partnerByNode.get(anchor);
    if (!label || !anchor || !partner || seenLabels.has(label) || !visiblePositions.has(Number(anchor.num))) return;
    const rawValue = Number(link.value);
    const linkDistance = multiplier * (Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 1);
    seenLabels.add(label);
    biases.push({
      label,
      anchor,
      partner,
      linkDistance
    });
  });
  return biases;
}

/**
 * Gently move wrong-side number labels across the rail centreline.
 * Once a label reaches its exterior half-plane this becomes a no-op and
 * The native label link completes the ordinary spacing.
 */
export function nudgeLinearHelixIndexLabels(biases) {
  let moved = 0;
  biases.forEach(bias => {
    const {
      label,
      anchor,
      partner,
      linkDistance
    } = bias;
    if (!label || !anchor || !partner || label.fixed || anchor.fixed || partner.fixed) return;
    if (![label.x, label.y, label.px, label.py, anchor.x, anchor.y, partner.x, partner.y, linkDistance].every(Number.isFinite)) return;
    const outwardX = anchor.x - partner.x;
    const outwardY = anchor.y - partner.y;
    const outwardLength = Math.hypot(outwardX, outwardY);
    if (!(outwardLength > 0)) return;
    const unitX = outwardX / outwardLength;
    const unitY = outwardY / outwardLength;
    const side = (label.x - anchor.x) * unitX + (label.y - anchor.y) * unitY;
    const target = LINEAR_HELIX_LABEL_BIAS_TARGET * linkDistance;
    if (!(side < target)) return;

    // Use the same bounded correction on every lifecycle event. The
    // end handler must never turn this settling hint into a late snap.
    const distance = Math.min((target - side) * LINEAR_HELIX_LABEL_BIAS_GAIN, LINEAR_HELIX_LABEL_BIAS_MAX_STEP * linkDistance);
    const deltaX = distance * unitX;
    const deltaY = distance * unitY;
    label.x += deltaX;
    label.y += deltaY;
    label.px += deltaX;
    label.py += deltaY;
    moved += 1;
  });
  return moved;
}
