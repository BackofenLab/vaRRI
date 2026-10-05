const NODE_FIELDS = ['x', 'y', 'px', 'py', 'fx', 'fy', 'vx', 'vy', 'fixed'];
const snapshotNode = node => Object.fromEntries(NODE_FIELDS.map(key => [key, node[key]]));

/** Render-local positions and bounded undo history; no graph objects enter Vue. */
export function createManualPositions(container, syncGraph) {
  const originals = new Map();
  const history = [];
  const updateCount = () => { container.hasManualPositions = originals.size > 0; };
  const resume = changed => {
    if (changed && container.options?.animation && !container.destroyed) container.force.resume();
  };
  const capture = targets => targets.map(target => target.node
    ? { node: target.node, position: snapshotNode(target.node), original: originals.get(target.node) }
    : { id: target.id, text: container.varriTextAnnotations?.capture(target.id) });
  function commit(records) {
    if (!records?.length) return;
    history.push(records);
    if (history.length > 100) history.shift();
    if (records.some(record => record.text)) container.varriTextAnnotations?.notify();
  }
  function apply(updates) {
    const texts = [];
    let movedNodes = false;
    for (const { target, position: { x, y } } of updates) {
      if (!target.element.isConnected) continue;
      if (target.node) {
        if (!originals.has(target.node)) originals.set(target.node, snapshotNode(target.node));
        Object.assign(target.node, { x, y, px: x, py: y, fx: x, fy: y, vx: 0, vy: 0, fixed: 1 });
        movedNodes = true;
      } else texts.push({ id: target.id, position: { x, y } });
    }
    updateCount();
    if (movedNodes) syncGraph();
    // Text offsets use the new nucleotide centroid after all graph nodes move.
    container.varriTextAnnotations?.move(texts);
    resume(movedNodes);
  }
  function reset(targets) {
    const resettable = targets.filter(target => originals.has(target.node));
    if (!resettable.length) return false;
    const records = capture(resettable);
    for (const { node } of resettable) {
      Object.assign(node, originals.get(node));
      originals.delete(node);
    }
    updateCount();
    syncGraph();
    container.varriTextAnnotations?.move([]);
    commit(records);
    resume(true);
    return true;
  }
  function undo() {
    const records = history.pop();
    if (!records) return false;
    let changedNodes = false;
    const texts = [];
    for (const record of records) {
      if (record.node && container.graph.nodes.includes(record.node)) {
        Object.assign(record.node, record.position);
        if (record.original) originals.set(record.node, record.original);
        else originals.delete(record.node);
        changedNodes = true;
      } else if (record.text) texts.push({ id: record.id, ...record.text });
    }
    updateCount();
    if (changedNodes) syncGraph();
    container.varriTextAnnotations?.restore(texts);
    resume(changedNodes);
    return true;
  }
  return {
    capture, commit, apply, reset, undo,
    has: node => originals.has(node),
    get count() { return originals.size; },
    get canUndo() { return history.length > 0; },
    clear() { originals.clear(); history.length = 0; updateCount(); },
  };
}
