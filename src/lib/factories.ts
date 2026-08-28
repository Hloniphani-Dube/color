import { uid } from "./id";
import type {
  ConnectorNode,
  DrawNode,
  Endpoint,
  ImageNode,
  ShapeKind,
  ShapeNode,
  StyleDefaults,
  TextNode,
} from "../store/types";

export function makeShape(
  shape: ShapeKind,
  x: number,
  y: number,
  w: number,
  h: number,
  s: StyleDefaults,
): ShapeNode {
  return {
    id: uid(),
    type: "shape",
    shape,
    x,
    y,
    w,
    h,
    rotation: 0,
    opacity: 1,
    fill: s.fill,
    stroke: s.stroke,
    strokeWidth: s.strokeWidth,
    dash: s.dash,
    radius: shape === "roundRect" ? Math.max(s.radius, 16) : s.radius,
    text: "",
    fontSize: s.fontSize,
    textColor: s.textColor,
  };
}

export function makeText(
  x: number,
  y: number,
  s: StyleDefaults,
  text = "",
): TextNode {
  return {
    id: uid(),
    type: "text",
    x,
    y,
    w: 220,
    h: s.fontSize * 1.5,
    rotation: 0,
    opacity: 1,
    text,
    fontSize: s.fontSize,
    color: s.textColor,
    align: "left",
    weight: 500,
  };
}

export function makeDraw(
  x: number,
  y: number,
  s: StyleDefaults,
): DrawNode {
  return {
    id: uid(),
    type: "draw",
    x,
    y,
    w: 0,
    h: 0,
    rotation: 0,
    opacity: s.brush === "highlighter" ? 0.4 : 1,
    points: [],
    color: s.drawColor,
    size: s.drawSize,
    brush: s.brush,
  };
}

export function makeImage(
  x: number,
  y: number,
  src: string,
  naturalW: number,
  naturalH: number,
): ImageNode {
  const max = 420;
  const scale = Math.min(1, max / Math.max(naturalW, naturalH));
  return {
    id: uid(),
    type: "image",
    x,
    y,
    w: Math.round(naturalW * scale),
    h: Math.round(naturalH * scale),
    rotation: 0,
    opacity: 1,
    src,
    radius: 10,
    naturalW,
    naturalH,
  };
}

export function makeConnector(
  from: Endpoint,
  to: Endpoint,
  s: StyleDefaults,
): ConnectorNode {
  return {
    id: uid(),
    type: "connector",
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    rotation: 0,
    opacity: 1,
    from,
    to,
    stroke: s.stroke === "transparent" ? "auto" : s.stroke,
    strokeWidth: Math.max(2, s.strokeWidth),
    dash: s.dash,
    routing: s.routing,
    startArrow: false,
    endArrow: true,
    animated: s.animated,
    label: "",
  };
}
