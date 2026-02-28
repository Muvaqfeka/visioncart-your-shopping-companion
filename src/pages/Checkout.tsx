import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ShoppingCart, CheckCircle, Mic } from "lucide-react";
import { speak, useSpeechRecognition } from "@/hooks/useSpeech";
import { useCart } from "@/context/CartContext";

type Step = "review" | "name" | "phone" | "confirm" | "done";

export default function Checkout() {
  const navigate = useNavigate();
  const { items, total, clearCart, itemCount } = useCart();
  const { isListening, startListening } = useSpeechRecognition();
  const [step, setStep] = useState<Step>("review");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
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
      confirmOrder(name, text);
    });
  };

  const confirmOrder = (n: string, p: string) => {
    setStep("confirm");
    const summary = `Order summary: ${itemCount} items, total ${total.toLocaleString("en-IN")} rupees. Name: ${n}. Phone: ${p}. Say confirm to place order, or cancel to go back.`;
    setStatus("Confirm your order");
    speak(summary).then(() => {
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
  };

  const placeOrder = () => {
    setStep("done");
    clearCart();
    setStatus("Order placed successfully! 🎉");
    speak(
      "Your order has been placed successfully! You will receive a confirmation call shortly. Thank you for shopping with Smart Vision Cart. Returning to home page."
    ).then(() => {
      setTimeout(() => navigate("/"), 2000);
    });
  };

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "b" || e.key === "B") {
        if (step === "review") askName();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [step]);

  const steps: { key: Step; label: string }[] = [
    { key: "review", label: "Review" },
    { key: "name", label: "Name" },
    { key: "phone", label: "Phone" },
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
          <h1 className="font-display text-xl font-bold text-foreground text-glow">Checkout</h1>
        </header>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8">
          {steps.map((s, i) => (
            <div key={s.key} className="flex-1 flex items-center gap-1">
              <div className={`h-1.5 flex-1 rounded-full transition-colors ${i <= stepIndex ? "bg-primary shadow-neon" : "bg-muted"}`} />
            </div>
          ))}
        </div>

        {/* Status */}
        <motion.div key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-lg p-4 mb-6 text-center">
          {isListening && <Mic className="w-5 h-5 text-primary animate-pulse mx-auto mb-2" />}
          <p className="text-sm text-primary font-display text-glow">{status}</p>
        </motion.div>

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

        {/* Done state */}
        {step === "done" && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-12">
            <CheckCircle className="w-20 h-20 text-primary mx-auto mb-4 shadow-neon" />
            <h2 className="font-display text-2xl font-bold text-foreground text-glow mb-2">Order Placed!</h2>
            <p className="text-muted-foreground">Returning to home...</p>
          </motion.div>
        )}

        {/* Action hint */}
        {step === "review" && items.length > 0 && (
          <div className="text-center mt-6 space-y-3">
            <button
              onClick={askName}
              className="glass px-6 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
            >
              <ShoppingCart className="w-4 h-4 inline mr-2" />
              Start Voice Checkout
            </button>
            <p className="text-xs text-muted-foreground">or press <kbd className="glass px-1.5 py-0.5 rounded text-primary">B</kbd></p>
          </div>
        )}

        {/* Confirm button */}
        {step === "confirm" && (
          <div className="text-center mt-6 space-y-3">
            <button
              onClick={placeOrder}
              className="glass px-8 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
            >
              <CheckCircle className="w-4 h-4 inline mr-2" />
              Confirm Order
            </button>
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
