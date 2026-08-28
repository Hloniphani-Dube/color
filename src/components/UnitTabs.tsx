import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import { useStore } from "../store/useStore";

export function UnitTabs() {
  const units = useStore((s) => s.units);
  const activeId = useStore((s) => s.activeUnitId);
  const addUnit = useStore((s) => s.addUnit);
  const switchUnit = useStore((s) => s.switchUnit);
  const closeUnit = useStore((s) => s.closeUnit);
  const renameUnit = useStore((s) => s.renameUnit);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const stripRef = useRef<HTMLDivElement>(null);
  const editRef = useRef<HTMLInputElement>(null);

  const active = units.find((u) => u.id === activeId) ?? units[0];

  useEffect(() => {
    document.title = active ? `${active.name} · color` : "color";
  }, [active]);

  useLayoutEffect(() => {
    if (editingId) editRef.current?.select();
  }, [editingId]);

  // keep the active tab in view when it changes
  useEffect(() => {
    const el = stripRef.current?.querySelector<HTMLElement>(".unit-tab.is-active");
    el?.scrollIntoView({ inline: "nearest", block: "nearest" });
  }, [activeId]);

  const startRename = (id: string, name: string) => {
    setDraft(name);
    setEditingId(id);
  };
  const commitRename = () => {
    if (editingId) renameUnit(editingId, draft);
    setEditingId(null);
  };

  return (
    <div className="unit-tabs glass">
      <div className="unit-strip" ref={stripRef}>
        <AnimatePresence initial={false}>
          {units.map((u) => {
            const isActive = u.id === activeId;
            const isEditing = u.id === editingId;
            return (
              <motion.div
                key={u.id}
                layout
                initial={{ opacity: 0, scale: 0.7, width: 0 }}
                animate={{ opacity: 1, scale: 1, width: "auto" }}
                exit={{ opacity: 0, scale: 0.7, width: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 38 }}
                className={`unit-tab ${isActive ? "is-active" : ""}`}
                onPointerDown={(e) => {
                  if (isEditing) return;
                  e.stopPropagation();
                  if (!isActive) switchUnit(u.id);
                }}
                onDoubleClick={() => startRename(u.id, u.name)}
                title={u.name}
              >
                {isEditing ? (
                  <input
                    ref={editRef}
                    className="unit-rename"
                    value={draft}
                    spellCheck={false}
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setEditingId(null);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    <span className="unit-name">{u.name}</span>
                    {units.length > 1 && (
                      <button
                        className="unit-close"
                        aria-label={`Close ${u.name}`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          closeUnit(u.id);
                        }}
                      >
                        <X size={12} strokeWidth={2.75} />
                      </button>
                    )}
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <button
        className="unit-add"
        aria-label="New unit"
        title="New unit"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={() => addUnit()}
      >
        <Plus size={16} strokeWidth={2.5} />
      </button>
    </div>
  );
}
