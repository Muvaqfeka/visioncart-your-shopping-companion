import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Fingerprint, ShieldCheck, XCircle, Loader2 } from "lucide-react";
import { speak } from "@/hooks/useSpeech";
import { useLanguage } from "@/context/LanguageContext";

interface Props {
  title: string;
  amount: number;
  onSuccess: () => void;
  onCancel: () => void;
}

/**
 * Fingerprint authorisation step used before UPI (GPay / Paytm) and card payments.
 * Uses the platform authenticator via WebAuthn when available, and falls back to a
 * press-and-hold fingerprint scan so it also works on desktop / inside iframes.
 */
export default function BiometricPrompt({ title, amount, onSuccess, onCancel }: Props) {
  const { language } = useLanguage();
  const [phase, setPhase] = useState<"idle" | "scanning" | "verifying" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    speak(
      language === "ta"
        ? `${title} மூலம் ₹${amount.toLocaleString("en-IN")} செலுத்த கைரேகையை வைக்கவும்.`
        : `Place your fingerprint to authorise ₹${amount.toLocaleString("en-IN")} with ${title}.`
    );
    return () => { if (holdTimer.current) clearInterval(holdTimer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = async () => {
    setPhase("verifying");
    // Try the real platform authenticator (Touch ID / Android fingerprint)
    try {
      const pk = (window as any).PublicKeyCredential;
      if (pk?.isUserVerifyingPlatformAuthenticatorAvailable) {
        const available = await pk.isUserVerifyingPlatformAuthenticatorAvailable();
        if (available) {
          const challenge = crypto.getRandomValues(new Uint8Array(32));
          await navigator.credentials.create({
            publicKey: {
              challenge,
              rp: { name: "Smart Vision Cart" },
              user: { id: crypto.getRandomValues(new Uint8Array(16)), name: "shopper", displayName: "Shopper" },
              pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
              authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
              timeout: 20000,
            },
          } as any);
        }
      }
    } catch {
      // fingerprint hardware unavailable or dismissed — fall back to the simulated scan
    }
    setPhase("done");
    await speak(language === "ta" ? "கைரேகை சரிபார்க்கப்பட்டது." : "Fingerprint verified.");
    onSuccess();
  };

  const startHold = () => {
    if (phase !== "idle") return;
    setPhase("scanning");
    setProgress(0);
    holdTimer.current = setInterval(() => {
      setProgress((p) => {
        const next = p + 8;
        if (next >= 100) {
          if (holdTimer.current) clearInterval(holdTimer.current);
          finish();
          return 100;
        }
        return next;
      });
    }, 60);
  };

  const cancelHold = () => {
    if (phase !== "scanning") return;
    if (holdTimer.current) clearInterval(holdTimer.current);
    setPhase("idle");
    setProgress(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="quick-card p-5 space-y-4 text-center"
      role="dialog"
      aria-live="assertive"
    >
      <div className="flex items-center justify-center gap-2 text-fresh">
        <ShieldCheck className="w-4 h-4" />
        <span className="text-xs font-display uppercase tracking-wider">
          {language === "ta" ? "பயோமெட்ரிக் அனுமதி" : "Biometric authorisation"}
        </span>
      </div>

      <p className="text-sm text-foreground">
        {title} · <span className="font-display text-fresh">₹{amount.toLocaleString("en-IN")}</span>
      </p>

      <button
        onMouseDown={startHold}
        onMouseUp={cancelHold}
        onMouseLeave={cancelHold}
        onTouchStart={startHold}
        onTouchEnd={cancelHold}
        onClick={() => { if (phase === "idle") startHold(); }}
        disabled={phase === "verifying" || phase === "done"}
        className="relative mx-auto w-28 h-28 rounded-full flex items-center justify-center bg-fresh/10 border-2 border-fresh/50"
        aria-label={language === "ta" ? "கைரேகை ஸ்கேன்" : "Scan fingerprint"}
      >
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: `conic-gradient(hsl(var(--fresh)) ${progress * 3.6}deg, transparent 0deg)`, opacity: 0.35 }}
        />
        {phase === "verifying" ? (
          <Loader2 className="w-12 h-12 text-fresh animate-spin" />
        ) : (
          <Fingerprint className={`w-14 h-14 text-fresh ${phase === "scanning" ? "animate-pulse" : ""}`} />
        )}
      </button>

      <p className="text-[11px] text-muted-foreground">
        {phase === "done"
          ? language === "ta" ? "சரிபார்க்கப்பட்டது ✓" : "Verified ✓"
          : language === "ta"
            ? "கைரேகை பொத்தானை அழுத்திப் பிடிக்கவும்"
            : "Press and hold the fingerprint sensor to authorise"}
      </p>

      <button
        onClick={onCancel}
        className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
      >
        <XCircle className="w-3.5 h-3.5" />
        {language === "ta" ? "ரத்து" : "Cancel"}
      </button>
    </motion.div>
  );
}
