import { listIntramolPairsBySequence } from './loops.js';
import { listDirectNestedPairChildren, listIntermolPairs, normaliseBasepairList, pairsCross } from './pairs.js';

export function pairKey(pair) {
  return pair[0] + ':' + pair[1];
}

/**
 * Return the one antiparallel RRI chain that can be represented by two
 * ordered rails. Crossing RRI pairs are deliberately left to the ordinary
 * force layout because a single two-rail ordering does not exist for them.
 */
export function listRriHelixPairGroups(v) {
  const pairs = normaliseBasepairList(listIntermolPairs(v));
  if (pairs.length < 2) return [];
  for (let first = 0; first < pairs.length; first++) {
    for (let second = first + 1; second < pairs.length; second++) {
      if (pairsCross(pairs[first], pairs[second])) return [];
    }
  }
  for (let index = 1; index < pairs.length; index++) {
    if (pairs[index - 1][1] <= pairs[index][1]) return [];
  }
  return [{
    kind: 'rri',
    sequence: null,
    pairs
  }];
}

/**
 * Split intramolecular base pairs into maximal single-child stem paths.
 * Paths stop at multiloops and only paths containing a bulge/interior loop
 * need an additional linear constraint; uninterrupted stacks are already
 * linear in Fornac's native layout.
 */
export function listStructureHelixPairGroups(v) {
  const groups = [];
  const grouped = listIntramolPairsBySequence(v);
  for (const sequence of ['1', '2']) {
    const pairs = normaliseBasepairList(grouped[sequence]);
    const crossingPairKeys = new Set();
    pairs.forEach((pair, index) => {
      pairs.slice(index + 1).forEach(other => {
        if (!pairsCross(pair, other)) return;
        crossingPairKeys.add(pairKey(pair));
        crossingPairKeys.add(pairKey(other));
      });
    });
    const nextPair = new Map();
    const hasIncoming = new Set();
    listDirectNestedPairChildren(pairs).forEach(({
      outer,
      children
    }) => {
      if (children.length !== 1) return;
      const inner = children[0];
      if (crossingPairKeys.has(pairKey(outer)) || crossingPairKeys.has(pairKey(inner))) return;
      nextPair.set(pairKey(outer), inner);
      hasIncoming.add(pairKey(inner));
    });
    pairs.filter(pair => !crossingPairKeys.has(pairKey(pair)) && !hasIncoming.has(pairKey(pair))).forEach(root => {
      const path = [];
      const visited = new Set();
      let pair = root;
      while (pair && !visited.has(pairKey(pair))) {
        path.push(pair);
        visited.add(pairKey(pair));
        pair = nextPair.get(pairKey(pair));
      }
      const containsLoop = path.slice(1).some((inner, index) => {
        const outer = path[index];
        return inner[0] - outer[0] > 1 || outer[1] - inner[1] > 1;
      });
      if (path.length >= 2 && containsLoop) {
        groups.push({
          kind: 'structure',
          sequence,
          pairs: path
        });
      }
    });
  }
  return groups;
}
