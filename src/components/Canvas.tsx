import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useStore } from "../store/useStore";
import type { AnyNode, Endpoint, ShapeKind, Vec } from "../store/types";
import { Grid } from "./Grid";
import { NodeView } from "./nodes/NodeView";
import { SelectionOverlay, type HandleId } from "./SelectionOverlay";
import { TextEditor } from "./TextEditor";
import { Marquee } from "./Marquee";
import {
  normalizeRect,
  roundTo,
  screenToWorld,
  type Rect,
} from "../lib/geometry";
import { bindableAt, hitTest, nodesInRect } from "../lib/hitTest";
import { pointsBounds } from "../lib/freehand";
import { makeConnector, makeDraw, makeShape, makeText } from "../lib/factories";

type Interaction =
  | { kind: "idle" }
  | { kind: "pan"; sx: number; sy: number; cx: number; cy: number }
  | { kind: "marquee"; start: Vec; additive: boolean }
  | {
      kind: "translate";
      start: Vec;
      origin: Record<string, { x: number; y: number }>;
      moved: boolean;
    }
  | {
      kind: "resize";
      handle: HandleId;
      box: Rect;
      origin: Record<string, Rect>;
      originPoints: Record<string, number[][]>;
      aspect: boolean;
    }
  | { kind: "create"; id: string; start: Vec; kind2: ShapeKind; changed: boolean }
  | { kind: "draw"; id: string; ox: number; oy: number; last: Vec }
  | { kind: "connect"; id: string; changed: boolean }
  | { kind: "endpoint"; id: string; end: "from" | "to" };

const MIN = 6;

