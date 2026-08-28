import { useEffect, useRef, useState } from "react";
import { Canvas } from "./components/Canvas";
import { Toolbar } from "./components/Toolbar";
import { TopBar } from "./components/TopBar";
import { Inspector } from "./components/Inspector";
import { PanelToggle } from "./components/PanelToggle";
import { ZoomWidget } from "./components/ZoomWidget";
import { HelpOverlay } from "./components/HelpOverlay";
import { useKeyboard } from "./hooks/useKeyboard";
import { useClipboard } from "./hooks/useClipboard";
import { useStore } from "./store/useStore";
import { applyTheme } from "./theme/themes";
import { seedDoc } from "./lib/seed";

export default function App() {
  useKeyboard();
  useClipboard();
  const [help, setHelp] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    applyTheme(useStore.getState().theme);
  }, []);

  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const st = useStore.getState();
    const isEmpty = st.doc.order.length === 0;
    const firstEver = !localStorage.getItem("color:seen");
    if (isEmpty && firstEver) {
      useStore.setState({ doc: seedDoc(st.style) });
      st.zoomToFit({ w: window.innerWidth, h: window.innerHeight });
    }
    localStorage.setItem("color:seen", "1");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "?" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        setHelp((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="app">
      <Canvas />
      <TopBar onHelp={() => setHelp(true)} />
      <Inspector />
      <PanelToggle />
      <Toolbar />
      <ZoomWidget />
      <HelpOverlay open={help} onClose={() => setHelp(false)} />
    </div>
  );
}
