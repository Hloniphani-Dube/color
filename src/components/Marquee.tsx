import type { Camera } from "../store/types";
import { worldToScreen, type Rect } from "../lib/geometry";

export function Marquee({ rect, camera }: { rect: Rect; camera: Camera }) {
  const tl = worldToScreen({ x: rect.x, y: rect.y }, camera);
  return (
    <div
      className="marquee"
      style={{
        transform: `translate(${tl.x}px, ${tl.y}px)`,
        width: rect.w * camera.z,
        height: rect.h * camera.z,
      }}
    />
  );
}
