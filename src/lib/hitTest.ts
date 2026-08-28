import type { AnyNode, Document, Vec } from "../store/types";
import { resolveConnector } from "./connectors";
import { orthRoute, pointInRect, rectsIntersect, type Rect } from "./geometry";

function pointSegDist(p: Vec, a: Vec, b: Vec): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function connectorDistance(
  node: Extract<AnyNode, { type: "connector" }>,
  nodes: Record<string, AnyNode>,
  p: Vec,
): number {
  const r = resolveConnector(node, nodes);
  if (node.routing === "elbow") {
    const pts = orthRoute(r.a, r.b);
    let d = Infinity;
    for (let i = 0; i < pts.length - 1; i++)
      d = Math.min(d, pointSegDist(p, pts[i], pts[i + 1]));
    return d;
  }
  if (node.routing === "curved") {
    // sample the quadratic-ish curve as short segments
    const steps = 16;
    let prev = r.a;
    let d = Infinity;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const mx = (r.a.x + r.b.x) / 2;
      const my = (r.a.y + r.b.y) / 2;
      const horiz = Math.abs(r.b.x - r.a.x) > Math.abs(r.b.y - r.a.y);
      const c1 = horiz ? { x: mx, y: r.a.y } : { x: r.a.x, y: my };
      const c2 = horiz ? { x: mx, y: r.b.y } : { x: r.b.x, y: my };
      const u = 1 - t;
      const pt = {
        x:
          u * u * u * r.a.x +
          3 * u * u * t * c1.x +
          3 * u * t * t * c2.x +
          t * t * t * r.b.x,
        y:
          u * u * u * r.a.y +
          3 * u * u * t * c1.y +
          3 * u * t * t * c2.y +
          t * t * t * r.b.y,
      };
      d = Math.min(d, pointSegDist(p, prev, pt));
      prev = pt;
    }
    return d;
  }
  return pointSegDist(p, r.a, r.b);
}

export function nodeHit(node: AnyNode, nodes: Record<string, AnyNode>, p: Vec, tol: number): boolean {
  if (node.type === "connector") return connectorDistance(node, nodes, p) <= tol + node.strokeWidth;
  if (node.type === "draw") {
    // bounds test then coarse stroke proximity
    if (!pointInRect(p, node, tol)) return false;
    if (node.points.length < 2) return true;
    let d = Infinity;
    for (let i = 0; i < node.points.length - 1; i += 1) {
      const a = { x: node.x + node.points[i][0], y: node.y + node.points[i][1] };
      const b = {
        x: node.x + node.points[i + 1][0],
        y: node.y + node.points[i + 1][1],
      };
      d = Math.min(d, pointSegDist(p, a, b));
      if (d <= tol + node.size) return true;
    }
    return false;
  }
  return pointInRect(p, node, node.type === "text" ? tol + 4 : tol);
}

export function hitTest(
  doc: Document,
  p: Vec,
  tol: number,
): string | null {
  for (let i = doc.order.length - 1; i >= 0; i--) {
    const id = doc.order[i];
    const n = doc.nodes[id];
    if (!n || n.locked) continue;
    if (nodeHit(n, doc.nodes, p, tol)) return id;
  }
  return null;
}

export function nodesInRect(doc: Document, r: Rect): string[] {
  const out: string[] = [];
  for (const id of doc.order) {
    const n = doc.nodes[id];
    if (!n || n.locked) continue;
    if (n.type === "connector") {
      const rc = resolveConnector(n, doc.nodes);
      const bb = {
        x: Math.min(rc.a.x, rc.b.x),
        y: Math.min(rc.a.y, rc.b.y),
        w: Math.abs(rc.a.x - rc.b.x),
        h: Math.abs(rc.a.y - rc.b.y),
      };
      if (rectsIntersect(bb, r)) out.push(id);
      continue;
    }
    if (rectsIntersect(n, r)) out.push(id);
  }
  return out;
}

/** topmost shape/image/text under a point (for connector binding) */
export function bindableAt(doc: Document, p: Vec): string | null {
  for (let i = doc.order.length - 1; i >= 0; i--) {
    const id = doc.order[i];
    const n = doc.nodes[id];
    if (!n || n.locked) continue;
    if (n.type === "connector" || n.type === "draw") continue;
    if (pointInRect(p, n, 4)) return id;
  }
  return null;
}
