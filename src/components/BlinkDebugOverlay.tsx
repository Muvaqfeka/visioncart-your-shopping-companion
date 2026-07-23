import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import type { BlinkEvent } from "@/hooks/useBlinkDetection";

interface Props {
  landmarks: Array<{ x: number; y: number }>;
  ear: number;
  threshold: number;
  blinkEvents: BlinkEvent[];
  visible: boolean;
  onClose: () => void;
}

export default function BlinkDebugOverlay({ landmarks, ear, threshold, blinkEvents, visible, onClose }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    // mirror horizontally (video is scale-x-[-1])
    ctx.save();
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    ctx.fillStyle = ear < threshold ? "#f43f5e" : "#22d3ee";
    landmarks.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x * c.width, p.y * c.height, 2.5, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }, [landmarks, ear, threshold]);

  if (!visible) return null;

  const closed = ear < threshold;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl p-3 border border-primary/40 max-w-md w-full space-y-2"
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-display text-primary">Blink Debug</p>
        <button onClick={onClose} className="text-[11px] text-muted-foreground underline">Hide</button>
      </div>

      <div className="relative w-full aspect-[4/3] rounded-lg overflow-hidden border border-primary/30 bg-black/40">
        <canvas ref={canvasRef} width={320} height={240} className="w-full h-full" />
        <div className="absolute top-1 left-2 text-[10px] font-mono text-primary">
          landmarks: {landmarks.length}
        </div>
        <div className={`absolute top-1 right-2 text-[10px] font-mono ${closed ? "text-destructive" : "text-primary"}`}>
          {closed ? "EYES CLOSED" : "EYES OPEN"}
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
          <span>EAR {ear.toFixed(3)}</span>
          <span>threshold {threshold.toFixed(3)}</span>
        </div>
        <div className="h-2 rounded-full bg-background/60 relative overflow-hidden">
          <div
            className="absolute inset-y-0 left-0 bg-primary/70"
            style={{ width: `${Math.min(100, (ear / 0.5) * 100)}%` }}
          />
          <div
            className="absolute inset-y-0 w-[2px] bg-accent"
            style={{ left: `${(threshold / 0.5) * 100}%` }}
          />
        </div>
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Recent events</p>
        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
          {blinkEvents.length === 0 && <span className="text-[10px] text-muted-foreground">none yet</span>}
          {blinkEvents.map((e, i) => (
            <span
              key={i}
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                e.type === "double" ? "bg-accent/30 text-accent" : e.type === "single" ? "bg-primary/30 text-primary" : "bg-muted-foreground/20 text-muted-foreground"
              }`}
            >
              {e.type}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
