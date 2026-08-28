import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { fmtKeys } from "../lib/platform";

const GROUPS: { title: string; items: [string, string][] }[] = [
  {
    title: "Tools",
    items: [
      ["V", "Select / move"],
      ["H / Space", "Pan the canvas"],
      ["R", "Rectangle"],
      ["O", "Ellipse"],
      ["D", "Diamond"],
      ["C", "Connector"],
      ["P", "Draw / brush"],
      ["T", "Text"],
    ],
  },
  {
    title: "Edit",
    items: [
      ["Mod+Z", "Undo"],
      ["Mod+Shift+Z", "Redo"],
      ["Mod+D", "Duplicate"],
      ["Mod+A", "Select all"],
      ["Mod+C / Mod+V", "Copy / paste"],
      ["Delete", "Delete selection"],
      ["Mod+] / Mod+[", "Bring forward / back"],
      ["Arrows", "Nudge (Shift for 10px)"],
      ["Enter", "Edit text of selection"],
    ],
  },
  {
    title: "View",
    items: [
      ["Scroll", "Pan"],
      ["Mod+Scroll", "Zoom to cursor"],
      ["Mod+0", "Reset view"],
      ["Mod+= / Mod+-", "Zoom in / out"],
      ["G", "Toggle grid"],
      ["Shift+S", "Toggle snap"],
    ],
  },
  {
    title: "Canvas",
    items: [
      ["Double-click", "New text / edit item"],
      ["Paste image", "Drops onto canvas"],
      ["Drag a file in", "Adds image"],
      ["Drag from a shape edge", "with Connector tool to link"],
    ],
  },
];

export function HelpOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="help-scrim"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="help-card glass"
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 460, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="help-head">
              <h2>Keyboard &amp; gestures</h2>
              <button className="icon-btn" onClick={onClose} aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <div className="help-grid">
              {GROUPS.map((g) => (
                <div key={g.title} className="help-col">
                  <h3>{g.title}</h3>
                  <ul>
                    {g.items.map(([k, v]) => (
                      <li key={k}>
                        <kbd>{fmtKeys(k)}</kbd>
                        <span>{v}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
