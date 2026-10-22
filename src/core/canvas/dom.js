

/**
 * Set an attribute on all elements that match `[targetAttr="targetValue"]`.
 *
 * @param {string} targetAttr
 * @param {string} targetValue
 * @param {string} setAttr
 * @param {string} setValue
 */
export function setAttributeForElements(session, targetAttr, targetValue, setAttr, setValue) {
  session.dom.querySelectorAll(`[${targetAttr}="${targetValue}"]`).forEach(el => {
    el.setAttribute(setAttr, setValue);
  });
}

/**
 * Assign `start` and `end` attributes to every `<line>` link element.
 *
 * The renderer stores link identity in a tooltip text child; this function
 * parses it and promotes the IDs to proper attributes.
 */
export function setLinksId(session) {
  session.dom.querySelectorAll('line').forEach(line => {
    const textContent = line.children[0] && line.children[0].textContent;
    if (!textContent) return;
    const parts = textContent.split(':')[1];
    if (!parts) return;
    const ids = parts.split('-').filter(x => !isNaN(parseInt(x, 10)) && x !== '');
    if (ids.length >= 2) {
      line.setAttribute('start', ids[0].trim());
      line.setAttribute('end', ids[1].trim());
    }
  });
}

/**
 * Assign sequential `label_gnum` / `label_num` IDs to label elements.
 */
export function setLabelsId(session) {
  session.dom.querySelectorAll('g[num="n-1"]').forEach((label, index) => {
    label.setAttribute('label_gnum', String(index + 1));
    if (label.firstChild) {
      label.firstChild.setAttribute('label_num', String(index + 1));
    }
  });
}

/**
 * Apply a CSS style string to an array of nodes by `node_num`.
 *
 * @param {number[]} nodeIds
 * @param {string} style
 */
export function addStyleToNodes(session, nodeIds, style) {
  nodeIds.forEach(nodeId => {
    session.dom.querySelectorAll(`circle[node_num="${nodeId}"]`).forEach(node => {
      node.setAttribute('style', (node.getAttribute('style') || '') + style);
    });
  });
}

/**
 * Retrieve the x,y position of a graph node from its `transform` attribute.
 *
 * @param {number} nodeId
 * @returns {number[]}  [x, y] coordinates.
 */
export function getPositionOfNode(session, nodeId) {
  const pos = [];
  session.dom.querySelectorAll(`g[num="n${nodeId}"]`).forEach(node => {
    const transform = node.getAttribute('transform') || '';
    const matches = [...transform.matchAll(/-?\d+(?:\.\d+)?/g)];
    matches.forEach(([val]) => pos.push(parseFloat(val)));
  });
  return pos;
}

/**
 * Resolve where new overlay elements should be inserted.
 *
 * If a vaRRI rotation layer exists, insert into that layer so newly added
 * overlays follow the current rotation.
 *
 * @returns {SVGElement|null}
 */
export function getPlotInsertRoot(session) {
  const plot = session.dom.getElementsByClassName('fornac-plot')[0];
  if (!plot) return null;
  const rotationLayer = Array.from(plot.children).find(child => child.tagName && child.tagName.toLowerCase() === 'g' && child.getAttribute('data-varri-rotation-layer') === 'true');
  return rotationLayer || plot;
}

/**
 * Create and insert an SVG element at the beginning of the canvas plot.
 *
 * @param {string} elementType  SVG tag name (e.g. `"circle"`, `"polyline"`).
 * @param {Object.<string,string>} attr  Attribute key→value map.
 */
export function addElement(session, elementType, attr) {
  const el = session.dom.createElementNS('http://www.w3.org/2000/svg', elementType);
  for (const [key, value] of Object.entries(attr)) {
    el.setAttribute(key, value);
  }
  const insertRoot = getPlotInsertRoot(session);
  if (insertRoot) insertRoot.insertBefore(el, insertRoot.firstChild);
}
