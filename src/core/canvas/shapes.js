import { getPlotInsertRoot } from './dom.js';

/**
 * Resolve the x/y coordinates of a list of graph node IDs.
 *
 * @param {number[]} indices  graph node IDs to resolve.
 * @returns {Array<[number, number]>}
 */
export function getNodePointPairs(session, indices) {
  const points = [];
  indices.forEach(index => {
    session.dom.querySelectorAll(`g[num="n${index}"]`).forEach(node => {
      const transform = node.getAttribute('transform') || '';
      const match = [...transform.matchAll(/-?\d+(?:\.\d+)?/g)];
      if (match.length >= 2) {
        points.push([parseFloat(match[0][0]), parseFloat(match[1][0])]);
      }
    });
  });
  return points;
}

/**
 * Close a polygon point list by appending the first point at the end.
 *
 * @param {Array<[number, number]>} points
 * @returns {string[]}
 */
export function closePolygonPoints(points) {
  if (!Array.isArray(points) || points.length === 0) return [];
  const pointStrings = points.map(([x, y]) => `${x},${y}`);
  if (pointStrings.length < 2) return pointStrings;
  return [...pointStrings, pointStrings[0]];
}

export function insertSvgShape(session, tagName, pointString, style, extraAttrs) {
  const shape = session.dom.createElementNS('http://www.w3.org/2000/svg', tagName);
  shape.setAttribute('points', pointString);
  shape.setAttribute('style', style);
  for (const [name, value] of Object.entries(extraAttrs)) {
    shape.setAttribute(name, value);
  }
  const insertRoot = getPlotInsertRoot(session);
  if (insertRoot) insertRoot.insertBefore(shape, insertRoot.firstChild);
}

/**
 * Draw a polyline connecting a list of graph node positions.
 *
 * @param {number[]} indices  graph node IDs to connect.
 * @param {string} style  CSS style string for the polyline.
 */
export function polyline(session, indices, style, extraAttrs = {}) {
  const points = getNodePointPairs(session, indices);
  const pointString = points.map(([x, y]) => `${x},${y}`).join(' ');
  insertSvgShape(session, 'polyline', pointString, style, extraAttrs);
}

/**
 * Draw a closed polygon connecting a list of graph node positions.
 *
 * @param {number[]} indices  graph node IDs to connect.
 * @param {string} style  CSS style string for the polygon.
 */
export function polygon(session, indices, style, extraAttrs = {}) {
  const points = getNodePointPairs(session, indices);
  const pointString = closePolygonPoints(points).join(' ');
  insertSvgShape(session, 'polygon', pointString, style, extraAttrs);
}
