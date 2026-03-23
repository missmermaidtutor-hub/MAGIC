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
 * Append new bezier segments to an existing SVG path string.
 * Only generates the path for points from `fromIndex` onward,
 * avoiding regeneration of the full path on every move.
 */
export function appendToSvgPath(existingPath, points, fromIndex) {
  if (!points || points.length === 0) return existingPath || '';

  // First point — start the path
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y} L ${points[0].x + 0.5} ${points[0].y + 0.5}`;
  }

  // If fromIndex is 0 or 1, regenerate from scratch (short path)
  if (fromIndex <= 1) {
    return pointsToSvgPath(points);
  }

  // Strip trailing L segment from existing path (we'll re-append it)
  let base = existingPath;
  const lastLIndex = base.lastIndexOf(' L ');
  if (lastLIndex !== -1) {
    base = base.substring(0, lastLIndex);
  }

  // Append new Q segments from fromIndex-1 onward
  let appended = '';
  for (let i = Math.max(fromIndex, 1); i < points.length - 1; i++) {
    const midX = (points[i].x + points[i + 1].x) / 2;
    const midY = (points[i].y + points[i + 1].y) / 2;
    appended += ` Q ${points[i].x} ${points[i].y} ${midX} ${midY}`;
  }

  // Final point
  const last = points[points.length - 1];
  appended += ` L ${last.x} ${last.y}`;

  return base + appended;
}

/**
 * Convert HSV (h: 0-360, s: 0-1, v: 0-1) to hex color string.
 */
export function hsvToHex(h, s, v) {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r, g, b;

  if (h < 60)      { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }

  const toHex = (val) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return '#' + toHex(r) + toHex(g) + toHex(b);
}

/**
 * Convert hex color string to HSV {h: 0-360, s: 0-1, v: 0-1}.
 */
export function hexToHsv(hex) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;

  let h = 0;
  if (d !== 0) {
    if (max === r)      h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * (((b - r) / d) + 2);
    else                h = 60 * (((r - g) / d) + 4);
  }
  if (h < 0) h += 360;

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

/**
 * Hit-test whether a point is near a given stroke.
 * Returns true if the point is within tolerance of the stroke.
 */
export function hitTestStroke(stroke, point, tolerance = 10) {
  const { x, y } = point;
  const pad = (stroke.size || 2) / 2 + tolerance;

  if (stroke.type === 'rect') {
    const r = rectFromPoints(stroke.startPoint, stroke.endPoint);
    return (
      x >= r.x - pad && x <= r.x + r.width + pad &&
      y >= r.y - pad && y <= r.y + r.height + pad
    );
  }

  if (stroke.type === 'circle') {
    const c = circleFromPoints(stroke.startPoint, stroke.endPoint);
    const dist = Math.sqrt((x - c.cx) ** 2 + (y - c.cy) ** 2);
    return dist <= c.r + pad;
  }

  if (stroke.type === 'line') {
    const { startPoint: a, endPoint: b } = stroke;
    const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
    if (lenSq === 0) return Math.sqrt((x - a.x) ** 2 + (y - a.y) ** 2) <= pad;
    let t = ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projX = a.x + t * (b.x - a.x);
    const projY = a.y + t * (b.y - a.y);
    const dist = Math.sqrt((x - projX) ** 2 + (y - projY) ** 2);
    return dist <= pad;
  }

  if (stroke.type === 'triangle') {
    const s = stroke.startPoint, e = stroke.endPoint;
    const minX = Math.min(s.x, e.x);
    const maxX = Math.max(s.x, e.x);
    const minY = Math.min(s.y, e.y);
    const maxY = Math.max(s.y, e.y);
    return x >= minX - pad && x <= maxX + pad && y >= minY - pad && y <= maxY + pad;
  }

  // Freehand path — check bounding box of all points
  if (stroke.type === 'path' && stroke.points && stroke.points.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of stroke.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    if (x < minX - pad || x > maxX + pad || y < minY - pad || y > maxY + pad) return false;
    // Fine check: is point near any segment?
    for (let i = 0; i < stroke.points.length - 1; i++) {
      const a = stroke.points[i], b = stroke.points[i + 1];
      const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
      if (lenSq === 0) continue;
      let t = ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = a.x + t * (b.x - a.x);
      const projY = a.y + t * (b.y - a.y);
      if (Math.sqrt((x - projX) ** 2 + (y - projY) ** 2) <= pad) return true;
    }
    // Single point path
    if (stroke.points.length === 1) {
      return Math.sqrt((x - stroke.points[0].x) ** 2 + (y - stroke.points[0].y) ** 2) <= pad;
    }
    return false;
  }

  return false;
}

/**
 * Return a new stroke shifted by (dx, dy).
 * Regenerates pathData for freehand paths.
 */
export function moveStroke(stroke, dx, dy) {
  const shift = (p) => ({ x: p.x + dx, y: p.y + dy });

  if (stroke.type === 'path') {
    const newPoints = stroke.points.map(shift);
    return {
      ...stroke,
      points: newPoints,
      pathData: pointsToSvgPath(newPoints),
    };
  }

  // Shape strokes (line, rect, circle, triangle) have startPoint + endPoint
  return {
    ...stroke,
    startPoint: shift(stroke.startPoint),
    endPoint: shift(stroke.endPoint),
  };
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
