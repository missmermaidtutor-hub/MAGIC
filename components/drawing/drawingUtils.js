/**
 * Convert an array of {x, y} points into an SVG path string.
 * Uses quadratic bezier curves for smooth freehand strokes.
 */
export function pointsToSvgPath(points) {
  if (!points || points.length === 0) return '';

  if (points.length === 1) {
    // Single dot — draw a tiny line so it renders
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.5} ${points[0].y + 0.5}`;
  }

  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  // Smooth path with quadratic bezier curves
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    path += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }

  // Last point
  const last = points[points.length - 1];
  path += ` L ${last.x} ${last.y}`;

  return path;
}

/**
 * Build SVG attributes for a line shape.
 */
export function lineFromPoints(start, end) {
  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
  };
}

/**
 * Build SVG attributes for a rectangle from two corner points.
 */
export function rectFromPoints(start, end) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

/**
 * Build SVG attributes for a circle from center + edge point.
 */
export function circleFromPoints(start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const radius = Math.sqrt(dx * dx + dy * dy);
  return {
    cx: start.x,
    cy: start.y,
    r: radius,
  };
}

/**
 * Build SVG polygon points string for an equilateral-ish triangle.
 * Start = top vertex, End defines the base width and height.
 */
export function triangleFromPoints(start, end) {
  const topX = (start.x + end.x) / 2;
  const topY = Math.min(start.y, end.y);
  const bottomY = Math.max(start.y, end.y);
  const leftX = Math.min(start.x, end.x);
  const rightX = Math.max(start.x, end.x);

  return `${topX},${topY} ${leftX},${bottomY} ${rightX},${bottomY}`;
}

/**
 * Simplify points array by removing points too close together.
 * Reduces SVG path complexity for better performance.
 */
export function simplifyPoints(points, tolerance = 2) {
  if (points.length < 3) return points;

  const result = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const dx = points[i].x - prev.x;
    const dy = points[i].y - prev.y;
    if (dx * dx + dy * dy >= tolerance * tolerance) {
      result.push(points[i]);
    }
  }

  // Always include the last point
  const last = points[points.length - 1];
  if (result[result.length - 1] !== last) {
    result.push(last);
  }

  return result;
}
