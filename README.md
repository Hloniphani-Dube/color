# color

An infinite whiteboard for sketching, notes, and boxes-and-arrows diagrams.
Runs entirely in the browser — no account, no server. React + Vite + TypeScript,
Zustand for state, perfect-freehand for ink, Framer Motion for the animation.

## Run it locally

Needs [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev       # open http://localhost:5173
```

Other scripts:

```bash
npm run build     # typecheck + bundle to dist/
npm run preview   # serve the built dist/ locally
```

If `npm install` fails on a Rollup native-binary error (common on Windows when
Defender quarantines it), it's already handled — `package.json` pins the
`@rollup/wasm-node` override. Just leave that field in place.

## How it works

The canvas is infinite. **Scroll** to pan, **Ctrl/⌘ + scroll** to zoom toward the
cursor, or hold **Space** to drag the view. Everything you make autosaves to the
browser's `localStorage`, so a reload brings it back.

**Units** are tabs (top-left) — each is a separate canvas with its own contents
and zoom. Click `+` for a new one, click a tab to switch, double-click to rename,
`×` to close.

**Themes** — Light and Dark, both black-and-white. Toggle from the palette icon
(top-right). Objects set to a theme colour re-skin on switch; fixed colours don't.

## Tools

Pick a tool from the bottom toolbar or press its key. The lock icon keeps a tool
active after each use instead of snapping back to Select.

| Key | Tool | How it works |
| --- | --- | --- |
| `V` | Select | Click to pick, drag to move. Marquee or Shift-click for multiple. Drag the handles to resize; drag a corner with Shift to keep aspect. |
| `H` | Pan | Drag the canvas. (Space does this from any tool.) |
| `R` | Shapes | Rectangle, rounded, ellipse, diamond, triangle. Drag to draw, or click once for a default size. Double-click a shape to type a label inside it. |
| `C` | Connector | Drag from one shape to another to link them. The line stays attached and reroutes when either shape moves. Straight / curved / elbow, arrowheads, an animated "flow" dash, and a text label — all in the inspector. |
| `P` | Draw | Freehand ink, marker, or highlighter, pressure-sensitive. Size and colour in the toolbar popover. |
| `T` | Text | Click to place a text box, or just double-click empty canvas. |
| — | Image | Toolbar button, paste from the clipboard, or drag an image file onto the canvas. |

## The inspector (right panel)

Shows controls for the current selection — fill, stroke colour/width/dash, corner
radius, text colour/size/alignment, opacity, connector options, and layer order
(bring to front / back). With nothing selected it edits the **defaults** applied
to whatever you draw next. The tab at the panel's corner collapses it.

## Editing

- **Undo / redo** — `Ctrl/⌘ + Z`, `Ctrl/⌘ + Shift + Z` (per unit).
- **Duplicate** `Ctrl/⌘ + D` · **copy / paste** `Ctrl/⌘ + C` / `V` · **select all** `Ctrl/⌘ + A`.
- **Delete** removes the selection; **arrow keys** nudge it (Shift = 10px).
- **Layer order** — `Ctrl/⌘ + ]` / `[`, or the inspector buttons.
- **Grid** `G`, **snap to grid** `Shift + S`.
- **`?`** opens the full shortcut sheet.

## Export

The download menu (top-right) exports the active unit as **PNG**, **SVG**, or a
**`.json`** file you can re-open later. SVG and JSON are exact; PNG rasterises the
SVG and falls back to an SVG download if the browser blocks it.
