import { useRef } from "react";
import { motion } from "framer-motion";
import {
  Circle,
  Diamond,
  Hand,
  Highlighter,
  Image as ImageIcon,
  Lock,
  MousePointer2,
  Pencil,
  Brush,
  RectangleHorizontal,
  Spline,
  Square,
  Triangle,
  Type,
  Unlock,
} from "lucide-react";
import { useStore } from "../store/useStore";
import type { ShapeKind, Tool } from "../store/types";
import { IconButton, Divider, Popover, Slider, Swatches, usePopover } from "./ui";
import { SWATCHES } from "../theme/themes";
import { makeImage } from "../lib/factories";

const SHAPES: { kind: ShapeKind; label: string; icon: React.ReactNode }[] = [
  { kind: "rectangle", label: "Rectangle", icon: <Square size={18} /> },
  { kind: "roundRect", label: "Rounded", icon: <RectangleHorizontal size={18} /> },
  { kind: "ellipse", label: "Ellipse", icon: <Circle size={18} /> },
  { kind: "diamond", label: "Diamond", icon: <Diamond size={18} /> },
  { kind: "triangle", label: "Triangle", icon: <Triangle size={18} /> },
];

function ToolDot({ tool }: { tool: Tool }) {
  const active = useStore((s) => s.tool === tool);
  if (!active) return null;
  return (
    <motion.span
      layoutId="tool-dot"
      className="tool-dot"
      transition={{ type: "spring", stiffness: 600, damping: 38 }}
    />
  );
}

function ShapePopContent() {
  const setTool = useStore((s) => s.setTool);
  const { close } = usePopover();
  return (
    <div className="pop-grid">
      {SHAPES.map((s) => (
        <button
          key={s.kind}
          className="pop-item"
          onClick={() => {
            setTool(s.kind);
            close();
          }}
        >
          {s.icon}
          <span>{s.label}</span>
        </button>
      ))}
    </div>
  );
}

function BrushPopContent() {
  const style = useStore((s) => s.style);
  const setStyle = useStore((s) => s.setStyle);
  const setTool = useStore((s) => s.setTool);
  return (
    <div className="pop-col">
      <div className="pop-seg">
        {(
          [
            ["ink", <Pencil key="i" size={16} />],
            ["marker", <Brush key="m" size={16} />],
            ["highlighter", <Highlighter key="h" size={16} />],
          ] as const
        ).map(([b, icon]) => (
          <button
            key={b}
            className={style.brush === b ? "on" : ""}
            onClick={() => {
              setStyle({ brush: b });
              setTool("draw", true);
            }}
          >
            {icon}
          </button>
        ))}
      </div>
      <Slider
        label="Size"
        min={1}
        max={48}
        value={style.drawSize}
        onChange={(v) => setStyle({ drawSize: v })}
      />
      <Swatches
        value={style.drawColor}
        onChange={(c) => setStyle({ drawColor: c })}
        colors={SWATCHES}
        allowAuto
      />
    </div>
  );
}

export function Toolbar() {
  const tool = useStore((s) => s.tool);
  const setTool = useStore((s) => s.setTool);
  const stickyTool = useStore((s) => s.stickyTool);
  const fileRef = useRef<HTMLInputElement>(null);

  const pickImage = () => fileRef.current?.click();

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const st = useStore.getState();
        const c = st.worldPoint({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        });
        const node = makeImage(
          c.x,
          c.y,
          String(reader.result),
          img.naturalWidth,
          img.naturalHeight,
        );
        node.x -= node.w / 2;
        node.y -= node.h / 2;
        st.addNode(node);
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const shapeActive = SHAPES.some((s) => s.kind === tool);

  return (
    <div className="toolbar-dock">
    <motion.div
      className="toolbar glass"
      initial={{ y: 90, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, delay: 0.05 }}
    >
      <div className="tool-slot">
        <ToolDot tool="select" />
        <IconButton
          label="Select"
          kbd="V"
          active={tool === "select"}
          onClick={() => setTool("select")}
        >
          <MousePointer2 size={18} />
        </IconButton>
      </div>
      <div className="tool-slot">
        <ToolDot tool="hand" />
        <IconButton
          label="Pan"
          kbd="H / Space"
          active={tool === "hand"}
          onClick={() => setTool("hand")}
        >
          <Hand size={18} />
        </IconButton>
      </div>

      <Divider />

      <Popover
        align="center"
        trigger={({ toggle }) => (
          <div className="tool-slot">
            {shapeActive && (
              <motion.span
                layoutId="tool-dot"
                className="tool-dot"
                transition={{ type: "spring", stiffness: 600, damping: 38 }}
              />
            )}
            <IconButton
              label="Shapes"
              kbd="R"
              active={shapeActive}
              onClick={() => {
                if (!shapeActive) setTool("rectangle");
                toggle();
              }}
            >
              <Square size={18} />
            </IconButton>
          </div>
        )}
      >
        <ShapePopContent />
      </Popover>

      <div className="tool-slot">
        <ToolDot tool="connector" />
        <IconButton
          label="Connector"
          kbd="C"
          active={tool === "connector"}
          onClick={() => setTool("connector", true)}
        >
          <Spline size={18} />
        </IconButton>
      </div>

      <Popover
        align="center"
        trigger={({ toggle }) => (
          <div className="tool-slot">
            <ToolDot tool="draw" />
            <IconButton
              label="Draw"
              kbd="P"
              active={tool === "draw"}
              onClick={() => {
                setTool("draw", true);
                toggle();
              }}
            >
              <Pencil size={18} />
            </IconButton>
          </div>
        )}
      >
        <BrushPopContent />
      </Popover>

      <div className="tool-slot">
        <ToolDot tool="text" />
        <IconButton
          label="Text"
          kbd="T"
          active={tool === "text"}
          onClick={() => setTool("text")}
        >
          <Type size={18} />
        </IconButton>
      </div>

      <div className="tool-slot">
        <IconButton label="Image" onClick={pickImage}>
          <ImageIcon size={18} />
        </IconButton>
      </div>

      <Divider />

      <IconButton
        label={stickyTool ? "Tool locked on" : "Lock tool"}
        active={stickyTool}
        onClick={() => useStore.getState().setTool(tool, !stickyTool)}
      >
        {stickyTool ? <Lock size={16} /> : <Unlock size={16} />}
      </IconButton>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={onFile}
      />
    </motion.div>
    </div>
  );
}
