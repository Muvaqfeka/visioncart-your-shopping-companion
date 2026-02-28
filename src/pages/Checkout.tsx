import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingCart, CheckCircle, Mic, Phone, MapPin, Clock, Package, Truck, Home, Eye } from "lucide-react";
import { speak, useSpeechRecognition } from "@/hooks/useSpeech";
import { useCart } from "@/context/CartContext";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";

type Step = "review" | "name" | "phone" | "calling" | "confirm" | "done";

interface DeliveryTimeline {
  label: string;
  icon: React.ReactNode;
  time: string;
  done: boolean;
}

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart, itemCount } = useCart();
  const { isListening, startListening } = useSpeechRecognition();
  const [step, setStep] = useState<Step>("review");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [callProgress, setCallProgress] = useState(0);
  const [deliveryTimeline, setDeliveryTimeline] = useState<DeliveryTimeline[]>([]);
  const started = useRef(false);

  const askName = () => {
    setStep("name");
    setStatus("Please say your full name.");
    speak("Please say your full name.").then(() => {
      startListening((text) => {
        setName(text);
        setStatus(`Name: ${text}`);
        speak(`I heard ${text}. Now, please say your phone number.`).then(askPhone);
      });
    });
  };

  const askPhone = () => {
    setStep("phone");
    setStatus("Please say your phone number.");
    startListening((text) => {
      setPhone(text);
      setStatus(`Phone: ${text}`);
      speak(`Phone number received: ${text}. Initiating verification call now.`).then(() => simulateCall(text));
    });
  };

  const simulateCall = (phoneNum: string) => {
    setStep("calling");
    setStatus(`📞 Calling ${phoneNum} for verification...`);
    setCallProgress(0);

    // Simulate call progress
    const stages = [
      { progress: 20, msg: "Dialing...", delay: 1000 },
      { progress: 40, msg: "Connected! Verifying identity...", delay: 2500 },
      { progress: 60, msg: "Asking for delivery address...", delay: 4000 },
      { progress: 80, msg: "Confirming payment mode...", delay: 5500 },
      { progress: 100, msg: "Verification complete!", delay: 7000 },
    ];

    stages.forEach(({ progress, msg, delay }) => {
      setTimeout(() => {
        setCallProgress(progress);
        setStatus(`📞 ${msg}`);
      }, delay);
    });

    // After call simulation, ask for address via voice
    setTimeout(() => {
      speak("Verification call complete. Please say your delivery address for confirmation.").then(() => {
        startListening((addressText) => {
          setAddress(addressText);
          setStatus(`Address: ${addressText}`);
          confirmOrder(name, phoneNum, addressText);
        });
      });
    }, 8000);
  };

  const confirmOrder = (n: string, p: string, addr: string) => {
    setStep("confirm");
    const summary = `Order summary: ${itemCount} items, total ${total.toLocaleString("en-IN")} rupees. Name: ${n}. Phone: ${p}. Delivery address: ${addr}. Double blink or say confirm to place order. Say cancel to go back.`;
    setStatus("Double blink or say Confirm to place order");
    speak(summary).then(() => {
      startListening((text) => {
        const lower = text.toLowerCase();
        if (lower.includes("confirm") || lower.includes("yes") || lower.includes("place")) {
          placeOrder();
        } else {
          setStatus("Order cancelled.");
          speak("Order cancelled. Going back to home.").then(() => navigate("/"));
        }
      });
    });
  };

  const placeOrder = () => {
    setStep("done");
    clearCart();
    setStatus("Order placed successfully! 🎉");

    // Generate delivery timeline
    const now = new Date();
    setDeliveryTimeline([
      { label: "Order Confirmed", icon: <CheckCircle className="w-4 h-4" />, time: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), done: true },
      { label: "Packed & Ready", icon: <Package className="w-4 h-4" />, time: new Date(now.getTime() + 2 * 3600000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), done: false },
      { label: "Out for Delivery", icon: <Truck className="w-4 h-4" />, time: new Date(now.getTime() + 5 * 3600000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), done: false },
      { label: "Delivered", icon: <Home className="w-4 h-4" />, time: new Date(now.getTime() + 8 * 3600000).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }), done: false },
    ]);

    speak(
      "Your order has been placed successfully! Estimated delivery in 8 hours. You will receive a confirmation call shortly. Thank you for shopping with Smart Vision Cart."
    );
  };

  // Blink detection for checkout
  const handleSingleBlink = () => {
    if (step === "review") {
      askName();
    } else if (step === "confirm") {
      setStatus("🎤 Listening...");
      speak("Listening.").then(() => {
        startListening((text) => {
          const lower = text.toLowerCase();
          if (lower.includes("confirm") || lower.includes("yes")) {
            placeOrder();
          } else {
            setStatus("Order cancelled.");
            speak("Order cancelled. Going back to home.").then(() => navigate("/"));
          }
        });
      });
    }
  };

  const handleDoubleBlink = () => {
    if (step === "confirm") {
      placeOrder();
    } else if (step === "review") {
      // Read cart
      if (items.length > 0) {
        const itemNames = items.map(i => `${i.product.name}, ${i.product.price.toLocaleString("en-IN")} rupees`).join(". ");
        speak(`You have ${itemCount} items. ${itemNames}. Total: ${total.toLocaleString("en-IN")} rupees.`);
      }
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
        speak("Your cart is empty. Going back to home.").then(() => navigate("/"));
        return;
      }
      const itemNames = items.map((i) => `${i.product.name}, ${i.product.price.toLocaleString("en-IN")} rupees`).join(". ");
      speak(
        `Welcome to checkout. You have ${itemCount} items in your cart. ${itemNames}. Total: ${total.toLocaleString("en-IN")} rupees. Blink once or press B to begin voice-guided checkout.`
      );
      setStatus("Review your cart, then blink to proceed");
    }
  }, [items, itemCount, total, navigate]);

  const steps: { key: Step; label: string }[] = [
    { key: "review", label: "Review" },
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
    { key: "calling", label: "Verify" },
    { key: "confirm", label: "Confirm" },
    { key: "done", label: "Done" },
  ];

  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-lg">
        <header className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/")} className="glass p-2 rounded-lg hover:shadow-neon transition-all">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h1 className="font-display text-xl font-bold text-foreground text-glow flex-1">Checkout</h1>
          {/* Mini camera */}
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3 mb-3">
              <Phone className="w-5 h-5 text-primary animate-pulse" />
              <span className="text-sm font-display text-foreground">Verification Call in Progress</span>
            </div>
            <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full shadow-neon"
                animate={{ width: `${callProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">{callProgress}% complete</p>
          </motion.div>
        )}

        {/* Cart items */}
        <AnimatePresence>
          {step !== "done" && items.length > 0 && (
            <motion.div exit={{ opacity: 0, height: 0 }} className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.product.id} className="glass rounded-lg p-4 flex items-center gap-3">
                  <img src={item.product.image} alt={item.product.name} className="w-12 h-12 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.brand} · Qty: {item.quantity}</p>
                  </div>
                  <span className="font-display text-sm text-primary font-bold">₹{(item.product.price * item.quantity).toLocaleString("en-IN")}</span>
                </div>
              ))}
              <div className="glass rounded-lg p-4 flex items-center justify-between">
                <span className="font-display text-sm text-muted-foreground">Total</span>
                <span className="font-display text-xl text-primary font-bold text-glow">₹{total.toLocaleString("en-IN")}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collected info */}
        {name && (
          <div className="glass rounded-lg p-3 mb-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="text-foreground font-medium">{name}</span>
          </div>
        )}
        {phone && (
          <div className="glass rounded-lg p-3 mb-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Phone</span>
            <span className="text-foreground font-medium">{phone}</span>
          </div>
        )}
        {address && (
          <div className="glass rounded-lg p-3 mb-3 flex justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" /> Address</span>
            <span className="text-foreground font-medium">{address}</span>
          </div>
        )}

        {/* Done state with delivery timeline */}
        {step === "done" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="font-display text-2xl font-bold text-foreground text-glow mb-2">Order Placed!</h2>
            <p className="text-muted-foreground mb-8">Your order is being processed</p>

            {/* Delivery Timeline */}
            {deliveryTimeline.length > 0 && (
              <div className="text-left max-w-sm mx-auto">
                <h3 className="font-display text-sm text-primary mb-4 text-center">📦 Delivery Timeline</h3>
                <div className="space-y-0">
                  {deliveryTimeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${item.done ? "bg-primary text-primary-foreground shadow-neon" : "glass text-muted-foreground"}`}>
                          {item.icon}
                        </div>
                        {i < deliveryTimeline.length - 1 && (
                          <div className={`w-0.5 h-10 ${item.done ? "bg-primary" : "bg-muted"}`} />
                        )}
                      </div>
                      {/* Content */}
                      <div className="pt-1">
                        <p className={`text-sm font-medium ${item.done ? "text-primary" : "text-muted-foreground"}`}>{item.label}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {item.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => navigate("/")}
              className="mt-8 glass px-6 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
            >
              Continue Shopping
            </button>
          </motion.div>
        )}

        {/* Action buttons */}
        {step === "review" && items.length > 0 && (
          <div className="text-center mt-6 space-y-3">
            <button
              onClick={askName}
              className="glass px-6 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Start Voice Checkout
            </button>
            <p className="text-xs text-muted-foreground">or blink once / press <kbd className="glass px-1.5 py-0.5 rounded text-primary">B</kbd></p>
          </div>
        )}

        {step === "confirm" && (
          <div className="text-center mt-6 space-y-3">
            <button
              onClick={placeOrder}
              className="glass px-8 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Confirm Order
            </button>
            <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
              <Eye className="w-3 h-3" /> Double blink to confirm
            </p>
            <button
              onClick={() => {
                setStatus("Order cancelled.");
                speak("Order cancelled. Going back to home.").then(() => navigate("/"));
              }}
              className="block mx-auto glass px-6 py-2 rounded-xl font-display text-xs text-muted-foreground hover:text-foreground transition-all"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
