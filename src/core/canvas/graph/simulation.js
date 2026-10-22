/** D3 7 simulation with vaRRI's existing start/resume and px/py contracts. */
export function createSimulation(container, d3) {
  const options = container.options;
  const events = d3.dispatch('tick', 'end');
  let nodes = [], links = [];
  const springs = d3.forceLink().distance(link => options.linkDistanceMultiplier * link.value)
    .strength(link => container.linkStrengths[link.linkType] ?? container.linkStrengths.other);
  const simulation = d3.forceSimulation().stop().alpha(0)
    .alphaMin(0.005).alphaDecay(0.01).velocityDecay(1 - options.friction)
    .force('coordinates', () => {
      // Rail projection and rigid rotations still operate on current/previous
      // positions. Transfer their changes into D3's explicit velocities.
      for (const node of nodes) {
        node.vx = node.x - node.px;
        node.vy = node.y - node.py;
        node.fx = node.fixed ? node.px : null;
        node.fy = node.fixed ? node.py : null;
      }
    })
    .force('links', springs)
    .force('charge', d3.forceManyBody()
      .strength(node => node.nodeType === 'middle' ? options.middleCharge : options.otherCharge)
      .distanceMax(options.chargeDistance));

  function finishTick() {
    for (const node of nodes) {
      node.px = node.x - node.vx;
      node.py = node.y - node.vy;
    }
    events.call('tick', force, { alpha: simulation.alpha() });
  }
  simulation.on('tick.graph', finishTick)
    .on('end.graph', () => events.call('end', force, { alpha: simulation.alpha() }));

  const force = {
    nodes(value) { if (!arguments.length) return nodes; nodes = value; return force; },
    links(value) { if (!arguments.length) return links; links = value; return force; },
    on(type, listener) {
      if (arguments.length === 1) return events.on(type);
      events.on(type, listener);
      return force;
    },
    alpha(value) {
      if (!arguments.length) return simulation.alpha();
      simulation.alpha(value);
      return force;
    },
    start() {
      // Clear old links before replacing nodes: free-end cleanup may have
      // removed endpoints. Reinitialize all cached strengths after UI changes.
      springs.links([]);
      simulation.nodes(nodes);
      springs.links(links);
      return force.resume();
    },
    resume() { simulation.alpha(0.1).restart(); return force; },
    stop() { simulation.stop().alpha(0); return force; },
    tick() {
      if (simulation.alpha() < simulation.alphaMin()) return true;
      simulation.tick();
      finishTick();
      if (simulation.alpha() < simulation.alphaMin()) {
        simulation.stop();
        events.call('end', force, { alpha: simulation.alpha() });
        return true;
      }
      return false;
    },
  };
  return force;
}
