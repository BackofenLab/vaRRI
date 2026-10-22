import { getGraphNucleotideByNumber, getNodeDistance } from './graph-access.js';

/**
 * Measure the two issue-59 loop spans without adding them to the renderer's
 * render graph. Keeping constraint metadata outside graph.links makes the
 * constraints unconditionally invisible, including after container.update().
 */
export function collectLinearHelixSpanConstraints(container, specs, linkType) {
  const graph = container && container.graph;
  if (!graph || !Array.isArray(graph.nodes)) return [];
  const rawMultiplier = Number(container.options?.linkDistanceMultiplier);
  const multiplier = Number.isFinite(rawMultiplier) && rawMultiplier > 0 ? rawMultiplier : 15;
  const byLoop = new Map();
  specs.forEach(spec => {
    if (!byLoop.has(spec.loopId)) byLoop.set(spec.loopId, []);
    byLoop.get(spec.loopId).push(spec);
  });
  const constraints = [];
  byLoop.forEach(loopSpecs => {
    if (loopSpecs.length !== 2) return;
    const resolved = loopSpecs.map(spec => ({
      spec,
      source: getGraphNucleotideByNumber(graph, spec.source),
      target: getGraphNucleotideByNumber(graph, spec.target)
    }));
    if (resolved.some(link => !link.source || !link.target)) return;
    const distances = resolved.map(link => getNodeDistance(link.source, link.target));
    if (distances.some(distance => distance === null)) return;
    const loopSpan = Math.max(...distances);
    if (!Number.isFinite(loopSpan) || loopSpan <= 0) return;
    resolved.forEach(({
      spec,
      source,
      target
    }) => {
      constraints.push({
        source,
        target,
        value: loopSpan / multiplier,
        linkType,
        extraLinkType: 'constraint',
        varriLinearHelix: true,
        varriLinearHelixKind: spec.kind,
        varriLinearHelixLoop: spec.loopId,
        varriTargetDistance: loopSpan
      });
    });
  });
  return constraints;
}
