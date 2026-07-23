import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw, Save, Eye } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  ear: number;
  threshold: number;
  setThreshold: (v: number) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
  landmarks: Array<{ x: number; y: number }>;
}

const DEFAULT = 0.23;

export default function BlinkCalibration({ open, onClose, ear, threshold, setThreshold, videoRef, landmarks }: Props) {
  const closed = ear < threshold;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-5 max-w-md w-full border border-primary/40 shadow-neon-lg space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <h3 className="font-display text-lg gradient-text">Blink Calibration</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Blink naturally a few times. Adjust the slider so the bar stays{" "}
              <span className="text-primary">above</span> the marker when eyes are open and dips{" "}
              <span className="text-destructive">below</span> it when you blink.
            </p>

            <div className="relative w-full aspect-video rounded-lg overflow-hidden border border-primary/30 bg-black/40">
              {/* Preview video reflected for natural view */}
              <video
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
                ref={(el) => {
                  if (el && videoRef.current?.srcObject) {
                    el.srcObject = videoRef.current.srcObject;
                  }
                }}
              />
              <div className="absolute top-2 left-2 text-[10px] font-mono text-primary bg-background/60 px-1.5 py-0.5 rounded">
                landmarks {landmarks.length}
              </div>
              <div className={`absolute top-2 right-2 text-[10px] font-mono px-1.5 py-0.5 rounded ${closed ? "bg-destructive/30 text-destructive" : "bg-primary/30 text-primary"}`}>
                {closed ? "CLOSED" : "OPEN"}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-muted-foreground mb-1">
                <span>EAR now: <span className="text-foreground font-mono">{ear.toFixed(3)}</span></span>
                <span>threshold: <span className="text-accent font-mono">{threshold.toFixed(3)}</span></span>
              </div>
              <div className="h-3 rounded-full bg-background/60 relative overflow-hidden mb-3">
                <div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary/60 to-primary transition-[width] duration-75"
                  style={{ width: `${Math.min(100, (ear / 0.5) * 100)}%` }}
                />
                <div
                  className="absolute inset-y-0 w-[3px] bg-accent shadow-neon"
                  style={{ left: `${(threshold / 0.5) * 100}%` }}
                />
              </div>

              <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
                Sensitivity (lower = fewer blinks, higher = more sensitive)
              </label>
              <input
                type="range"
                min={0.12}
                max={0.35}
                step={0.005}
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full mt-1 accent-primary"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>0.12</span><span>0.23 default</span><span>0.35</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setThreshold(DEFAULT)}
                className="flex-1 glass px-3 py-2 rounded-lg text-xs font-display text-muted-foreground inline-flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </button>
              <button
                onClick={onClose}
                className="flex-1 glass px-3 py-2 rounded-lg text-xs font-display text-primary shadow-neon inline-flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> Save & Close
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">Your setting is saved and used automatically next time.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
