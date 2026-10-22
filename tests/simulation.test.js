import { JSDOM } from 'jsdom';
import getD3 from '../src/core/vendor/d3.js';
import { createSimulation } from '../src/core/canvas/graph/simulation.js';

function fixture() {
  const dom = new JSDOM('<div></div>');
  const nodes = [
    { x: 0, y: 0, px: 0, py: 0, nodeType: 'nucleotide' },
    { x: 100, y: 0, px: 100, py: 0, nodeType: 'nucleotide' },
  ];
  const links = [{ source: nodes[0], target: nodes[1], value: 1, linkType: 'pseudoknot' }];
  const container = { options: { friction: 0.35, middleCharge: 0, otherCharge: 0,
    chargeDistance: 110, linkDistanceMultiplier: 15 }, linkStrengths: { other: 10, pseudoknot: 0 } };
  const force = createSimulation(container, getD3(dom.window.document));
  force.nodes(nodes).links(links);
  return { nodes, links, container, force, close() { force.stop(); dom.window.close(); } };
}

test('restarting refreshes pseudoknot strength while fixed nodes retain their position', () => {
  const { nodes, container, force, close } = fixture();
  try {
    nodes[0].fixed = 1;
    force.start();
    for (let i = 0; i < 30; i++) force.tick();
    expect(nodes[1].x).toBe(100);
    container.linkStrengths.pseudoknot = 10;
    force.start();
    for (let i = 0; i < 300; i++) force.tick();
    expect(nodes[0].x).toBe(0);
    expect(nodes[0].y).toBe(0);
    expect(nodes[1].x).toBeCloseTo(15, 1);
    expect(nodes.every(node => [node.x, node.y, node.px, node.py].every(Number.isFinite))).toBe(true);
  } finally { close(); }
});

test('projected previous positions control velocity on the next modern simulation tick', () => {
  const { nodes, force, close } = fixture();
  try {
    force.start();
    nodes[0].x = 20;
    nodes[0].px = 16;
    force.tick();
    expect(nodes[0].x).toBeCloseTo(21.4, 6);
    expect(nodes[0].px).toBeCloseTo(20, 6);
  } finally { close(); }
});

test('convergence dispatches end once; cancellation does not dispatch or resume', () => {
  const { force, close } = fixture();
  let ticks = 0, ends = 0;
  force.on('tick.test', () => ticks++).on('end.test', () => ends++);
  try {
    force.start();
    for (let i = 0; i < 500; i++) force.tick();
    expect(ends).toBe(1);
    expect(ticks).toBeGreaterThan(200);
    expect(ticks).toBeLessThan(400);
    force.resume();
    force.stop();
    expect(force.tick()).toBe(true);
    expect(ends).toBe(1);
  } finally { close(); }
});

test('replacing a graph after removing helper nodes leaves no stale link forces', () => {
  const { nodes, links, container, force, close } = fixture();
  try {
    container.linkStrengths.pseudoknot = 10;
    force.start();
    force.tick();
    const retained = nodes[0];
    retained.px = retained.x;
    retained.py = retained.y;
    const position = retained.x;
    force.nodes([retained]).links([]).start();
    force.tick();
    expect(retained.x).toBe(position);
    expect(force.nodes()).toEqual([retained]);
    expect(force.links()).toEqual([]);
  } finally { close(); }
});
