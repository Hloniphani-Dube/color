import { memo } from "react";
import type { ShapeNode } from "../../store/types";
import { resolveColor } from "../../theme/themes";
import { useStore } from "../../store/useStore";

function dashArray(dash: ShapeNode["dash"], w: number): string | undefined {
  if (dash === "dashed") return `${w * 3} ${w * 2.4}`;
  if (dash === "dotted") return `${w * 0.1} ${w * 2.2}`;
  return undefined;
}

function shapePath(s: ShapeNode): { el: "rect" | "ellipse" | "path"; props: Record<string, unknown> } {
  const { w, h } = s;
  if (s.shape === "ellipse")
    return {
      el: "ellipse",
      props: { cx: w / 2, cy: h / 2, rx: w / 2, ry: h / 2 },
    };
  if (s.shape === "diamond")
    return {
      el: "path",
      props: { d: `M ${w / 2} 0 L ${w} ${h / 2} L ${w / 2} ${h} L 0 ${h / 2} Z` },
    };
  if (s.shape === "triangle")
    return {
      el: "path",
      props: { d: `M ${w / 2} 0 L ${w} ${h} L 0 ${h} Z` },
    };
  const r =
    s.shape === "roundRect"
      ? Math.min(s.radius || 18, w / 2, h / 2)
      : Math.min(s.radius || 0, w / 2, h / 2);
  return { el: "rect", props: { width: w, height: h, rx: r, ry: r } };
}

export const ShapeView = memo(function ShapeView({ node }: { node: ShapeNode }) {
  const theme = useStore((s) => s.theme);
  const fill = resolveColor(node.fill, theme, "--node-surface");
  const stroke = resolveColor(node.stroke, theme, "--fg");
  const textColor = resolveColor(node.textColor, theme, "--fg");
  const { el, props } = shapePath(node);
  const sw = node.strokeWidth;

  const common = {
    fill,
    stroke: sw > 0 ? stroke : "none",
    strokeWidth: sw,
    strokeDasharray: dashArray(node.dash, sw),
    strokeLinejoin: "round" as const,
    vectorEffect: "non-scaling-stroke" as const,
  };

  return (
    <g transform={`translate(${node.x} ${node.y})`} opacity={node.opacity}>
      {el === "rect" && <rect {...props} {...common} />}
      {el === "ellipse" && <ellipse {...props} {...common} />}
      {el === "path" && <path {...(props as { d: string })} {...common} />}
      {node.text ? (
        <foreignObject
          x={6}
          y={6}
          width={Math.max(0, node.w - 12)}
          height={Math.max(0, node.h - 12)}
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              color: textColor,
              fontSize: node.fontSize,
              lineHeight: 1.28,
              fontWeight: 500,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              overflow: "hidden",
              fontFamily:
                "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Inter', system-ui, sans-serif",
            }}
          >
            {node.text}
          </div>
        </foreignObject>
      ) : null}
    </g>
  );
});
