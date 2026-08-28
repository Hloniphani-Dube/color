import { motion } from "framer-motion";
import { Maximize, Minus, Plus } from "lucide-react";
import { useStore } from "../store/useStore";

export function ZoomWidget() {
  const z = useStore((s) => s.camera.z);
  const setZoom = useStore((s) => s.setZoom);
  const resetView = useStore((s) => s.resetView);
  const zoomToFit = useStore((s) => s.zoomToFit);

  return (
    <motion.div
      className="zoom-widget glass"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 32, delay: 0.1 }}
    >
      <button className="icon-btn" title="Zoom out" onClick={() => setZoom(z / 1.2)}>
        <Minus size={16} />
      </button>
      <button className="zw-pct" title="Reset to 100%" onClick={resetView}>
        {Math.round(z * 100)}%
      </button>
      <button className="icon-btn" title="Zoom in" onClick={() => setZoom(z * 1.2)}>
        <Plus size={16} />
      </button>
      <span className="zw-sep" />
      <button
        className="icon-btn"
        title="Zoom to fit"
        onClick={() =>
          zoomToFit({ w: window.innerWidth, h: window.innerHeight })
        }
      >
        <Maximize size={16} />
      </button>
    </motion.div>
  );
}
