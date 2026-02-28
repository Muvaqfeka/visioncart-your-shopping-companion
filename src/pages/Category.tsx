import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, Eye, ShoppingCart, Plus } from "lucide-react";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { speak, useSpeechRecognition } from "@/hooks/useSpeech";
import { getCategoryById, getProductsByCategory } from "@/data/products";
import { useCart } from "@/context/CartContext";
import ProductCard from "@/components/ProductCard";

export default function Category() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { addItem, items, total, itemCount } = useCart();
  const { isListening, startListening } = useSpeechRecognition();
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState("");
  const announced = useRef(false);

  const category = getCategoryById(categoryId || "");
  const products = getProductsByCategory(categoryId || "");

  const readProduct = (index: number) => {
    const p = products[index];
    if (!p) return;
    const text = `${p.name} by ${p.brand}. Price: ${p.price.toLocaleString("en-IN")} rupees. Features: ${p.features.join(", ")}. ${p.available ? "Available" : "Currently out of stock"}.`;
    setStatus(`Reading: ${p.name}`);
    speak(text);
  };

  const readCart = () => {
    if (itemCount === 0) {
      speak("Your cart is empty. Say add to cart to add the current product.");
      setStatus("Cart is empty");
      return;
    }
    const cartItems = items.map(i => `${i.product.name}, quantity ${i.quantity}, ${(i.product.price * i.quantity).toLocaleString("en-IN")} rupees`).join(". ");
    const text = `You have ${itemCount} items in your cart. ${cartItems}. Total: ${total.toLocaleString("en-IN")} rupees. Say checkout to proceed.`;
    setStatus(`Cart: ${itemCount} items — ₹${total.toLocaleString("en-IN")}`);
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
    } else if (lower.includes("add to cart") || lower.includes("take order") || lower.includes("add") || lower.includes("order")) {
      const p = products[activeIndex];
      if (p) {
        addItem(p);
        setStatus(`✅ ${p.name} added to cart!`);
        speak(`${p.name} added to cart. You now have ${itemCount + 1} items. Say next to continue, add to cart for another, or checkout to pay. Blink once to give a voice command.`);
      }
    } else if (lower.includes("view cart") || lower.includes("read cart") || lower.includes("read my cart") || lower.includes("my cart") || lower.includes("show cart")) {
      readCart();
    } else if (lower.includes("checkout") || lower.includes("pay") || lower.includes("cart")) {
      speak("Proceeding to checkout.").then(() => navigate("/checkout"));
    } else if (lower.includes("home") || lower.includes("go back")) {
      speak("Going back to home.").then(() => navigate("/"));
    } else {
      setStatus("Command not recognized. Try: Next, Add to Cart, View Cart, Checkout");
      speak("Sorry, I didn't understand. You can say Next, Add to Cart, View Cart, or Checkout.");
    }
  };

  const handleSingleBlink = () => {
    setStatus("🎤 Listening...");
    speak("Listening.").then(() => {
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
        speak(`You are now inside the ${category.name} page. ${products.length} products available. Blink once for voice commands like Next, Add to Cart, or View Cart. Double blink to hear product details.`);
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
          {/* Cart badge */}
          {itemCount > 0 && (
            <button
              onClick={() => navigate("/checkout")}
              className="glass px-3 py-2 rounded-lg text-primary font-display text-xs shadow-neon flex items-center gap-1"
            >
              <ShoppingCart className="w-4 h-4" />
              {itemCount}
            </button>
          )}
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
            <div key={product.id} className="relative">
              <ProductCard product={product} isActive={i === activeIndex} index={i} />
              <button
                onClick={() => {
                  addItem(product);
                  setStatus(`✅ ${product.name} added!`);
                  speak(`${product.name} added to cart.`);
                }}
                className="absolute bottom-2 right-2 glass p-2 rounded-full shadow-neon hover:shadow-neon-lg transition-all z-10"
              >
                <Plus className="w-4 h-4 text-primary" />
              </button>
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              const p = products[activeIndex];
              if (p) {
                addItem(p);
                setStatus(`✅ ${p.name} added!`);
                speak(`${p.name} added to cart.`);
              }
            }}
            className="glass px-5 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add to Cart
          </button>
          <button
            onClick={() => readCart()}
            className="glass px-5 py-3 rounded-xl font-display text-sm text-muted-foreground hover:text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            View Cart
          </button>
          <button
            onClick={() => {
              speak("Proceeding to checkout.").then(() => navigate("/checkout"));
            }}
            className="glass px-5 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            Checkout
          </button>
        </div>

        {/* Controls hint */}
        <div className="mt-6 text-center space-y-1 text-xs text-muted-foreground">
          <p>👁 Blink once → Voice command · 👁👁 Double blink → Read product</p>
          <p>🎤 "Next" · "Add to cart" · "View cart" · "Checkout" · "Go back"</p>
        </div>
      </div>
    </div>
  );
}
