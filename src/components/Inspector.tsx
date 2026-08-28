import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ArrowLeft,
  BringToFront,
  Copy,
  Lock,
  MoveDown,
  MoveUp,
  SendToBack,
  Sparkles,
  Tag,
  Trash2,
  Unlock,
} from "lucide-react";
import { useStore } from "../store/useStore";
import type { AnyNode, DashStyle } from "../store/types";
import { Field, IconButton, Segmented, Slider, Swatches } from "./ui";
import { SWATCHES } from "../theme/themes";

const DASH: { value: DashStyle; label: string }[] = [
  { value: "solid", label: "──" },
  { value: "dashed", label: "- -" },
  { value: "dotted", label: "···" },
];

export function Inspector() {
  const selectedIds = useStore((s) => s.selectedIds);
  const doc = useStore((s) => s.doc);
  const style = useStore((s) => s.style);
  const setStyle = useStore((s) => s.setStyle);
  const applyToSel = useStore((s) => s.applyStyleToSelection);
  const snapshot = useStore((s) => s.snapshot);
  const reorder = useStore((s) => s.reorder);
  const dup = useStore((s) => s.duplicateSelected);
  const removeSelected = useStore((s) => s.removeSelected);
  const panelOpen = useStore((s) => s.panelOpen);

  const nodes = selectedIds
    .map((id) => doc.nodes[id])
    .filter(Boolean) as AnyNode[];
  const has = (t: AnyNode["type"]) => nodes.some((n) => n.type === t);
  const first = nodes[0];
  const empty = nodes.length === 0;

  const set = (patch: Partial<AnyNode>) => {
    if (empty) {
      // update matching style defaults
      const s: Record<string, unknown> = {};
      if ("fill" in patch) s.fill = patch.fill;
      if ("stroke" in patch) s.stroke = patch.stroke;
      if ("strokeWidth" in patch) s.strokeWidth = patch.strokeWidth;
      if ("dash" in patch) s.dash = patch.dash;
      if ("radius" in patch) s.radius = patch.radius;
      if ("color" in patch) s.drawColor = (patch as { color?: string }).color;
      if ("textColor" in patch) s.textColor = patch.textColor;
      if ("fontSize" in patch) s.fontSize = patch.fontSize;
      if ("routing" in patch) s.routing = patch.routing;
      if ("animated" in patch) s.animated = patch.animated;
      setStyle(s);
    } else {
      applyToSel(patch);
    }
  };

  const val = (key: string, fallback: unknown): unknown =>
    first && key in first
      ? (first as unknown as Record<string, unknown>)[key]
      : fallback;

  const connector = nodes.find((n) => n.type === "connector") as
    | Extract<AnyNode, { type: "connector" }>
    | undefined;
  const showShapeFill = empty || has("shape") || has("image");
  const showStroke = empty || has("shape") || has("connector");
  const showText = has("text") || has("shape");
  const showRadius =
    empty ||
    nodes.some(
      (n) =>
        (n.type === "shape" && (n.shape === "rectangle" || n.shape === "roundRect")) ||
        n.type === "image",
    );
  const showDraw = has("draw");
  const showConn = !!connector;

  return (
    <AnimatePresence>
      {panelOpen && (
        <motion.aside
          className="inspector glass"
          style={{ transformOrigin: "top right" }}
          initial={{ opacity: 0, scale: 0.55, x: 30, y: -26 }}
          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, scale: 0.55, x: 30, y: -26 }}
          transition={{ type: "spring", stiffness: 460, damping: 34 }}
        >
          <div className="inspector-head">
            <span className="inspector-title">
              {empty
                ? "Defaults"
                : nodes.length > 1
                  ? `${nodes.length} selected`
                  : labelFor(first)}
            </span>
            {!empty && (
              <div className="inspector-head-actions">
                <IconButton label="Duplicate" kbd="Mod+D" onClick={() => dup()}>
                  <Copy size={15} />
                </IconButton>
                <IconButton
                  label={first?.locked ? "Unlock" : "Lock"}
                  onClick={() =>
                    applyToSel({ locked: !first?.locked } as Partial<AnyNode>)
                  }
                >
                  {first?.locked ? <Lock size={15} /> : <Unlock size={15} />}
                </IconButton>
                <IconButton label="Delete" kbd="Delete" danger onClick={removeSelected}>
                  <Trash2 size={15} />
                </IconButton>
              </div>
            )}
          </div>

          <div className="inspector-body">
            {showShapeFill && (
              <Field label="Fill">
                <Swatches
                  value={String(empty ? style.fill : val("fill", "surface"))}
                  onChange={(c) => set({ fill: c } as Partial<AnyNode>)}
                  colors={SWATCHES}
                  allowNone
                />
              </Field>
            )}

            {showStroke && (
              <>
                <Field label={showConn ? "Line" : "Stroke"}>
                  <Swatches
                    value={String(empty ? style.stroke : val("stroke", "auto"))}
                    onChange={(c) => set({ stroke: c } as Partial<AnyNode>)}
                    colors={SWATCHES}
                    allowAuto
                    allowNone
                  />
                </Field>
                <Field label="Weight">
                  <Slider
                    label="px"
                    min={0}
                    max={24}
                    value={Number(
                      empty ? style.strokeWidth : val("strokeWidth", 2),
                    )}
                    onCommitStart={() => snapshot("weight")}
                    onChange={(v) =>
                      set({ strokeWidth: v } as Partial<AnyNode>)
                    }
                  />
                </Field>
                <Field label="Dash">
                  <Segmented
                    value={(empty ? style.dash : (val("dash", "solid") as DashStyle))}
                    options={DASH}
                    onChange={(v) => set({ dash: v } as Partial<AnyNode>)}
                  />
                </Field>
              </>
            )}

            {showRadius && (
              <Field label="Corner">
                <Slider
                  label="px"
                  min={0}
                  max={80}
                  value={Number(empty ? style.radius : val("radius", 8))}
                  onCommitStart={() => snapshot("radius")}
                  onChange={(v) => set({ radius: v } as Partial<AnyNode>)}
                />
              </Field>
            )}

            {showText && !empty && (
              <>
                <Field label="Text colour">
                  <Swatches
                    value={String(
                      first?.type === "text"
                        ? (first as Extract<AnyNode, { type: "text" }>).color
                        : val("textColor", "auto"),
                    )}
                    onChange={(c) =>
                      applyToSel(
                        has("text")
                          ? ({ color: c } as Partial<AnyNode>)
                          : ({ textColor: c } as Partial<AnyNode>),
                      )
                    }
                    colors={SWATCHES}
                    allowAuto
                  />
                </Field>
                <Field label="Font size">
                  <Slider
                    label="px"
                    min={8}
                    max={96}
                    value={Number(val("fontSize", 18))}
                    onCommitStart={() => snapshot("font")}
                    onChange={(v) =>
                      applyToSel({ fontSize: v } as Partial<AnyNode>)
                    }
                  />
                </Field>
              </>
            )}

            {has("text") && (
              <Field label="Align">
                <Segmented
                  value={
                    (first as Extract<AnyNode, { type: "text" }>).align ?? "left"
                  }
                  options={[
                    { value: "left", label: "L" },
                    { value: "center", label: "C" },
                    { value: "right", label: "R" },
                  ]}
                  onChange={(v) =>
                    applyToSel({ align: v } as Partial<AnyNode>)
                  }
                />
              </Field>
            )}

            {showDraw && (
              <>
                <Field label="Ink">
                  <Swatches
                    value={
                      (first as Extract<AnyNode, { type: "draw" }>).color ?? "auto"
                    }
                    onChange={(c) => applyToSel({ color: c } as Partial<AnyNode>)}
                    colors={SWATCHES}
                    allowAuto
                  />
                </Field>
                <Field label="Size">
                  <Slider
                    label="px"
                    min={1}
                    max={48}
                    value={Number(
                      (first as Extract<AnyNode, { type: "draw" }>).size ?? 6,
                    )}
                    onCommitStart={() => snapshot("drawsize")}
                    onChange={(v) => applyToSel({ size: v } as Partial<AnyNode>)}
                  />
                </Field>
              </>
            )}

            {showConn && connector && (
              <>
                <Field label="Route">
                  <Segmented
                    value={connector.routing}
                    options={[
                      { value: "straight", label: "Straight" },
                      { value: "curved", label: "Curved" },
                      { value: "elbow", label: "Elbow" },
                    ]}
                    onChange={(v) =>
                      applyToSel({ routing: v } as Partial<AnyNode>)
                    }
                  />
                </Field>
                <Field label="Ends">
                  <div className="btn-row">
                    <button
                      className={`chip ${connector.startArrow ? "on" : ""}`}
                      onClick={() =>
                        applyToSel({
                          startArrow: !connector.startArrow,
                        } as Partial<AnyNode>)
                      }
                    >
                      <ArrowLeft size={15} /> Start
                    </button>
                    <button
                      className={`chip ${connector.endArrow ? "on" : ""}`}
                      onClick={() =>
                        applyToSel({
                          endArrow: !connector.endArrow,
                        } as Partial<AnyNode>)
                      }
                    >
                      End <ArrowRight size={15} />
                    </button>
                  </div>
                </Field>
                <Field label="Flow">
                  <button
                    className={`chip wide ${connector.animated ? "on" : ""}`}
                    onClick={() =>
                      applyToSel({
                        animated: !connector.animated,
                      } as Partial<AnyNode>)
                    }
                  >
                    <Sparkles size={15} />
                    {connector.animated ? "Animated" : "Static"}
                  </button>
                </Field>
                <Field label="Label">
                  <button
                    className="chip wide"
                    onClick={() => {
                      const l = prompt("Connector label", connector.label);
                      if (l !== null)
                        applyToSel({ label: l } as Partial<AnyNode>);
                    }}
                  >
                    <Tag size={15} /> {connector.label || "Add label"}
                  </button>
                </Field>
              </>
            )}

            {!empty && (
              <Field label="Opacity">
                <Slider
                  label="%"
                  min={5}
                  max={100}
                  value={Math.round(Number(val("opacity", 1)) * 100)}
                  onCommitStart={() => snapshot("opacity")}
                  onChange={(v) =>
                    applyToSel({ opacity: v / 100 } as Partial<AnyNode>)
                  }
                />
              </Field>
            )}

            {empty && (
              <Field label="Connector flow">
                <button
                  className={`chip wide ${style.animated ? "on" : ""}`}
                  onClick={() => setStyle({ animated: !style.animated })}
                >
                  <Sparkles size={15} />
                  {style.animated ? "Animated by default" : "Static by default"}
                </button>
              </Field>
            )}

            {!empty && (
              <Field label="Arrange">
                <div className="btn-row">
                  <IconButton label="To front" onClick={() => reorder("front")}>
                    <BringToFront size={15} />
                  </IconButton>
                  <IconButton label="Forward" onClick={() => reorder("forward")}>
                    <MoveUp size={15} />
                  </IconButton>
                  <IconButton label="Backward" onClick={() => reorder("backward")}>
                    <MoveDown size={15} />
                  </IconButton>
                  <IconButton label="To back" onClick={() => reorder("back")}>
                    <SendToBack size={15} />
                  </IconButton>
                </div>
              </Field>
            )}

            {nodes.length === 1 && first && first.type !== "connector" && (
              <div className="dims">
                <span>X {Math.round(first.x)}</span>
                <span>Y {Math.round(first.y)}</span>
                <span>W {Math.round(first.w)}</span>
                <span>H {Math.round(first.h)}</span>
              </div>
            )}
            {nodes.length === 1 &&
              first &&
              (first.type === "text" || first.type === "shape") && (
                <button
                  className="chip wide"
                  onClick={() => useStore.getState().setEditing(first.id)}
                >
                  Edit text
                </button>
              )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

function labelFor(n?: AnyNode): string {
  if (!n) return "Item";
  if (n.type === "shape") return cap(n.shape);
  return cap(n.type);
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
