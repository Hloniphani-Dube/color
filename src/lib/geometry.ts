import type { AnyNode, Camera, Vec } from "../store/types";

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y);

export const roundTo = (n: number, step: number) =>
  step > 0 ? Math.round(n / step) * step : n;

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function screenToWorld(pt: Vec, cam: Camera): Vec {
  return { x: (pt.x - cam.x) / cam.z, y: (pt.y - cam.y) / cam.z };
}

export function worldToScreen(pt: Vec, cam: Camera): Vec {
  return { x: pt.x * cam.z + cam.x, y: pt.y * cam.z + cam.y };
}

export function rectsIntersect(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.w &&
    a.x + a.w > b.x &&
    a.y < b.y + b.h &&
    a.y + a.h > b.y
  );
}

export function pointInRect(p: Vec, r: Rect, pad = 0): boolean {
  return (
    p.x >= r.x - pad &&
    p.x <= r.x + r.w + pad &&
    p.y >= r.y - pad &&
    p.y <= r.y + r.h + pad
  );
}

export function normalizeRect(a: Vec, b: Vec): Rect {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.abs(a.x - b.x), h: Math.abs(a.y - b.y) };
}

/** Axis-aligned bounds of a node in world space. */
export function nodeBounds(n: AnyNode): Rect {
  return { x: n.x, y: n.y, w: n.w, h: n.h };
}

export function nodeCenter(n: AnyNode): Vec {
  return { x: n.x + n.w / 2, y: n.y + n.h / 2 };
}

export function boundsOf(nodes: AnyNode[]): Rect | null {
  if (nodes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.w);
    maxY = Math.max(maxY, n.y + n.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function expandRect(r: Rect, pad: number): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 };
}

/** Perimeter point on a rect for an anchor direction. */
export function anchorPoint(
  r: Rect,
  anchor: "top" | "right" | "bottom" | "left" | "auto",
  toward: Vec,
): Vec {
  const c = { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  if (anchor === "top") return { x: c.x, y: r.y };
  if (anchor === "bottom") return { x: c.x, y: r.y + r.h };
  if (anchor === "left") return { x: r.x, y: c.y };
  if (anchor === "right") return { x: r.x + r.w, y: c.y };
  // auto: intersection of the ray c -> toward with the rect border
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (dx === 0 && dy === 0) return { x: c.x, y: r.y };
  const scaleX = dx === 0 ? Infinity : r.w / 2 / Math.abs(dx);
  const scaleY = dy === 0 ? Infinity : r.h / 2 / Math.abs(dy);
  const s = Math.min(scaleX, scaleY);
  return { x: c.x + dx * s, y: c.y + dy * s };
}

/** SVG path for a rounded polyline given points and a corner radius. */
export function elbowPath(points: Vec[], r = 12): string {
  if (points.length < 2) return "";
  if (points.length === 2)
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const v1 = norm({ x: p1.x - p0.x, y: p1.y - p0.y });
    const v2 = norm({ x: p2.x - p1.x, y: p2.y - p1.y });
    const d1 = Math.min(r, dist(p0, p1) / 2);
    const d2 = Math.min(r, dist(p1, p2) / 2);
    const a = { x: p1.x - v1.x * d1, y: p1.y - v1.y * d1 };
    const b = { x: p1.x + v2.x * d2, y: p1.y + v2.y * d2 };
    d += ` L ${a.x} ${a.y} Q ${p1.x} ${p1.y} ${b.x} ${b.y}`;
  }
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function curvedPath(a: Vec, b: Vec): string {
  const mx = (a.x + b.x) / 2;
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx > dy) {
    return `M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`;
  }
  const my = (a.y + b.y) / 2;
  return `M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}`;
}

function norm(v: Vec): Vec {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

/** Simple orthogonal route between two points with a mid elbow. */
export function orthRoute(a: Vec, b: Vec): Vec[] {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx > dy) {
    const mx = (a.x + b.x) / 2;
    return [a, { x: mx, y: a.y }, { x: mx, y: b.y }, b];
  }
  const my = (a.y + b.y) / 2;
  return [a, { x: a.x, y: my }, { x: b.x, y: my }, b];
}
