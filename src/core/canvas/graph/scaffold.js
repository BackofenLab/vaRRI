/** Loop/stem geometry adapted from Fornac v1.0.1 rnagraph.js (Apache-2.0). */
const TYPES = { e: 'exterior', h: 'hairpin', i: 'interior', m: 'multiloop', s: 'stem' };

function addHub(graph, members, type, serial) {
  const nucs = members.filter(num => num > 0 && graph.nodes[num - 1]);
  if (nucs.length < 3) return;
  const points = nucs.map(num => graph.nodes[num - 1]);
  const count = points.length;
  const radius = 18 / (2 * Math.tan(Math.PI / count));
  // Fornac counts closure helpers in the polygon but starts springs only at
  // nucleotides (including the virtual strand-break positions).
  const anchors = points.filter(node => node.layoutRole !== 'outer-closure');
  const x = anchors.reduce((sum, node) => sum + node.x, 0) / anchors.length;
  const y = anchors.reduce((sum, node) => sum + node.y, 0) / anchors.length;
  const external = type === 'e' || points.some(node => node.layoutRole === 'strand-break');
  const hub = {
    uid: `hub${serial}`, name: '', num: -1, nodeType: 'middle', elemType: 'f',
    scaffoldType: external ? 'exterior' : TYPES[type], external, nucs,
    radius, rna: graph, x, y, px: x, py: y,
  };
  graph.nodes.push(hub);
  const link = (source, target, value) => {
    if (source === target) return;
    // Reciprocal hidden chords are separate springs in Fornac, particularly
    // the two diagonals of each stem rectangle. Do not deduplicate them.
    graph.links.push({ source, target, value, linkType: 'fake',
      uid: `fake:${hub.uid}:${graph.links.length}`, scaffoldUid: hub.uid });
  };
  const spoke = 0.5 / Math.cos((count - 2) * Math.PI / (2 * count));
  points.forEach((node, index) => {
    if (node.layoutRole === 'outer-closure') return;
    link(node, hub, spoke);
    if (count > 4) link(node, points[(index + Math.floor(count / 2)) % count], spoke * 2);
    link(node, points[(index + 2) % count], 2 * Math.cos(Math.PI / count));
  });
}

export function addScaffolds(graph, circularizeExternal = true) {
  let serial = 0;
  const elements = [...graph.elements].sort();
  // Match Fornac's force order: stems first, then loops, then hub links.
  elements.filter(([type]) => type === 's').forEach(([, , members]) => {
    const half = members.slice(0, members.length / 2);
    for (let i = 0; i + 1 < half.length; i++) {
      addHub(graph, [half[i], half[i + 1], graph.pairtable[half[i + 1]],
        graph.pairtable[half[i]]], 's', ++serial);
    }
  });
  elements.filter(([type]) => type !== 's').forEach(([type, , members]) => {
    if (!circularizeExternal && type === 'e') return;
    const loop = members.filter(num => num > 0);
    if (type === 'e') {
      for (const [slot, anchor] of [graph.nodes[graph.rnaLength - 1], graph.nodes[0]].entries()) {
        loop.push(graph.nodes.length + 1);
        graph.nodes.push({
          uid: `closure${slot}`, name: '', num: -3 + slot, radius: 0,
          nodeType: 'middle', elemType: 'f', layoutRole: 'outer-closure', nucs: [],
          scaffoldType: 'exterior', external: true,
          rna: graph, x: anchor.x, y: anchor.y, px: anchor.x, py: anchor.y,
        });
      }
    }
    addHub(graph, loop, type, ++serial);
  });
  const hubs = graph.nodes.filter(node => node.nodeType === 'middle' && node.num === -1);
  for (let i = 0; i < hubs.length; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      const source = hubs[i], target = hubs[j];
      if (!source.nucs.some(num => target.nucs.includes(num))) continue;
      graph.links.push({ source, target, value: (source.radius + target.radius) / 18,
        linkType: 'fake_fake', uid: `fake_fake:${source.uid}:${target.uid}` });
    }
  }
}