export function Canvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const iaRef = useRef<Interaction>({ kind: "idle" });
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [marquee, setMarquee] = useState<Rect | null>(null);
  const [bindHi, setBindHi] = useState<string | null>(null);

  const doc = useStore((s) => s.doc);
  const camera = useStore((s) => s.camera);
  const tool = useStore((s) => s.tool);
  const stickyTool = useStore((s) => s.stickyTool);
  const selectedIds = useStore((s) => s.selectedIds);
  const editingId = useStore((s) => s.editingId);
  const showGrid = useStore((s) => s.showGrid);
  const snap = useStore((s) => s.snap);
  const gridSize = useStore((s) => s.gridSize);
  const spaceDown = useStore((s) => s.spaceDown);

  const s = useStore.getState;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setSize({ w: el.clientWidth, h: el.clientHeight });
    });
    ro.observe(el);
    setSize({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  const getScreen = useCallback((e: { clientX: number; clientY: number }): Vec => {
    const r = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }, []);

  const toWorld = useCallback(
    (screen: Vec): Vec => screenToWorld(screen, useStore.getState().camera),
    [],
  );

  const maybeSnap = useCallback(
    (v: Vec): Vec =>
      snap
        ? { x: roundTo(v.x, gridSize * 2), y: roundTo(v.y, gridSize * 2) }
        : v,
    [snap, gridSize],
  );

  // ---- wheel: zoom + pan ------------------------------------------------
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const screen = getScreen(e);
      if (e.ctrlKey || e.metaKey) {
        const factor = Math.exp(-e.deltaY * 0.0016);
        useStore.getState().zoomAt(screen, factor);
      } else {
        useStore.getState().panBy(-e.deltaX, -e.deltaY);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [getScreen]);

  // ---- pointer down --------------------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button === 2) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const screen = getScreen(e);
    const world = toWorld(screen);
    const st = s();
    const panning =
      spaceDown || tool === "hand" || e.button === 1;

    if (panning) {
      iaRef.current = {
        kind: "pan",
        sx: screen.x,
        sy: screen.y,
        cx: st.camera.x,
        cy: st.camera.y,
      };
      return;
    }

    if (tool === "select") {
      const tol = 8 / st.camera.z;
      const hit = hitTest(st.doc, world, tol);
      if (hit) {
        if (e.shiftKey) {
          st.toggleInSelection(hit);
          return;
        }
        if (!st.selectedIds.includes(hit)) st.select([hit]);
        startTranslate(world);
      } else {
        if (!e.shiftKey) st.clearSelection();
        iaRef.current = { kind: "marquee", start: world, additive: e.shiftKey };
        setMarquee({ x: world.x, y: world.y, w: 0, h: 0 });
      }
      return;
    }

    if (tool === "draw") {
      st.snapshot();
      const node = makeDraw(world.x, world.y, st.style);
      node.points = [[0, 0, e.pressure || 0.5]];
      st.addNode(node, { history: false, select: false });
      iaRef.current = {
        kind: "draw",
        id: node.id,
        ox: world.x,
        oy: world.y,
        last: world,
      };
      return;
    }

    if (tool === "text") {
      st.snapshot();
      const p = maybeSnap(world);
      const node = makeText(p.x, p.y, st.style);
      st.addNode(node, { history: false });
      st.setEditing(node.id);
      if (!stickyTool) st.setTool("select");
      return;
    }

    if (tool === "connector") {
      st.snapshot();
      const bindId = bindableAt(st.doc, world);
      const from: Endpoint = bindId
        ? { kind: "node", nodeId: bindId, anchor: "auto" }
        : { kind: "free", x: world.x, y: world.y };
      const node = makeConnector(
        from,
        { kind: "free", x: world.x, y: world.y },
        st.style,
      );
      st.addNode(node, { history: false, select: false });
      iaRef.current = { kind: "connect", id: node.id, changed: false };
      return;
    }

    // shape tools
    const shapeKind = tool as ShapeKind;
    st.snapshot();
    const p = maybeSnap(world);
    const node = makeShape(shapeKind, p.x, p.y, 1, 1, st.style);
    st.addNode(node, { history: false, select: false });
    iaRef.current = {
      kind: "create",
      id: node.id,
      start: p,
      kind2: shapeKind,
      changed: false,
    };
  };

  const startTranslate = (world: Vec) => {
    const st = s();
    st.snapshot();
    const origin: Record<string, { x: number; y: number }> = {};
    for (const id of st.selectedIds) {
      const n = st.doc.nodes[id];
      if (n) origin[id] = { x: n.x, y: n.y };
    }
    iaRef.current = { kind: "translate", start: world, origin, moved: false };
  };

  const onResizeStart = (handle: HandleId, e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const st = s();
    st.snapshot();
    const nodes = st.selectedIds
      .map((id) => st.doc.nodes[id])
      .filter(Boolean) as AnyNode[];
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    const origin: Record<string, Rect> = {};
    const originPoints: Record<string, number[][]> = {};
    for (const n of nodes) {
      origin[n.id] = { x: n.x, y: n.y, w: n.w, h: n.h };
      if (n.type === "draw") originPoints[n.id] = n.points.map((p) => [...p]);
      minX = Math.min(minX, n.x);
      minY = Math.min(minY, n.y);
      maxX = Math.max(maxX, n.x + n.w);
      maxY = Math.max(maxY, n.y + n.h);
    }
    iaRef.current = {
      kind: "resize",
      handle,
      box: { x: minX, y: minY, w: maxX - minX, h: maxY - minY },
      origin,
      originPoints,
      aspect: e.shiftKey,
    };
  };

  const onEndpointStart = (end: "from" | "to", e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const st = s();
    st.snapshot();
    iaRef.current = { kind: "endpoint", id: st.selectedIds[0], end };
  };

  // ---- pointer move -----------------------------------------------------
  const onPointerMove = (e: React.PointerEvent) => {
    const ia = iaRef.current;
    const screen = getScreen(e);
    const st = s();

    if (ia.kind === "idle") {
      if (tool === "connector" || tool === "select") {
        const w = toWorld(screen);
        const b =
          tool === "connector" ? bindableAt(st.doc, w) : null;
        setBindHi(b);
      }
      return;
    }

    const world = toWorld(screen);

    if (ia.kind === "pan") {
      st.setCamera({
        x: ia.cx + (screen.x - ia.sx),
        y: ia.cy + (screen.y - ia.sy),
      });
      return;
    }

    if (ia.kind === "marquee") {
      const r = normalizeRect(ia.start, world);
      setMarquee(r);
      const ids = nodesInRect(st.doc, r);
      st.select(
        ia.additive
          ? Array.from(new Set([...st.selectedIds, ...ids]))
          : ids,
      );
      return;
    }

    if (ia.kind === "translate") {
      let dx = world.x - ia.start.x;
      let dy = world.y - ia.start.y;
      if (snap) {
        const ids = Object.keys(ia.origin);
        if (ids.length) {
          const first = ia.origin[ids[0]];
          dx = roundTo(first.x + dx, gridSize * 2) - first.x;
          dy = roundTo(first.y + dy, gridSize * 2) - first.y;
        }
      }
      const patch: Record<string, Partial<AnyNode>> = {};
      for (const [id, o] of Object.entries(ia.origin)) {
        patch[id] = { x: o.x + dx, y: o.y + dy };
      }
      st.updateNodes(patch, false);
      if (Math.abs(dx) + Math.abs(dy) > 0.01)
        iaRef.current = { ...ia, moved: true };
      return;
    }

    if (ia.kind === "resize") {
      const b = ia.box;
      const h = ia.handle;
      const left = h.includes("w");
      const right = h.includes("e");
      const top = h.includes("n");
      const bottom = h.includes("s");
      let nx = b.x;
      let ny = b.y;
      let nw = b.w;
      let nh = b.h;
      const p = snap ? maybeSnap(world) : world;
      if (right) nw = Math.max(MIN, p.x - b.x);
      if (left) {
        nx = Math.min(p.x, b.x + b.w - MIN);
        nw = b.x + b.w - nx;
      }
      if (bottom) nh = Math.max(MIN, p.y - b.y);
      if (top) {
        ny = Math.min(p.y, b.y + b.h - MIN);
        nh = b.y + b.h - ny;
      }
      let sx = b.w ? nw / b.w : 1;
      let sy = b.h ? nh / b.h : 1;
      if (ia.aspect && (left || right) && (top || bottom)) {
        const k = Math.max(sx, sy);
        sx = k;
        sy = k;
        if (left) nx = b.x + b.w - b.w * k;
        if (top) ny = b.y + b.h - b.h * k;
      }
      const patch: Record<string, Partial<AnyNode>> = {};
      for (const [id, o] of Object.entries(ia.origin)) {
        const next: Partial<AnyNode> = {
          x: nx + (o.x - b.x) * sx,
          y: ny + (o.y - b.y) * sy,
          w: Math.max(1, o.w * sx),
          h: Math.max(1, o.h * sy),
        };
        const op = ia.originPoints[id];
        if (op)
          (next as { points: number[][] }).points = op.map(([px, py, pr]) => [
            px * sx,
            py * sy,
            pr,
          ]);
        patch[id] = next;
      }
      st.updateNodes(patch, false);
      return;
    }

    if (ia.kind === "create") {
      const p = maybeSnap(world);
      const r = normalizeRect(ia.start, p);
      st.updateNode(
        ia.id,
        { x: r.x, y: r.y, w: Math.max(1, r.w), h: Math.max(1, r.h) },
        false,
      );
      if (r.w + r.h > 4) iaRef.current = { ...ia, changed: true };
      return;
    }

    if (ia.kind === "draw") {
      const dxp = world.x - ia.ox;
      const dyp = world.y - ia.oy;
      if (Math.hypot(world.x - ia.last.x, world.y - ia.last.y) < 1 / camera.z)
        return;
      const node = st.doc.nodes[ia.id];
      if (!node || node.type !== "draw") return;
      const points = [...node.points, [dxp, dyp, e.pressure || 0.5]];
      const bb = pointsBounds(points, node.size);
      st.updateNode(
        ia.id,
        { points, w: bb.w, h: bb.h } as Partial<AnyNode>,
        false,
      );
      iaRef.current = { ...ia, last: world };
      return;
    }

    if (ia.kind === "connect") {
      const bindId = bindableAt(st.doc, world);
      setBindHi(bindId);
      const to: Endpoint = bindId
        ? { kind: "node", nodeId: bindId, anchor: "auto" }
        : { kind: "free", x: world.x, y: world.y };
      st.updateNode(ia.id, { to } as Partial<AnyNode>, false);
      iaRef.current = { ...ia, changed: true };
      return;
    }

    if (ia.kind === "endpoint") {
      const bindId = bindableAt(st.doc, world);
      setBindHi(bindId);
      const ep: Endpoint = bindId
        ? { kind: "node", nodeId: bindId, anchor: "auto" }
        : { kind: "free", x: world.x, y: world.y };
      st.updateNode(ia.id, { [ia.end]: ep } as Partial<AnyNode>, false);
      return;
    }
  };

  // ---- pointer up ----------------------------------------------------
  const onPointerUp = (e: React.PointerEvent) => {
    const ia = iaRef.current;
    iaRef.current = { kind: "idle" };
    setMarquee(null);
    setBindHi(null);
    const st = s();

    if (ia.kind === "marquee") {
      return;
    }

    if (ia.kind === "translate") {
      if (!ia.moved) {
        st.discardSnapshot();
        const world = toWorld(getScreen(e));
        const hit = hitTest(st.doc, world, 8 / st.camera.z);
        if (hit && !e.shiftKey) st.select([hit]);
      }
      return;
    }

    if (ia.kind === "resize" || ia.kind === "endpoint") {
      return;
    }

    if (ia.kind === "create") {
      const node = st.doc.nodes[ia.id];
      if (!node) return;
      if (!ia.changed) {
        // click-stamp a default-sized shape
        const w = 140;
        const h = ia.kind2 === "ellipse" ? 100 : 90;
        st.updateNode(
          ia.id,
          { x: ia.start.x - w / 2, y: ia.start.y - h / 2, w, h },
          false,
        );
      }
      st.select([ia.id]);
      if (!stickyTool) st.setTool("select");
      return;
    }

    if (ia.kind === "draw") {
      const node = st.doc.nodes[ia.id];
      if (!node || node.type !== "draw" || node.points.length < 2) {
        st.removeNodes([ia.id], false);
        st.discardSnapshot();
        return;
      }
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const [x, y] of node.points) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
      const pad = node.size;
      const shifted = node.points.map(([x, y, p]) => [
        x - minX + pad,
        y - minY + pad,
        p,
      ]);
      st.updateNode(
        ia.id,
        {
          x: node.x + minX - pad,
          y: node.y + minY - pad,
          w: maxX - minX + pad * 2,
          h: maxY - minY + pad * 2,
          points: shifted,
        } as Partial<AnyNode>,
        false,
      );
      return;
    }

    if (ia.kind === "connect") {
      const node = st.doc.nodes[ia.id];
      if (!node || node.type !== "connector") return;
      const bothFree =
        node.from.kind === "free" && node.to.kind === "free";
      if (
        !ia.changed ||
        (bothFree &&
          Math.hypot(
            (node.from as { x: number }).x - (node.to as { x: number }).x,
            (node.from as { y: number }).y - (node.to as { y: number }).y,
          ) < 8)
      ) {
        st.removeNodes([ia.id], false);
        st.discardSnapshot();
        return;
      }
      st.select([ia.id]);
      if (!stickyTool) st.setTool("select");
      return;
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    const st = s();
    const world = toWorld(getScreen(e));
    const hit = hitTest(st.doc, world, 8 / st.camera.z);
    if (hit) {
      const n = st.doc.nodes[hit];
      if (n && (n.type === "text" || n.type === "shape")) {
        st.setEditing(hit);
        return;
      }
      if (n && n.type === "connector") {
        const label = window.prompt("Connector label", n.label);
        if (label !== null) st.updateNode(hit, { label } as Partial<AnyNode>);
        return;
      }
    } else {
      st.snapshot();
      const node = makeText(world.x, world.y - 10, st.style);
      st.addNode(node, { history: false });
      st.setEditing(node.id);
    }
  };

  const selectedNodes = useMemo(
    () => selectedIds.map((id) => doc.nodes[id]).filter(Boolean) as AnyNode[],
    [selectedIds, doc.nodes],
  );

  const editingNode =
    editingId && doc.nodes[editingId]
      ? doc.nodes[editingId]
      : null;

  const cursor =
    spaceDown || tool === "hand"
      ? iaRef.current.kind === "pan"
        ? "grabbing"
        : "grab"
      : tool === "draw"
        ? "crosshair"
        : tool === "text"
          ? "text"
          : tool === "select"
            ? "default"
            : "crosshair";

  const worldTransform = `translate(${camera.x}px, ${camera.y}px) scale(${camera.z})`;

  return (
    <div
      ref={containerRef}
      className="canvas-root"
      style={{ cursor }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={onDoubleClick}
      onContextMenu={(e) => e.preventDefault()}
    >
      {showGrid && <Grid camera={camera} width={size.w} height={size.h} />}

      <svg className="scene" width={size.w} height={size.h}>
        <g style={{ transform: worldTransform }}>
          {doc.order.map((id) => {
            const n = doc.nodes[id];
            if (!n) return null;
            return (
              <NodeView
                key={id}
                node={n}
                nodes={doc.nodes}
                editing={editingId === id}
              />
            );
          })}
        </g>
      </svg>

      {marquee && <Marquee rect={marquee} camera={camera} />}

      {selectedNodes.length > 0 && !editingId && (
        <SelectionOverlay
          nodes={selectedNodes}
          allNodes={doc.nodes}
          camera={camera}
          onResizeStart={onResizeStart}
          onEndpointStart={onEndpointStart}
          bindHighlightId={bindHi}
        />
      )}

      {!selectedNodes.length && bindHi && (
        <SelectionOverlay
          nodes={[]}
          allNodes={doc.nodes}
          camera={camera}
          onResizeStart={onResizeStart}
          onEndpointStart={onEndpointStart}
          bindHighlightId={bindHi}
        />
      )}

      {editingNode &&
        (editingNode.type === "text" || editingNode.type === "shape") && (
          <TextEditor node={editingNode} camera={camera} />
        )}

      <div className="zoom-readout" onPointerDown={(e) => e.stopPropagation()}>
        {Math.round(camera.z * 100)}%
      </div>
    </div>
  );
}
