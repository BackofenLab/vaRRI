import { addStyleToNodes } from './dom.js';
import { getIndexDictionary } from '../model/indexing.js';
import { getIndexLabelValues } from '../model/labels.js';
import { getIntermolBasepairRegion } from '../model/region-paths.js';

/**
 * Update node tooltip text to display correct sequence and index labels.
 *
 * @param {Object} v  Validated parameter dictionary.
 */
export function updateNodeToolTips(session, v) {
  const indexDict = getIndexDictionary(v);
  for (const [key, [seq, num]] of Object.entries(indexDict)) {
    session.dom.querySelectorAll(`circle[node_num="${key}"]`).forEach(node => {
      if (node.firstChild) {
        node.firstChild.innerHTML = `${seq}[${num}]`;
      }
    });
  }
}

/**
 * Apply the intermolecular-highlight stroke style to the label at the given index.
 *
 * @param {number} targetIndex
 */
export function highlightLabel(session, targetIndex) {
  session.dom.querySelectorAll(`[label_num="${targetIndex}"]`).forEach(label => {
    label.setAttribute('style', `stroke: ${session.colors.intermolecularHighlight};stroke-width: 0.8;`);
  });
}

/**
 * Set or update the SVG title used as a hover tooltip for a label.
 *
 * @param {SVGElement} label
 * @param {string} text
 */
export function setLabelTooltip(session, label, text) {
  const parent = label.parentElement;
  if (!parent) return;
  const existingTitleOnLabel = label.querySelector('title');
  if (existingTitleOnLabel) existingTitleOnLabel.remove();
  let title = parent.querySelector('title');
  if (!title) {
    title = session.dom.createElementNS('http://www.w3.org/2000/svg', 'title');
    parent.insertBefore(title, parent.firstChild);
  }
  title.textContent = text;
}

/**
 * Remove label group elements at the given index.
 *
 * @param {number} index
 */
export function removeLabel(session, index) {
  session.dom.querySelectorAll(`[label_gnum="${index}"]`).forEach(node => node.remove());
}

/**
 * Remove label-link line elements at the given index.
 *
 * @param {number} index
 */
export function removeLabelLink(session, index) {
  session.dom.querySelectorAll(`line[start="${index}"]`).forEach(line => {
    if (line.getAttribute('link_type') === 'label_link') {
      line.remove();
    }
  });
}

/**
 * Set index labels on the canvas plot using a priority system.
 *
 * Priority order (highest → lowest):
 * 1. Start/end of each sequence.
 * 2. Start/end of intermolecular basepair region.
 * 3. Every `labelInterval`-th position.
 *
 * @param {Object} v  Validated parameter dictionary.
 */
export function setIndexLabels(session, v) {
  const indexLabels = getIndexLabelValues(v);
  const mutationByNodeId = {};
  (Array.isArray(v.pointMutations) ? v.pointMutations : []).forEach(mutation => {
    if (mutation.nodeId) mutationByNodeId[mutation.nodeId] = mutation;
  });
  if (v.molecules === '2') {
    getIntermolBasepairRegion(v.structure1, v.structure2).flat().forEach(highlightLabel.bind(null, session));
  }

  // Apply labels
  const labelValues = Object.entries(indexLabels);
  session.dom.querySelectorAll('[label_type="label"]').forEach((label, index) => {
    const [posStr, value] = labelValues[index] || [];
    const pos = posStr ? parseInt(posStr, 10) : 0;
    const mutation = pos && mutationByNodeId[pos] ? mutationByNodeId[pos] : null;
    if (mutation) {
      label.innerHTML = mutation.replacement;
      setLabelTooltip(session, label, `Mutation: ${mutation.labelText}`);
      label.setAttribute('style', `fill: ${mutation.color}; stroke: ${mutation.color}; stroke-width: 0.2; font-weight: bolder;`);
      addStyleToNodes(session, [mutation.nodeId], `stroke: ${mutation.color}; stroke-width: 2px;`);
      return;
    }
    label.removeAttribute('style');
    const parent = label.parentElement;
    const existingTitle = parent?.querySelector('title');
    if (existingTitle) existingTitle.remove();
    label.innerHTML = value !== undefined ? value : '';
  });

  // Remove suppressed labels
  for (const [posStr, value] of Object.entries(indexLabels)) {
    const pos = parseInt(posStr, 10);
    if (value === 0 && !mutationByNodeId[pos]) {
      removeLabel(session, pos);
      removeLabelLink(session, pos);
    }
  }
}

/**
 * Update tooltip text on link elements to display correct index values.
 *
 * @param {Object} v  Validated parameter dictionary.
 */
export function updateLinkTooltips(session, v) {
  const updatedIndices = {};
  for (const [key, [, index]] of Object.entries(getIndexDictionary(v))) {
    updatedIndices[String(key)] = String(index);
  }
  session.dom.querySelectorAll('line').forEach(line => {
    const start = line.getAttribute('start');
    const end = line.getAttribute('end');
    if (!line.firstChild) return;
    if (line.getAttribute('link_type') === 'label_link') {
      line.firstChild.textContent = updatedIndices[start] || '';
    } else {
      line.firstChild.textContent = (updatedIndices[start] || '') + '-' + (updatedIndices[end] || '');
    }
  });
}
