import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { fmtKeys } from "../lib/platform";

export function useClickOutside<T extends HTMLElement>(
  onOut: () => void,
  active = true,
) {
  const ref = useRef<T>(null);
  useEffect(() => {
    if (!active) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    window.addEventListener("pointerdown", handler);
    return () => window.removeEventListener("pointerdown", handler);
  }, [onOut, active]);
  return ref;
}

export function IconButton({
  label,
  active,
  onClick,
  children,
  kbd,
  danger,
  className,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  children: ReactNode;
  kbd?: string;
  danger?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      className={clsx("icon-btn", active && "is-active", danger && "is-danger", className)}
      onClick={onClick}
      title={kbd ? `${label} — ${fmtKeys(kbd)}` : label}
      aria-label={label}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export function Divider() {
  return <span className="divider" aria-hidden />;
}

interface PopoverCtx {
  close: () => void;
}
const PopCtx = createContext<PopoverCtx>({ close: () => {} });
export const usePopover = () => useContext(PopCtx);

export function Popover({
  trigger,
  children,
  align = "center",
  side = "top",
}: {
  trigger: (o: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: "start" | "center" | "end";
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside<HTMLDivElement>(() => setOpen(false), open);
  // When centred we offset by -50% of our own width; framer-motion owns the
  // `transform` property once it animates, so the shift has to live here too
  // (a CSS `translateX(-50%)` would get wiped by the y/scale animation).
  const cx = align === "center" ? "-50%" : 0;
  return (
    <div className="popover-wrap" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      <AnimatePresence>
        {open && (
          <motion.div
            className={clsx("popover", `pop-${side}`, `align-${align}`)}
            initial={{ opacity: 0, x: cx, y: side === "top" ? 8 : -8, scale: 0.96 }}
            animate={{ opacity: 1, x: cx, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: cx, y: side === "top" ? 6 : -6, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
          >
            <PopCtx.Provider value={{ close: () => setOpen(false) }}>
              {children}
            </PopCtx.Provider>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
}) {
  const gid = useId();
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          className={clsx("seg", value === o.value && "seg-on")}
          onClick={() => onChange(o.value)}
        >
          {value === o.value && (
            <motion.span
              layoutId={`seg-bg-${gid}`}
              className="seg-bg"
              transition={{ type: "spring", stiffness: 520, damping: 36 }}
            />
          )}
          <span className="seg-label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommitStart,
  label,
  suffix,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommitStart?: () => void;
  label: string;
  suffix?: string;
}) {
  return (
    <label className="slider-row">
      <span className="slider-label">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onPointerDown={onCommitStart}
        onChange={(e) => onChange(parseFloat(e.target.value))}
      />
      <span className="slider-value">
        {Math.round(value)}
        {suffix}
      </span>
    </label>
  );
}

export function Swatches({
  value,
  onChange,
  colors,
  allowNone,
  allowAuto,
}: {
  value: string;
  onChange: (c: string) => void;
  colors: string[];
  allowNone?: boolean;
  allowAuto?: boolean;
}) {
  return (
    <div className="swatches">
      {allowAuto && (
        <button
          type="button"
          className={clsx("swatch swatch-auto", value === "auto" && "on")}
          title="Follow theme"
          onClick={() => onChange("auto")}
        >
          A
        </button>
      )}
      {allowNone && (
        <button
          type="button"
          className={clsx("swatch swatch-none", (value === "transparent" || value === "none") && "on")}
          title="None"
          onClick={() => onChange("transparent")}
        />
      )}
      <button
        type="button"
        className={clsx("swatch swatch-surface", value === "surface" && "on")}
        title="Surface"
        onClick={() => onChange("surface")}
      />
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          className={clsx("swatch", value === c && "on")}
          style={{ background: c }}
          onClick={() => onChange(c)}
        />
      ))}
      <label className="swatch swatch-custom" title="Custom">
        <input
          type="color"
          value={/^#/.test(value) ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
        />
      </label>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      <div className="field-body">{children}</div>
    </div>
  );
}
