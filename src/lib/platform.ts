const ua =
  typeof navigator !== "undefined"
    ? `${navigator.platform || ""} ${navigator.userAgent || ""}`
    : "";

export const IS_MAC = /mac|iphone|ipad|ipod/i.test(ua);
export const IS_WIN = /win/i.test(ua) && !IS_MAC;

/** The primary shortcut modifier on this OS, spelled out (never a glyph). */
export const MOD_LABEL = IS_MAC ? "Cmd" : "Ctrl";

const MAP: Record<string, string> = {
  mod: MOD_LABEL,
  cmd: "Cmd",
  ctrl: "Ctrl",
  win: "Win",
  super: "Win",
  shift: "Shift",
  alt: IS_MAC ? "Option" : "Alt",
  opt: "Option",
  option: "Option",
  enter: "Enter",
  esc: "Esc",
  escape: "Esc",
  del: "Delete",
  delete: "Delete",
  backspace: "Backspace",
  space: "Space",
  tab: "Tab",
  scroll: "Scroll",
  arrows: "Arrows",
};

/**
 * Turn a compact combo string into readable, OS-correct text.
 *   "Mod+Shift+Z"      -> "Ctrl + Shift + Z"   (Windows)
 *   "Mod+C / Mod+V"    -> "Ctrl + C  /  Ctrl + V"
 *   "H / Space"        -> "H  /  Space"
 */
export function fmtKeys(combo: string): string {
  if (combo.includes(" / "))
    return combo
      .split(" / ")
      .map((s) => fmtKeys(s))
      .join("  /  ");
  return combo
    .split("+")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => MAP[p.toLowerCase()] ?? (p.length === 1 ? p.toUpperCase() : p))
    .join(" + ");
}
