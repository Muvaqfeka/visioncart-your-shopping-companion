import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Eye, CheckCircle2, RotateCcw, Save, Play } from "lucide-react";

type Phase = "intro" | "single" | "gap" | "double" | "result";

interface Props {
  open: boolean;
  onClose: () => void;
  ear: number;
  threshold: number;
  setThreshold: (v: number) => void;
  getEarSamples: () => Array<{ t: number; ear: number; smoothed: number; closed: boolean }>;
  blinkEvents: Array<{ t: number; type: "single" | "double" | "raw" }>;
}

const TEST_DURATION = 5000;

export default function BlinkTestWizard({
  open, onClose, ear, threshold, setThreshold, getEarSamples, blinkEvents,
}: Props) {
  const [phase, setPhase] = useState<Phase>("intro");
  const [countdown, setCountdown] = useState(0);
  const singleStartRef = useRef<number>(0);
  const doubleStartRef = useRef<number>(0);
  const [singleCount, setSingleCount] = useState(0);
  const [doubleCount, setDoubleCount] = useState(0);
  const [suggested, setSuggested] = useState<number | null>(null);
  const beforeEventCountRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setPhase("intro"); setSingleCount(0); setDoubleCount(0); setSuggested(null);
    }
  }, [open]);

  const runPhase = (next: Phase, duration: number, onDone: () => void) => {
    setPhase(next);
    setCountdown(Math.ceil(duration / 1000));
    const start = Date.now();
    const tick = setInterval(() => {
      const left = Math.max(0, duration - (Date.now() - start));
      setCountdown(Math.ceil(left / 1000));
      if (left <= 0) { clearInterval(tick); onDone(); }
    }, 200);
  };

  const start = () => {
    beforeEventCountRef.current = blinkEvents.length;
    singleStartRef.current = Date.now();
    runPhase("single", TEST_DURATION, () => {
      // Count raw blinks during single phase
      const after = blinkEvents.filter((e) => e.t >= singleStartRef.current && e.type === "raw").length;
      setSingleCount(after);
      runPhase("gap", 1500, () => {
        doubleStartRef.current = Date.now();
        runPhase("double", TEST_DURATION, () => {
          const doubles = blinkEvents.filter((e) => e.t >= doubleStartRef.current && e.type === "double").length;
          setDoubleCount(doubles);
          computeSuggestion();
          setPhase("result");
        });
      });
    });
  };

  const computeSuggestion = () => {
    // Use EAR samples from the whole test window: find "closed peaks" (local minima)
    // and "open baseline" (top quartile of smoothed EAR). Suggest threshold roughly
    // midway between them, biased toward the closed side.
    const samples = getEarSamples().filter((s) => s.t >= singleStartRef.current);
    if (samples.length < 30) { setSuggested(null); return; }
    const values = samples.map((s) => s.smoothed).sort((a, b) => a - b);
    const lowMean = mean(values.slice(0, Math.max(3, Math.floor(values.length * 0.1))));
    const highMean = mean(values.slice(Math.floor(values.length * 0.75)));
    const suggestion = lowMean + (highMean - lowMean) * 0.45;
    // Clamp to reasonable range
    setSuggested(Math.max(0.14, Math.min(0.32, +suggestion.toFixed(3))));
  };

  const applySuggested = () => {
    if (suggested != null) setThreshold(suggested);
    onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-background/85 backdrop-blur flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="glass rounded-2xl p-5 max-w-md w-full border border-primary/40 shadow-neon-lg space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary animate-pulse" />
                <h3 className="font-display text-lg gradient-text">Blink Test Wizard</h3>
              </div>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {phase === "intro" && (
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>We'll run two short tests to validate blink detection and suggest the best sensitivity for your eyes.</p>
                <ol className="text-xs space-y-1 list-decimal list-inside">
                  <li>Perform <b className="text-foreground">single blinks</b> at a natural pace for 5 seconds.</li>
                  <li>Short break, then perform <b className="text-foreground">double blinks</b> for 5 seconds.</li>
                </ol>
                <button onClick={start} className="w-full glass px-4 py-2 rounded-lg font-display text-sm text-primary shadow-neon inline-flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Start test
                </button>
                <p className="text-[11px] text-center">Current EAR: <span className="font-mono text-foreground">{ear.toFixed(3)}</span> · Threshold: <span className="font-mono text-accent">{threshold.toFixed(3)}</span></p>
              </div>
            )}

            {(phase === "single" || phase === "double" || phase === "gap") && (
              <div className="text-center space-y-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">
                  {phase === "single" && "Single blinks"}
                  {phase === "gap" && "Get ready…"}
                  {phase === "double" && "Double blinks"}
                </p>
                <div className="text-6xl font-display gradient-text">{countdown}</div>
                <p className="text-sm text-foreground">
                  {phase === "single" && "Blink once at a natural pace"}
                  {phase === "gap" && "Prepare to blink twice in quick succession"}
                  {phase === "double" && "Blink twice rapidly, pause, repeat"}
                </p>
                <div className="h-2 rounded-full bg-background/60 overflow-hidden">
                  <div
                    className={`h-full transition-[width] duration-200 ${ear < threshold ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${Math.min(100, (ear / 0.5) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {phase === "result" && (
              <div className="space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Single blinks detected</p>
                    <p className="text-2xl font-display text-primary">{singleCount}</p>
                  </div>
                  <div className="glass rounded-lg p-3 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground">Double blinks detected</p>
                    <p className="text-2xl font-display text-primary">{doubleCount}</p>
                  </div>
                </div>
                <div className="glass rounded-lg p-3 space-y-1">
                  <p className="text-xs text-muted-foreground">Suggested threshold</p>
                  <p className="text-xl font-display text-accent">
                    {suggested != null ? suggested.toFixed(3) : "—"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">Current: {threshold.toFixed(3)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setPhase("intro"); }} className="flex-1 glass px-3 py-2 rounded-lg text-xs font-display text-muted-foreground inline-flex items-center justify-center gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" /> Redo
                  </button>
                  <button
                    onClick={applySuggested}
                    disabled={suggested == null}
                    className="flex-1 glass px-3 py-2 rounded-lg text-xs font-display text-primary shadow-neon inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" /> Save suggested
                  </button>
                </div>
                {singleCount === 0 && doubleCount === 0 && (
                  <p className="text-[11px] text-destructive text-center inline-flex items-center gap-1 justify-center">
                    <CheckCircle2 className="w-3 h-3" /> No blinks detected — try lowering threshold or improving lighting.
                  </p>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function mean(a: number[]) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
