import { memo } from "react";
import type { TextNode } from "../../store/types";
import { resolveColor } from "../../theme/themes";
import { useStore } from "../../store/useStore";

export const TextView = memo(function TextView({
  node,
  hidden,
}: {
  node: TextNode;
  hidden?: boolean;
}) {
  const theme = useStore((s) => s.theme);
  const color = resolveColor(node.color, theme, "--fg");
  return (
    <foreignObject
      x={node.x}
      y={node.y}
      width={Math.max(1, node.w)}
      height={Math.max(1, node.h)}
      opacity={hidden ? 0 : node.opacity}
      style={{ overflow: "visible" }}
    >
      <div
        style={{
          width: "100%",
          minHeight: "100%",
          color,
          fontSize: node.fontSize,
          fontWeight: node.weight,
          textAlign: node.align,
          lineHeight: 1.32,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          pointerEvents: "none",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif",
        }}
      >
        {node.text || "Text"}
      </div>
    </foreignObject>
  );
});
