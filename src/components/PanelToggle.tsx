import { motion } from "framer-motion";
import { PanelRightClose, PanelRightOpen } from "lucide-react";
import { useStore } from "../store/useStore";

/**
 * A fixed anchor at the panel's top-right corner. It never moves, so the
 * inspector can visibly collapse into it and expand back out of it.
 */
export function PanelToggle() {
  const panelOpen = useStore((s) => s.panelOpen);
  const setPanelOpen = useStore((s) => s.setPanelOpen);

  return (
    <motion.button
      className="panel-toggle glass"
      onClick={() => setPanelOpen(!panelOpen)}
      aria-label={panelOpen ? "Hide panel" : "Show panel"}
      aria-pressed={panelOpen}
      title={panelOpen ? "Hide panel" : "Show panel"}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 480, damping: 30, delay: 0.12 }}
      whileTap={{ scale: 0.9 }}
    >
      <motion.span
        key={panelOpen ? "close" : "open"}
        initial={{ opacity: 0, rotate: -30 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 0.14 }}
        style={{ display: "flex" }}
      >
        {panelOpen ? (
          <PanelRightClose size={17} />
        ) : (
          <PanelRightOpen size={17} />
        )}
      </motion.span>
    </motion.button>
  );
}
