# Color

A browser-based infinite whiteboard for sketching, notes, and diagrams.

Create shapes, draw freely, connect ideas, add images, and organize your work across multiple canvases. Everything is saved locally in your browser — no account or backend required.

## Tech Stack

* React
* TypeScript
* Vite
* Zustand
* Framer Motion
* perfect-freehand
* localStorage

## Features

* Infinite canvas with pan and zoom
* Freehand drawing, marker, and highlighter
* Shapes, text, images, and connectors
* Straight, curved, and elbow connectors
* Multiple canvases
* Light and dark themes
* Grid and snap-to-grid
* Undo and redo
* Multi-selection and object manipulation
* Layer ordering
* PNG, SVG, and JSON export
* Automatic local saving
* Keyboard shortcuts

## Getting Started

Requires **Node.js 18+**.

```bash
git clone <repository-url>
cd color
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Build

```bash
npm run build
npm run preview
```

## Keyboard Shortcuts

| Key                    | Action             |
| ---------------------- | ------------------ |
| `V`                    | Select             |
| `H`                    | Pan                |
| `R`                    | Shapes             |
| `C`                    | Connector          |
| `P`                    | Draw               |
| `T`                    | Text               |
| `G`                    | Toggle grid        |
| `Shift + S`            | Snap to grid       |
| `Ctrl/Cmd + Z`         | Undo               |
| `Ctrl/Cmd + Shift + Z` | Redo               |
| `Ctrl/Cmd + D`         | Duplicate          |
| `Ctrl/Cmd + C`         | Copy               |
| `Ctrl/Cmd + V`         | Paste              |
| `Ctrl/Cmd + A`         | Select all         |
| `Delete`               | Delete selection   |
| `?`                    | Shortcut reference |

Hold **Space** to pan from any tool.

## Data & Privacy

Color runs entirely in the browser.

Your boards are automatically saved to `localStorage`. No accounts, servers, or cloud databases are required.

## Export

Export your active canvas as:

* **PNG** — raster image
* **SVG** — vector image
* **JSON** — editable board data for backup or re-import

## License

This project is licensed under the MIT License.
