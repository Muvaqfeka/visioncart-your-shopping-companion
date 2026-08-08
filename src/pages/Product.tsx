import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Mic, Eye, ShoppingCart, Plus, PackageCheck, Volume2, Timer, BadgeIndianRupee } from "lucide-react";
import { getProductById } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { speak, useSpeechRecognition, matchCommand, COMMAND_PHRASES } from "@/hooks/useSpeech";
import { Button } from "@/components/ui/button";

export default function Product() {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { addItem, itemCount } = useCart();
  const { language, t } = useLanguage();
  const { isListening, interimText, startListening } = useSpeechRecognition();
  const [status, setStatus] = useState("");
  const announced = useRef(false);
  const pendingAdd = useRef(false);

  const product = getProductById(productId || "");

  const stockLine = () => {
    if (!product) return "";
    const left = product.stock ?? 0;
    if (!product.available || left === 0) return language === "ta" ? "தற்போது கையிருப்பு இல்லை" : "Out of stock";
    return language === "ta" ? `கையிருப்பில் ${left} உள்ளது` : `In stock, ${left} units left`;
  };

  const readProduct = () => {
    if (!product) return;
    const text = language === "ta"
      ? `${product.tamilName || product.name}. ${product.brand}. ${product.unit ? product.unit + "." : ""} விலை ${product.price.toLocaleString("en-IN")} ரூபாய். ${stockLine()}. அம்சங்கள்: ${product.features.join(", ")}. கார்ட்டில் சேர்க்க இரண்டு முறை கண் சிமிட்டுங்கள் அல்லது கார்ட்டில் சேர் என்று சொல்லுங்கள்.`
      : `${product.name} by ${product.brand}. ${product.unit ? product.unit + "." : ""} Price ${product.price.toLocaleString("en-IN")} rupees. ${stockLine()}. Features: ${product.features.join(", ")}. Double blink or say Add to cart to add this item.`;
    setStatus(`${language === "ta" ? "படிக்கிறது" : "Reading"}: ${product.name}`);
    return speak(text);
  };

  const doAdd = async () => {
    if (!product) return;
    addItem(product);
    pendingAdd.current = false;
    setStatus(language === "ta" ? "கார்ட்டில் சேர்க்கப்பட்டது" : "Added to cart");
    await speak(
      language === "ta"
        ? `${product.tamilName || product.name} கார்ட்டில் சேர்க்கப்பட்டது. கார்ட்டுக்கு செல் என்று சொல்லுங்கள்.`
        : `${product.name} added to cart. Say Go to cart to check out.`
    );
  };

  const readHelp = () =>
    speak(
      language === "ta"
        ? "கிடைக்கும் கட்டளைகள்: பொருளை படி, கார்ட்டில் சேர், கார்ட்டுக்கு செல், செக்அவுட், உதவி."
        : "Available commands: Read product, Add to cart, Go to cart, Checkout, Help."
    );

  const handleVoice = (text: string) => {
    const lower = text.toLowerCase();
    setStatus(`${language === "ta" ? "கேட்டது" : "Heard"}: ${text}`);

    if (matchCommand(lower, COMMAND_PHRASES.help).matched) return readHelp();
    if (matchCommand(lower, COMMAND_PHRASES.goToCart).matched || matchCommand(lower, COMMAND_PHRASES.checkout).matched) {
      speak(language === "ta" ? "கார்ட் பக்கத்திற்கு செல்கிறேன்." : "Opening your cart.");
      navigate("/checkout");
      return;
    }
    if (matchCommand(lower, COMMAND_PHRASES.addToCart).matched) return doAdd();
    if (lower.includes("read") || lower.includes("படி") || lower.includes("detail")) return readProduct();

    speak(language === "ta" ? "மீண்டும் சொல்லுங்கள். உதவி என்று சொல்லலாம்." : "Please repeat. You can say Help.");
  };

  const listen = () => {
    speak(language === "ta" ? "கேட்கிறேன்." : "Listening.");
    startListening({ onResult: (text) => handleVoice(text) });
  };

  const { videoRef, isActive } = useBlinkDetection({
    onSingleBlink: () => listen(),
    onDoubleBlink: () => doAdd(),
  });

  useEffect(() => {
    if (announced.current || !product) return;
    announced.current = true;
    readProduct();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product, language]);

  if (!product) {
    return (
      <main className="min-h-screen aurora-bg flex flex-col items-center justify-center gap-4 p-6">
        <h1 className="font-display text-xl text-foreground">
          {language === "ta" ? "பொருள் கிடைக்கவில்லை" : "Product not found"}
        </h1>
        <Button onClick={() => navigate("/")}>{language === "ta" ? "முகப்பு" : "Back home"}</Button>
      </main>
    );
  }

  const inStock = product.available && (product.stock ?? 0) > 0;

  return (
    <main className="min-h-screen aurora-bg pb-32">
      <video ref={videoRef} className="hidden" playsInline muted />

      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/70 border-b border-border">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 rounded-full quick-pill">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="font-display text-sm text-foreground flex-1 truncate">{product.name}</span>
          <button onClick={() => navigate("/checkout")} className="relative p-2 rounded-full quick-pill" aria-label="Cart">
            <ShoppingCart className="w-4 h-4" />
            {itemCount > 0 && (
              <span className="absolute -top-1 -right-1 quick-badge text-[10px] font-display rounded-full w-5 h-5 grid place-items-center">
                {itemCount}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {(isListening || interimText || status) && (
          <div className="quick-strip rounded-xl px-3 py-2 text-xs text-foreground" aria-live="polite">
            {isListening && <span className="text-fresh font-display mr-1">● {language === "ta" ? "கேட்கிறது" : "Hearing"}:</span>}
            {interimText || status}
          </div>
        )}

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="quick-card overflow-hidden">
          <div className="relative aspect-square bg-muted">
            <img src={product.image} alt={`${product.name} — ${product.brand}`} className="w-full h-full object-cover" loading="lazy" />
            <span className="absolute top-3 left-3 quick-badge text-[11px] font-display px-2.5 py-1 rounded-full flex items-center gap-1">
              <Timer className="w-3 h-3" /> 10 min
            </span>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h1 className="font-display text-lg text-foreground leading-tight">{product.name}</h1>
                <p className="text-xs text-muted-foreground">{product.brand}{product.unit ? ` · ${product.unit}` : ""}</p>
                {product.tamilName && <p className="text-xs text-muted-foreground">{product.tamilName}</p>}
              </div>
              <span className="text-2xl font-display gradient-text whitespace-nowrap flex items-center">
                <BadgeIndianRupee className="w-5 h-5 mr-0.5 text-quick" />
                {product.price.toLocaleString("en-IN")}
              </span>
            </div>

            <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full ${inStock ? "quick-pill" : "bg-destructive/15 text-destructive border border-destructive/40"}`}>
              <PackageCheck className="w-3 h-3" /> {stockLine()}
            </span>

            <ul className="grid grid-cols-2 gap-2 pt-1">
              {product.features.map((f) => (
                <li key={f} className="text-[11px] text-muted-foreground bg-secondary/60 rounded-lg px-2 py-1.5">{f}</li>
              ))}
            </ul>

            <button onClick={readProduct} className="w-full text-xs text-quick hover:underline flex items-center justify-center gap-1 pt-1">
              <Volume2 className="w-3.5 h-3.5" /> {language === "ta" ? "விவரங்களை கேட்க" : "Read details aloud"}
            </button>
          </div>
        </motion.div>

        <div className="quick-card p-3 text-[11px] text-muted-foreground space-y-1">
          <p className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-quick" /> {language === "ta" ? "ஒரு முறை சிமிட்டு = மைக் ஆன்" : "Single blink = turn on microphone"}</p>
          <p className="flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-fresh" /> {language === "ta" ? "இரண்டு முறை சிமிட்டு = கார்ட்டில் சேர்" : "Double blink = add to cart"}</p>
          {!isActive && <p className="text-muted-foreground/70">{language === "ta" ? "கேமரா இல்லை — கீழே உள்ள பொத்தான்களை பயன்படுத்தவும்." : "Camera off — use the buttons below."}</p>}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-20 backdrop-blur-xl bg-background/85 border-t border-border">
        <div className="max-w-md mx-auto px-4 py-3 grid grid-cols-3 gap-2">
          <Button variant="secondary" onClick={listen} className="flex-col h-auto py-2 gap-0.5">
            <Mic className={`w-4 h-4 ${isListening ? "text-fresh animate-pulse" : ""}`} />
            <span className="text-[10px]">{language === "ta" ? "பேசு" : "Speak"}</span>
          </Button>
          <Button onClick={doAdd} disabled={!inStock} className="flex-col h-auto py-2 gap-0.5">
            <Plus className="w-4 h-4" />
            <span className="text-[10px]">{t("addToCart") || "Add"}</span>
          </Button>
          <Button variant="outline" onClick={() => navigate("/checkout")} className="flex-col h-auto py-2 gap-0.5">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-[10px]">{language === "ta" ? "கார்ட்" : "Cart"}</span>
          </Button>
        </div>
      </div>
    </main>
  );
}
