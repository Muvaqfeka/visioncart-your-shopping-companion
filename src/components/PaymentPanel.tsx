import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Video, StopCircle, CheckCircle2, Smartphone, Wallet, CircleDollarSign, Upload, Loader2 } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { speak } from "@/hooks/useSpeech";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export type PaymentMethod = "gpay" | "phonepe" | "cod" | "offline";

interface PaymentPanelProps {
  orderId: string;
  userId: string;
  amount: number;
  payeeName?: string;
  isLocal?: boolean;
  onSubmitted: (method: PaymentMethod, status: "paid" | "awaiting_verification" | "pending") => void;
}

const UPI_VPA = "smartvisioncart@upi";

function buildUpiQuery(amount: number, payee: string, orderId: string) {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: payee,
    am: amount.toFixed(2),
    cu: "INR",
    tn: `SVC Order ${orderId.slice(0, 8)}`,
    tr: orderId.slice(0, 16),
  });
  return params.toString();
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}
function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function launchUpiApp(app: "gpay" | "phonepe", amount: number, payee: string, orderId: string) {
  const query = buildUpiQuery(amount, payee, orderId);
  const pkg = app === "gpay" ? "com.google.android.apps.nbu.paisa.user" : "com.phonepe.app";

  // Android: targeted intent URL opens the specific app directly
  if (isAndroid()) {
    const intentUrl = `intent://pay?${query}#Intent;scheme=upi;package=${pkg};end`;
    window.location.href = intentUrl;
    // fallback to generic upi chooser after a moment
    setTimeout(() => {
      window.location.href = `upi://pay?${query}`;
    }, 1500);
    return true;
  }

  // iOS / other mobile: try app-specific scheme, then generic upi://
  if (isMobile()) {
    const scheme = app === "gpay" ? `gpay://upi/pay?${query}` : `phonepe://pay?${query}`;
    window.location.href = scheme;
    setTimeout(() => { window.location.href = `upi://pay?${query}`; }, 1500);
    return true;
  }

  // Desktop: try generic upi link (won't work on most desktops) and signal fallback
  try { window.location.href = `upi://pay?${query}`; } catch {}
  return false;
}

  const submitUpi = async () => {
    if (!txnId.trim() || txnId.trim().length < 6) {
      toast.error("Enter the UPI transaction ID from your payment app");
      return;
    }
    setSubmitting(true);
    if (!isLocal) {
      const { error } = await supabase.from("orders").update({
        payment_method: method,
        payment_status: "awaiting_verification",
        upi_txn_id: txnId.trim(),
      }).eq("id", orderId);
      if (error) { setSubmitting(false); return toast.error(error.message); }
    }
    setSubmitting(false);
    speak(language === "ta" ? "UPI ஐடி பெறப்பட்டது. ஆர்டர் உறுதி." : "UPI ID received. Your order is confirmed.");
    onSubmitted(method!, isLocal ? "paid" : "awaiting_verification");
  };

  const chooseCod = async () => {
    setMethod("cod");
    setSubmitting(true);
    if (!isLocal) {
      const { error } = await supabase.from("orders").update({
        payment_method: "cod", payment_status: "pending",
      }).eq("id", orderId);
      if (error) { setSubmitting(false); return toast.error(error.message); }
    }
    setSubmitting(false);
    onSubmitted("cod", "pending");
  };

  const startRecording = async () => {
    setMethod("offline");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      streamRef.current = stream;
      if (videoElRef.current) { videoElRef.current.srcObject = stream; await videoElRef.current.play().catch(() => {}); }
      const mimeType = ["video/webm;codecs=vp9", "video/webm", "video/mp4"].find((m) => MediaRecorder.isTypeSupported(m)) || "";
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType || "video/webm" });
        setVideoBlob(blob);
        setVideoPreview(URL.createObjectURL(blob));
        stream.getTracks().forEach((tr) => tr.stop());
        streamRef.current = null;
        if (videoElRef.current) videoElRef.current.srcObject = null;
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      speak(language === "ta" ? "பணப் பரிமாற்றத்தை பதிவு செய்கிறேன். முடிந்தபின் நிறுத்து என்று அழுத்தவும்." : "Recording cash exchange. Press stop when done.");
    } catch {
      toast.error("Could not access camera/microphone");
    }
  };

  const stopRecording = () => { try { recRef.current?.stop(); } catch {} setRecording(false); };

  const uploadAndSubmit = async () => {
    if (!videoBlob) return;
    setUploading(true);
    if (isLocal) {
      setUploading(false);
      speak(language === "ta" ? "வீடியோ சேமிக்கப்பட்டது." : "Video saved locally. Order confirmed.");
      onSubmitted("offline", "paid");
      return;
    }
    const ext = videoBlob.type.includes("mp4") ? "mp4" : "webm";
    const path = `${userId}/${orderId}.${ext}`;
    const { error: upErr } = await supabase.storage.from("payment-videos").upload(path, videoBlob, {
      contentType: videoBlob.type, upsert: true,
    });
    if (upErr) { setUploading(false); return toast.error(upErr.message); }
    const { error } = await supabase.from("orders").update({
      payment_method: "offline", payment_status: "awaiting_verification", video_path: path,
    }).eq("id", orderId);
    setUploading(false);
    if (error) return toast.error(error.message);
    speak(language === "ta" ? "வீடியோ பதிவேற்றப்பட்டது. வொர்க்கர் சரிபார்ப்புக்காக காத்திருக்கிறது." : "Video uploaded securely. Awaiting worker verification.");
    onSubmitted("offline", "awaiting_verification");
  };

  return (
    <div className="space-y-3">
      <h3 className="font-display text-sm text-primary text-glow text-center">{t("choosePayment")}</h3>
      <p className="text-xs text-muted-foreground text-center">₹{amount.toLocaleString("en-IN")} {t("total")}</p>

      {!method && (
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => openUpi("gpay")} className="glass rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-neon-lg transition-all">
            <Smartphone className="w-6 h-6 text-primary" />
            <span className="text-xs font-display text-foreground">{t("payGpay")}</span>
          </button>
          <button onClick={() => openUpi("phonepe")} className="glass rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-neon-lg transition-all">
            <Wallet className="w-6 h-6 text-primary" />
            <span className="text-xs font-display text-foreground">{t("payPhonepe")}</span>
          </button>
          <button onClick={chooseCod} className="glass rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-neon-lg transition-all">
            <CircleDollarSign className="w-6 h-6 text-primary" />
            <span className="text-xs font-display text-foreground">{t("payCash")}</span>
          </button>
          <button onClick={startRecording} className="glass rounded-xl p-4 flex flex-col items-center gap-2 hover:shadow-neon-lg transition-all border border-primary/40">
            <Video className="w-6 h-6 text-primary" />
            <span className="text-xs font-display text-foreground">{t("payOffline")}</span>
          </button>
        </div>
      )}

      {(method === "gpay" || method === "phonepe") && (
        <div className="glass rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {language === "ta"
              ? "உங்கள் UPI ஆப்பில் பணம் செலுத்திய பிறகு, பரிவர்த்தனை ஐடி ஐ உள்ளிடுங்கள். வொர்க்கர் சரிபார்த்தபின் ஆர்டர் உறுதியாகும்."
              : "After paying in your UPI app, paste the 12-digit transaction ID below. A worker will verify it and confirm your order."}
          </p>
          <Input placeholder="e.g. 412345678901" value={txnId} onChange={(e) => setTxnId(e.target.value)} maxLength={32} />
          <div className="flex gap-2">
            <Button onClick={submitUpi} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Submit for verification
            </Button>
            <Button variant="outline" onClick={() => { setMethod(null); setTxnId(""); }}>Back</Button>
          </div>
        </div>
      )}

      {method === "offline" && (
        <div className="glass rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {language === "ta"
              ? "வொர்க்கர் பணப் பரிமாற்ற வீடியோவை பதிவு செய்வார். அது பாதுகாப்பாக சேமிக்கப்பட்டு வொர்க்கர் சரிபார்ப்புக்கு அனுப்பப்படும்."
              : "A worker records the cash exchange. The video is uploaded securely to backup storage for verification."}
          </p>
          <video ref={videoElRef} className="w-full aspect-video rounded-lg bg-muted object-cover" muted playsInline />
          {videoPreview && !recording && (
            <video src={videoPreview} controls className="w-full aspect-video rounded-lg" />
          )}
          <div className="flex flex-wrap gap-2">
            {!recording && !videoBlob && (
              <Button onClick={startRecording} className="flex-1"><Video className="w-4 h-4 mr-1" /> {t("recordExchange")}</Button>
            )}
            {recording && (
              <Button variant="destructive" onClick={stopRecording} className="flex-1"><StopCircle className="w-4 h-4 mr-1 animate-pulse" /> {t("stopRecording")}</Button>
            )}
            {videoBlob && !recording && (
              <>
                <Button onClick={uploadAndSubmit} disabled={uploading} className="flex-1">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                  Upload & submit
                </Button>
                <Button variant="outline" onClick={() => { setVideoBlob(null); setVideoPreview(null); }}>Re-record</Button>
              </>
            )}
          </div>
          {videoBlob && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[11px] text-primary">
              Ready to upload · {(videoBlob.size / 1024 / 1024).toFixed(2)} MB
            </motion.p>
          )}
        </div>
      )}
    </div>
  );
}
