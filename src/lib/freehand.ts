import { getStroke } from "perfect-freehand";
import type { DrawNode } from "../store/types";

const OPTIONS: Record<
  DrawNode["brush"],
  Parameters<typeof getStroke>[1] & { smoothing?: number }
> = {
  ink: {
    size: 1,
    thinning: 0.6,
    smoothing: 0.5,
    streamline: 0.5,
    easing: (t) => t,
    simulatePressure: true,
  },
  marker: {
    size: 1,
    thinning: 0.1,
    smoothing: 0.6,
    streamline: 0.6,
    easing: (t) => t,
    simulatePressure: false,
  },
  highlighter: {
    size: 1,
    thinning: 0,
    smoothing: 0.4,
    streamline: 0.4,
    easing: (t) => t,
    simulatePressure: false,
  },
};

/** Build the filled SVG path for a freehand stroke. Points are [x, y, pressure]. */
export function strokePath(
  points: number[][],
  size: number,
  brush: DrawNode["brush"],
): string {
  if (points.length === 0) return "";
  const opts = { ...OPTIONS[brush], size };
  const outline = getStroke(points, opts);
  if (!outline.length) return "";
  const d = outline.reduce(
    (acc, [x0, y0], i, arr) => {
      const [x1, y1] = arr[(i + 1) % arr.length];
      acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
      return acc;
    },
    ["M", ...outline[0], "Q"] as (string | number)[],
  );
  d.push("Z");
  return d.join(" ");
}

export function pointsBounds(points: number[][], pad: number) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of points) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (!isFinite(minX)) return { x: 0, y: 0, w: 0, h: 0 };
  return {
    x: minX - pad,
    y: minY - pad,
    w: maxX - minX + pad * 2,
    h: maxY - minY + pad * 2,
  };
}
