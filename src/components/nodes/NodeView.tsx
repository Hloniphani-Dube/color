import { memo } from "react";
import type { AnyNode } from "../../store/types";
import { ShapeView } from "./ShapeView";
import { DrawView } from "./DrawView";
import { TextView } from "./TextView";
import { ImageView } from "./ImageView";
import { ConnectorView } from "./ConnectorView";

export const NodeView = memo(function NodeView({
  node,
  nodes,
  editing,
}: {
  node: AnyNode;
  nodes: Record<string, AnyNode>;
  editing: boolean;
}) {
  return (
    <g className="node-enter" data-id={node.id}>
      {node.type === "shape" && <ShapeView node={node} />}
      {node.type === "draw" && <DrawView node={node} />}
      {node.type === "text" && <TextView node={node} hidden={editing} />}
      {node.type === "image" && <ImageView node={node} />}
      {node.type === "connector" && (
        <ConnectorView node={node} nodes={nodes} />
      )}
    </g>
  );
});
