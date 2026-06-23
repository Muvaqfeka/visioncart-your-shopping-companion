import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Video, StopCircle, Upload, CheckCircle2, Smartphone, Wallet, CircleDollarSign } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { speak } from "@/hooks/useSpeech";

export type PaymentMethod = "gpay" | "phonepe" | "cod" | "offline";

interface PaymentPanelProps {
  amount: number;
  payeeName?: string;
  onConfirm: (method: PaymentMethod, meta?: { videoDataUrl?: string }) => void;
}

const UPI_VPA = "smartvisioncart@upi"; // demo merchant VPA

function buildUpiLink(amount: number, payee: string, pkg?: string) {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: payee,
    am: amount.toFixed(2),
    cu: "INR",
    tn: "Smart Vision Cart Order",
  });
  const base = `upi://pay?${params.toString()}`;
  // GPay & PhonePe accept the standard upi:// scheme; package suggestion is informational.
  return base;
}

export default function PaymentPanel({ amount, payeeName = "Smart Vision Cart", onConfirm }: PaymentPanelProps) {
  const { language, t } = useLanguage();
  const [recording, setRecording] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const handleUpi = (method: "gpay" | "phonepe") => {
    const link = buildUpiLink(amount, payeeName);
    speak(language === "ta"
      ? `${method === "gpay" ? "கூகுள் பே" : "போன் பே"} ஐ திறக்கிறது. பேங்க் ஆப்பில் உறுதிசெய்து திரும்பவும்.`
      : `Opening ${method === "gpay" ? "Google Pay" : "PhonePe"}. Confirm the payment in your bank app and come back.`
    );
    try { window.location.href = link; } catch {}
    // Mark as paid after a short window (demo).
    setTimeout(() => onConfirm(method), 1500);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoElRef.current) {
        videoElRef.current.srcObject = stream;
        await videoElRef.current.play().catch(() => {});
      }
      const mimeType = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setVideoUrl(URL.createObjectURL(blob));
          // Store last verification video locally as a mock backup.
          try {
            const key = `svc_verification_${Date.now()}`;
            localStorage.setItem(key, JSON.stringify({ at: Date.now(), size: blob.size, type: blob.type, dataUrl: dataUrl.slice(0, 50_000) }));
          } catch {}
          setUploaded(true);
          speak(language === "ta" ? "சரிபார்ப்புக்கு வீடியோ பதிவேற்றப்பட்டது." : "Video uploaded for verification.");
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      speak(language === "ta" ? "பணப் பரிமாற்றத்தை பதிவு செய்கிறேன். முடிந்தபின் நிறுத்து என்று அழுத்தவும்." : "Recording cash exchange. Press stop when done.");
    } catch (e) {
      console.error(e);
      speak(language === "ta" ? "கேமராவை அணுக முடியவில்லை." : "Could not access camera.");
    }
  };

  const stopRecording = () => {
    try { recRef.current?.stop(); } catch {}
    setRecording(false);
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm text-primary text-glow text-center">{t("choosePayment")}</h3>
      <p className="text-xs text-muted-foreground text-center">₹{amount.toLocaleString("en-IN")} {t("total")}</p>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => handleUpi("gpay")} className="glass rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-neon-lg transition-all">
          <Smartphone className="w-6 h-6 text-primary" />
          <span className="text-xs font-display text-foreground">{t("payGpay")}</span>
        </button>
        <button onClick={() => handleUpi("phonepe")} className="glass rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-neon-lg transition-all">
          <Wallet className="w-6 h-6 text-primary" />
          <span className="text-xs font-display text-foreground">{t("payPhonepe")}</span>
        </button>
        <button onClick={() => onConfirm("cod")} className="glass rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-neon-lg transition-all">
          <CircleDollarSign className="w-6 h-6 text-primary" />
          <span className="text-xs font-display text-foreground">{t("payCash")}</span>
        </button>
        <button onClick={() => speak(language === "ta" ? "வொர்க்கர் வீடியோ பதிவு செய்து சரிபார்ப்பு செய்வார்." : "A worker will record the cash exchange video for verification.") } className="glass rounded-xl p-4 flex flex-col items-center gap-2 border border-primary/40">
          <Video className="w-6 h-6 text-primary" />
          <span className="text-xs font-display text-foreground">{t("payOffline")}</span>
        </button>
      </div>

      {/* Offline pay workflow */}
      <div className="glass rounded-xl p-4 space-y-3">
        <p className="text-xs text-muted-foreground">{language === "ta" ? "ஆஃப்லைன் பணம்: வொர்க்கர் பணப் பரிமாற்ற வீடியோவை பதிவு செய்து பதிவேற்றுவார் — பின் ஆர்டர் உறுதிசெய்யப்படும்." : "Offline pay: a worker records the cash exchange on video and uploads it. Then the order is confirmed."}</p>
        <video ref={videoElRef} className="w-full aspect-video rounded-lg bg-muted object-cover" muted playsInline />
        <div className="flex flex-wrap gap-2">
          {!recording && !uploaded && (
            <button onClick={startRecording} className="flex-1 glass px-3 py-2 rounded-lg text-xs font-display text-primary shadow-neon flex items-center justify-center gap-2">
              <Video className="w-4 h-4" /> {t("recordExchange")}
            </button>
          )}
          {recording && (
            <button onClick={stopRecording} className="flex-1 glass px-3 py-2 rounded-lg text-xs font-display text-destructive flex items-center justify-center gap-2">
              <StopCircle className="w-4 h-4 animate-pulse" /> {t("stopRecording")}
            </button>
          )}
          {uploaded && (
            <button onClick={() => onConfirm("offline", { videoDataUrl: videoUrl || undefined })} className="flex-1 glass px-3 py-2 rounded-lg text-xs font-display text-primary shadow-neon flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> {language === "ta" ? "சரிபார்ப்பு முடிந்தது — தொடரு" : "Verified — Continue"}
            </button>
          )}
        </div>
        {uploaded && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-primary flex items-center gap-1">
            <Upload className="w-3 h-3" /> {t("videoUploaded")}
          </motion.p>
        )}
      </div>
    </div>
  );
}
