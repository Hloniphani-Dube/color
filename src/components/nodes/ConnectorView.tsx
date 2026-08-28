import { memo } from "react";
import type { AnyNode, ConnectorNode } from "../../store/types";
import { resolveConnector } from "../../lib/connectors";
import { resolveColor } from "../../theme/themes";
import { useStore } from "../../store/useStore";

function dashArray(dash: ConnectorNode["dash"], w: number): string | undefined {
  if (dash === "dashed") return `${w * 3} ${w * 2.6}`;
  if (dash === "dotted") return `${w * 0.1} ${w * 2.4}`;
  return undefined;
}

function Arrow({
  at,
  angle,
  size,
  color,
}: {
  at: { x: number; y: number };
  angle: number;
  size: number;
  color: string;
}) {
  const deg = (angle * 180) / Math.PI;
  return (
    <path
      d={`M 0 0 L ${-size} ${-size * 0.5} L ${-size * 0.72} 0 L ${-size} ${
        size * 0.5
      } Z`}
      transform={`translate(${at.x} ${at.y}) rotate(${deg})`}
      fill={color}
    />
  );
}

export const ConnectorView = memo(function ConnectorView({
  node,
  nodes,
}: {
  node: ConnectorNode;
  nodes: Record<string, AnyNode>;
}) {
  const theme = useStore((s) => s.theme);
  const color = resolveColor(node.stroke, theme, "--fg");
  const r = resolveConnector(node, nodes);
  const w = node.strokeWidth;
  const head = Math.max(9, w * 3.4);

  return (
    <g opacity={node.opacity} className="connector">
      <path
        d={r.path}
        fill="none"
        stroke={color}
        strokeWidth={w}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={
          node.animated ? `${w * 2.6} ${w * 2.6}` : dashArray(node.dash, w)
        }
        className={node.animated ? "conn-flow" : undefined}
      />
      {node.endArrow && (
        <Arrow at={r.b} angle={r.endAngle} size={head} color={color} />
      )}
      {node.startArrow && (
        <Arrow
          at={r.a}
          angle={r.startAngle + Math.PI}
          size={head}
          color={color}
        />
      )}
      {node.label ? (
        <foreignObject
          x={r.mid.x - 90}
          y={r.mid.y - 16}
          width={180}
          height={32}
          style={{ overflow: "visible", pointerEvents: "none" }}
        >
          <div className="connector-label">{node.label}</div>
        </foreignObject>
      ) : null}
    </g>
  );
});
