/** Loop/stem geometry adapted from Fornac v1.0.1 rnagraph.js (Apache-2.0). */
const TYPES = { e: 'exterior', h: 'hairpin', i: 'interior', m: 'multiloop', s: 'stem' };

function addHub(graph, members, type, serial) {
  const nucs = [...new Set(members)].filter(num => num > 0 && num <= graph.rnaLength);
  if (nucs.length < 3) return;
  const points = nucs.map(num => graph.nodes[num - 1]);
  const count = points.length;
  const radius = 18 / (2 * Math.tan(Math.PI / count));
  const x = points.reduce((sum, node) => sum + node.x, 0) / count;
  const y = points.reduce((sum, node) => sum + node.y, 0) / count;
  const external = type === 'e' || (type !== 's' && graph.breaks.some(boundary =>
    nucs.includes(boundary) && nucs.includes(boundary + 1)));
  const hub = {
    uid: `hub${serial}`, name: '', num: -1, nodeType: 'middle', elemType: 'f',
    scaffoldType: external ? 'exterior' : TYPES[type], external, nucs,
    radius, rna: graph, x, y, px: x, py: y,
  };
  graph.nodes.push(hub);
  const seen = new Set();
  const link = (source, target, value) => {
    const endpoints = [source.uid, target.uid].sort().join(':');
    if (source === target || seen.has(endpoints)) return;
    seen.add(endpoints);
    graph.links.push({ source, target, value, linkType: 'fake',
      uid: `fake:${hub.uid}:${endpoints}`, scaffoldUid: hub.uid });
  };
  const spoke = 0.5 / Math.cos((count - 2) * Math.PI / (2 * count));
  points.forEach((node, index) => {
    link(node, hub, spoke);
    if (count > 4) link(node, points[(index + Math.floor(count / 2)) % count], spoke * 2);
    link(node, points[(index + 2) % count], 2 * Math.cos(Math.PI / count));
  });
}

export function addScaffolds(graph, circularizeExternal = true) {
  let serial = 0;
  graph.elements.forEach(([type, , members]) => {
    if (type === 's') {
      const half = members.slice(0, members.length / 2);
      for (let i = 0; i + 1 < half.length; i++) {
        addHub(graph, [half[i], half[i + 1], graph.pairtable[half[i + 1]],
          graph.pairtable[half[i]]], type, ++serial);
      }
    } else if (circularizeExternal || type !== 'e') {
      addHub(graph, members, type, ++serial);
    }
  });
  const hubs = graph.nodes.filter(node => node.nodeType === 'middle');
  for (let i = 0; i < hubs.length; i++) {
    for (let j = i + 1; j < hubs.length; j++) {
      const source = hubs[i], target = hubs[j];
      if (!source.nucs.some(num => target.nucs.includes(num))) continue;
      graph.links.push({ source, target, value: (source.radius + target.radius) / 18,
        linkType: 'fake_fake', uid: `fake_fake:${source.uid}:${target.uid}` });
    }
  }
}
