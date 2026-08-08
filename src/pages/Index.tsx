import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Eye, Camera, Volume2, Globe, ShoppingCart, Sparkles, Sliders, Activity, Download, Wand2 } from "lucide-react";
import heroImage from "@/assets/hero-eye.jpg";
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
    <div className="min-h-screen relative overflow-hidden aurora-bg">
      {/* Hero background */}
      <div className="absolute inset-0 z-0">
        <img src={heroImage} alt="" className="w-full h-full object-cover opacity-20 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background" />
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Eye className="w-8 h-8 text-primary animate-neon-pulse" />
            <h1 className="font-display text-2xl md:text-3xl font-bold gradient-text">
              {t("appName")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newLang = language === "en" ? "ta" : "en";
                setLanguage(newLang);
                setLanguageChosen(true);
                setShowWelcomeCard(false);
                setStatus(newLang === "ta" ? "தமிழ் தேர்ந்தெடுக்கப்பட்டது ✓" : "English selected ✓");
                speak(newLang === "ta" ? "தமிழ் தேர்ந்தெடுக்கப்பட்டது." : "English selected.");
              }}
              className="glass px-3 py-2 rounded-lg text-primary font-display text-xs shadow-neon flex items-center gap-1"
            >
              <Globe className="w-3.5 h-3.5" />
              {language === "en" ? "தமிழ்" : "EN"}
            </button>
            {itemCount > 0 && (
              <button
                onClick={() => navigate("/checkout")}
                className="glass px-4 py-2 rounded-lg text-primary font-display text-sm shadow-neon flex items-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {t("cart")} ({itemCount})
              </button>
            )}
          </div>
        </header>

        {/* Welcome Card */}
        <AnimatePresence>
          {showWelcomeCard && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="glass rounded-2xl p-6 mb-8 text-center border border-primary/20"
            >
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-3 animate-pulse" />
              <h2 className="font-display text-xl font-bold text-foreground text-glow mb-2">
                {language === "ta" ? "ஸ்மார்ட் விஷன் கார்ட்டுக்கு வரவேற்கிறோம்!" : "Welcome to Smart Vision Cart!"}
              </h2>
              <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                {language === "ta"
                  ? "சுதந்திரமாகவும், தன்னம்பிக்கையுடனும், எளிதாகவும் ஷாப்பிங் செய்யுங்கள். உங்கள் குரலும் கண்களும் மட்டுமே போதும்."
                  : "Shop with complete independence, confidence, and ease. Your voice and eyes are all you need. No touch required."}
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleLanguageChoice("english")}
                  className="glass px-5 py-2.5 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
                >
                  🇬🇧 English
                </button>
                <button
                  onClick={() => handleLanguageChoice("tamil")}
                  className="glass px-5 py-2.5 rounded-xl font-display text-sm text-primary shadow-neon hover:shadow-neon-lg transition-all"
                >
                  🇮🇳 தமிழ்
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {language === "ta" ? "அல்லது கண் சிமிட்டி குரலில் சொல்லுங்கள்" : "or blink once & say your language"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Camera Feed + Status */}
        <div className="flex flex-col items-center gap-5 mb-10">
          {!audioOnly && (
            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden border-2 border-glow shadow-neon-lg">
              <video
                ref={videoRef}
                className="w-full h-full object-cover scale-x-[-1]"
                playsInline
                muted
              />
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
                <div className="w-full h-1 bg-primary/40 animate-scan" />
              </div>
            </div>
          )}

          {audioOnly && (
            <div className="glass rounded-2xl px-5 py-4 border border-accent/40 max-w-md text-center space-y-3">
              <div className="inline-flex items-center gap-2 text-accent">
                <Mic className="w-5 h-5" />
                <span className="font-display text-sm">Audio-only mode</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Camera is off. Use voice or the buttons below to browse and checkout.
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={manualBlink}
                  className="glass px-4 py-2 rounded-lg text-xs font-display text-primary shadow-neon"
                >
                  🎤 Start listening
                </button>
                <button
                  onClick={() => setAudioOnly(false)}
                  className="glass px-4 py-2 rounded-lg text-xs font-display text-muted-foreground"
                >
                  Re-enable camera
                </button>
              </div>
            </div>
          )}

          {!audioOnly && (cameraError || !isActive) && (
            <CameraTroubleshoot
              cameraError={cameraError}
              cameraErrorName={cameraErrorName}
              isActive={isActive}
              devices={devices}
              activeDeviceId={activeDeviceId}
              onRetry={startCamera}
              onRefreshDevices={refreshDevices}
              suggestAudioOnly={suggestAudioOnly}
              onEnableAudioOnly={() => {
                setAudioOnly(true);
                speak(language === "ta"
                  ? "ஒலி மட்டும் முறை இயக்கப்பட்டது. குரலால் ஷாப்பிங் செய்யலாம்."
                  : "Audio-only mode enabled. You can shop using your voice."
                );
              }}
            />
          )}

          {/* Calibration & Debug toggles */}
          {!audioOnly && isActive && (
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                onClick={() => setShowCalibration(true)}
                className="glass px-3 py-1.5 rounded-lg text-[11px] font-display text-primary inline-flex items-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5" /> Calibrate
              </button>
              <button
                onClick={() => setShowWizard(true)}
                className="glass px-3 py-1.5 rounded-lg text-[11px] font-display text-accent inline-flex items-center gap-1.5"
              >
                <Wand2 className="w-3.5 h-3.5" /> Blink test
              </button>
              <button
                onClick={() => setShowDebug((v) => !v)}
                className={`glass px-3 py-1.5 rounded-lg text-[11px] font-display inline-flex items-center gap-1.5 ${showDebug ? "text-accent" : "text-muted-foreground"}`}
              >
                <Activity className="w-3.5 h-3.5" /> {showDebug ? "Hide" : "Show"} debug
              </button>
              <button
                onClick={downloadDiagnostics}
                className="glass px-3 py-1.5 rounded-lg text-[11px] font-display text-muted-foreground inline-flex items-center gap-1.5"
                title="Export calibration, EAR samples, and blink logs as JSON"
              >
                <Download className="w-3.5 h-3.5" /> Diagnostics
              </button>
            </div>
          )}

          {!audioOnly && showDebug && (
            <BlinkDebugOverlay
              landmarks={landmarks}
              ear={ear}
              threshold={threshold}
              blinkEvents={blinkEvents}
              visible={showDebug}
              onClose={() => setShowDebug(false)}
            />
          )}

          {/* Status indicators */}
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Camera, label: language === "ta" ? "கேமரா" : "Camera", active: isActive },
              { icon: Eye, label: language === "ta" ? "கண் AI" : "Blink AI", active: mediaPipeLoaded },
              { icon: Mic, label: language === "ta" ? "குரல்" : "Voice", active: isListening },
              { icon: Volume2, label: language === "ta" ? "ஒலி" : "Audio", active: true },
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-primary font-display text-sm text-center text-glow max-w-md"
          >
            {status}
          </motion.p>

          {/* Live transcript */}
          {(isListening || interimText) && (
            <div className="glass rounded-full px-4 py-2 border border-primary/30 max-w-md">
              <p className="text-xs text-muted-foreground inline">
                {language === "ta" ? "கேட்பது: " : "Hearing: "}
              </p>
              <span className="text-sm font-display text-foreground">
                {interimText || (language === "ta" ? "பேசுங்கள்..." : "speak now...")}
                <span className="text-primary animate-pulse">|</span>
              </span>
            </div>
          )}

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

        {/* Quick search — voice or type */}
        <section className="max-w-md mx-auto w-full">
          <form
            onSubmit={(e) => { e.preventDefault(); if (searchText.trim()) runProductSearch(searchText.trim()); }}
            className="quick-card p-2 flex items-center gap-2"
          >
            <Search className="w-4 h-4 text-quick ml-2 shrink-0" aria-hidden />
            <input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={language === "ta" ? "பால், ரொட்டி, முட்டை..." : "Search milk, bread, eggs..."}
              aria-label={language === "ta" ? "பொருள் தேடல்" : "Search products"}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none py-2"
            />
            <button
              type="button"
              onClick={promptProductSearch}
              className="quick-badge rounded-full p-2"
              aria-label={language === "ta" ? "குரல் மூலம் தேடு" : "Search by voice"}
            >
              <Mic className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            {language === "ta" ? 'மைக்கை அழுத்தி "பொருள் தேடு" என்று சொல்லுங்கள்' : 'Tap the mic and say "Search product"'}
          </p>
        </section>

        {/* Daily essentials quick strip */}
        <section>
          <h2 className="font-display text-sm text-foreground mb-3 flex items-center gap-2">
            <span className="quick-badge rounded-full px-2 py-0.5 text-[10px]">10 min</span>
            {language === "ta" ? "அத்தியாவசிய பொருட்கள்" : "Daily essentials"}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
            {getProductsByCategory("essentials").slice(0, 10).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/product/${p.id}`)}
                className="quick-card shrink-0 w-28 text-left overflow-hidden hover:scale-105 transition-transform"
              >
                <img src={p.image} alt={`${p.name} — ${p.brand}`} className="w-full h-20 object-cover" loading="lazy" />
                <div className="p-2">
                  <p className="text-[11px] font-display text-foreground leading-tight truncate">{p.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{p.unit}</p>
                  <p className="text-xs font-display text-quick">₹{p.price.toLocaleString("en-IN")}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Category Cards */}

        <section>
          <h2 className="font-display text-lg text-muted-foreground mb-4 text-center">
            {t("browseCategories")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                onClick={() => {
                  const catName = getCatDisplayName(cat);
                  speak(`${language === "ta" ? "அருமை!" : "Great!"} ${t("navigatingTo")} ${catName}`).then(() => navigate(`/category/${cat.id}`));
                }}
                className="glass rounded-xl overflow-hidden text-center transition-all duration-300 hover:shadow-neon-lg hover:scale-105 group"
              >
                <div className="h-28 overflow-hidden">
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                </div>
                <div className="p-3">
                  <span className="text-xl block mb-1">{cat.emoji}</span>
                  <h3 className="font-display text-xs font-semibold text-foreground mb-0.5">{getCatDisplayName(cat)}</h3>
                  <p className="text-[10px] text-muted-foreground">{getCatDescription(cat)}</p>
                </div>
              </motion.button>
            ))}
          </div>
        </section>

        {/* Instructions */}
        <div className="mt-10 text-center space-y-2 text-xs text-muted-foreground max-w-lg mx-auto">
          <p>👁 <strong className="text-foreground">{t("singleBlink")}</strong> {language === "ta" ? "அல்லது" : "or press"} <kbd className="glass px-1.5 py-0.5 rounded text-primary">B</kbd> — {t("activateVoice")}</p>
          <p>👁👁 <strong className="text-foreground">{t("doubleBlink")}</strong> — {t("hearInstructions")}</p>
          <p>🎤 <strong className="text-foreground">"{t("next")}"</strong> · <strong className="text-foreground">"{t("addToCart")}"</strong> · <strong className="text-foreground">"{t("viewCart")}"</strong> · <strong className="text-foreground">"{t("help")}"</strong></p>
        </div>
      </div>

      <BlinkCalibration
        open={showCalibration}
        onClose={() => setShowCalibration(false)}
        ear={ear}
        threshold={threshold}
        setThreshold={setThreshold}
        videoRef={videoRef}
        landmarks={landmarks}
      />

      <BlinkTestWizard
        open={showWizard}
        onClose={() => setShowWizard(false)}
        ear={ear}
        threshold={threshold}
        setThreshold={setThreshold}
        getEarSamples={getEarSamples}
        blinkEvents={blinkEvents}
      />
    </div>
  );
}
