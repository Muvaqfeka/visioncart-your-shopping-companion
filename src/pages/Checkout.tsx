import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, Mic, Phone, MapPin, Clock, Package, Truck, Home, Eye, Search, Loader2, ShieldCheck } from "lucide-react";
import { speak, useSpeechRecognition } from "@/hooks/useSpeech";
import { useCart } from "@/context/CartContext";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PaymentPanel, { type PaymentMethod } from "@/components/PaymentPanel";

type Step = "review" | "name" | "phone" | "calling" | "payment" | "confirm" | "done";

interface DeliveryTimelineItem { label: string; icon: React.ReactNode; time: string; }

function spellOutPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").split("").join(" ");
}

const DELIVERY_LABELS = ["placed", "packed", "out_for_delivery", "delivered"] as const;

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart, itemCount } = useCart();
  const { isListening, startListening } = useSpeechRecognition();
  const { language, t } = useLanguage();
  const [step, setStep] = useState<Step>("review");
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [callProgress, setCallProgress] = useState(0);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "awaiting_verification" | "paid" | "failed" | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<string>("placed");
  const started = useRef(false);

  // No login required — use existing session, else try anonymous sign-in, else local-only mode
  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) { setUserId(data.session.user.id); return; }
      try {
        const { data: anon } = await (supabase.auth as any).signInAnonymously?.();
        if (anon?.user) { setUserId(anon.user.id); return; }
      } catch (e) { console.log("anon sign-in unavailable", e); }
      // Local fallback — order completes without DB persistence
      setUserId(`local-${crypto.randomUUID()}`);
    })();
  }, []);

  const isLocalMode = !!userId && userId.startsWith("local-");

  // Realtime: track payment_status / delivery updates (skip in local mode)
  useEffect(() => {
    if (!orderId || isLocalMode) return;
    const ch = supabase
      .channel(`order-${orderId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${orderId}` }, (payload) => {
        const o = payload.new as any;
        setPaymentStatus(o.payment_status);
        setDeliveryStatus(o.delivery_status);
        if (o.payment_status === "paid") {
          speak(language === "ta" ? "உங்கள் பணம் சரிபார்க்கப்பட்டது. ஆர்டர் உறுதி." : "Your payment is verified. Order confirmed!");
        } else if (o.payment_status === "failed") {
          speak(language === "ta" ? "பணம் சரிபார்ப்பு தோல்வி. மீண்டும் முயற்சிக்கவும்." : "Payment verification failed. Please retry.");
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orderId, language, isLocalMode]);

  const askName = () => {
    setStep("name"); setStatus(t("sayYourName"));
    speak(language === "ta" ? "உங்கள் முழு பெயரைச் சொல்லுங்கள்." : "Please say your full name.").then(() => {
      startListening((text) => {
        setName(text);
        speak(language === "ta" ? `${text}. இப்போது உங்கள் தொலைபேசி எண்.` : `Got it, ${text}. Now your phone number.`).then(askPhone);
      });
    });
  };

  const askPhone = () => {
    setStep("phone"); setStatus(t("sayPhone"));
    startListening((text) => {
      setPhone(text);
      speak(language === "ta" ? `தொலைபேசி: ${spellOutPhone(text)}.` : `Phone number: ${spellOutPhone(text)}. Starting verification call.`)
        .then(() => simulateCall(text));
    });
  };

  const proceedWithTyped = () => {
    if (!name.trim() || !phone.trim()) { toast.error("Enter name and phone"); return; }
    speak(language === "ta" ? `பெயர்: ${name}. தொலைபேசி: ${spellOutPhone(phone)}.` : `Name ${name}, phone ${spellOutPhone(phone)}. Starting verification call.`)
      .then(() => simulateCall(phone));
  };

  const simulateCall = (phoneNum: string) => {
    setStep("calling"); setCallProgress(0);
    const stages = [
      { p: 20, msg: language === "ta" ? "டயல் செய்கிறது..." : "Dialing...", d: 800 },
      { p: 50, msg: language === "ta" ? "ரிங்... ரிங்..." : "Ringing...", d: 2200 },
      { p: 80, msg: language === "ta" ? "இணைக்கப்பட்டது!" : "Connected — verifying identity", d: 3800 },
      { p: 100, msg: language === "ta" ? "சரிபார்ப்பு முடிந்தது ✅" : "Verification complete ✅", d: 5200 },
    ];
    stages.forEach(({ p, msg, d }) => setTimeout(() => { setCallProgress(p); setStatus(`📞 ${msg}`); }, d));
    setTimeout(() => {
      speak(language === "ta" ? "உங்கள் டெலிவரி முகவரியைச் சொல்லுங்கள்." : "Now please say your delivery address.").then(() => {
        startListening((addr) => { setAddress(addr); goToPayment(addr); });
      });
    }, 6000);
  };

  const goToPayment = async (addr: string) => {
    if (!userId) return;
    // Local-only mode: skip DB writes, generate a local order id
    if (isLocalMode) {
      setOrderId(`local-${crypto.randomUUID()}`);
      setStep("payment");
      setStatus(t("choosePayment"));
      speak(language === "ta"
        ? `பணம் செலுத்தும் முறையை தேர்வு செய்யவும். மொத்தம் ${total.toLocaleString("en-IN")} ரூபாய்.`
        : `Choose a payment method. Total ${total.toLocaleString("en-IN")} rupees.`);
      return;
    }
    const { data, error } = await supabase.from("orders").insert({
      user_id: userId,
      customer_name: name,
      phone,
      address: addr,
      items: items.map((i) => ({ id: i.product.id, name: i.product.name, price: i.product.price, qty: i.quantity })),
      total,
      payment_method: "pending",
      payment_status: "pending",
    }).select().single();
    if (error || !data) { toast.error(error?.message ?? "Could not create order"); return; }
    setOrderId(data.id);
    setStep("payment");
    setStatus(t("choosePayment"));
    speak(language === "ta"
      ? `பணம் செலுத்தும் முறையை தேர்வு செய்யவும். மொத்தம் ${total.toLocaleString("en-IN")} ரூபாய்.`
      : `Choose a payment method. Total ${total.toLocaleString("en-IN")} rupees. UPI payments are verified by our worker after you submit the transaction ID.`);
  };

  const onPaymentSubmitted = (method: PaymentMethod, ps: "pending" | "awaiting_verification" | "paid") => {
    setPaymentMethod(method); setPaymentStatus(ps);
    setStep("done"); clearCart();
    const label = method === "gpay" ? "Google Pay" : method === "phonepe" ? "PhonePe" : method === "cod" ? "Cash on Delivery" : "Offline Pay";
    if (ps === "awaiting_verification") {
      speak(language === "ta"
        ? `${label} மூலம் சமர்ப்பிக்கப்பட்டது. வொர்க்கர் சரிபார்த்தபின் ஆர்டர் உறுதியாகும். ${t("trackingInstructions")}`
        : `${label} submitted. Your order will be confirmed after our worker verifies the payment. ${t("trackingInstructions")}`);
    } else {
      speak(language === "ta" ? `ஆர்டர் வைக்கப்பட்டது ${label} மூலம். ${t("trackingInstructions")}` : `Order placed with ${label}. ${t("trackingInstructions")}`);
    }
    listenForTrackingCommands();
  };

  const listenForTrackingCommands = () => {
    startListening((text) => {
      const l = text.toLowerCase();
      if (l.includes("where") || l.includes("track") || l.includes("status") || l.includes("எங்கே")) readOrderStatus();
      else if (l.includes("home") || l.includes("continue") || l.includes("முகப்பு")) speak(language === "ta" ? "முகப்புக்கு செல்கிறது." : "Going home.").then(() => navigate("/"));
      else listenForTrackingCommands();
    });
  };

  const readOrderStatus = () => {
    const statusMap: Record<string, string> = {
      placed: t("orderConfirmed"), packed: t("packed"), out_for_delivery: t("outForDelivery"), delivered: t("delivered"),
    };
    const payMsg = paymentStatus === "awaiting_verification"
      ? (language === "ta" ? "பணம் வொர்க்கர் சரிபார்ப்புக்காக காத்திருக்கிறது." : "Payment is awaiting worker verification.")
      : paymentStatus === "paid" ? (language === "ta" ? "பணம் சரிபார்க்கப்பட்டது." : "Payment verified.")
      : paymentStatus === "failed" ? (language === "ta" ? "பணம் தோல்வி." : "Payment failed.") : "";
    const msg = language === "ta"
      ? `${payMsg} டெலிவரி நிலை: ${statusMap[deliveryStatus]}.`
      : `${payMsg} Delivery status: ${statusMap[deliveryStatus]}.`;
    setStatus(`📦 ${statusMap[deliveryStatus]}`);
    speak(msg).then(() => listenForTrackingCommands());
  };

  const handleSingleBlink = () => {
    if (step === "review") askName();
    else if (step === "done") { setStatus("🎤 " + t("listening")); listenForTrackingCommands(); }
  };
  const handleDoubleBlink = () => {
    if (step === "done") readOrderStatus();
    else if (step === "review" && items.length > 0) {
      const names = items.map(i => `${i.product.name}, ${i.product.price.toLocaleString("en-IN")} ${t("rupees")}`).join(". ");
      speak(`${itemCount} ${t("items")}. ${names}. ${t("total")}: ${total.toLocaleString("en-IN")} ${t("rupees")}.`);
    }
  };

  const { videoRef } = useBlinkDetection({
    onSingleBlink: handleSingleBlink, onDoubleBlink: handleDoubleBlink, enabled: step !== "calling",
  });

  useEffect(() => {
    if (!started.current && userId) {
      started.current = true;
      if (items.length === 0) { speak(language === "ta" ? "கார்ட் காலியாக உள்ளது." : "Cart is empty. Going back.").then(() => navigate("/")); return; }
      const names = items.map((i) => `${i.product.name}`).join(", ");
      speak(language === "ta"
        ? `செக்அவுட். ${itemCount} பொருட்கள். மொத்தம் ${total.toLocaleString("en-IN")} ரூபாய். தொடர கண் சிமிட்டுங்கள்.`
        : `Welcome to checkout. ${itemCount} items: ${names}. Total ${total.toLocaleString("en-IN")} rupees. Blink once or press B to start.`);
      setStatus(language === "ta" ? "கார்ட்டை பாருங்கள், பிறகு தொடரவும்" : "Review your cart, then blink to proceed");
    }
  }, [items, itemCount, total, navigate, userId, language, t]);

  const steps: { key: Step; label: string }[] = [
    { key: "review", label: t("review") },
    { key: "name", label: t("name") },
    { key: "phone", label: t("phone") },
    { key: "calling", label: t("verify") },
    { key: "payment", label: t("payment") },
    { key: "done", label: t("done") },
  ];
  const stepIndex = steps.findIndex((s) => s.key === step);

  const timeline: DeliveryTimelineItem[] = [
    { label: t("orderConfirmed"), icon: <CheckCircle className="w-4 h-4" />, time: "" },
    { label: t("packed"), icon: <Package className="w-4 h-4" />, time: "" },
    { label: t("outForDelivery"), icon: <Truck className="w-4 h-4" />, time: "" },
    { label: t("delivered"), icon: <Home className="w-4 h-4" />, time: "" },
  ];
  const activeIdx = DELIVERY_LABELS.indexOf(deliveryStatus as any);

  return (
    <div className="min-h-screen aurora-bg">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <header className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/")} className="glass p-2 rounded-lg hover:shadow-neon transition-all">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="font-display text-xl font-bold gradient-text text-glow flex-1">{t("checkout")}</h1>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-glow shadow-neon">
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />
          </div>
        </header>

        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full transition-colors ${i <= stepIndex ? "bg-primary shadow-neon" : "bg-muted"}`} />
              <span className={`text-[10px] ${i <= stepIndex ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
          ))}
        </div>

        <motion.div key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-lg p-4 mb-6 text-center">
          {isListening && <Mic className="w-5 h-5 text-primary animate-pulse mx-auto mb-2" />}
          <p className="text-sm text-primary font-display text-glow">{status}</p>
        </motion.div>

        {step === "calling" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Phone className="w-5 h-5 text-primary" />
              <span className="text-sm font-display">{language === "ta" ? "📞 சரிபார்ப்பு அழைப்பு" : "📞 Verification Call"}</span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <motion.div className="h-full bg-primary rounded-full shadow-neon" animate={{ width: `${callProgress}%` }} transition={{ duration: 0.5 }} />
            </div>
          </motion.div>
        )}

        {step === "payment" && orderId && userId && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 mb-6">
            <PaymentPanel orderId={orderId} userId={userId} amount={total} isLocal={isLocalMode} onSubmitted={onPaymentSubmitted} />
          </motion.div>
        )}

        <AnimatePresence>
          {step !== "done" && items.length > 0 && (
            <motion.div exit={{ opacity: 0, height: 0 }} className="space-y-3 mb-6">
              {items.map((item) => (
                <motion.div key={item.product.id} className="glass rounded-lg p-4 flex items-center gap-3" whileHover={{ scale: 1.02 }}>
                  <img src={item.product.image} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.brand} · {language === "ta" ? "எண்" : "Qty"}: {item.quantity}</p>
                  </div>
                  <span className="font-display text-sm text-primary font-bold">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</span>
                </motion.div>
              ))}
              <div className="glass rounded-lg p-4 flex items-center justify-between">
                <span className="font-display text-sm text-muted-foreground">{t("total")}</span>
                <span className="font-display text-xl text-primary font-bold text-glow">₹{total.toLocaleString("en-IN")}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {(step === "review" || step === "name" || step === "phone") && items.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-lg p-4 mb-6 space-y-3">
            <h3 className="text-sm font-display text-foreground">{language === "ta" ? "📝 விவரங்கள்" : "📝 Your details"} <span className="text-muted-foreground text-xs">({t("orType")})</span></h3>
            <Input placeholder={t("enterName")} value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder={t("enterPhone")} value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
            <Button onClick={proceedWithTyped} className="w-full"><Phone className="w-4 h-4 mr-2" />{language === "ta" ? "சரிபார்ப்பு அழைப்பு தொடங்கு" : "Start Verification Call"}</Button>
          </motion.div>
        )}

        {address && step !== "done" && (
          <div className="glass rounded-lg p-3 mb-3 flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</span>
            <span className="text-foreground font-medium">{address}</span>
          </div>
        )}

        {step === "done" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.2 }}>
              {paymentStatus === "awaiting_verification" ? (
                <Loader2 className="w-16 h-16 text-primary mx-auto mb-4 animate-spin" />
              ) : paymentStatus === "paid" ? (
                <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
              ) : (
                <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
              )}
            </motion.div>
            <h2 className="font-display text-2xl font-bold gradient-text text-glow mb-1">{t("orderPlaced")}</h2>
            {paymentStatus === "awaiting_verification" && (
              <Badge variant="secondary" className="mb-2"><ShieldCheck className="w-3 h-3 mr-1" /> Awaiting worker verification</Badge>
            )}
            {paymentStatus === "paid" && <Badge className="mb-2">Payment verified ✓</Badge>}
            {paymentStatus === "failed" && <Badge variant="destructive" className="mb-2">Payment rejected — please retry</Badge>}
            <p className="text-muted-foreground mb-2">{t("orderProcessing")}</p>
            <p className="text-xs text-primary mb-6">
              {language === "ta" ? "🎤 'என் ஆர்டர் எங்கே' என்று சொல்லுங்கள்" : '🎤 Say "where is my order" to track'}
            </p>

            <div className="text-left max-w-sm mx-auto">
              <h3 className="font-display text-sm text-primary mb-4 text-center flex items-center justify-center gap-2">
                <Search className="w-4 h-4" /> {t("deliveryTimeline")}
              </h3>
              <div className="space-y-0">
                {timeline.map((item, i) => {
                  const done = i <= activeIdx;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${done ? "bg-primary text-primary-foreground shadow-neon" : "glass text-muted-foreground"}`}>{item.icon}</div>
                        {i < timeline.length - 1 && <div className={`w-0.5 h-10 ${done ? "bg-primary" : "bg-muted"}`} />}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-medium ${done ? "text-primary" : "text-muted-foreground"}`}>{item.label}</p>
                        {i === activeIdx && <p className="text-xs text-primary flex items-center gap-1"><Clock className="w-3 h-3" /> Current</p>}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col items-center gap-3">
              <Button onClick={readOrderStatus}><Search className="w-4 h-4 mr-1" /> {language === "ta" ? "என் ஆர்டர் எங்கே?" : "Where is my order?"}</Button>
              <Button variant="outline" onClick={() => navigate("/")}>{t("continueShopping")}</Button>
            </div>
          </motion.div>
        )}

        {step === "review" && items.length > 0 && (
          <div className="text-center mt-6 space-y-3">
            <Button onClick={askName}><Mic className="w-4 h-4 mr-2" />{t("startVoiceCheckout")}</Button>
            <p className="text-xs text-muted-foreground">{language === "ta" ? "அல்லது " : "or "}<kbd className="glass px-1.5 py-0.5 rounded text-primary">B</kbd> / <Eye className="w-3 h-3 inline" /></p>
          </div>
        )}
      </div>
    </div>
  );
}
