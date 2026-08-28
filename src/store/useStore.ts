import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  AnyNode,
  Camera,
  Document,
  StyleDefaults,
  ThemeName,
  Tool,
  Unit,
  Vec,
} from "./types";
import { boundsOf, clamp, screenToWorld } from "../lib/geometry";
import { uid } from "../lib/id";
import { applyTheme, normalizeTheme } from "../theme/themes";

const HISTORY_LIMIT = 120;
const STORAGE_KEY = "color:workspace:v1";
const PREFS_KEY = "color:prefs:v1";
const LEGACY_DOC_KEY = "slate:doc:v1";

const DEFAULT_STYLE: StyleDefaults = {
  fill: "surface",
  stroke: "auto",
  strokeWidth: 2,
  dash: "solid",
  radius: 4,
  textColor: "auto",
  fontSize: 18,
  drawColor: "auto",
  drawSize: 6,
  brush: "ink",
  routing: "curved",
  animated: true,
};

const emptyDoc = (): Document => ({ nodes: {}, order: [] });

function cloneDoc(d: Document): Document {
  return {
    order: [...d.order],
    nodes: Object.fromEntries(
      Object.entries(d.nodes).map(([k, v]) => [k, { ...v }]),
    ),
  };
}

interface Prefs {
  theme: ThemeName;
  style: StyleDefaults;
  showGrid: boolean;
  snap: boolean;
}

function loadPrefs(): Prefs {
  const base: Prefs = {
    theme: "light",
    style: DEFAULT_STYLE,
    showGrid: true,
    snap: false,
  };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) {
      // migrate theme choice from the old prefs key if present
      const legacy = localStorage.getItem("slate:prefs:v1");
      if (legacy) {
        const lp = JSON.parse(legacy);
        return {
          ...base,
          style: { ...DEFAULT_STYLE, ...(lp.style ?? {}) },
          showGrid: lp.showGrid ?? true,
          snap: lp.snap ?? false,
          theme: normalizeTheme(lp.theme),
        };
      }
      return base;
    }
    const p = JSON.parse(raw);
    return {
      ...base,
      ...p,
      style: { ...DEFAULT_STYLE, ...(p.style ?? {}) },
      theme: normalizeTheme(p.theme),
    };
  } catch {
    return base;
  }
}

function newUnit(name: string, doc?: Document): Unit {
  return {
    id: uid(),
    name,
    doc: doc ?? emptyDoc(),
    camera: { x: 0, y: 0, z: 1 },
  };
}

interface Workspace {
  units: Unit[];
  activeUnitId: string;
}

function sanitizeUnit(u: unknown, i: number): Unit | null {
  if (!u || typeof u !== "object") return null;
  const o = u as Partial<Unit>;
  if (!o.doc || !Array.isArray(o.doc.order) || typeof o.doc.nodes !== "object")
    return null;
  return {
    id: typeof o.id === "string" ? o.id : uid(),
    name: typeof o.name === "string" && o.name ? o.name : `unit ${i + 1}`,
    doc: { order: [...o.doc.order], nodes: { ...o.doc.nodes } },
    camera:
      o.camera && typeof o.camera.z === "number"
        ? { x: o.camera.x ?? 0, y: o.camera.y ?? 0, z: o.camera.z }
        : { x: 0, y: 0, z: 1 },
  };
}

function loadWorkspace(): Workspace {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const w = JSON.parse(raw) as Workspace;
      const units = (Array.isArray(w.units) ? w.units : [])
        .map(sanitizeUnit)
        .filter(Boolean) as Unit[];
      if (units.length) {
        const activeUnitId = units.some((u) => u.id === w.activeUnitId)
          ? w.activeUnitId
          : units[0].id;
        return { units, activeUnitId };
      }
    }
  } catch {
    /* fall through */
  }
  // migrate a single legacy document into unit 1
  try {
    const legacy = localStorage.getItem(LEGACY_DOC_KEY);
    if (legacy) {
      const d = JSON.parse(legacy) as Document;
      if (d && Array.isArray(d.order) && d.nodes) {
        const u = newUnit("unit 1", d);
        return { units: [u], activeUnitId: u.id };
      }
    }
  } catch {
    /* ignore */
  }
  const u = newUnit("unit 1");
  return { units: [u], activeUnitId: u.id };
}

