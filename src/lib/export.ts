import type { Document } from "../store/types";
import { boundsOf } from "./geometry";

function download(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportJSON(doc: Document) {
  download(
    `color-${Date.now()}.json`,
    new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" }),
  );
}

export function importJSON(): Promise<Document | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const d = JSON.parse(String(reader.result));
          if (d && Array.isArray(d.order) && d.nodes) resolve(d as Document);
          else resolve(null);
        } catch {
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

/** Build a standalone SVG string from the live scene DOM. */
function buildSVG(doc: Document, bg: string): string | null {
  const list = doc.order.map((id) => doc.nodes[id]).filter(Boolean);
  const b = boundsOf(list as never);
  if (!b) return null;
  const pad = 48;
  const scene = document.querySelector(".scene .node-enter")?.parentElement;
  if (!scene) return null;
  const clone = scene.cloneNode(true) as SVGGElement;
  clone.removeAttribute("style");
  clone.setAttribute(
    "transform",
    `translate(${-b.x + pad} ${-b.y + pad})`,
  );
  const w = b.w + pad * 2;
  const h = b.h + pad * 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${bg}"/>${new XMLSerializer().serializeToString(
    clone,
  )}</svg>`;
}

export function exportSVG(doc: Document, bg: string) {
  const svg = buildSVG(doc, bg);
  if (!svg) return;
  download(`color-${Date.now()}.svg`, new Blob([svg], { type: "image/svg+xml" }));
}

export async function exportPNG(doc: Document, bg: string, scale = 2) {
  const svg = buildSVG(doc, bg);
  if (!svg) return;
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error("render failed"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.width * scale;
    canvas.height = img.height * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    await new Promise<void>((res) =>
      canvas.toBlob((b) => {
        if (b) download(`color-${Date.now()}.png`, b);
        res();
      }, "image/png"),
    );
  } catch {
    // Fallback: hand them the SVG instead.
    download(
      `color-${Date.now()}.svg`,
      new Blob([svg], { type: "image/svg+xml" }),
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
