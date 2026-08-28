import type { Document, StyleDefaults } from "../store/types";
import { makeConnector, makeShape, makeText } from "./factories";

export function seedDoc(style: StyleDefaults): Document {
  const s: StyleDefaults = { ...style, animated: true, routing: "curved" };
  const start = makeShape("roundRect", -260, -60, 150, 84, s);
  start.text = "Start";
  start.fill = "accent";
  start.textColor = "#ffffff";
  start.stroke = "transparent";

  const idea = makeShape("rectangle", 20, -70, 170, 96, s);
  idea.text = "Sketch the idea";

  const ship = makeShape("diamond", 300, -84, 180, 124, s);
  ship.text = "Ship it?";

  const yay = makeShape("ellipse", 320, 150, 140, 84, s);
  yay.text = "Launch 🎉";

  const c1 = makeConnector(
    { kind: "node", nodeId: start.id, anchor: "auto" },
    { kind: "node", nodeId: idea.id, anchor: "auto" },
    s,
  );
  const c2 = makeConnector(
    { kind: "node", nodeId: idea.id, anchor: "auto" },
    { kind: "node", nodeId: ship.id, anchor: "auto" },
    s,
  );
  const c3 = makeConnector(
    { kind: "node", nodeId: ship.id, anchor: "auto" },
    { kind: "node", nodeId: yay.id, anchor: "auto" },
    s,
  );
  c3.label = "yes";

  const title = makeText(-262, -150, { ...s, fontSize: 34 }, "welcome to color");
  title.w = 420;
  title.weight = 700;

  const hint = makeText(
    -262,
    70,
    { ...s, fontSize: 15 },
    "Double-click anywhere to type · press P to draw · C to connect",
  );
  hint.w = 460;
  hint.color = "auto";

  const nodes = [title, hint, start, idea, ship, yay, c1, c2, c3];
  return {
    nodes: Object.fromEntries(nodes.map((n) => [n.id, n])),
    order: nodes.map((n) => n.id),
  };
}
