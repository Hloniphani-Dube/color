import { memo } from "react";
import type { ImageNode } from "../../store/types";

export const ImageView = memo(function ImageView({ node }: { node: ImageNode }) {
  const clip = `img-clip-${node.id}`;
  return (
    <g transform={`translate(${node.x} ${node.y})`} opacity={node.opacity}>
      <defs>
        <clipPath id={clip}>
          <rect
            width={node.w}
            height={node.h}
            rx={Math.min(node.radius, node.w / 2, node.h / 2)}
          />
        </clipPath>
      </defs>
      <image
        href={node.src}
        width={node.w}
        height={node.h}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${clip})`}
      />
      <rect
        width={node.w}
        height={node.h}
        rx={Math.min(node.radius, node.w / 2, node.h / 2)}
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </g>
  );
});
