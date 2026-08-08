import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Video, StopCircle, CheckCircle2, Smartphone, Wallet, CircleDollarSign, Upload, Loader2, XCircle, Volume2, CreditCard, PlusCircle, Fingerprint } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import { useWallet } from "@/context/WalletContext";
import { speak } from "@/hooks/useSpeech";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import BiometricPrompt from "@/components/BiometricPrompt";
import { toast } from "sonner";

export type PaymentMethod = "gpay" | "phonepe" | "paytm" | "card" | "cod" | "offline";


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

type UpiApp = "gpay" | "phonepe" | "paytm";

const UPI_APPS: Record<UpiApp, { pkg: string; scheme: string; label: string; labelTa: string }> = {
  gpay: { pkg: "com.google.android.apps.nbu.paisa.user", scheme: "gpay://upi/pay", label: "Google Pay", labelTa: "கூகுள் பே" },
  phonepe: { pkg: "com.phonepe.app", scheme: "phonepe://pay", label: "PhonePe", labelTa: "போன் பே" },
  paytm: { pkg: "net.one97.paytm", scheme: "paytmmp://pay", label: "Paytm", labelTa: "பேடிஎம்" },
};

function launchUpiApp(app: UpiApp, amount: number, payee: string, orderId: string) {
  const query = buildUpiQuery(amount, payee, orderId);
  const { pkg, scheme } = UPI_APPS[app];

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
    window.location.href = `${scheme}?${query}`;
    setTimeout(() => { window.location.href = `upi://pay?${query}`; }, 1500);
    return true;
  }

  // Desktop: try generic upi link (won't work on most desktops) and signal fallback
  try { window.location.href = `upi://pay?${query}`; } catch {}
  return false;
}


