

export function normaliseRotationRadians(radians) {
  return Math.atan2(Math.sin(radians), Math.cos(radians));
}

export function rotateCoordinateCloud(nodes, xField, yField, center, radians) {
  if (!center || ![center.x, center.y, radians].every(Number.isFinite)) return false;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  nodes.forEach(node => {
    const offsetX = node[xField] - center.x;
    const offsetY = node[yField] - center.y;
    node[xField] = center.x + cosine * offsetX - sine * offsetY;
    node[yField] = center.y + sine * offsetX + cosine * offsetY;
  });
  return true;
}

export function rotateTemplateFitState(template, centerField, angleField, pivot, radians) {
  const center = template?.[centerField];
  const angle = template?.[angleField];
  if (!center || ![center.x, center.y, angle].every(Number.isFinite)) return;
  const cosine = Math.cos(radians);
  const sine = Math.sin(radians);
  const offsetX = center.x - pivot.x;
  const offsetY = center.y - pivot.y;
  template[centerField] = {
    x: pivot.x + cosine * offsetX - sine * offsetY,
    y: pivot.y + sine * offsetX + cosine * offsetY
  };
  template[angleField] = normaliseRotationRadians(angle + radians);
}

/**
 * Remove the global angular degree of freedom from an RRI layout by
 * rotating the complete graph until the paired-column centreline is
 * horizontal. Current and previous coordinate clouds are rotated
 * independently so translation is preserved without angular drift.
 */
export function orientLinearRriInteractionHorizontally(graph, rriTemplate, templates) {
  if (!graph || !Array.isArray(graph.nodes) || !rriTemplate) return false;
  const nodes = graph.nodes.filter(Boolean);
  if (nodes.length === 0 || nodes.some(node => node.fixed || ![node.x, node.y, node.px, node.py].every(Number.isFinite))) return false;
  if (![rriTemplate.angle, rriTemplate.previousAngle].every(Number.isFinite) || !rriTemplate.center || !rriTemplate.previousCenter) return false;
  if (rriTemplate.horizontalDirection !== 1 && rriTemplate.horizontalDirection !== -1) {
    rriTemplate.horizontalDirection = Math.cos(rriTemplate.angle) >= 0 ? 1 : -1;
  }
  const targetAngle = rriTemplate.horizontalDirection === 1 ? 0 : Math.PI;
  const currentRotation = normaliseRotationRadians(targetAngle - rriTemplate.angle);
  const previousRotation = normaliseRotationRadians(targetAngle - rriTemplate.previousAngle);
  const currentPivot = {
    ...rriTemplate.center
  };
  const previousPivot = {
    ...rriTemplate.previousCenter
  };
  rotateCoordinateCloud(nodes, 'x', 'y', currentPivot, currentRotation);
  rotateCoordinateCloud(nodes, 'px', 'py', previousPivot, previousRotation);
  templates.forEach(template => {
    rotateTemplateFitState(template, 'center', 'angle', currentPivot, currentRotation);
    rotateTemplateFitState(template, 'previousCenter', 'previousAngle', previousPivot, previousRotation);
  });
  rriTemplate.lastHorizontalRotation = currentRotation;
  return true;
}