function nextUnitName(units: Unit[]): string {
  let max = 0;
  for (const u of units) {
    const m = /^unit\s+(\d+)$/i.exec(u.name.trim());
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `unit ${Math.max(max + 1, units.length + 1)}`;
}

export interface SlateState {
  /** the tab list; the active unit's live doc/camera live on `doc`/`camera` */
  units: Unit[];
  activeUnitId: string;

  doc: Document;
  past: Document[];
  future: Document[];

  selectedIds: string[];
  editingId: string | null;
  hoverId: string | null;

  camera: Camera;
  tool: Tool;
  stickyTool: boolean;
  theme: ThemeName;
  style: StyleDefaults;

  showGrid: boolean;
  snap: boolean;
  gridSize: number;

  panelOpen: boolean;
  spaceDown: boolean;

  _snapTag: string | null;
  _snapAt: number;

  // history -----------------------------------------------------------------
  snapshot: (tag?: string) => void;
  discardSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  // mutations -------------------------------------------------------------
  addNode: (n: AnyNode, opts?: { select?: boolean; history?: boolean }) => void;
  addNodes: (ns: AnyNode[], select?: boolean) => void;
  updateNode: (id: string, patch: Partial<AnyNode>, history?: boolean) => void;
  updateNodes: (
    entries: Record<string, Partial<AnyNode>>,
    history?: boolean,
  ) => void;
  removeNodes: (ids: string[], history?: boolean) => void;
  removeSelected: () => void;
  duplicateSelected: () => string[];

  reorder: (op: "front" | "back" | "forward" | "backward") => void;

  // selection -----------------------------------------------------------
  select: (ids: string[], additive?: boolean) => void;
  toggleInSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  setEditing: (id: string | null) => void;
  setHover: (id: string | null) => void;

  // camera ------------------------------------------------------------
  setCamera: (c: Partial<Camera>) => void;
  panBy: (dx: number, dy: number) => void;
  zoomAt: (screen: Vec, factor: number) => void;
  setZoom: (z: number, center?: Vec) => void;
  resetView: () => void;
  zoomToFit: (viewport: { w: number; h: number }, ids?: string[]) => void;

  // tool / theme / prefs -------------------------------------------
  setTool: (t: Tool, sticky?: boolean) => void;
  setTheme: (t: ThemeName) => void;
  cycleTheme: (dir?: number) => void;
  setStyle: (patch: Partial<StyleDefaults>) => void;
  applyStyleToSelection: (patch: Partial<AnyNode>) => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
  setSpaceDown: (v: boolean) => void;
  setPanelOpen: (v: boolean) => void;

  // doc lifecycle -------------------------------------------------
  loadDocument: (d: Document) => void;
  newDocument: () => void;

  // units / tabs -------------------------------------------------
  addUnit: () => void;
  switchUnit: (id: string) => void;
  closeUnit: (id: string) => void;
  renameUnit: (id: string, name: string) => void;

  worldPoint: (screen: Vec) => Vec;
  selectedNodes: () => AnyNode[];
}

const prefs = loadPrefs();
const workspace = loadWorkspace();
const activeUnit =
  workspace.units.find((u) => u.id === workspace.activeUnitId) ??
  workspace.units[0];

export const useStore = create<SlateState>()(
  subscribeWithSelector((set, get) => ({
    units: workspace.units,
    activeUnitId: activeUnit.id,

    doc: cloneDoc(activeUnit.doc),
    past: [],
    future: [],

    selectedIds: [],
    editingId: null,
    hoverId: null,

    camera: { ...activeUnit.camera },
    tool: "select",
    stickyTool: false,
    theme: prefs.theme,
    style: prefs.style,

    showGrid: prefs.showGrid,
    snap: prefs.snap,
    gridSize: 8,

    panelOpen: true,
    spaceDown: false,

    _snapTag: null,
    _snapAt: 0,

    snapshot(tag) {
      const now = Date.now();
      const { _snapTag, _snapAt } = get();
      if (tag && tag === _snapTag && now - _snapAt < 500) {
        set({ _snapAt: now });
        return;
      }
      set((s) => ({
        past: [...s.past.slice(-HISTORY_LIMIT + 1), cloneDoc(s.doc)],
        future: [],
        _snapTag: tag ?? null,
        _snapAt: now,
      }));
    },

    discardSnapshot() {
      set((s) => ({ past: s.past.slice(0, -1) }));
    },

    undo() {
      const { past, doc, future } = get();
      if (!past.length) return;
      const prev = past[past.length - 1];
      set({
        doc: prev,
        past: past.slice(0, -1),
        future: [...future, cloneDoc(doc)],
        _snapTag: null,
      });
      pruneSelection();
    },

    redo() {
      const { past, doc, future } = get();
      if (!future.length) return;
      const next = future[future.length - 1];
      set({
        doc: next,
        future: future.slice(0, -1),
        past: [...past, cloneDoc(doc)],
        _snapTag: null,
      });
      pruneSelection();
    },

    addNode(n, opts) {
      const history = opts?.history ?? true;
      if (history) get().snapshot();
      set((s) => ({
        doc: {
          nodes: { ...s.doc.nodes, [n.id]: n },
          order: [...s.doc.order, n.id],
        },
        selectedIds: opts?.select === false ? s.selectedIds : [n.id],
      }));
    },

    addNodes(ns, select = true) {
      if (!ns.length) return;
      get().snapshot();
      set((s) => {
        const nodes = { ...s.doc.nodes };
        for (const n of ns) nodes[n.id] = n;
        return {
          doc: { nodes, order: [...s.doc.order, ...ns.map((n) => n.id)] },
          selectedIds: select ? ns.map((n) => n.id) : s.selectedIds,
        };
      });
    },

    updateNode(id, patch, history = true) {
      if (history) get().snapshot("update:" + id);
      set((s) => {
        const cur = s.doc.nodes[id];
        if (!cur) return s;
        return {
          doc: {
            ...s.doc,
            nodes: { ...s.doc.nodes, [id]: { ...cur, ...patch } as AnyNode },
          },
        };
      });
    },

    updateNodes(entries, history = true) {
      const ids = Object.keys(entries);
      if (!ids.length) return;
      if (history) get().snapshot("updateMany:" + ids.join(","));
      set((s) => {
        const nodes = { ...s.doc.nodes };
        for (const id of ids) {
          const cur = nodes[id];
          if (cur) nodes[id] = { ...cur, ...entries[id] } as AnyNode;
        }
        return { doc: { ...s.doc, nodes } };
      });
    },

    removeNodes(ids, history = true) {
      if (!ids.length) return;
      if (history) get().snapshot();
      set((s) => {
        const kill = new Set(ids);
        const nodes = { ...s.doc.nodes };
        for (const id of ids) delete nodes[id];
        // also drop connectors bound to removed nodes
        for (const [cid, n] of Object.entries(nodes)) {
          if (n.type !== "connector") continue;
          const fromDead = n.from.kind === "node" && kill.has(n.from.nodeId);
          const toDead = n.to.kind === "node" && kill.has(n.to.nodeId);
          if (fromDead || toDead) delete nodes[cid];
        }
        const order = s.doc.order.filter((id) => nodes[id]);
        return {
          doc: { nodes, order },
          selectedIds: s.selectedIds.filter((id) => nodes[id]),
          editingId: s.editingId && nodes[s.editingId] ? s.editingId : null,
        };
      });
    },

    removeSelected() {
      get().removeNodes(get().selectedIds);
    },

    duplicateSelected() {
      const { selectedIds, doc } = get();
      if (!selectedIds.length) return [];
      get().snapshot();
      const idMap = new Map<string, string>();
      selectedIds.forEach((id) => idMap.set(id, uid()));
      const clones: AnyNode[] = [];
      for (const id of selectedIds) {
        const src = doc.nodes[id];
        if (!src) continue;
        const copy: AnyNode = {
          ...src,
          id: idMap.get(id)!,
          x: src.x + 24,
          y: src.y + 24,
        } as AnyNode;
        if (copy.type === "connector") {
          if (copy.from.kind === "node" && idMap.has(copy.from.nodeId))
            copy.from = { ...copy.from, nodeId: idMap.get(copy.from.nodeId)! };
          if (copy.to.kind === "node" && idMap.has(copy.to.nodeId))
            copy.to = { ...copy.to, nodeId: idMap.get(copy.to.nodeId)! };
        }
        clones.push(copy);
      }
      set((s) => {
        const nodes = { ...s.doc.nodes };
        for (const c of clones) nodes[c.id] = c;
        return {
          doc: { nodes, order: [...s.doc.order, ...clones.map((c) => c.id)] },
          selectedIds: clones.map((c) => c.id),
        };
      });
      return clones.map((c) => c.id);
    },

    reorder(op) {
      const { selectedIds } = get();
      if (!selectedIds.length) return;
      get().snapshot();
      set((s) => {
        const sel = new Set(selectedIds);
        let order = [...s.doc.order];
        const picked = order.filter((id) => sel.has(id));
        const rest = order.filter((id) => !sel.has(id));
        if (op === "front") order = [...rest, ...picked];
        else if (op === "back") order = [...picked, ...rest];
        else if (op === "forward") {
          for (let i = order.length - 2; i >= 0; i--) {
            if (sel.has(order[i]) && !sel.has(order[i + 1])) {
              [order[i], order[i + 1]] = [order[i + 1], order[i]];
            }
          }
        } else {
          for (let i = 1; i < order.length; i++) {
            if (sel.has(order[i]) && !sel.has(order[i - 1])) {
              [order[i], order[i - 1]] = [order[i - 1], order[i]];
            }
          }
        }
        return { doc: { ...s.doc, order } };
      });
    },

    select(ids, additive) {
      set((s) => ({
        selectedIds: additive
          ? Array.from(new Set([...s.selectedIds, ...ids]))
          : ids,
        editingId: null,
      }));
    },

    toggleInSelection(id) {
      set((s) => ({
        selectedIds: s.selectedIds.includes(id)
          ? s.selectedIds.filter((x) => x !== id)
          : [...s.selectedIds, id],
      }));
    },

    selectAll() {
      set((s) => ({ selectedIds: [...s.doc.order] }));
    },

    clearSelection() {
      set({ selectedIds: [], editingId: null });
    },

    setEditing(id) {
      set({ editingId: id, selectedIds: id ? [id] : get().selectedIds });
    },

    setHover(id) {
      if (get().hoverId !== id) set({ hoverId: id });
    },

    setCamera(c) {
      set((s) => ({ camera: { ...s.camera, ...c } }));
    },

    panBy(dx, dy) {
      set((s) => ({
        camera: { ...s.camera, x: s.camera.x + dx, y: s.camera.y + dy },
      }));
    },

    zoomAt(screen, factor) {
      set((s) => {
        const z = clamp(s.camera.z * factor, 0.08, 8);
        const k = z / s.camera.z;
        return {
          camera: {
            z,
            x: screen.x - (screen.x - s.camera.x) * k,
            y: screen.y - (screen.y - s.camera.y) * k,
          },
        };
      });
    },

    setZoom(z, center) {
      const c = center ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 };
      set((s) => {
        const nz = clamp(z, 0.08, 8);
        const k = nz / s.camera.z;
        return {
          camera: {
            z: nz,
            x: c.x - (c.x - s.camera.x) * k,
            y: c.y - (c.y - s.camera.y) * k,
          },
        };
      });
    },

    resetView() {
      set({ camera: { x: 0, y: 0, z: 1 } });
    },

    zoomToFit(viewport, ids) {
      const { doc } = get();
      const list = (ids && ids.length ? ids : doc.order)
        .map((id) => doc.nodes[id])
        .filter(Boolean) as AnyNode[];
      const b = boundsOf(list);
      if (!b || b.w === 0 || b.h === 0) {
        set({ camera: { x: 0, y: 0, z: 1 } });
        return;
      }
      const pad = 120;
      const z = clamp(
        Math.min(
          (viewport.w - pad * 2) / b.w,
          (viewport.h - pad * 2) / b.h,
        ),
        0.08,
        2.5,
      );
      set({
        camera: {
          z,
          x: viewport.w / 2 - (b.x + b.w / 2) * z,
          y: viewport.h / 2 - (b.y + b.h / 2) * z,
        },
      });
    },

    setTool(t, sticky = false) {
      set({
        tool: t,
        stickyTool: sticky || t === "select" || t === "hand",
        editingId: null,
      });
      if (t !== "select") set({ selectedIds: [] });
    },

    setTheme(t) {
      applyTheme(t);
      set({ theme: t });
    },

    cycleTheme(dir = 1) {
      const order: ThemeName[] = ["light", "dark"];
      const i = order.indexOf(get().theme);
      get().setTheme(order[(i + dir + order.length) % order.length]);
    },

    setStyle(patch) {
      set((s) => ({ style: { ...s.style, ...patch } }));
    },

    applyStyleToSelection(patch) {
      const { selectedIds } = get();
      if (!selectedIds.length) return;
      const entries: Record<string, Partial<AnyNode>> = {};
      for (const id of selectedIds) entries[id] = patch;
      get().updateNodes(entries, true);
    },

    toggleGrid() {
      set((s) => ({ showGrid: !s.showGrid }));
    },

    toggleSnap() {
      set((s) => ({ snap: !s.snap }));
    },

    setSpaceDown(v) {
      set({ spaceDown: v });
    },

    setPanelOpen(v) {
      set({ panelOpen: v });
    },

    loadDocument(d) {
      get().snapshot();
      set({
        doc: cloneDoc(d),
        selectedIds: [],
        editingId: null,
      });
    },

    newDocument() {
      get().snapshot();
      set({
        doc: emptyDoc(),
        selectedIds: [],
        editingId: null,
        camera: { x: 0, y: 0, z: 1 },
      });
    },

    addUnit() {
      const s = get();
      const unit = newUnit(nextUnitName(s.units));
      set({
        units: [
          ...s.units.map((u) =>
            u.id === s.activeUnitId
              ? { ...u, doc: cloneDoc(s.doc), camera: { ...s.camera } }
              : u,
          ),
          unit,
        ],
        activeUnitId: unit.id,
        doc: emptyDoc(),
        camera: { x: 0, y: 0, z: 1 },
        selectedIds: [],
        editingId: null,
        hoverId: null,
        past: [],
        future: [],
      });
    },

    switchUnit(id) {
      const s = get();
      if (id === s.activeUnitId) return;
      const target = s.units.find((u) => u.id === id);
      if (!target) return;
      set({
        units: s.units.map((u) =>
          u.id === s.activeUnitId
            ? { ...u, doc: cloneDoc(s.doc), camera: { ...s.camera } }
            : u,
        ),
        activeUnitId: id,
        doc: cloneDoc(target.doc),
        camera: { ...target.camera },
        selectedIds: [],
        editingId: null,
        hoverId: null,
        past: [],
        future: [],
      });
    },

    closeUnit(id) {
      const s = get();
      if (s.units.length <= 1) {
        // keep the last tab, just wipe it
        get().snapshot();
        set({
          doc: emptyDoc(),
          selectedIds: [],
          editingId: null,
        });
        return;
      }
      const idx = s.units.findIndex((u) => u.id === id);
      if (idx < 0) return;
      const remaining = s.units.filter((u) => u.id !== id);
      if (id === s.activeUnitId) {
        const next = remaining[Math.min(idx, remaining.length - 1)];
        set({
          units: remaining,
          activeUnitId: next.id,
          doc: cloneDoc(next.doc),
          camera: { ...next.camera },
          selectedIds: [],
          editingId: null,
          hoverId: null,
          past: [],
          future: [],
        });
      } else {
        set({
          units: remaining.map((u) =>
            u.id === s.activeUnitId
              ? { ...u, doc: cloneDoc(s.doc), camera: { ...s.camera } }
              : u,
          ),
        });
      }
    },

    renameUnit(id, name) {
      set((s) => ({
        units: s.units.map((u) =>
          u.id === id ? { ...u, name: name.trim() || u.name } : u,
        ),
      }));
    },

    worldPoint(screen) {
      return screenToWorld(screen, get().camera);
    },

    selectedNodes() {
      const { doc, selectedIds } = get();
      return selectedIds.map((id) => doc.nodes[id]).filter(Boolean) as AnyNode[];
    },
  })),
);

