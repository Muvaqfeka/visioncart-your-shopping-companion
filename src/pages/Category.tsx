import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, Eye } from "lucide-react";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { speak, useSpeechRecognition } from "@/hooks/useSpeech";
import { getCategoryById, getProductsByCategory } from "@/data/products";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";

export default function Category() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { addItem } = useCart();
  const { isListening, startListening } = useSpeechRecognition();
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState("");
  const announced = useRef(false);

  const category = getCategoryById(categoryId || "");
  const products = getProductsByCategory(categoryId || "");

  const readProduct = (index: number) => {
    const p = products[index];
    if (!p) return;
    const text = `${p.name} by ${p.brand}. Price: $${p.price.toFixed(2)}. Features: ${p.features.join(", ")}. ${p.available ? "Available" : "Currently out of stock"}.`;
    setStatus(`Reading: ${p.name}`);
    speak(text);
  };

  const handleVoiceCommand = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("next")) {
      const next = (activeIndex + 1) % products.length;
      setActiveIndex(next);
      readProduct(next);
    } else if (lower.includes("previous") || lower.includes("back")) {
      const prev = (activeIndex - 1 + products.length) % products.length;
      setActiveIndex(prev);
      readProduct(prev);
    } else if (lower.includes("take order") || lower.includes("add") || lower.includes("order")) {
      const p = products[activeIndex];
      if (p) {
        addItem(p);
        speak(`${p.name} added to cart. Say next to continue, or take order for another product. Blink once to give a voice command.`).then(() => {
          setStatus("Product added to cart!");
        });
      }
    } else if (lower.includes("checkout") || lower.includes("pay") || lower.includes("cart")) {
      speak("Proceeding to checkout.").then(() => navigate("/checkout"));
    } else if (lower.includes("home") || lower.includes("go back")) {
      speak("Going back to home.").then(() => navigate("/"));
    } else {
      setStatus("Command not recognized. Try: Next, Take Order, Checkout");
      speak("Sorry, I didn't understand. You can say Next, Take Order, or Checkout.");
    }
  };

  const handleSingleBlink = () => {
    setStatus("Listening...");
    speak("Listening for your command.").then(() => {
      startListening(handleVoiceCommand);
    });
  };

  const handleDoubleBlink = () => {
    readProduct(activeIndex);
  };

  const { videoRef, isActive } = useBlinkDetection({
    onSingleBlink: handleSingleBlink,
    onDoubleBlink: handleDoubleBlink,
  });

  useEffect(() => {
    if (!announced.current && category) {
      announced.current = true;
      setTimeout(() => {
        speak(`You are now inside the ${category.name} page. ${products.length} products available. Double blink to hear product details, or single blink for voice commands.`);
        setStatus(`${category.name} — ${products.length} products`);
      }, 500);
    }
  }, [category, products.length]);

  if (!category) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Category not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <header className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/")} className="glass p-2 rounded-lg hover:shadow-neon transition-all">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="font-display text-xl font-bold text-foreground text-glow">
              {category.emoji} {category.name}
            </h1>
            <p className="text-xs text-muted-foreground">{products.length} products</p>
          </div>
          {/* Mini camera */}
          <div className="w-12 h-12 rounded-full overflow-hidden border border-glow shadow-neon">
            <video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted />
          </div>
        </header>

        {/* Status */}
        <motion.div key={status} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-lg p-3 mb-6 flex items-center gap-3">
          {isListening ? <Mic className="w-4 h-4 text-primary animate-pulse" /> : <Eye className="w-4 h-4 text-primary" />}
          <span className="text-sm text-primary font-display">{status}</span>
        </motion.div>

        {/* Products */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((product, i) => (
            <ProductCard key={product.id} product={product} isActive={i === activeIndex} index={i} />
          ))}
        </div>

        {/* Controls hint */}
        <div className="mt-8 text-center space-y-1 text-xs text-muted-foreground">
          <p>👁 Blink once → Voice command · 👁👁 Double blink → Read product details</p>
          <p>🎤 "Next" · "Take order" · "Checkout" · "Go back"</p>
        </div>
      </div>
    </div>
  );
}
