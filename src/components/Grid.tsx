import { memo } from "react";
import type { Camera } from "../store/types";

export const Grid = memo(function Grid({
  camera,
  width,
  height,
}: {
  camera: Camera;
  width: number;
  height: number;
}) {
  const bases = [8, 16, 32, 64, 128, 256];
  let base = 32;
  for (const b of bases) {
    if (b * camera.z >= 22) {
      base = b;
      break;
    }
    base = b;
  }
  const cell = base * camera.z;
  const major = cell * 4;
  const ox = ((camera.x % cell) + cell) % cell;
  const oy = ((camera.y % cell) + cell) % cell;
  const mox = ((camera.x % major) + major) % major;
  const moy = ((camera.y % major) + major) % major;

  return (
    <svg
      className="grid-svg"
      width={width}
      height={height}
      aria-hidden
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <defs>
        <pattern
          id="grid-dot"
          x={ox}
          y={oy}
          width={cell}
          height={cell}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={0.5} cy={0.5} r={Math.max(0.6, camera.z * 0.7)} fill="var(--grid)" />
        </pattern>
        <pattern
          id="grid-major"
          x={mox}
          y={moy}
          width={major}
          height={major}
          patternUnits="userSpaceOnUse"
        >
          <circle cx={0.5} cy={0.5} r={Math.max(0.9, camera.z * 1)} fill="var(--grid-strong)" />
        </pattern>
      </defs>
      <rect width={width} height={height} fill="url(#grid-dot)" />
      <rect width={width} height={height} fill="url(#grid-major)" />
    </svg>
  );
});
