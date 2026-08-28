import { useEffect } from "react";
import { useStore } from "../store/useStore";
import type { Tool } from "../store/types";

const TOOL_KEYS: Record<string, Tool> = {
  v: "select",
  h: "hand",
  r: "rectangle",
  o: "ellipse",
  d: "diamond",
  a: "connector",
  c: "connector",
  l: "connector",
  p: "draw",
  b: "draw",
  t: "text",
};

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.isContentEditable
  );
}

export function useKeyboard() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const st = useStore.getState();
      if (e.code === "Space" && !st.spaceDown && !isTypingTarget(e.target)) {
        st.setSpaceDown(true);
      }
      if (isTypingTarget(e.target)) return;

      const mod = e.metaKey || e.ctrlKey;
      const k = e.key.toLowerCase();

      if (mod && k === "z") {
        e.preventDefault();
        e.shiftKey ? st.redo() : st.undo();
        return;
      }
      if (mod && k === "y") {
        e.preventDefault();
        st.redo();
        return;
      }
      if (mod && k === "a") {
        e.preventDefault();
        st.selectAll();
        return;
      }
      if (mod && k === "d") {
        e.preventDefault();
        st.duplicateSelected();
        return;
      }
      if (mod && k === "c") {
        writeClipboard();
        return;
      }
      if (mod && k === "v") {
        return; // handled by paste listener
      }
      if (mod && k === "]") {
        e.preventDefault();
        st.reorder(e.shiftKey ? "front" : "forward");
        return;
      }
      if (mod && k === "[") {
        e.preventDefault();
        st.reorder(e.shiftKey ? "back" : "backward");
        return;
      }
      if (mod && (k === "=" || k === "+")) {
        e.preventDefault();
        st.setZoom(st.camera.z * 1.2);
        return;
      }
      if (mod && k === "-") {
        e.preventDefault();
        st.setZoom(st.camera.z / 1.2);
        return;
      }
      if (mod && k === "0") {
        e.preventDefault();
        st.resetView();
        return;
      }
      if (mod) return;

      if (k === "delete" || k === "backspace") {
        e.preventDefault();
        st.removeSelected();
        return;
      }
      if (k === "escape") {
        st.clearSelection();
        st.setTool("select");
        return;
      }
      if (k === "enter" && st.selectedIds.length === 1) {
        const n = st.doc.nodes[st.selectedIds[0]];
        if (n && (n.type === "text" || n.type === "shape"))
          st.setEditing(n.id);
        return;
      }
      if (k === "g" && !e.shiftKey) {
        st.toggleGrid();
        return;
      }
      if (k === "s" && e.shiftKey) {
        st.toggleSnap();
        return;
      }
      if (["arrowleft", "arrowright", "arrowup", "arrowdown"].includes(k)) {
        if (!st.selectedIds.length) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx =
          k === "arrowleft" ? -step : k === "arrowright" ? step : 0;
        const dy = k === "arrowup" ? -step : k === "arrowdown" ? step : 0;
        const patch: Record<string, { x: number; y: number }> = {};
        for (const id of st.selectedIds) {
          const n = st.doc.nodes[id];
          if (n) patch[id] = { x: n.x + dx, y: n.y + dy };
        }
        st.updateNodes(patch as never, true);
        return;
      }
      if (TOOL_KEYS[k]) st.setTool(TOOL_KEYS[k]);
    };

    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") useStore.getState().setSpaceDown(false);
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
}

function writeClipboard() {
  const st = useStore.getState();
  const nodes = st.selectedIds
    .map((id) => st.doc.nodes[id])
    .filter(Boolean);
  if (!nodes.length) return;
  try {
    localStorage.setItem("color:clipboard", JSON.stringify(nodes));
  } catch {
    /* ignore */
  }
}
