import { memo, useMemo } from "react";
import type { DrawNode } from "../../store/types";
import { strokePath } from "../../lib/freehand";
import { resolveColor } from "../../theme/themes";
import { useStore } from "../../store/useStore";

export const DrawView = memo(function DrawView({ node }: { node: DrawNode }) {
  const theme = useStore((s) => s.theme);
  const color = resolveColor(node.color, theme, "--fg");
  const d = useMemo(
    () => strokePath(node.points, node.size, node.brush),
    [node.points, node.size, node.brush],
  );
  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      opacity={node.opacity}
      style={{
        mixBlendMode: node.brush === "highlighter" ? "multiply" : "normal",
      }}
    >
      <path d={d} fill={color} stroke="none" />
    </g>
  );
});
