export type Vec = { x: number; y: number };

/** Camera transform: screen = world * z + {x, y} */
export type Camera = { x: number; y: number; z: number };

export type Tool =
  | "select"
  | "hand"
  | "rectangle"
  | "roundRect"
  | "ellipse"
  | "diamond"
  | "triangle"
  | "connector"
  | "draw"
  | "text"
  | "image";

export type ThemeName = "light" | "dark";

export type DashStyle = "solid" | "dashed" | "dotted";
export type ConnectorRouting = "straight" | "curved" | "elbow";
export type Anchor = "auto" | "top" | "right" | "bottom" | "left";

export type NodeType = "shape" | "draw" | "text" | "image" | "connector";

export interface BaseNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
}

export type ShapeKind =
  | "rectangle"
  | "roundRect"
  | "ellipse"
  | "diamond"
  | "triangle";

export interface ShapeNode extends BaseNode {
  type: "shape";
  shape: ShapeKind;
  /** palette token key (see palette.ts) or raw hex */
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash: DashStyle;
  radius: number;
  text: string;
  fontSize: number;
  textColor: string;
}

export interface DrawNode extends BaseNode {
  type: "draw";
  /** points are stored relative to node origin: [dx, dy, pressure][] */
  points: number[][];
  color: string;
  size: number;
  /** filled brush stroke vs. thin marker */
  brush: "ink" | "marker" | "highlighter";
}

export interface TextNode extends BaseNode {
  type: "text";
  text: string;
  fontSize: number;
  color: string;
  align: "left" | "center" | "right";
  weight: number;
}

export interface ImageNode extends BaseNode {
  type: "image";
  src: string;
  radius: number;
  naturalW: number;
  naturalH: number;
}

export type Endpoint =
  | { kind: "free"; x: number; y: number }
  | { kind: "node"; nodeId: string; anchor: Anchor };

export interface ConnectorNode extends BaseNode {
  type: "connector";
  from: Endpoint;
  to: Endpoint;
  stroke: string;
  strokeWidth: number;
  dash: DashStyle;
  routing: ConnectorRouting;
  startArrow: boolean;
  endArrow: boolean;
  animated: boolean;
  label: string;
}

export type AnyNode =
  | ShapeNode
  | DrawNode
  | TextNode
  | ImageNode
  | ConnectorNode;

export interface StyleDefaults {
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash: DashStyle;
  radius: number;
  textColor: string;
  fontSize: number;
  drawColor: string;
  drawSize: number;
  brush: DrawNode["brush"];
  routing: ConnectorRouting;
  animated: boolean;
}

export interface Document {
  nodes: Record<string, AnyNode>;
  order: string[];
}

/** A single tab / workspace. Each holds its own document and viewport. */
export interface Unit {
  id: string;
  name: string;
  doc: Document;
  camera: Camera;
}