export default function PaymentPanel({ orderId, userId, amount, payeeName = "Smart Vision Cart", isLocal = false, onSubmitted }: PaymentPanelProps) {
  const { language, t } = useLanguage();
  const wallet = useWallet();
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [pendingMethod, setPendingMethod] = useState<PaymentMethod | null>(null);
  const [biometricFor, setBiometricFor] = useState<PaymentMethod | null>(null);
  const [rechargeAmount, setRechargeAmount] = useState("500");
  const [txnId, setTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [desktopUpi, setDesktopUpi] = useState<string | null>(null);

  // Offline pay recording state
  const [recording, setRecording] = useState(false);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const videoElRef = useRef<HTMLVideoElement | null>(null);

  const methodLabel = (m: PaymentMethod) => {
    if (language === "ta") {
      return m === "gpay" ? "கூகுள் பே" : m === "phonepe" ? "போன் பே" : m === "paytm" ? "பேடிஎம்"
        : m === "card" ? "விஷன் கார்டு" : m === "cod" ? "பணம் கையில் (COD)" : "ஆஃப்லைன் பணம்";
    }
    return m === "gpay" ? "Google Pay" : m === "phonepe" ? "PhonePe" : m === "paytm" ? "Paytm"
      : m === "card" ? "Vision Card wallet" : m === "cod" ? "Cash on Delivery" : "Offline cash payment";
  };

  const requestConfirm = (m: PaymentMethod) => {
    setPendingMethod(m);
    const amt = `₹${amount.toLocaleString("en-IN")}`;
    const msg = language === "ta"
      ? `நீங்கள் ${methodLabel(m)} மூலம் ${amt} செலுத்த தேர்ந்தெடுத்துள்ளீர்கள். உறுதிப்படுத்த "உறுதி" என்பதை அழுத்துங்கள், அல்லது "ரத்து" என்பதை அழுத்துங்கள்.`
      : `You selected ${methodLabel(m)} for ${amt}. Press Confirm to proceed, or Cancel to choose another method.`;
    speak(msg);
  };

  const proceedAfterConfirm = () => {
    const m = pendingMethod;
    setPendingMethod(null);
    if (!m) return;
    // UPI apps and the Vision Card require a fingerprint before the money moves
    if (m === "gpay" || m === "phonepe" || m === "paytm" || m === "card") {
      setBiometricFor(m);
      return;
    }
    if (m === "cod") chooseCod();
    else if (m === "offline") startRecording();
  };

  const afterBiometric = (m: PaymentMethod) => {
    setBiometricFor(null);
    if (m === "card") payWithCard();
    else openUpi(m as UpiApp);
  };

  const payWithCard = async () => {
    setMethod("card");
    if (wallet.balance < amount) {
      speak(language === "ta"
        ? `கார்டில் ₹${wallet.balance.toLocaleString("en-IN")} மட்டுமே உள்ளது. ரீசார்ஜ் செய்யுங்கள்.`
        : `Your card has only ₹${wallet.balance.toLocaleString("en-IN")}. Please recharge to continue.`);
      toast.error("Insufficient card balance — recharge to continue");
      return;
    }
    wallet.pay(amount, `Order ${orderId.slice(0, 8)}`);
    setSubmitting(true);
    if (!isLocal) {
      const { error } = await supabase.from("orders").update({
        payment_method: "card", payment_status: "paid",
      }).eq("id", orderId);
      if (error) { setSubmitting(false); return toast.error(error.message); }
    }
    setSubmitting(false);
    await speak(language === "ta"
      ? `விஷன் கார்டில் ₹${amount.toLocaleString("en-IN")} செலுத்தப்பட்டது. மீதி ₹${(wallet.balance - amount).toLocaleString("en-IN")}.`
      : `Paid ₹${amount.toLocaleString("en-IN")} with your Vision Card. Remaining balance ₹${(wallet.balance - amount).toLocaleString("en-IN")}.`);
    onSubmitted("card", "paid");
  };

  const doRecharge = () => {
    const amt = Number(rechargeAmount);
    if (!amt || amt <= 0) return toast.error("Enter a recharge amount");
    wallet.recharge(amt);
    speak(language === "ta"
      ? `₹${amt.toLocaleString("en-IN")} ரீசார்ஜ் ஆனது. புதிய இருப்பு ₹${(wallet.balance + amt).toLocaleString("en-IN")}.`
      : `Recharged ₹${amt.toLocaleString("en-IN")}. New balance ₹${(wallet.balance + amt).toLocaleString("en-IN")}.`);
    toast.success(`Card recharged with ₹${amt.toLocaleString("en-IN")}`);
  };

  const openUpi = (m: UpiApp) => {
    setMethod(m);
    const appName = UPI_APPS[m].label;
    speak(language === "ta"
      ? `${UPI_APPS[m].labelTa} ஐ திறக்கிறது. பணம் செலுத்திய பின் பரிவர்த்தனை ஐடி ஐ உள்ளிடுங்கள்.`
      : `Opening ${appName}. After paying, enter the transaction ID to confirm your order.`);
    const launched = launchUpiApp(m, amount, payeeName, orderId);
    if (!launched) {
      // Desktop fallback: show the upi link so it can be scanned/copied
      setDesktopUpi(`upi://pay?${buildUpiQuery(amount, payeeName, orderId)}`);
      toast.info("Open this UPI link on your phone to pay");
    }
  };



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

      {biometricFor && (
        <BiometricPrompt
          title={methodLabel(biometricFor)}
          amount={amount}
          onSuccess={() => afterBiometric(biometricFor)}
          onCancel={() => { setBiometricFor(null); speak(language === "ta" ? "ரத்து செய்யப்பட்டது." : "Cancelled."); }}
        />
      )}

      {!method && !pendingMethod && !biometricFor && (
        <>
          {/* Vision Card wallet */}
          <div className="quick-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-display uppercase tracking-wider text-quick flex items-center gap-1">
                <CreditCard className="w-3.5 h-3.5" /> {language === "ta" ? "விஷன் கார்டு" : "Vision Card"}
              </span>
              <span className="text-[11px] text-muted-foreground">{wallet.cardNumber}</span>
            </div>
            <p className="text-2xl font-display gradient-text">₹{wallet.balance.toLocaleString("en-IN")}</p>
            <div className="flex gap-2">
              <Button size="sm" onClick={() => requestConfirm("card")} disabled={wallet.balance < amount} className="flex-1">
                <Fingerprint className="w-4 h-4 mr-1" />
                {language === "ta" ? "கார்டில் செலுத்து" : "Pay with card"}
              </Button>
            </div>
            <div className="flex gap-2 items-center">
              <Input
                value={rechargeAmount}
                onChange={(e) => setRechargeAmount(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                aria-label={language === "ta" ? "ரீசார்ஜ் தொகை" : "Recharge amount"}
                className="h-9"
              />
              <Button size="sm" variant="secondary" onClick={doRecharge}>
                <PlusCircle className="w-4 h-4 mr-1" />
                {language === "ta" ? "ரீசார்ஜ்" : "Recharge"}
              </Button>
            </div>
            {wallet.balance < amount && (
              <p className="text-[11px] text-destructive">
                {language === "ta" ? "இருப்பு போதவில்லை — ரீசார்ஜ் செய்யுங்கள்." : "Insufficient balance — recharge to pay with the card."}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => requestConfirm("gpay")} className="quick-card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform">
              <Smartphone className="w-6 h-6 text-quick" />
              <span className="text-xs font-display text-foreground">{t("payGpay")}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Fingerprint className="w-3 h-3" /> {language === "ta" ? "கைரேகை" : "Fingerprint"}</span>
            </button>
            <button onClick={() => requestConfirm("phonepe")} className="quick-card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform">
              <Wallet className="w-6 h-6 text-quick" />
              <span className="text-xs font-display text-foreground">{t("payPhonepe")}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Fingerprint className="w-3 h-3" /> {language === "ta" ? "கைரேகை" : "Fingerprint"}</span>
            </button>
            <button onClick={() => requestConfirm("paytm")} className="quick-card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform">
              <Smartphone className="w-6 h-6 text-fresh" />
              <span className="text-xs font-display text-foreground">Paytm</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Fingerprint className="w-3 h-3" /> {language === "ta" ? "கைரேகை" : "Fingerprint"}</span>
            </button>
            <button onClick={() => requestConfirm("cod")} className="quick-card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform">
              <CircleDollarSign className="w-6 h-6 text-fresh" />
              <span className="text-xs font-display text-foreground">{t("payCash")}</span>
            </button>
            <button onClick={() => requestConfirm("offline")} className="quick-card p-4 flex flex-col items-center gap-2 hover:scale-[1.02] transition-transform col-span-2">
              <Video className="w-6 h-6 text-primary" />
              <span className="text-xs font-display text-foreground">{t("payOffline")}</span>
            </button>
          </div>
        </>
      )}


      {pendingMethod && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-xl p-4 space-y-3 border-2 border-primary/60 shadow-neon-lg"
          role="dialog"
          aria-live="assertive"
        >
          <div className="flex items-center gap-2 text-primary">
            <Volume2 className="w-4 h-4 animate-pulse" />
            <span className="text-xs font-display uppercase tracking-wider">
              {language === "ta" ? "உறுதிப்படுத்தவும்" : "Confirm payment method"}
            </span>
          </div>
          <p className="text-sm text-foreground">
            {language === "ta"
              ? `நீங்கள் தேர்ந்தெடுத்தது: `
              : `You selected: `}
            <span className="font-display text-primary text-glow">{methodLabel(pendingMethod)}</span>
          </p>
          <p className="text-2xl font-display gradient-text text-center">
            ₹{amount.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-muted-foreground text-center">
            {language === "ta"
              ? "உறுதி என்று சொல்லுங்கள் அல்லது கீழே அழுத்துங்கள்."
              : 'Say "Confirm" or press the button below to continue.'}
          </p>
          <div className="flex gap-2">
            <Button onClick={proceedAfterConfirm} className="flex-1">
              <CheckCircle2 className="w-4 h-4 mr-1" />
              {language === "ta" ? "உறுதி" : "Confirm"}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setPendingMethod(null);
                speak(language === "ta" ? "ரத்து செய்யப்பட்டது." : "Cancelled. Please choose a payment method.");
              }}
            >
              <XCircle className="w-4 h-4 mr-1" />
              {language === "ta" ? "ரத்து" : "Cancel"}
            </Button>
          </div>
          <button
            type="button"
            onClick={() => {
              const amt = `₹${amount.toLocaleString("en-IN")}`;
              speak(language === "ta"
                ? `${methodLabel(pendingMethod)} மூலம் ${amt}.`
                : `${methodLabel(pendingMethod)} for ${amt}.`);
            }}
            className="w-full text-[11px] text-primary/80 hover:text-primary underline"
          >
            <Volume2 className="w-3 h-3 inline mr-1" />
            {language === "ta" ? "மீண்டும் கேட்க" : "Read it back again"}
          </button>
        </motion.div>
      )}


      {(method === "gpay" || method === "phonepe") && (
        <div className="glass rounded-xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            {language === "ta"
              ? `${method === "gpay" ? "கூகுள் பே" : "போன் பே"} திறக்கப்பட்டது. பணம் செலுத்திய பிறகு, பரிவர்த்தனை ஐடி ஐ உள்ளிடுங்கள்.`
              : `${method === "gpay" ? "Google Pay" : "PhonePe"} should have opened. After paying, paste the UPI transaction ID below to confirm your order.`}
          </p>
          <Button
            variant="secondary"
            onClick={() => launchUpiApp(method as "gpay" | "phonepe", amount, payeeName, orderId)}
            className="w-full"
          >
            <Smartphone className="w-4 h-4 mr-1" /> Re-open {method === "gpay" ? "Google Pay" : "PhonePe"}
          </Button>
          {desktopUpi && (
            <p className="text-[11px] text-muted-foreground break-all">
              Desktop? Open this on your phone: <span className="text-primary">{desktopUpi}</span>
            </p>
          )}
          <Input placeholder="e.g. 412345678901" value={txnId} onChange={(e) => setTxnId(e.target.value)} maxLength={32} />
          <div className="flex gap-2">
            <Button onClick={submitUpi} disabled={submitting} className="flex-1">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
              Confirm payment
            </Button>
            <Button variant="outline" onClick={() => { setMethod(null); setTxnId(""); setDesktopUpi(null); }}>Back</Button>
          </div>
          {isLocal && (
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => {
                speak(language === "ta" ? "டெமோ பணம் உறுதி." : "Demo payment confirmed.");
                onSubmitted(method!, "paid");
              }}
            >
              {language === "ta" ? "டெமோவாக செலுத்தியதாக குறி" : "Mark as paid (Demo)"}
            </Button>
          )}
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
