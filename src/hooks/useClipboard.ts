import { useEffect } from "react";
import { useStore } from "../store/useStore";
import { makeImage } from "../lib/factories";
import { uid } from "../lib/id";
import type { AnyNode } from "../store/types";
import { screenToWorld } from "../lib/geometry";

function viewportCenterWorld() {
  const st = useStore.getState();
  return screenToWorld(
    { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    st.camera,
  );
}

function addImageFromBlob(blob: Blob, at?: { x: number; y: number }) {
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const reader = new FileReader();
    reader.onload = () => {
      const st = useStore.getState();
      const c = at ?? viewportCenterWorld();
      const node = makeImage(
        c.x,
        c.y,
        String(reader.result),
        img.naturalWidth,
        img.naturalHeight,
      );
      node.x -= node.w / 2;
      node.y -= node.h / 2;
      st.addNode(node);
      URL.revokeObjectURL(url);
    };
    reader.readAsDataURL(blob);
  };
  img.src = url;
}

export function useClipboard() {
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA")
      )
        return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const it of items) {
        if (it.type.startsWith("image/")) {
          const file = it.getAsFile();
          if (file) {
            e.preventDefault();
            addImageFromBlob(file);
            return;
          }
        }
      }
      const text = e.clipboardData?.getData("text/plain");
      if (text && text.trim().startsWith("[")) {
        try {
          const nodes = JSON.parse(text) as AnyNode[];
          if (Array.isArray(nodes) && nodes.length) {
            e.preventDefault();
            pasteNodes(nodes);
            return;
          }
        } catch {
          /* not json */
        }
      }
      // internal clipboard fallback
      try {
        const raw = localStorage.getItem("color:clipboard");
        if (raw) {
          const nodes = JSON.parse(raw) as AnyNode[];
          if (Array.isArray(nodes) && nodes.length) pasteNodes(nodes);
        }
      } catch {
        /* ignore */
      }
    };

    const onDrop = (e: DragEvent) => {
      if (!e.dataTransfer) return;
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/"),
      );
      if (!files.length) return;
      e.preventDefault();
      const st = useStore.getState();
      const at = screenToWorld({ x: e.clientX, y: e.clientY }, st.camera);
      files.forEach((f, i) =>
        addImageFromBlob(f, { x: at.x + i * 24, y: at.y + i * 24 }),
      );
    };
    const onDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("drop", onDrop);
    window.addEventListener("dragover", onDragOver);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("dragover", onDragOver);
    };
  }, []);
}

function pasteNodes(nodes: AnyNode[]) {
  const st = useStore.getState();
  const idMap = new Map<string, string>();
  nodes.forEach((n) => idMap.set(n.id, uid()));
  const clones = nodes.map((n) => {
    const c = { ...n, id: idMap.get(n.id)!, x: n.x + 28, y: n.y + 28 } as AnyNode;
    if (c.type === "connector") {
      if (c.from.kind === "node" && idMap.has(c.from.nodeId))
        c.from = { ...c.from, nodeId: idMap.get(c.from.nodeId)! };
      if (c.to.kind === "node" && idMap.has(c.to.nodeId))
        c.to = { ...c.to, nodeId: idMap.get(c.to.nodeId)! };
    }
    return c;
  });
  st.addNodes(clones);
}
