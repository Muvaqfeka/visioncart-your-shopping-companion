import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Eye, Camera, Volume2, Globe, ShoppingCart, Sparkles, Sliders, Activity, Download, Wand2, Search, ChevronRight, Timer, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductCard from "@/components/ProductCard";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { speak, useSpeechRecognition, matchCommand, COMMAND_PHRASES } from "@/hooks/useSpeech";
import { categories, findCategoryByVoice, findProductByVoice, getProductsByCategory } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import CameraTroubleshoot from "@/components/CameraTroubleshoot";
import BlinkCalibration from "@/components/BlinkCalibration";
import BlinkDebugOverlay from "@/components/BlinkDebugOverlay";
import BlinkTestWizard from "@/components/BlinkTestWizard";

export default function Index() {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { isListening, interimText, startListening } = useSpeechRecognition();
  const { language, setLanguage, t } = useLanguage();
  const [status, setStatus] = useState("Initializing...");
  const welcomed = useRef(false);
  const [languageChosen, setLanguageChosen] = useState(false);
  const [showWelcomeCard, setShowWelcomeCard] = useState(true);

  const [searchText, setSearchText] = useState("");

  const taName = (id: string) => ({
    essentials: "அத்தியாவசிய பொருட்கள்",
    electronics: "எலக்ட்ரானிக்ஸ்",
    groceries: "மளிகை பொருட்கள்",
    "personal-care": "அழகு பொருட்கள்",
    medicines: "மருந்துகள்",
    clothing: "ஆடைகள்",
    home: "வீட்டு பொருட்கள்",
  } as Record<string, string>)[id] || id;

  const readAllCategories = () => {
    return categories.map((c) => (language === "ta" ? taName(c.id) : c.name)).join(", ");
  };

  /** Resolve a spoken/typed product name and open its detail page. */
  const runProductSearch = (term: string) => {
    const found = findProductByVoice(term);
    if (found) {
      setStatus(`${language === "ta" ? "கண்டுபிடிக்கப்பட்டது" : "Found"}: ${found.name}`);
      speak(
        language === "ta"
          ? `${found.tamilName || found.name} கண்டுபிடிக்கப்பட்டது. விவரங்களைத் திறக்கிறேன்.`
          : `Found ${found.name}. Opening the product details.`
      ).then(() => navigate(`/product/${found.id}`));
      return true;
    }
    setStatus(`${language === "ta" ? "கிடைக்கவில்லை" : "No match"}: ${term}`);
    speak(
      language === "ta"
        ? `மன்னிக்கவும், ${term} கிடைக்கவில்லை. பால், ரொட்டி, முட்டை போன்ற பொருளின் பெயரைச் சொல்லுங்கள்.`
        : `Sorry, I could not find ${term}. Try a product name like milk, bread, or eggs.`
    );
    return false;
  };

  /** Voice search: ask for a product name, then open it. */
  const promptProductSearch = () => {
    setStatus("🎤 " + (language === "ta" ? "பொருளின் பெயரைச் சொல்லுங்கள்" : "Say the product name"));
    speak(
      language === "ta"
        ? "எந்தப் பொருளைத் தேட வேண்டும்? உதாரணமாக பால், ரொட்டி, முட்டை என்று சொல்லுங்கள்."
        : "Which product are you looking for? For example, say milk, bread, or eggs."
    ).then(() => {
      startListening({ retries: 2, onResult: (text) => runProductSearch(text) });
    });
  };


  const handleLanguageChoice = (text: string) => {
    const isTamil = matchCommand(text, COMMAND_PHRASES.tamil, 0.5).matched;
    const isEnglish = matchCommand(text, COMMAND_PHRASES.english, 0.5).matched;
    if (isTamil && !isEnglish) {
      setLanguage("ta");
      setLanguageChosen(true);
      setShowWelcomeCard(false);
      setStatus("தமிழ் தேர்ந்தெடுக்கப்பட்டது ✓");
      speak("தமிழ் தேர்ந்தெடுக்கப்பட்டது. வகையைச் சொல்ல ஒரு முறை கண் சிமிட்டுங்கள்.");
    } else {
      setLanguage("en");
      setLanguageChosen(true);
      setShowWelcomeCard(false);
      setStatus("English selected ✓");
      speak("English selected. Blink once or press B, then say a category name.");
    }
  };

  const helpSpeech = () => {
    const msg = language === "ta"
      ? "கிடைக்கும் கட்டளைகள்: பொருள் தேடு என்று சொல்லி பால், ரொட்டி போன்ற பொருளைத் தேடலாம். வகை சொல்லலாம் — அத்தியாவசியம், எலக்ட்ரானிக்ஸ், மளிகை, அழகு, மருந்துகள். கார்ட்டுக்கு செல், கார்ட் பார், கார்ட்டில் சேர், அடுத்தது, பொருளைப் படி, ரீசார்ஜ், செக்அவுட், உதவி."
      : "Available commands: Say Search Product to find an item like milk or bread. Say a category like Daily Essentials, Electronics, Groceries, Personal Care, or Medicines. Say Go to Cart to open your cart, View Cart to hear it, Add to Cart to add a product, Next or Previous to browse, Read Product for details, Recharge for your wallet card, Checkout to pay, or Help anytime.";
    speak(msg);
  };

  const handleSingleBlink = () => {
    if (!languageChosen) {
      setStatus("🎤 " + t("chooseLanguage"));
      speak(language === "ta"
        ? "கேட்கிறேன். தமிழ் அல்லது ஆங்கிலம் சொல்லுங்கள்."
        : "Listening. Say Tamil or English."
      ).then(() => {
        startListening({ onResult: handleLanguageChoice, retries: 2 });
      });
      return;
    }

    setStatus("🎤 " + t("listening"));
    const prompt = language === "ta"
      ? "கேட்கிறேன். பொருள் தேடு என்று சொல்லுங்கள், அல்லது வகையின் பெயரைச் சொல்லுங்கள். உதவிக்கு உதவி என்று சொல்லுங்கள்."
      : "Listening. Say Search Product to find an item, or say a category name. Say Help for commands.";
    speak(prompt).then(() => {
      startListening({
        retries: 2,
        onResult: (text, conf) => {
          // Help
          if (matchCommand(text, COMMAND_PHRASES.help, 0.5).matched) {
            setStatus(language === "ta" ? "உதவி கட்டளைகள்" : "Help commands");
            helpSpeech();
            return;
          }
          // Go to cart
          if (matchCommand(text, COMMAND_PHRASES.goToCart, 0.45).matched) {
            setStatus(language === "ta" ? "கார்ட்டுக்கு செல்கிறது..." : "Going to cart...");
            speak(language === "ta" ? "கார்ட் பக்கத்திற்கு செல்கிறது." : "Opening your cart now.").then(() => navigate("/checkout"));
            return;
          }
          // "Search product" — ask for the item name, then open the product page
          if (matchCommand(text, COMMAND_PHRASES.searchProduct, 0.5).matched) {
            promptProductSearch();
            return;
          }

          const cat = findCategoryByVoice(text);
          if (cat) {
            const catName = language === "ta" ? taName(cat.id) : cat.name;
            setStatus(`${t("navigatingTo")} ${catName}...`);
            speak(`${language === "ta" ? "அருமை!" : "Great choice!"} ${t("navigatingTo")} ${catName}`).then(() => navigate(`/category/${cat.id}`));
            return;
          }

          // Maybe they named a product directly ("milk")
          const product = findProductByVoice(text);
          if (product) {
            runProductSearch(text);
            return;
          }

          // Low-confidence fallback — read what we heard so the user can retry
          setStatus(`${language === "ta" ? "கேட்டது" : "Heard"}: "${text}"`);
          speak(language === "ta"
            ? `மன்னிக்கவும், "${text}" புரியவில்லை. வகை அல்லது பொருளின் பெயரைச் சொல்லுங்கள், அல்லது உதவி என்று சொல்லுங்கள்.`
            : `Sorry, I heard "${text}" but did not match anything. Say a category or product name, or say Help.`
          );
        },
      });

    });
  };

  const handleDoubleBlink = () => {
    const catNames = readAllCategories();
    const msg = language === "ta"
      ? `ஸ்மார்ட் விஷன் கார்ட்டில் நீங்கள் சுதந்திரமாக ஷாப்பிங் செய்யலாம். கிடைக்கும் வகைகள்: ${catNames}. குரல் தேடலை இயக்க ஒரு முறை கண் சிமிட்டுங்கள்.`
      : `Welcome to Smart Vision Cart. You can shop independently with just your voice and eyes. Available categories are: ${catNames}. Blink once to start.`;
    speak(msg);
  };

  const {
    videoRef, isActive, mediaPipeLoaded, cameraError, cameraErrorName, startCamera,
    devices, activeDeviceId, refreshDevices,
    ear, landmarks, blinkEvents, threshold, setThreshold,
    audioOnly, setAudioOnly, manualBlink, suggestAudioOnly,
    getEarSamples, downloadDiagnostics,
  } = useBlinkDetection({
    onSingleBlink: handleSingleBlink,
    onDoubleBlink: handleDoubleBlink,
  });

  const [showCalibration, setShowCalibration] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showWizard, setShowWizard] = useState(false);

  // Auto-start listening once audio-only mode turns on (with a small delay for TTS)
  const audioOnlyPrev = useRef(audioOnly);
  useEffect(() => {
    if (audioOnly && !audioOnlyPrev.current) {
      const timer = setTimeout(() => {
        handleSingleBlink();
      }, 1200);
      return () => clearTimeout(timer);
    }
    audioOnlyPrev.current = audioOnly;
  }, [audioOnly]);

  useEffect(() => {
    if (welcomed.current) return;
    welcomed.current = true;
    const timer = setTimeout(() => {
      setStatus(t("chooseLanguage"));
      speak("Welcome to Smart Vision Cart. Shop with independence, confidence, and ease. Please say Tamil or English to continue.");
    }, 5500);
    return () => clearTimeout(timer);
  }, []);

  const getCatDisplayName = (cat: typeof categories[0]) => {
    if (language !== "ta") return cat.name;
    return taName(cat.id);
  };

  const getCatDescription = (cat: typeof categories[0]) => {
    if (language !== "ta") return cat.description;
    switch (cat.id) {
      case "electronics": return t("smartDevices");
      case "groceries": return t("freshFood");
      case "personal-care": return t("healthBeauty");
      case "medicines": return t("medicinesDesc");
      case "clothing": return t("clothingDesc");
      case "home": return t("homeDesc");
      default: return cat.description;
    }
  };

  return (
    <main className="min-h-screen bg-background pb-28">
      <header className="border-b border-border bg-background sticky top-0 z-30">
        <div className="shop-container flex flex-wrap items-center gap-4 py-4">
          <div className="flex items-center gap-2 text-primary shrink-0">
            <Eye className="h-8 w-8" aria-hidden />
            <h1 className="text-xl font-bold leading-tight">Smart Vision<br /><span className="text-foreground">Cart</span></h1>
          </div>
          <div className="hidden md:block border-l border-border pl-4 text-sm">
            <p className="font-bold flex items-center gap-1"><Timer className="w-4 h-4 text-fresh" />10-minute delivery</p>
            <p className="text-muted-foreground text-xs mt-1">{language === "ta" ? "மதிப்பிடப்பட்ட நேரம்" : "Estimated delivery time"}</p>
          </div>
          <form onSubmit={e => { e.preventDefault(); if (searchText.trim()) runProductSearch(searchText.trim()); }} className="order-last md:order-none flex items-center bg-muted border border-border rounded-lg px-3 flex-1 min-w-0 basis-full md:basis-0 h-12">
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder={language === "ta" ? "பால், ரொட்டி, முட்டை தேடுங்கள்" : "Search for milk, bread, eggs…"} aria-label="Search products" className="w-full min-w-0 bg-transparent px-3 outline-none text-sm" />
            <Button type="button" variant="ghost" size="icon" onClick={promptProductSearch} aria-label="Search by voice" title="Search by voice"><Mic /></Button>
          </form>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="ghost" onClick={() => { const next = language === "en" ? "ta" : "en"; setLanguage(next); setLanguageChosen(true); setShowWelcomeCard(false); }} aria-label="Switch language"><Globe />{language === "en" ? "தமிழ்" : "EN"}</Button>
            <Button variant="outline" onClick={() => navigate("/checkout")} aria-label={`Cart, ${itemCount} items`}><ShoppingCart /><span className="hidden sm:inline">{t("cart")}</span>{itemCount > 0 && <span>{itemCount}</span>}</Button>
          </div>
        </div>
      </header>
      <nav aria-label="Shop departments" className="border-b border-border">
        <div className="shop-container flex gap-6 overflow-x-auto py-3">
          <span className="text-primary font-semibold text-sm border-b-2 border-primary pb-1 shrink-0">{language === "ta" ? "அனைத்தும்" : "All"}</span>
          {categories.map(cat => <Button key={cat.id} variant="ghost" className="shrink-0 h-auto p-0 text-muted-foreground" onClick={() => navigate(`/category/${cat.id}`)}>{getCatDisplayName(cat)}</Button>)}
        </div>
      </nav>
      <div className="shop-container">
        {showWelcomeCard && <section className="flex flex-wrap items-center gap-3 py-4 border-b border-border" aria-label="Choose language">
          <Globe className="text-primary w-5 h-5" /><h2 className="font-semibold text-sm">Choose your language / மொழியைத் தேர்ந்தெடுக்கவும்</h2>
          <Button variant="outline" onClick={() => handleLanguageChoice("english")}>English</Button>
          <Button variant="outline" onClick={() => handleLanguageChoice("tamil")}>தமிழ்</Button>
        </section>}
        <section className="py-6" aria-labelledby="categories-heading">
          <div className="flex items-center justify-between mb-5"><h2 id="categories-heading" className="text-lg font-bold">{t("browseCategories")}</h2><span className="text-xs text-muted-foreground md:hidden">10 min · estimate</span></div>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-x-4 gap-y-5">
            {categories.map(cat => <Button key={cat.id} variant="ghost" onClick={() => navigate(`/category/${cat.id}`)} className="h-auto p-0 flex-col gap-3 whitespace-normal group hover:bg-transparent">
              <div className="aspect-square w-full rounded-lg bg-muted overflow-hidden"><img src={cat.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" /></div>
              <span className="text-sm font-semibold text-center min-h-10">{getCatDisplayName(cat)}</span>
            </Button>)}
          </div>
        </section>
        {["essentials", "groceries", "personal-care", "home"].map(id => <section key={id} className="py-5 border-t border-border">
          <div className="flex items-center justify-between mb-4"><h2 className="font-bold text-lg">{getCatDisplayName(categories.find(c => c.id === id) ?? categories[0])}</h2><Button variant="link" onClick={() => navigate(`/category/${id}`)}>{language === "ta" ? "அனைத்தும்" : "See all"}<ChevronRight /></Button></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">{getProductsByCategory(id).slice(0, 6).map(p => <ProductCard key={p.id} product={p} />)}</div>
        </section>)}
        <details className="py-5 border-t border-border">
          <summary className="cursor-pointer text-sm font-semibold flex items-center gap-2"><Camera className="w-4 h-4" />{language === "ta" ? "கேமரா மற்றும் கண் அமைப்புகள்" : "Camera & blink settings"}</summary>
          <div className="grid md:grid-cols-2 gap-4 pt-4">
            <div className="flex items-start gap-4"><div className="w-24 h-24 rounded-lg bg-muted overflow-hidden shrink-0"><video ref={videoRef} className="w-full h-full object-cover scale-x-[-1]" playsInline muted /></div><div className="space-y-2"><p className="text-sm">{audioOnly ? "Audio-only mode" : isActive ? "Camera connected" : "Camera off"}</p><Button variant="outline" onClick={() => setAudioOnly(!audioOnly)}>{audioOnly ? "Enable camera" : "Audio only"}</Button></div></div>
            {!audioOnly && (cameraError || !isActive) && <CameraTroubleshoot cameraError={cameraError} cameraErrorName={cameraErrorName} isActive={isActive} devices={devices} activeDeviceId={activeDeviceId} onRetry={startCamera} onRefreshDevices={refreshDevices} suggestAudioOnly={suggestAudioOnly} onEnableAudioOnly={() => setAudioOnly(true)} />}
            {!audioOnly && isActive && <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => setShowCalibration(true)}><Sliders />Calibrate</Button><Button variant="outline" onClick={() => setShowWizard(true)}><Wand2 />Blink test</Button><Button variant="outline" onClick={() => setShowDebug(!showDebug)}><Activity />Debug</Button><Button variant="outline" onClick={downloadDiagnostics}><Download />Diagnostics</Button></div>}
          </div>
        </details>
      </div>
      <aside className="fixed bottom-0 inset-x-0 bg-background border-t border-border z-40 shadow-assistant" aria-label="Hands-free shopping">
        <div className="shop-container flex flex-wrap items-center gap-3 py-3">
          <div className="flex items-center gap-3 flex-1 min-w-0"><div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0"><Eye className="text-primary w-5 h-5" /></div><div className="min-w-0"><p className="font-bold text-sm">{language === "ta" ? "ஷாப்பிங் உதவியாளர்" : "Shopping assistant"}</p><p role="status" aria-live="polite" className="text-xs text-muted-foreground break-words">{interimText || (isListening ? t("listening") : languageChosen ? (language === "ta" ? "உங்களுக்காக தயார்" : "Ready when you are") : t("chooseLanguage"))}</p></div></div>
          <Button onClick={handleSingleBlink} className="h-11"><Mic className={isListening ? "animate-pulse" : ""} />{isListening ? (language === "ta" ? "கேட்கிறது" : "Listening…") : (language === "ta" ? "பேசுங்கள்" : "Speak to shop")}</Button>
          <Button variant="outline" size="icon" onClick={helpSpeech} aria-label="Hear available commands" title="Hear available commands"><HelpCircle /></Button>
        </div>
      </aside>
      <BlinkDebugOverlay landmarks={landmarks} ear={ear} threshold={threshold} blinkEvents={blinkEvents} visible={showDebug} onClose={() => setShowDebug(false)} />
      <BlinkCalibration open={showCalibration} onClose={() => setShowCalibration(false)} ear={ear} threshold={threshold} setThreshold={setThreshold} videoRef={videoRef} landmarks={landmarks} />
      <BlinkTestWizard open={showWizard} onClose={() => setShowWizard(false)} ear={ear} threshold={threshold} setThreshold={setThreshold} getEarSamples={getEarSamples} blinkEvents={blinkEvents} />
    </main>
  );
}
