import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle, Mic, Phone, MapPin, Clock, Package, Truck, Home, Eye, Search } from "lucide-react";
import { speak, useSpeechRecognition } from "@/hooks/useSpeech";
import { useCart } from "@/context/CartContext";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { useLanguage } from "@/context/LanguageContext";
import { Input } from "@/components/ui/input";
import PaymentPanel, { type PaymentMethod } from "@/components/PaymentPanel";

type Step = "review" | "name" | "phone" | "calling" | "payment" | "confirm" | "done";

interface DeliveryTimelineItem {
  label: string;
  icon: React.ReactNode;
  time: string;
  done: boolean;
}

// Helper: read phone number digit by digit
function spellOutPhone(phone: string): string {
  return phone.replace(/[^0-9]/g, "").split("").join(" ");
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart, itemCount } = useCart();
  const { isListening, startListening } = useSpeechRecognition();
  const { language, t } = useLanguage();
  const [step, setStep] = useState<Step>("review");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [callProgress, setCallProgress] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [deliveryTimeline, setDeliveryTimeline] = useState<DeliveryTimelineItem[]>([]);
  const [activeTimelineIndex, setActiveTimelineIndex] = useState(0);
  const started = useRef(false);

  const askName = () => {
    setStep("name");
    setStatus(t("sayYourName"));
    speak(language === "ta" ? "உங்கள் முழு பெயரைச் சொல்லுங்கள், அல்லது கீழே தட்டச்சு செய்யுங்கள்." : "Please say your full name, or type it in the box below.").then(() => {
      startListening((text) => {
        setName(text);
        setStatus(`${t("name")}: ${text}`);
        speak(language === "ta"
          ? `உங்கள் பெயர் ${text} என்று பதிவு செய்யப்பட்டது. நன்றி! இப்போது உங்கள் தொலைபேசி எண்ணைச் சொல்லுங்கள்.`
          : `Your name is ${text}. Got it! Now, please say your phone number.`
        ).then(askPhone);
      });
    });
  };

  const askPhone = () => {
    setStep("phone");
    setStatus(t("sayPhone"));
    startListening((text) => {
      setPhone(text);
      const spelled = spellOutPhone(text);
      setStatus(`${t("phone")}: ${text}`);
      speak(language === "ta"
        ? `தொலைபேசி எண் பெறப்பட்டது: ${spelled}. சரிபார்ப்பு அழைப்பை தொடங்குகிறது.`
        : `Phone number received: ${spelled}. Initiating verification call now.`
      ).then(() => simulateCall(text));
    });
  };

  const proceedWithTypedInfo = () => {
    if (!name.trim() || !phone.trim()) {
      speak(language === "ta" ? "பெயர் மற்றும் தொலைபேசி எண் தேவை." : "Please enter both name and phone number.");
      return;
    }
    const spelled = spellOutPhone(phone);
    setStatus(language === "ta" ? "சரிபார்ப்பு அழைப்பை தொடங்குகிறது..." : "Starting verification call...");
    speak(language === "ta"
      ? `பெயர்: ${name}. தொலைபேசி எண்: ${spelled}. சரிபார்ப்பு அழைப்பை தொடங்குகிறது.`
      : `Name: ${name}. Phone number: ${spelled}. Initiating verification call.`
    ).then(() => simulateCall(phone));
  };

  const simulateCall = (phoneNum: string) => {
    setStep("calling");
    const spelled = spellOutPhone(phoneNum);
    setStatus(`📞 ${language === "ta" ? `${phoneNum} ஐ அழைக்கிறது...` : `Calling ${phoneNum} for verification...`}`);
    setCallProgress(0);

    const stages = [
      { progress: 15, msg: language === "ta" ? `${spelled} க்கு டயல் செய்கிறது...` : `Dialing ${spelled}...`, delay: 1000 },
      { progress: 30, msg: language === "ta" ? "ரிங்... ரிங்... ரிங்..." : "Ringing... Ringing... Ringing...", delay: 2500 },
      { progress: 50, msg: language === "ta" ? "இணைக்கப்பட்டது! அடையாளத்தை சரிபார்க்கிறது..." : "Connected! Verifying your identity...", delay: 4000 },
      { progress: 70, msg: language === "ta" ? "டெலிவரி முகவரியைக் கேட்கிறது..." : "Asking for delivery address...", delay: 5500 },
      { progress: 85, msg: language === "ta" ? "பணம் செலுத்தும் முறை: கேஷ் ஆன் டெலிவரி உறுதி" : "Payment mode: Cash on Delivery confirmed", delay: 7000 },
      { progress: 100, msg: language === "ta" ? "சரிபார்ப்பு முடிந்தது! ✅" : "Verification complete! ✅", delay: 8500 },
    ];

    stages.forEach(({ progress, msg, delay }) => {
      setTimeout(() => {
        setCallProgress(progress);
        setStatus(`📞 ${msg}`);
      }, delay);
    });

    setTimeout(() => {
      speak(language === "ta"
        ? "சரிபார்ப்பு அழைப்பு வெற்றிகரமாக முடிந்தது. இப்போது உங்கள் டெலிவரி முகவரியைச் சொல்லுங்கள்."
        : "Verification call completed successfully. Now, please say your delivery address."
      ).then(() => {
        startListening((addressText) => {
          setAddress(addressText);
          setStatus(`${language === "ta" ? "முகவரி" : "Address"}: ${addressText}`);
          goToPayment();
        });
      });
    }, 9500);
  };

  const goToPayment = () => {
    setStep("payment");
    setStatus(t("choosePayment"));
    speak(language === "ta"
      ? `பணம் செலுத்தும் முறையை தேர்ந்தெடுங்கள். மொத்தம் ${total.toLocaleString("en-IN")} ரூபாய். ${t("paymentInstructions")}`
      : `Please choose a payment method. Total ${total.toLocaleString("en-IN")} rupees. ${t("paymentInstructions")}`
    ).then(() => {
      startListening((text) => {
        const lower = text.toLowerCase();
        if (lower.includes("gpay") || lower.includes("g pay") || lower.includes("google")) handlePaymentChosen("gpay");
        else if (lower.includes("phonepe") || lower.includes("phone pay") || lower.includes("phone pe")) handlePaymentChosen("phonepe");
        else if (lower.includes("cash") || lower.includes("கேஷ்") || lower.includes("பணம்")) handlePaymentChosen("cod");
        else if (lower.includes("offline") || lower.includes("ஆஃப்லைன்")) speak(language === "ta" ? "ஆஃப்லைன் பணம் தேர்ந்தெடுக்கப்பட்டது. வொர்க்கர் வீடியோ பதிவு செய்வார்." : "Offline pay selected. The worker will record the verification video.");
      });
    });
  };

  const handlePaymentChosen = (method: PaymentMethod, _meta?: { videoDataUrl?: string }) => {
    setPaymentMethod(method);
    const label = method === "gpay" ? "Google Pay" : method === "phonepe" ? "PhonePe" : method === "cod" ? (language === "ta" ? "கேஷ் ஆன் டெலிவரி" : "Cash on Delivery") : (language === "ta" ? "ஆஃப்லைன் பணம்" : "Offline Pay");
    speak(language === "ta" ? `${label} தேர்ந்தெடுக்கப்பட்டது. ஆர்டர் உறுதிசெய்ய தயார்.` : `${label} selected. Ready to confirm your order.`).then(() => confirmOrder(name, phone, address));
  };


  const confirmOrder = (n: string, p: string, addr: string) => {
    setStep("confirm");
    const spelled = spellOutPhone(p);
    const summary = language === "ta"
      ? `ஆர்டர் சுருக்கம்: ${itemCount} பொருட்கள், மொத்தம் ${total.toLocaleString("en-IN")} ரூபாய். பெயர்: ${n}. தொலைபேசி: ${spelled}. டெலிவரி முகவரி: ${addr}. ஆர்டர் வைக்க இரு முறை கண் சிமிட்டுங்கள் அல்லது உறுதி என்று சொல்லுங்கள்.`
      : `Order summary: ${itemCount} items, total ${total.toLocaleString("en-IN")} rupees. Name: ${n}. Phone: ${spelled}. Delivery address: ${addr}. Double blink or say confirm to place your order. Say cancel to go back.`;
    setStatus(language === "ta" ? "ஆர்டர் உறுதிசெய்ய இரு முறை கண் சிமிட்டுங்கள்" : "Double blink or say Confirm to place order");
    speak(summary).then(() => {
      startListening((text) => {
        const lower = text.toLowerCase();
        if (lower.includes("confirm") || lower.includes("yes") || lower.includes("place") || lower.includes("உறுதி") || lower.includes("ஆம்")) {
          placeOrder();
        } else {
          setStatus(language === "ta" ? "ஆர்டர் ரத்து." : "Order cancelled.");
          speak(language === "ta" ? "ஆர்டர் ரத்து. முகப்பு பக்கத்திற்கு திரும்புகிறது." : "Order cancelled. Going back to home.").then(() => navigate("/"));
        }
      });
    });
  };

  const placeOrder = () => {
    setStep("done");
    clearCart();
    setStatus(language === "ta" ? "🎉 ஆர்டர் வெற்றிகரமாக வைக்கப்பட்டது!" : "🎉 Order placed successfully!");

    const now = new Date();
    const timeline: DeliveryTimelineItem[] = [
      { label: t("orderConfirmed"), icon: <CheckCircle className="w-4 h-4" />, time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), done: true },
      { label: t("packed"), icon: <Package className="w-4 h-4" />, time: new Date(now.getTime() + 2 * 3600000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), done: false },
      { label: t("outForDelivery"), icon: <Truck className="w-4 h-4" />, time: new Date(now.getTime() + 5 * 3600000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), done: false },
      { label: t("delivered"), icon: <Home className="w-4 h-4" />, time: new Date(now.getTime() + 8 * 3600000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), done: false },
    ];
    setDeliveryTimeline(timeline);
    setActiveTimelineIndex(0);

    const methodSpoken = paymentMethod === "gpay" ? "Google Pay" : paymentMethod === "phonepe" ? "PhonePe" : paymentMethod === "offline" ? (language === "ta" ? "ஆஃப்லைன் பணம்" : "Offline Pay") : (language === "ta" ? "கேஷ் ஆன் டெலிவரி" : "Cash on Delivery");
    speak(
      language === "ta"
        ? `வாழ்த்துக்கள்! உங்கள் ஆர்டர் ${methodSpoken} மூலம் வைக்கப்பட்டது. தற்போதைய நிலை: ஆர்டர் உறுதி. சுமார் 8 மணி நேரத்தில் டெலிவரி. ${t("trackingInstructions")}`
        : `Congratulations! Your order has been placed using ${methodSpoken}. Current status: Order Confirmed at ${timeline[0].time}. Estimated delivery in about 8 hours by ${timeline[3].time}. ${t("trackingInstructions")} Thank you for shopping with Smart Vision Cart!`
    ).then(() => {
      listenForTrackingCommands();
    });
  };


  const listenForTrackingCommands = () => {
    startListening((text) => {
      const lower = text.toLowerCase();
      if (lower.includes("where") || lower.includes("order") || lower.includes("track") || lower.includes("status") || lower.includes("எங்கே") || lower.includes("நிலை")) {
        readOrderStatus();
      } else if (lower.includes("home") || lower.includes("shop") || lower.includes("continue") || lower.includes("முகப்பு")) {
        speak(language === "ta" ? "முகப்பு பக்கத்திற்கு செல்கிறது." : "Going to home page.").then(() => navigate("/"));
      } else {
        speak(language === "ta"
          ? "உங்கள் ஆர்டர் நிலையை அறிய 'என் ஆர்டர் எங்கே' என்று சொல்லுங்கள், அல்லது 'ஷாப்பிங் தொடர' என்று சொல்லுங்கள்."
          : "Say 'where is my order' to track your order, or say 'continue shopping' to go back."
        ).then(() => listenForTrackingCommands());
      }
    });
  };

  const readOrderStatus = () => {
    const currentStep = deliveryTimeline[activeTimelineIndex];
    const nextStep = deliveryTimeline[activeTimelineIndex + 1];
    const msg = language === "ta"
      ? `உங்கள் ஆர்டர் நிலை: ${currentStep?.label}, ${currentStep?.time} மணிக்கு. ${nextStep ? `அடுத்த நிலை: ${nextStep.label}, சுமார் ${nextStep.time} மணிக்கு எதிர்பார்க்கப்படுகிறது.` : "உங்கள் பொருள் டெலிவர் செய்யப்பட்டது!"}`
      : `Your order status: ${currentStep?.label} at ${currentStep?.time}. ${nextStep ? `Next step: ${nextStep.label}, expected around ${nextStep.time}.` : "Your item has been delivered!"}`;
    setStatus(`📦 ${currentStep?.label}`);
    speak(msg).then(() => listenForTrackingCommands());
  };

  const handleSingleBlink = () => {
    if (step === "review") {
      askName();
    } else if (step === "confirm") {
      setStatus("🎤 " + t("listening"));
      speak(language === "ta" ? "கேட்கிறேன்." : "Listening.").then(() => {
        startListening((text) => {
          const lower = text.toLowerCase();
          if (lower.includes("confirm") || lower.includes("yes") || lower.includes("உறுதி")) {
            placeOrder();
          } else {
            setStatus(language === "ta" ? "ஆர்டர் ரத்து." : "Order cancelled.");
            speak(language === "ta" ? "ஆர்டர் ரத்து." : "Order cancelled. Going back to home.").then(() => navigate("/"));
          }
        });
      });
    } else if (step === "done") {
      setStatus("🎤 " + t("listening"));
      speak(language === "ta" ? "கேட்கிறேன். என் ஆர்டர் எங்கே என்று சொல்லுங்கள்." : "Listening. Say where is my order to track it.").then(() => {
        listenForTrackingCommands();
      });
    }
  };

  const handleDoubleBlink = () => {
    if (step === "confirm") {
      placeOrder();
    } else if (step === "review") {
      if (items.length > 0) {
        const itemNames = items.map(i => `${i.product.name}, ${i.product.price.toLocaleString("en-IN")} ${t("rupees")}`).join(". ");
        speak(`${language === "ta" ? "உங்களிடம்" : "You have"} ${itemCount} ${t("items")}. ${itemNames}. ${t("total")}: ${total.toLocaleString("en-IN")} ${t("rupees")}.`);
      }
    } else if (step === "done") {
      readOrderStatus();
    }
  };

  const { videoRef } = useBlinkDetection({
    onSingleBlink: handleSingleBlink,
    onDoubleBlink: handleDoubleBlink,
    enabled: step !== "calling",
  });

  useEffect(() => {
    if (!started.current) {
      started.current = true;
      if (items.length === 0) {
        speak(language === "ta" ? "உங்கள் கார்ட் காலியாக உள்ளது. முகப்புக்கு திரும்புகிறது." : "Your cart is empty. Going back to home.").then(() => navigate("/"));
        return;
      }
      const itemNames = items.map((i) => `${i.product.name}, ${i.product.price.toLocaleString("en-IN")} ${t("rupees")}`).join(". ");
      speak(
        language === "ta"
          ? `செக்அவுட்டுக்கு வரவேற்கிறோம். உங்கள் கார்ட்டில் ${itemCount} பொருட்கள் உள்ளன. ${itemNames}. மொத்தம்: ${total.toLocaleString("en-IN")} ரூபாய். குரல் செக்அவுட் தொடங்க கண் சிமிட்டுங்கள் அல்லது கீழே உங்கள் பெயர் மற்றும் எண்ணை தட்டச்சு செய்யுங்கள்.`
          : `Welcome to checkout! You have ${itemCount} items in your cart. ${itemNames}. Total: ${total.toLocaleString("en-IN")} rupees. Blink once or press B to begin voice checkout. Or you can type your name and phone number below.`
      );
      setStatus(language === "ta" ? "கார்ட்டை பாருங்கள், பிறகு தொடரவும்" : "Review your cart, then blink to proceed or type details below");
    }
  }, [items, itemCount, total, navigate]);

  const steps: { key: Step; label: string }[] = [
    { key: "review", label: t("review") },
    { key: "name", label: t("name") },
    { key: "phone", label: t("phone") },
    { key: "calling", label: t("verify") },
    { key: "payment", label: t("payment") },
    { key: "confirm", label: t("confirm") },
    { key: "done", label: t("done") },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <header className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/")} className="glass p-2 rounded-lg hover:shadow-neon transition-all">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground text-glow flex-1">{t("checkout")}</h1>
          <div className="w-10 h-10 rounded-full overflow-hidden border border-glow shadow-neon">
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />
          </div>
        </header>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex-1 flex flex-col items-center gap-1">
              <div className={`h-1.5 w-full rounded-full transition-colors ${i <= stepIndex ? "bg-primary shadow-neon" : "bg-muted"}`} />
              <span className={`text-[10px] ${i <= stepIndex ? "text-primary" : "text-muted-foreground"}`}>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Status */}
        <motion.div key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-lg p-4 mb-6 text-center">
          {isListening && <Mic className="w-5 h-5 text-primary animate-pulse mx-auto mb-2" />}
          <p className="text-sm text-primary font-display text-glow">{status}</p>
        </motion.div>

        {/* Call progress */}
        {step === "calling" && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <Phone className="w-5 h-5 text-primary" />
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-ping" />
              </div>
              <span className="text-sm font-display text-foreground">
                {language === "ta" ? "📞 சரிபார்ப்பு அழைப்பு நடைபெறுகிறது" : "📞 Verification Call in Progress"}
              </span>
            </div>
            <div className="w-full h-3 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full shadow-neon"
                animate={{ width: `${callProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">{callProgress}% {language === "ta" ? "முடிந்தது" : "complete"}</p>
        )}

        {/* Payment selection */}
        {step === "payment" && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-xl p-4 mb-6">
            <PaymentPanel amount={total} payeeName="Smart Vision Cart" onConfirm={handlePaymentChosen} />
          </motion.div>
        )}



        {/* Cart items */}
        <AnimatePresence>
          {step !== "done" && items.length > 0 && (
            <motion.div exit={{ opacity: 0, height: 0 }} className="space-y-3 mb-6">
              {items.map((item) => (
                <motion.div key={item.product.id} className="glass rounded-lg p-4 flex items-center gap-3" whileHover={{ scale: 1.02 }}>
                  <img src={item.product.image} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.brand} · {language === "ta" ? "எண்ணிக்கை" : "Qty"}: {item.quantity}</p>
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

        {/* Manual input for name and phone */}
        {(step === "review" || step === "name" || step === "phone") && items.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass rounded-lg p-4 mb-6 space-y-3">
            <h3 className="text-sm font-display text-foreground mb-2">
              {language === "ta" ? "📝 விவரங்களை தட்டச்சு செய்யுங்கள்" : "📝 Type your details"} <span className="text-muted-foreground text-xs">({t("orType")})</span>
            </h3>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("name")}</label>
              <Input
                placeholder={t("enterName")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-muted/50 border-border"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t("phone")}</label>
              <Input
                placeholder={t("enterPhone")}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                type="tel"
                className="bg-muted/50 border-border"
              />
            </div>
            <button
              onClick={proceedWithTypedInfo}
              className="w-full glass px-4 py-2.5 rounded-lg font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center justify-center gap-2"
            >
              <Phone className="w-4 h-4" />
              {language === "ta" ? "சரிபார்ப்பு அழைப்பை தொடங்கு" : "Start Verification Call"}
            </button>
          </motion.div>
        )}

        {/* Collected info */}
        {name && step !== "review" && step !== "name" && step !== "phone" && (
          <div className="glass rounded-lg p-3 mb-3 flex justify-between text-sm">
            <span className="text-muted-foreground">{t("name")}</span>
            <span className="text-foreground font-medium">{name}</span>
          </div>
        )}
        {phone && step !== "review" && step !== "name" && step !== "phone" && (
          <div className="glass rounded-lg p-3 mb-3 flex justify-between text-sm">
            <span className="text-muted-foreground">{t("phone")}</span>
            <span className="text-foreground font-medium">{phone}</span>
          </div>
        )}
        {address && (
          <div className="glass rounded-lg p-3 mb-3 flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> {language === "ta" ? "முகவரி" : "Address"}</span>
            <span className="text-foreground font-medium">{address}</span>
          </div>
        )}

        {/* Done state with delivery timeline */}
        {step === "done" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4" />
            </motion.div>
            <h2 className="font-display text-2xl font-bold text-foreground text-glow mb-1">{t("orderPlaced")}</h2>
            <p className="text-muted-foreground mb-2">{t("orderProcessing")}</p>
            <p className="text-xs text-primary mb-6">
              {language === "ta"
                ? "🎤 'என் ஆர்டர் எங்கே' என்று சொல்லுங்கள்"
                : '🎤 Say "where is my order" to track'}
            </p>

            {deliveryTimeline.length > 0 && (
              <div className="text-left max-w-sm mx-auto">
                <h3 className="font-display text-sm text-primary mb-4 text-center flex items-center justify-center gap-2">
                  <Search className="w-4 h-4" />
                  {t("deliveryTimeline")}
                </h3>
                <div className="space-y-0">
                  {deliveryTimeline.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.2 }}
                      className="flex items-start gap-3"
                    >
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${item.done ? "bg-primary text-primary-foreground shadow-neon" : "glass text-muted-foreground"}`}>
                          {item.icon}
                        </div>
                        {i < deliveryTimeline.length - 1 && (
                          <div className={`w-0.5 h-10 ${item.done ? "bg-primary" : "bg-muted"}`} />
                        )}
                      </div>
                      <div className="pt-1.5">
                        <p className={`text-sm font-medium ${item.done ? "text-primary" : "text-muted-foreground"}`}>{item.label}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.time}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              <button
                onClick={() => readOrderStatus()}
                className="glass px-6 py-2.5 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center gap-2"
              >
                <Search className="w-4 h-4" />
                {language === "ta" ? "என் ஆர்டர் எங்கே?" : "Where is my order?"}
              </button>
              <button
                onClick={() => navigate("/")}
                className="glass px-6 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
              >
                {t("continueShopping")}
              </button>
            </div>
          </motion.div>
        )}

        {/* Action buttons */}
        {step === "review" && items.length > 0 && (
          <div className="text-center mt-6 space-y-3">
            <button
              onClick={askName}
              className="glass px-6 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
            >
              <Mic className="w-4 h-4 inline mr-2" />
              {t("startVoiceCheckout")}
            </button>
            <p className="text-xs text-muted-foreground">{language === "ta" ? "அல்லது கண் சிமிட்டுங்கள் /" : "or blink once /"} <kbd className="glass px-1.5 py-0.5 rounded text-primary">B</kbd></p>
          </div>
        )}

        {step === "confirm" && (
          <div className="text-center mt-6 space-y-3">
            <button
              onClick={placeOrder}
              className="glass px-8 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              {t("confirmOrder")}
            </button>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" /> {language === "ta" ? "உறுதிசெய்ய இரு முறை கண் சிமிட்டுங்கள்" : "Double blink to confirm"}
            </p>
            <button
              onClick={() => {
                setStatus(language === "ta" ? "ஆர்டர் ரத்து." : "Order cancelled.");
                speak(language === "ta" ? "ஆர்டர் ரத்து." : "Order cancelled. Going back to home.").then(() => navigate("/"));
              }}
              className="block mx-auto glass px-6 py-2 rounded-xl font-display text-xs text-muted-foreground hover:text-foreground transition-all"
            >
              {t("cancel")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
