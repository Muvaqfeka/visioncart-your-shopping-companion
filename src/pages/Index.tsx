import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Eye, Camera, Volume2 } from "lucide-react";
import heroImage from "@/assets/hero-eye.jpg";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { speak, useSpeechRecognition } from "@/hooks/useSpeech";
import { categories, findCategoryByVoice } from "@/data/products";
import { useCart } from "@/context/CartContext";

export default function Index() {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { isListening, startListening } = useSpeechRecognition();
  const [status, setStatus] = useState("Initializing...");
  const welcomed = useRef(false);

  const handleSingleBlink = () => {
    setStatus("Listening for your command...");
    speak("Listening. Please say a category name. Electronics, Groceries, or Personal Care.").then(() => {
      startListening((text) => {
        const cat = findCategoryByVoice(text);
        if (cat) {
          setStatus(`Navigating to ${cat.name}...`);
          speak(`Going to ${cat.name}`).then(() => navigate(`/category/${cat.id}`));
        } else {
          setStatus("Category not found. Blink again to retry.");
          speak("Sorry, I did not recognize that category. Please blink and try again.");
        }
      });
    });
  };

  const handleDoubleBlink = () => {
    speak(
      "Welcome to Smart Vision Cart. Blink once to activate voice search and say a category name. Available categories are: Electronics, Groceries, and Personal Care. You can also press the B key as a blink shortcut."
    );
  };

  const { videoRef, isActive, mediaPipeLoaded } = useBlinkDetection({
    onSingleBlink: handleSingleBlink,
    onDoubleBlink: handleDoubleBlink,
  });

  useEffect(() => {
    if (!welcomed.current) {
      welcomed.current = true;
      setTimeout(() => {
        setStatus("Ready — Blink once to start voice search");
        speak("Welcome to Smart Vision Cart. Blink once to search, or double blink for help. Press B on your keyboard as a shortcut.");
      }, 1500);
    }
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Hero background */}
      <div className="absolute inset-0 z-0">
        <img src={heroImage} alt="" className="w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-3">
            <Eye className="w-8 h-8 text-primary animate-neon-pulse" />
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground text-glow">
              Smart Vision Cart
            </h1>
          </div>
          {itemCount > 0 && (
            <button
              onClick={() => navigate("/checkout")}
              className="glass px-4 py-2 rounded-lg text-primary font-display text-sm shadow-neon"
            >
              Cart ({itemCount})
            </button>
          )}
        </header>

        {/* Camera Feed + Status */}
        <div className="flex flex-col items-center gap-6 mb-12">
          <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-full overflow-hidden border-2 border-glow shadow-neon-lg">
            <video
              ref={videoRef}
              className="w-full h-full object-cover scale-x-[-1]"
              playsInline
              muted
            />
            {/* Scan overlay */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
              <div className="w-full h-1 bg-primary/40 animate-scan" />
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Camera, label: "Camera", active: isActive },
              { icon: Eye, label: "Blink AI", active: mediaPipeLoaded },
              { icon: Mic, label: "Voice", active: isListening },
              { icon: Volume2, label: "Audio", active: true },
            ].map(({ icon: Icon, label, active }) => (
              <div key={label} className="glass flex items-center gap-2 px-3 py-1.5 rounded-full text-xs">
                <span className={`w-2 h-2 rounded-full ${active ? "bg-primary shadow-neon" : "bg-muted-foreground/40"}`} />
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>

          {/* Status text */}
          <motion.p
            key={status}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-primary font-display text-sm text-center text-glow max-w-md"
          >
            {status}
          </motion.p>

          {isListening && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="relative"
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center shadow-neon-lg">
                <Mic className="w-8 h-8 text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary/40 animate-pulse-ring" />
            </motion.div>
          )}
        </div>

        {/* Category Cards */}
        <section>
          <h2 className="font-display text-lg text-muted-foreground mb-4 text-center">
            Browse Categories
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                onClick={() => {
                  speak(`Going to ${cat.name}`).then(() => navigate(`/category/${cat.id}`));
                }}
                className="glass rounded-xl p-6 text-center transition-all duration-300 hover:shadow-neon-lg hover:scale-105 group"
              >
                <span className="text-5xl block mb-3 group-hover:animate-float">{cat.emoji}</span>
                <h3 className="font-display text-sm font-semibold text-foreground mb-1">{cat.name}</h3>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Instructions */}
        <div className="mt-12 text-center space-y-2 text-xs text-muted-foreground max-w-lg mx-auto">
          <p>👁 <strong className="text-foreground">Single Blink</strong> or press <kbd className="glass px-1.5 py-0.5 rounded text-primary">B</kbd> — Activate voice search</p>
          <p>👁👁 <strong className="text-foreground">Double Blink</strong> or press <kbd className="glass px-1.5 py-0.5 rounded text-primary">B</kbd> twice — Hear instructions</p>
          <p>🎤 Say <strong className="text-foreground">"Next"</strong> to browse · <strong className="text-foreground">"Take order"</strong> to add to cart</p>
        </div>
      </div>
    </div>
  );
}
