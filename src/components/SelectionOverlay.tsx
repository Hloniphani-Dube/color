import { memo } from "react";
import type { AnyNode, Camera } from "../store/types";
import { resolveConnector } from "../lib/connectors";
import { worldToScreen } from "../lib/geometry";

export type HandleId =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

const HANDLES: { id: HandleId; fx: number; fy: number; cursor: string }[] = [
  { id: "nw", fx: 0, fy: 0, cursor: "nwse-resize" },
  { id: "n", fx: 0.5, fy: 0, cursor: "ns-resize" },
  { id: "ne", fx: 1, fy: 0, cursor: "nesw-resize" },
  { id: "e", fx: 1, fy: 0.5, cursor: "ew-resize" },
  { id: "se", fx: 1, fy: 1, cursor: "nwse-resize" },
  { id: "s", fx: 0.5, fy: 1, cursor: "ns-resize" },
  { id: "sw", fx: 0, fy: 1, cursor: "nesw-resize" },
  { id: "w", fx: 0, fy: 0.5, cursor: "ew-resize" },
];

interface Props {
  nodes: AnyNode[];
  allNodes: Record<string, AnyNode>;
  camera: Camera;
  onResizeStart: (h: HandleId, e: React.PointerEvent) => void;
  onEndpointStart: (end: "from" | "to", e: React.PointerEvent) => void;
  onRotateStart?: (e: React.PointerEvent) => void;
  bindHighlightId?: string | null;
}

export const SelectionOverlay = memo(function SelectionOverlay({
  nodes,
  allNodes,
  camera,
  onResizeStart,
  onEndpointStart,
  bindHighlightId,
}: Props) {
  const bind = bindHighlightId ? allNodes[bindHighlightId] : null;

  // single connector -> endpoint handles
  const singleConnector =
    nodes.length === 1 && nodes[0].type === "connector"
      ? (nodes[0] as Extract<AnyNode, { type: "connector" }>)
      : null;

  let box: { x: number; y: number; w: number; h: number } | null = null;
  if (nodes.length && !singleConnector) {
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
    const tl = worldToScreen({ x: minX, y: minY }, camera);
    box = {
      x: tl.x,
      y: tl.y,
      w: (maxX - minX) * camera.z,
      h: (maxY - minY) * camera.z,
    };
  }

  const resizable = nodes.some((n) => n.type !== "connector");

  return (
    <div className="overlay-layer">
      {bind && (
        <div
          className="bind-highlight"
          style={rectStyle(bind, camera)}
          aria-hidden
        />
      )}

      {box && (
        <div
          className="sel-box"
          style={{
            transform: `translate(${box.x}px, ${box.y}px)`,
            width: box.w,
            height: box.h,
          }}
        >
          {resizable &&
            HANDLES.map((h) => (
              <div
                key={h.id}
                className={`handle handle-${h.id}`}
                style={{
                  left: h.fx * box!.w,
                  top: h.fy * box!.h,
                  cursor: h.cursor,
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onResizeStart(h.id, e);
                }}
              />
            ))}
        </div>
      )}

      {singleConnector &&
        (() => {
          const r = resolveConnector(singleConnector, allNodes);
          const a = worldToScreen(r.a, camera);
          const b = worldToScreen(r.b, camera);
          return (
            <>
              <div
                className="endpoint-handle"
                style={{ transform: `translate(${a.x - 8}px, ${a.y - 8}px)` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onEndpointStart("from", e);
                }}
              />
              <div
                className="endpoint-handle"
                style={{ transform: `translate(${b.x - 8}px, ${b.y - 8}px)` }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  onEndpointStart("to", e);
                }}
              />
            </>
          );
        })()}
    </div>
  );
});

function rectStyle(n: AnyNode, cam: Camera): React.CSSProperties {
  const tl = worldToScreen({ x: n.x, y: n.y }, cam);
  return {
    transform: `translate(${tl.x}px, ${tl.y}px)`,
    width: n.w * cam.z,
    height: n.h * cam.z,
  };
}
