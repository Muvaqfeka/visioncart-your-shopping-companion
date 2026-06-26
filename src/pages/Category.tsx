import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, Eye, ShoppingCart, Plus } from "lucide-react";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { speak, useSpeechRecognition, matchCommand, COMMAND_PHRASES } from "@/hooks/useSpeech";
import { getCategoryById, getProductsByCategory } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import ProductCard from "@/components/ProductCard";

export default function Category() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { addItem, items, total, itemCount } = useCart();
  const { isListening, interimText, startListening } = useSpeechRecognition();
  const { language, t } = useLanguage();
  const [activeIndex, setActiveIndex] = useState(0);
  const [status, setStatus] = useState("");
  const announced = useRef(false);
  const autoReadDone = useRef(false);
  // Voice-name selection stages: 0 = just announced name, 1 = details read, awaiting add confirm
  const namedStageRef = useRef<{ index: number | null; stage: 0 | 1 }>({ index: null, stage: 0 });

  const category = getCategoryById(categoryId || "");
  const products = getProductsByCategory(categoryId || "");

  const readProduct = (index: number) => {
    const p = products[index];
    if (!p) return;
    const text = language === "ta"
      ? `${index + 1} வது பொருள். ${p.name}, ${p.brand}. விலை: ${p.price.toLocaleString("en-IN")} ரூபாய். அம்சங்கள்: ${p.features.join(", ")}. ${p.available ? "கிடைக்கும்" : "தற்போது கிடைக்கவில்லை"}.`
      : `Product ${index + 1}. ${p.name} by ${p.brand}. Price: ${p.price.toLocaleString("en-IN")} rupees. Features: ${p.features.join(", ")}. ${p.available ? "Available" : "Currently out of stock"}.`;
    setStatus(`${language === "ta" ? "படிக்கிறது" : "Reading"}: ${p.name}`);
    return speak(text);
  };

  // Auto-read first product when entering category
  const autoReadProducts = async () => {
    if (autoReadDone.current || products.length === 0) return;
    autoReadDone.current = true;

    const introMsg = language === "ta"
      ? `நீங்கள் இப்போது ${category?.name} பக்கத்தில் இருக்கிறீர்கள். ${products.length} பொருட்கள் கிடைக்கும். முதல் பொருளைப் படிக்கிறேன்.`
      : `You are now in ${category?.name}. ${products.length} products available. Reading the first product.`;
    setStatus(`${category?.name} — ${products.length} ${t("products")}`);
    await speak(introMsg);
    await readProduct(0);

    const hint = language === "ta"
      ? "அடுத்த பொருளுக்கு ஒரு முறை கண் சிமிட்டி அடுத்தது என்று சொல்லுங்கள். கார்ட்டில் சேர் என்று சொல்லி சேர்க்கலாம். உதவி என்று சொல்லி அனைத்து கட்டளைகளையும் கேட்கலாம்."
      : "Blink once and say Next for the next product. Say Add to Cart to add this item. Say Help to hear all commands.";
    await speak(hint);
  };

  const readCart = () => {
    if (itemCount === 0) {
      const msg = language === "ta"
        ? "உங்கள் கார்ட் காலியாக உள்ளது. கார்ட்டில் சேர் என்று சொல்லி பொருளைச் சேர்க்கவும்."
        : "Your cart is empty. Say add to cart to add the current product.";
      speak(msg);
      setStatus(t("cartEmpty"));
      return;
    }
    const cartItems = items.map(i => `${i.product.name}, ${language === "ta" ? "எண்ணிக்கை" : "quantity"} ${i.quantity}, ${(i.product.price * i.quantity).toLocaleString("en-IN")} ${t("rupees")}`).join(". ");
    const text = language === "ta"
      ? `உங்கள் கார்ட்டில் ${itemCount} பொருட்கள் உள்ளன. ${cartItems}. ${t("total")}: ${total.toLocaleString("en-IN")} ரூபாய். செக்அவுட் என்று சொல்லுங்கள்.`
      : `You have ${itemCount} items in your cart. ${cartItems}. Total: ${total.toLocaleString("en-IN")} rupees. Say checkout to proceed.`;
    setStatus(`${t("cart")}: ${itemCount} ${t("items")} — ₹${total.toLocaleString("en-IN")}`);
    speak(text);
  };

  // Find product by name from voice
  const findProductByName = (text: string) => {
    const lower = text.toLowerCase();
    return products.findIndex(p => lower.includes(p.name.toLowerCase()) || lower.includes(p.brand.toLowerCase()));
  };

  const helpSpeech = () => {
    const msg = language === "ta"
      ? "கட்டளைகள்: அடுத்தது, முந்தையது, பொருளைப் படி, கார்ட்டில் சேர், கார்ட் பார், கார்ட்டுக்கு செல், செக்அவுட், திரும்பு, உதவி."
      : "Commands: Next, Previous, Read Product, Add to Cart, View Cart, Go to Cart, Checkout, Go Back, Help. Just speak naturally.";
    speak(msg);
  };

  const handleVoiceCommand = (text: string) => {
    const lower = text.toLowerCase();

    // Help
    if (matchCommand(text, COMMAND_PHRASES.help, 0.5).matched) {
      setStatus(language === "ta" ? "உதவி கட்டளைகள்" : "Help — available commands");
      helpSpeech();
      return;
    }

    // Go to cart / View cart navigation (check BEFORE add to cart, more specific)
    if (matchCommand(text, COMMAND_PHRASES.goToCart, 0.5).matched) {
      setStatus(language === "ta" ? "கார்ட்டுக்கு செல்கிறது..." : "Going to cart...");
      speak(language === "ta" ? "கார்ட் பக்கத்திற்கு செல்கிறது." : "Going to cart page.").then(() => navigate("/checkout"));
      return;
    }

    // Read cart aloud
    if (matchCommand(text, COMMAND_PHRASES.readCart, 0.5).matched) {
      readCart();
      return;
    }

    // Add to cart
    if (matchCommand(text, COMMAND_PHRASES.addToCart, 0.5).matched) {
      const p = products[activeIndex];
      if (p) {
        addItem(p);
        const msg = language === "ta"
          ? `கார்ட்டில் சேர்க்கப்பட்டது. ${p.name}. இப்போது ${itemCount + 1} பொருட்கள் உள்ளன. கார்ட்டுக்கு செல்ல "go to cart" என்று சொல்லுங்கள்.`
          : `Added to cart. ${p.name}. You now have ${itemCount + 1} items. Say "go to cart" to checkout, or "next" to continue.`;
        setStatus(`✅ ${t("addedToCart")}: ${p.name}`);
        speak(msg);
      }
      return;
    }

    // Next / Previous
    if (matchCommand(text, COMMAND_PHRASES.next, 0.5).matched) {
      const next = (activeIndex + 1) % products.length;
      setActiveIndex(next);
      readProduct(next);
      return;
    }
    if (matchCommand(text, COMMAND_PHRASES.previous, 0.5).matched) {
      const prev = (activeIndex - 1 + products.length) % products.length;
      setActiveIndex(prev);
      readProduct(prev);
      return;
    }

    // Read by product name → announce + await double-blink for details
    const productIndex = findProductByName(text);
    if (productIndex >= 0) {
      setActiveIndex(productIndex);
      namedStageRef.current = { index: productIndex, stage: 0 };
      const p = products[productIndex];
      setStatus(`🔎 ${p.name}`);
      speak(language === "ta"
        ? `${p.name}, ${p.brand}. விளக்கம் மற்றும் விலை கேட்க இரு முறை கண் சிமிட்டுங்கள்.`
        : `${p.name} by ${p.brand}. Double blink to hear the description and price.`);
      return;
    }

    // Read current
    if (lower.includes("read product") || lower.includes("read this") || lower.includes("படி")) {
      readProduct(activeIndex);
      return;
    }

    // Checkout / Home
    if (matchCommand(text, COMMAND_PHRASES.checkout, 0.5).matched) {
      speak(language === "ta" ? "செக்அவுட்டுக்கு செல்கிறது." : "Proceeding to checkout.").then(() => navigate("/checkout"));
      return;
    }
    if (lower.includes("home") || lower.includes("go back") || lower.includes("திரும்பு")) {
      speak(language === "ta" ? "முகப்பு பக்கத்திற்கு திரும்புகிறது." : "Going back to home.").then(() => navigate("/"));
      return;
    }

    // Unrecognized — echo so user can correct
    setStatus(`${language === "ta" ? "கேட்டது" : "Heard"}: "${text}"`);
    speak(language === "ta"
      ? `"${text}" புரியவில்லை. அடுத்தது, கார்ட்டில் சேர், கார்ட்டுக்கு செல், அல்லது உதவி என்று சொல்லுங்கள்.`
      : `I heard "${text}" but did not recognize it. Try: Next, Add to Cart, Go to Cart, or Help.`
    );
  };

  const handleSingleBlink = () => {
    setStatus("🎤 " + t("listening"));
    speak(language === "ta" ? "கேட்கிறேன்." : "Listening.").then(() => {
      startListening({ onResult: handleVoiceCommand, retries: 2 });
    });
  };

  const handleDoubleBlink = () => {
    const named = namedStageRef.current;
    if (named.index !== null) {
      const p = products[named.index];
      if (!p) { namedStageRef.current = { index: null, stage: 0 }; return; }
      if (named.stage === 0) {
        // Stage 1: read full description + price, then prompt for add
        namedStageRef.current = { index: named.index, stage: 1 };
        const msg = language === "ta"
          ? `${p.name}. விலை ${p.price.toLocaleString("en-IN")} ரூபாய். அம்சங்கள்: ${p.features.join(", ")}. கார்ட்டில் சேர்க்க இரு முறை கண் சிமிட்டுங்கள்.`
          : `${p.name}. Price ${p.price.toLocaleString("en-IN")} rupees. Features: ${p.features.join(", ")}. Double blink again to add to cart, or say go to cart.`;
        setStatus(`📖 ${p.name}`);
        speak(msg);
        return;
      }
      if (named.stage === 1) {
        // Stage 2: add to cart
        addItem(p);
        namedStageRef.current = { index: null, stage: 0 };
        const msg = language === "ta"
          ? `${p.name} கார்ட்டில் சேர்க்கப்பட்டது. கார்ட்டுக்கு செல்ல "go to cart" என்று சொல்லுங்கள்.`
          : `${p.name} added to cart. Say "go to cart" to checkout, or blink to continue shopping.`;
        setStatus(`✅ ${p.name} ${t("addedToCart")}!`);
        speak(msg);
        return;
      }
    }
    // Default double-blink: read current product fully
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
        autoReadProducts();
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
            <p className="text-xs text-muted-foreground">{products.length} {t("products")}</p>
          </div>
          {itemCount > 0 && (
            <button
              onClick={() => navigate("/checkout")}
              className="glass px-3 py-2 rounded-lg text-primary font-display text-xs shadow-neon flex items-center gap-1"
            >
              <ShoppingCart className="w-4 h-4" />
              {itemCount}
            </button>
          )}
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
                  setStatus(`✅ ${t("addedToCart")}: ${product.name}`);
                  speak(language === "ta" ? `கார்ட்டில் சேர்க்கப்பட்டது. ${product.name}.` : `Added to cart. ${product.name}.`);
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
                setStatus(`✅ ${p.name} ${t("addedToCart")}!`);
                speak(language === "ta" ? `${p.name} கார்ட்டில் சேர்க்கப்பட்டது.` : `${p.name} added to cart.`);
              }
            }}
            className="glass px-5 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            {t("addToCart")}
          </button>
          <button
            onClick={() => readCart()}
            className="glass px-5 py-3 rounded-xl font-display text-sm text-muted-foreground hover:text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {t("viewCart")}
          </button>
          <button
            onClick={() => navigate("/checkout")}
            className="glass px-5 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {t("goToCart")}
          </button>
          <button
            onClick={() => {
              speak(language === "ta" ? "செக்அவுட்டுக்கு செல்கிறது." : "Proceeding to checkout.").then(() => navigate("/checkout"));
            }}
            className="glass px-5 py-3 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all flex items-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            {t("checkout")}
          </button>
        </div>

        {/* Controls hint */}
        <div className="mt-6 text-center space-y-1 text-xs text-muted-foreground">
          <p>👁 {t("singleBlink")} → {language === "ta" ? "குரல் கட்டளை" : "Voice command"} · 👁👁 {t("doubleBlink")} → {t("readProduct")}</p>
          <p>🎤 "{t("next")}" · "{t("addToCart")}" · "{t("viewCart")}" · "{t("readProduct")}" · "{t("help")}" · "{t("goToCart")}"</p>
        </div>
      </div>
    </div>
  );
}
