import { motion } from "framer-motion";
import {
  Check,
  Download,
  FileJson,
  FilePlus2,
  Grid3x3,
  Image as ImageIcon,
  Keyboard,
  Magnet,
  Palette,
  Redo2,
  Undo2,
} from "lucide-react";
import { useStore } from "../store/useStore";
import { IconButton, Divider, Popover, usePopover } from "./ui";
import { THEMES, THEME_ORDER } from "../theme/themes";
import { exportJSON, exportPNG, exportSVG, importJSON } from "../lib/export";
import { UnitTabs } from "./UnitTabs";

function ThemeMenu() {
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  return (
    <div className="pop-col theme-menu">
      <div className="pop-title">Theme</div>
      <div className="theme-grid">
        {THEME_ORDER.map((name) => {
          const t = THEMES[name];
          return (
            <button
              key={name}
              className={`theme-chip ${theme === name ? "on" : ""}`}
              onClick={() => setTheme(name)}
              style={{
                background: t.vars["--canvas"],
                color: t.vars["--fg"],
                borderColor: t.vars["--panel-border"],
              }}
            >
              <span
                className="theme-dot"
                style={{ background: t.vars["--accent"] }}
              />
              {t.label}
              {theme === name && <Check size={14} className="theme-check" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ExportMenu() {
  const { close } = usePopover();
  const run = (fn: () => void) => {
    fn();
    close();
  };
  const doc = () => useStore.getState().doc;
  const bg = () =>
    THEMES[useStore.getState().theme].vars["--canvas"];
  return (
    <div className="pop-col">
      <div className="pop-title">Export</div>
      <button className="menu-row" onClick={() => run(() => exportPNG(doc(), bg()))}>
        <ImageIcon size={16} /> PNG image
      </button>
      <button className="menu-row" onClick={() => run(() => exportSVG(doc(), bg()))}>
        <Download size={16} /> SVG vector
      </button>
      <button className="menu-row" onClick={() => run(() => exportJSON(doc()))}>
        <FileJson size={16} /> color file (.json)
      </button>
      <div className="menu-sep" />
      <button
        className="menu-row"
        onClick={() =>
          run(async () => {
            const d = await importJSON();
            if (d) useStore.getState().loadDocument(d);
          })
        }
      >
        <FilePlus2 size={16} /> Open file…
      </button>
      <button
        className="menu-row danger"
        onClick={() =>
          run(() => {
            if (confirm("Clear the whole canvas?"))
              useStore.getState().newDocument();
          })
        }
      >
        <FilePlus2 size={16} /> New canvas
      </button>
    </div>
  );
}

export function TopBar({ onHelp }: { onHelp: () => void }) {
  const undo = useStore((s) => s.undo);
  const redo = useStore((s) => s.redo);
  const canUndo = useStore((s) => s.past.length > 0);
  const canRedo = useStore((s) => s.future.length > 0);
  const showGrid = useStore((s) => s.showGrid);
  const snap = useStore((s) => s.snap);
  const toggleGrid = useStore((s) => s.toggleGrid);
  const toggleSnap = useStore((s) => s.toggleSnap);

  return (
    <motion.div
      className="topbar"
      initial={{ y: -70, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
    >
      <UnitTabs />

      <div className="topbar-right glass">
        <IconButton label="Undo" kbd="Mod+Z" onClick={undo} className={canUndo ? "" : "dim"}>
          <Undo2 size={17} />
        </IconButton>
        <IconButton label="Redo" kbd="Mod+Shift+Z" onClick={redo} className={canRedo ? "" : "dim"}>
          <Redo2 size={17} />
        </IconButton>
        <Divider />
        <IconButton label="Grid" kbd="G" active={showGrid} onClick={toggleGrid}>
          <Grid3x3 size={17} />
        </IconButton>
        <IconButton
          label="Snap to grid"
          kbd="Shift+S"
          active={snap}
          onClick={toggleSnap}
        >
          <Magnet size={17} />
        </IconButton>
        <Divider />
        <Popover
          side="bottom"
          align="end"
          trigger={({ toggle, open }) => (
            <IconButton label="Theme" active={open} onClick={toggle}>
              <Palette size={17} />
            </IconButton>
          )}
        >
          <ThemeMenu />
        </Popover>
        <Popover
          side="bottom"
          align="end"
          trigger={({ toggle, open }) => (
            <IconButton label="Export & files" active={open} onClick={toggle}>
              <Download size={17} />
            </IconButton>
          )}
        >
          <ExportMenu />
        </Popover>
        <IconButton label="Shortcuts" kbd="?" onClick={onHelp}>
          <Keyboard size={17} />
        </IconButton>
      </div>
    </motion.div>
  );
}
