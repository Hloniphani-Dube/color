import { useEffect, useLayoutEffect, useRef } from "react";
import type { AnyNode, Camera } from "../store/types";
import { worldToScreen } from "../lib/geometry";
import { resolveColor } from "../theme/themes";
import { useStore } from "../store/useStore";

export function TextEditor({
  node,
  camera,
}: {
  node: Extract<AnyNode, { type: "text" | "shape" }>;
  camera: Camera;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const theme = useStore((s) => s.theme);
  const updateNode = useStore((s) => s.updateNode);
  const setEditing = useStore((s) => s.setEditing);
  const removeNodes = useStore((s) => s.removeNodes);

  const isText = node.type === "text";
  const pos = worldToScreen({ x: node.x, y: node.y }, camera);
  const fontSize =
    (isText ? node.fontSize : (node as Extract<AnyNode, { type: "shape" }>).fontSize) *
    camera.z;
  const color = resolveColor(
    isText
      ? (node as Extract<AnyNode, { type: "text" }>).color
      : (node as Extract<AnyNode, { type: "shape" }>).textColor,
    theme,
    "--fg",
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [node.id]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !isText) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
    const worldH = el.scrollHeight / camera.z;
    if (Math.abs(worldH - node.h) > 1) updateNode(node.id, { h: worldH }, false);
  });

  const commit = () => {
    if (isText && !node.text.trim()) {
      removeNodes([node.id]);
    }
    setEditing(null);
  };

  return (
    <textarea
      ref={ref}
      className="text-editor"
      value={node.text}
      spellCheck={false}
      onPointerDown={(e) => e.stopPropagation()}
      onChange={(e) =>
        updateNode(node.id, { text: e.target.value }, true)
      }
      onBlur={commit}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Escape" || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) {
          e.preventDefault();
          commit();
        }
      }}
      style={{
        transform: `translate(${pos.x}px, ${pos.y}px)`,
        width: node.w * camera.z,
        height: isText ? undefined : node.h * camera.z,
        minHeight: fontSize * 1.3,
        fontSize,
        lineHeight: 1.32,
        color,
        textAlign: isText
          ? (node as Extract<AnyNode, { type: "text" }>).align
          : "center",
        fontWeight: isText
          ? (node as Extract<AnyNode, { type: "text" }>).weight
          : 500,
        display: "flex",
        padding: node.type === "shape" ? 6 * camera.z : 0,
      }}
    />
  );
}
