import type { ThemeName } from "../store/types";

export interface Theme {
  name: ThemeName;
  label: string;
  /** true when the canvas is dark (affects default ink, blend modes) */
  dark: boolean;
  vars: Record<string, string>;
}

/**
 * Every theme defines the same set of CSS custom properties, written onto
 * <html data-theme>. Node colours that use the semantic tokens ("auto",
 * "surface", "accent") resolve against these at render time, so switching
 * theme re-skins the whole board while explicit swatch colours stay put.
 *
 * For now the palette is deliberately monochrome — black & white, light and
 * dark. More themes come later.
 */
export const THEMES: Record<ThemeName, Theme> = {
  light: {
    name: "light",
    label: "Light",
    dark: false,
    vars: {
      "--bg": "#ededed",
      "--bg-2": "#e1e1e1",
      "--canvas": "#ffffff",
      "--grid": "rgba(0,0,0,0.06)",
      "--grid-strong": "rgba(0,0,0,0.13)",
      "--fg": "#0a0a0a",
      "--fg-soft": "#454549",
      "--fg-dim": "#9a9aa0",
      "--panel": "rgba(255,255,255,0.70)",
      "--panel-solid": "#ffffff",
      "--panel-border": "rgba(0,0,0,0.07)",
      "--panel-shadow": "0 16px 46px -16px rgba(0,0,0,0.22)",
      "--hairline": "rgba(0,0,0,0.08)",
      "--accent": "#0a0a0a",
      "--accent-contrast": "#ffffff",
      "--accent-soft": "rgba(0,0,0,0.055)",
      "--node-surface": "#ffffff",
      "--node-ink": "#0a0a0a",
      "--selection": "#0a84ff",
      "--selection-soft": "rgba(10,132,255,0.14)",
    },
  },
  dark: {
    name: "dark",
    label: "Dark",
    dark: true,
    vars: {
      "--bg": "#000000",
      "--bg-2": "#0b0b0b",
      "--canvas": "#0a0a0a",
      "--grid": "rgba(255,255,255,0.055)",
      "--grid-strong": "rgba(255,255,255,0.13)",
      "--fg": "#f5f5f5",
      "--fg-soft": "#b4b4b8",
      "--fg-dim": "#6e6e73",
      "--panel": "rgba(20,20,20,0.64)",
      "--panel-solid": "#161616",
      "--panel-border": "rgba(255,255,255,0.10)",
      "--panel-shadow": "0 20px 54px -18px rgba(0,0,0,0.72)",
      "--hairline": "rgba(255,255,255,0.09)",
      "--accent": "#f5f5f5",
      "--accent-contrast": "#0a0a0a",
      "--accent-soft": "rgba(255,255,255,0.09)",
      "--node-surface": "#161616",
      "--node-ink": "#f5f5f5",
      "--selection": "#0a84ff",
      "--selection-soft": "rgba(10,132,255,0.22)",
    },
  },
};

export const THEME_ORDER: ThemeName[] = ["light", "dark"];

/** Swatches offered in the colour picker (per-object, not theme). */
export const SWATCHES: string[] = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#0ea5e9",
  "#3b82f6",
  "#6366f1",
  "#a855f7",
  "#ec4899",
  "#64748b",
];

let styleEl: HTMLStyleElement | null = null;

/** Resolve a semantic token / raw colour to a concrete CSS colour. */
export function resolveColor(
  token: string,
  theme: ThemeName,
  fallbackVar: "--fg" | "--node-surface" | "--accent" = "--fg",
): string {
  if (!token || token === "none" || token === "transparent") return "transparent";
  if (token === "auto") return THEMES[theme].vars["--node-ink"];
  if (token === "surface") return THEMES[theme].vars["--node-surface"];
  if (token === "accent") return THEMES[theme].vars["--accent"];
  if (token.startsWith("#") || token.startsWith("rgb") || token.startsWith("hsl"))
    return token;
  return THEMES[theme].vars[fallbackVar];
}

/** Map any legacy / unknown stored theme id onto the current two-theme set. */
export function normalizeTheme(value: unknown): ThemeName {
  if (value === "dark") return "dark";
  if (value === "light") return "light";
  // old dark-ish themes fold into dark, everything else into light
  if (
    value === "midnight" ||
    value === "ocean" ||
    value === "sunset" ||
    value === "forest" ||
    value === "grape"
  )
    return "dark";
  return "light";
}

export function applyTheme(theme: ThemeName) {
  const t = THEMES[theme];
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = t.dark ? "dark" : "light";
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "color-theme-vars";
    document.head.appendChild(styleEl);
  }
  const body = Object.entries(t.vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  styleEl.textContent = `:root{\n${body}\n}`;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", t.vars["--bg"]);
}
