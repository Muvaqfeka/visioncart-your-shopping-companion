import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, Eye, Camera, Volume2, Globe } from "lucide-react";
import heroImage from "@/assets/hero-eye.jpg";
import { useBlinkDetection } from "@/hooks/useBlinkDetection";
import { speak, useSpeechRecognition } from "@/hooks/useSpeech";
import { categories, findCategoryByVoice } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useLanguage } from "@/context/LanguageContext";

export default function Index() {
  const navigate = useNavigate();
  const { itemCount } = useCart();
  const { isListening, startListening } = useSpeechRecognition();
  const { language, setLanguage, t } = useLanguage();
  const [status, setStatus] = useState("Initializing...");
  const welcomed = useRef(false);
  const [languageChosen, setLanguageChosen] = useState(false);

  const readAllCategories = () => {
    const catNames = categories.map((c) =>
      language === "ta"
        ? c.id === "electronics" ? "எலக்ட்ரானிக்ஸ்" : c.id === "groceries" ? "மளிகை பொருட்கள்" : c.id === "personal-care" ? "அழகு பொருட்கள்" : "மருந்துகள்"
        : c.name
    ).join(", ");
    return catNames;
  };

  const handleLanguageChoice = (text: string) => {
    const lower = text.toLowerCase();
    if (lower.includes("tamil") || lower.includes("தமிழ்")) {
      setLanguage("ta");
      setLanguageChosen(true);
      setStatus("தமிழ் தேர்ந்தெடுக்கப்பட்டது ✓");
      const catNames = "எலக்ட்ரானிக்ஸ், மளிகை பொருட்கள், அழகு பொருட்கள், மருந்துகள்";
      speak(`தமிழ் தேர்ந்தெடுக்கப்பட்டது. வரவேற்கிறோம். கிடைக்கும் வகைகள்: ${catNames}. குரல் தேடலை தொடங்க ஒரு முறை கண் சிமிட்டுங்கள்.`);
    } else {
      setLanguage("en");
      setLanguageChosen(true);
      setStatus("English selected ✓");
      const catNames = categories.map(c => c.name).join(", ");
      speak(`English selected. Welcome! Available categories are: ${catNames}. Blink once to start voice search.`);
    }
  };

  const handleSingleBlink = () => {
    if (!languageChosen) {
      setStatus("🎤 " + t("chooseLanguage"));
      speak(language === "ta"
        ? "கேட்கிறேன். தமிழ் அல்லது ஆங்கிலம் சொல்லுங்கள்."
        : "Listening. Say Tamil or English."
      ).then(() => {
        startListening(handleLanguageChoice);
      });
      return;
    }

    setStatus("🎤 " + t("listening"));
    const prompt = language === "ta"
      ? "கேட்கிறேன். எலக்ட்ரானிக்ஸ், மளிகை பொருட்கள், அழகு பொருட்கள், அல்லது மருந்துகள் என்று ஒரு வகையின் பெயரைச் சொல்லுங்கள்."
      : "Listening. Say a category name like Electronics, Groceries, Personal Care, or Medicines.";
    speak(prompt).then(() => {
      startListening((text) => {
        const lower = text.toLowerCase();

        // Help command
        if (lower.includes("help") || lower.includes("உதவி")) {
          setStatus(language === "ta" ? "உதவி கட்டளைகள்" : "Help commands");
          speak(t("helpCommands"));
          return;
        }

        // Go to cart command
        if (lower.includes("go to cart") || lower.includes("கார்ட்டுக்கு செல்") || lower.includes("cart")) {
          setStatus(language === "ta" ? "கார்ட்டுக்கு செல்கிறது..." : "Going to cart...");
          speak(language === "ta" ? "கார்ட்டுக்கு செல்கிறது." : "Going to cart.").then(() => navigate("/checkout"));
          return;
        }

        const cat = findCategoryByVoice(text);
        if (cat) {
          const catName = language === "ta"
            ? cat.id === "electronics" ? "எலக்ட்ரானிக்ஸ்" : cat.id === "groceries" ? "மளிகை பொருட்கள்" : cat.id === "personal-care" ? "அழகு பொருட்கள்" : "மருந்துகள்"
            : cat.name;
          setStatus(`${t("navigatingTo")} ${catName}...`);
          speak(`${t("navigatingTo")} ${catName}`).then(() => navigate(`/category/${cat.id}`));
        } else {
          setStatus(t("categoryNotFound"));
          speak(language === "ta"
            ? "மன்னிக்கவும், அந்த வகை கிடைக்கவில்லை. மீண்டும் கண் சிமிட்டி முயற்சிக்கவும்."
            : "Sorry, I did not recognize that category. Please blink and try again."
          );
        }
      });
    });
  };

  const handleDoubleBlink = () => {
    const catNames = readAllCategories();
    const msg = language === "ta"
      ? `ஸ்மார்ட் விஷன் கார்ட்டுக்கு வரவேற்கிறோம். குரல் தேடலை இயக்க ஒரு முறை கண் சிமிட்டி, ஒரு வகையின் பெயரைச் சொல்லுங்கள். கிடைக்கும் வகைகள்: ${catNames}. B விசையை அழுத்தி குறுக்குவழியாகவும் பயன்படுத்தலாம்.`
      : `Welcome to Smart Vision Cart. Blink once to activate voice search and say a category name. Available categories are: ${catNames}. You can also press the B key as a blink shortcut.`;
    speak(msg);
  };

  const { videoRef, isActive, mediaPipeLoaded } = useBlinkDetection({
    onSingleBlink: handleSingleBlink,
    onDoubleBlink: handleDoubleBlink,
  });

  useEffect(() => {
    if (!welcomed.current) {
      welcomed.current = true;
      setTimeout(() => {
        setStatus(t("chooseLanguage"));
        speak("Welcome to Smart Vision Cart. Shop with independence, confidence, and ease. Your voice and eyes are all you need. Please say Tamil for Tamil, or English to continue in English. Blink once or press B to choose.").then(() => {
          const catNames = categories.map(c => c.name).join(", ");
          speak(`Available categories are: ${catNames}.`);
        });
      }, 5500); // After splash screen
    }
  }, []);

  const getCatDisplayName = (cat: typeof categories[0]) => {
    if (language !== "ta") return cat.name;
    switch (cat.id) {
      case "electronics": return "எலக்ட்ரானிக்ஸ்";
      case "groceries": return "மளிகை பொருட்கள்";
      case "personal-care": return "அழகு பொருட்கள்";
      case "medicines": return "மருந்துகள்";
      default: return cat.name;
    }
  };

  const getCatDescription = (cat: typeof categories[0]) => {
    if (language !== "ta") return cat.description;
    switch (cat.id) {
      case "electronics": return t("smartDevices");
      case "groceries": return t("freshFood");
      case "personal-care": return t("healthBeauty");
      case "medicines": return t("medicinesDesc");
      default: return cat.description;
    }
  };

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
              {t("appName")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={() => {
                const newLang = language === "en" ? "ta" : "en";
                setLanguage(newLang);
                setLanguageChosen(true);
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
                className="glass px-4 py-2 rounded-lg text-primary font-display text-sm shadow-neon"
              >
                {t("cart")} ({itemCount})
              </button>
            )}
          </div>
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
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
              <div className="w-full h-1 bg-primary/40 animate-scan" />
            </div>
          </div>

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
            {t("browseCategories")}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.1 }}
                onClick={() => {
                  const catName = getCatDisplayName(cat);
                  speak(`${t("navigatingTo")} ${catName}`).then(() => navigate(`/category/${cat.id}`));
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
        <div className="mt-12 text-center space-y-2 text-xs text-muted-foreground max-w-lg mx-auto">
          <p>👁 <strong className="text-foreground">{t("singleBlink")}</strong> {language === "ta" ? "அல்லது" : "or press"} <kbd className="glass px-1.5 py-0.5 rounded text-primary">B</kbd> — {t("activateVoice")}</p>
          <p>👁👁 <strong className="text-foreground">{t("doubleBlink")}</strong> — {t("hearInstructions")}</p>
          <p>🎤 <strong className="text-foreground">"{t("next")}"</strong> · <strong className="text-foreground">"{t("addToCart")}"</strong> · <strong className="text-foreground">"{t("viewCart")}"</strong> · <strong className="text-foreground">"{t("help")}"</strong></p>
        </div>
      </div>
    </div>
  );
}