function pruneSelection() {
  const { doc, selectedIds } = useStore.getState();
  const next = selectedIds.filter((id) => doc.nodes[id]);
  if (next.length !== selectedIds.length)
    useStore.setState({ selectedIds: next });
}

// ---- persistence -----------------------------------------------------------
let saveTimer: number | undefined;
useStore.subscribe(
  (s) => [s.doc, s.camera, s.units, s.activeUnitId] as const,
  () => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const s = useStore.getState();
      const units = s.units.map((u) =>
        u.id === s.activeUnitId
          ? { ...u, doc: s.doc, camera: s.camera }
          : u,
      );
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ units, activeUnitId: s.activeUnitId }),
        );
      } catch {
        /* quota — ignore */
      }
    }, 400);
  },
);

let prefsTimer: number | undefined;
useStore.subscribe(
  (s) => [s.theme, s.style, s.showGrid, s.snap] as const,
  ([theme, style, showGrid, snap]) => {
    window.clearTimeout(prefsTimer);
    prefsTimer = window.setTimeout(() => {
      try {
        localStorage.setItem(
          PREFS_KEY,
          JSON.stringify({ theme, style, showGrid, snap }),
        );
      } catch {
        /* ignore */
      }
    }, 400);
  },
);

export const selectSelectedNodes = (s: SlateState) =>
  s.selectedIds.map((id) => s.doc.nodes[id]).filter(Boolean) as AnyNode[];
