import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Eye, Camera, Volume2, Globe, ShoppingCart, Sparkles } from "lucide-react";
import heroImage from "@/assets/hero-eye.jpg";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { speak, useSpeechRecognition, matchCommand, COMMAND_PHRASES } from "@/hooks/useSpeech";
import { categories, findCategoryByVoice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";
import CameraTroubleshoot from "@/components/CameraTroubleshoot";

export default function Index() {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { isListening, interimText, startListening } = useSpeechRecognition();
  const { language, setLanguage, t } = useLanguage();
  const [status, setStatus] = useState("Initializing...");
  const welcomed = useRef(false);
  const [languageChosen, setLanguageChosen] = useState(false);
  const [showWelcomeCard, setShowWelcomeCard] = useState(true);

  const taName = (id: string) => ({
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
      ? "கிடைக்கும் கட்டளைகள்: எலக்ட்ரானிக்ஸ், மளிகை, அழகு, மருந்துகள் என்று வகை சொல்லுங்கள். கார்ட்டுக்கு செல், கார்ட் பார், கார்ட்டில் சேர், அடுத்தது, பொருளைப் படி, செக்அவுட், உதவி."
      : "Available commands: Say a category like Electronics, Groceries, Personal Care, or Medicines. Say Go to Cart to open your cart, View Cart to hear it, Add to Cart to add a product, Next or Previous to browse, Read Product for details, Checkout to pay, or Help anytime.";
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
      ? "கேட்கிறேன். வகையின் பெயரைச் சொல்லுங்கள் — எலக்ட்ரானிக்ஸ், மளிகை, அழகு, மருந்துகள். உதவிக்கு உதவி என்று சொல்லுங்கள்."
      : "Listening. Say a category like Electronics, Groceries, Personal Care, or Medicines. Say Help for commands.";
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

          const cat = findCategoryByVoice(text);
          if (cat) {
            const catName = language === "ta"
              ? cat.id === "electronics" ? "எலக்ட்ரானிக்ஸ்" : cat.id === "groceries" ? "மளிகை பொருட்கள்" : cat.id === "personal-care" ? "அழகு பொருட்கள்" : "மருந்துகள்"
              : cat.name;
            setStatus(`${t("navigatingTo")} ${catName}...`);
            speak(`${language === "ta" ? "அருமை!" : "Great choice!"} ${t("navigatingTo")} ${catName}`).then(() => navigate(`/category/${cat.id}`));
          } else {
            // Low-confidence fallback — read what we heard so the user can retry
            setStatus(`${language === "ta" ? "கேட்டது" : "Heard"}: "${text}"`);
            speak(language === "ta"
              ? `மன்னிக்கவும், "${text}" புரியவில்லை. மீண்டும் ஒரு வகையின் பெயரைச் சொல்லுங்கள், அல்லது உதவி என்று சொல்லுங்கள்.`
              : `Sorry, I heard "${text}" but did not match a category. Please blink and try again, or say Help.`
            );
          }
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

  const { videoRef, isActive, mediaPipeLoaded, cameraError, cameraErrorName, startCamera, devices, activeDeviceId, refreshDevices } = useBlinkDetection({
    onSingleBlink: handleSingleBlink,
    onDoubleBlink: handleDoubleBlink,
  });

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

          {(cameraError || !isActive) && (
            <CameraTroubleshoot
              cameraError={cameraError}
              cameraErrorName={cameraErrorName}
              isActive={isActive}
              devices={devices}
              activeDeviceId={activeDeviceId}
              onRetry={startCamera}
              onRefreshDevices={refreshDevices}
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
    </div>
  );
}
