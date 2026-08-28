import type { AnyNode, ConnectorNode, Vec } from "../store/types";
import {
  anchorPoint,
  curvedPath,
  elbowPath,
  nodeBounds,
  nodeCenter,
  orthRoute,
} from "./geometry";

export interface ResolvedConnector {
  a: Vec;
  b: Vec;
  path: string;
  /** midpoint for label / hit affordance */
  mid: Vec;
  /** angle (rad) of the end segment, for arrowhead rotation */
  endAngle: number;
  startAngle: number;
}

function endpointPos(
  ep: ConnectorNode["from"],
  nodes: Record<string, AnyNode>,
  toward: Vec,
): { p: Vec; center: Vec | null } {
  if (ep.kind === "free") return { p: { x: ep.x, y: ep.y }, center: null };
  const n = nodes[ep.nodeId];
  if (!n) return { p: toward, center: null };
  const r = nodeBounds(n);
  const c = nodeCenter(n);
  const p = anchorPoint(r, ep.anchor, toward);
  return { p, center: c };
}

export function resolveConnector(
  conn: ConnectorNode,
  nodes: Record<string, AnyNode>,
): ResolvedConnector {
  // First pass: aim endpoints at the other end's center (or free point).
  const rawFrom =
    conn.from.kind === "free"
      ? { x: conn.from.x, y: conn.from.y }
      : nodes[conn.from.nodeId]
        ? nodeCenter(nodes[conn.from.nodeId])
        : { x: 0, y: 0 };
  const rawTo =
    conn.to.kind === "free"
      ? { x: conn.to.x, y: conn.to.y }
      : nodes[conn.to.nodeId]
        ? nodeCenter(nodes[conn.to.nodeId])
        : { x: 0, y: 0 };

  const a = endpointPos(conn.from, nodes, rawTo).p;
  const b = endpointPos(conn.to, nodes, rawFrom).p;

  let path: string;
  let startAngle: number;
  let endAngle: number;

  if (conn.routing === "elbow") {
    const pts = orthRoute(a, b);
    path = elbowPath(pts, 14);
    startAngle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
    const n = pts.length;
    endAngle = Math.atan2(
      pts[n - 1].y - pts[n - 2].y,
      pts[n - 1].x - pts[n - 2].x,
    );
  } else if (conn.routing === "curved") {
    path = curvedPath(a, b);
    startAngle = Math.atan2(b.y - a.y, b.x - a.x);
    endAngle = startAngle;
  } else {
    path = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    startAngle = Math.atan2(b.y - a.y, b.x - a.x);
    endAngle = startAngle;
  }

  return {
    a,
    b,
    path,
    mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    startAngle,
    endAngle,
  };
}
