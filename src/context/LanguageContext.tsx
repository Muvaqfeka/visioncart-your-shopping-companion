import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { setSpeechLanguage } from "@/hooks/useSpeech";

export type Language = "en" | "ta";

const translations = {
  en: {
    appName: "Smart Vision Cart",
    welcome: "Welcome to Smart Vision Cart",
    welcomeMessage: "Welcome to Smart Vision Cart. Please say Tamil for Tamil, or English to continue in English.",
    chooseLanguage: "Choose your language — say Tamil or English",
    electronics: "Electronics",
    groceries: "Groceries",
    personalCare: "Personal Care",
    medicines: "Medicines",
    browseCategories: "Browse Categories",
    singleBlink: "Single Blink",
    doubleBlink: "Double Blink",
    activateVoice: "Activate voice search",
    hearInstructions: "Hear instructions",
    sayNext: "Say",
    next: "Next",
    addToCart: "Add to Cart",
    viewCart: "View Cart",
    goToCart: "Go to Cart",
    readProduct: "Read Product",
    help: "Help",
    checkout: "Checkout",
    goBack: "Go Back",
    cart: "Cart",
    listening: "Listening...",
    ready: "Ready — Blink once to start voice search",
    categoryNotFound: "Category not found. Blink again to retry.",
    navigatingTo: "Going to",
    products: "products",
    inStock: "In Stock",
    soldOut: "Sold Out",
    price: "Price",
    features: "Features",
    available: "Available",
    outOfStock: "Currently out of stock",
    rupees: "rupees",
    addedToCart: "added to cart",
    cartEmpty: "Your cart is empty",
    total: "Total",
    items: "items",
    startVoiceCheckout: "Start Voice Checkout",
    confirmOrder: "Confirm Order",
    cancel: "Cancel",
    orderPlaced: "Order Placed!",
    orderProcessing: "Your order is being processed",
    continueShopping: "Continue Shopping",
    review: "Review",
    name: "Name",
    phone: "Phone",
    verify: "Verify",
    confirm: "Confirm",
    done: "Done",
    enterName: "Enter your name",
    enterPhone: "Enter phone number",
    sayYourName: "Please say your full name.",
    sayPhone: "Please say your phone number.",
    orType: "or type below",
    deliveryTimeline: "Delivery Timeline",
    orderConfirmed: "Order Confirmed",
    packed: "Packed & Ready",
    outForDelivery: "Out for Delivery",
    delivered: "Delivered",
    helpCommands: "Available commands: Next to browse products, Add to cart to add current product, View cart or Read my cart to hear your cart, Go to cart to open cart page, Read product to hear details, Checkout to proceed, Go back to return, Help to hear commands.",
    smartDevices: "Smart devices & gadgets",
    freshFood: "Fresh food & essentials",
    healthBeauty: "Health & beauty products",
    medicinesDesc: "Health & wellness medicines",
  },
  ta: {
    appName: "ஸ்மார்ட் விஷன் கார்ட்",
    welcome: "ஸ்மார்ட் விஷன் கார்ட்டுக்கு வரவேற்கிறோம்",
    welcomeMessage: "ஸ்மார்ட் விஷன் கார்ட்டுக்கு வரவேற்கிறோம். தமிழுக்கு தமிழ் என்று சொல்லுங்கள், அல்லது ஆங்கிலத்தில் தொடர ஆங்கிலம் என்று சொல்லுங்கள்.",
    chooseLanguage: "உங்கள் மொழியைத் தேர்ந்தெடுங்கள் — தமிழ் அல்லது ஆங்கிலம் சொல்லுங்கள்",
    electronics: "எலக்ட்ரானிக்ஸ்",
    groceries: "மளிகை பொருட்கள்",
    personalCare: "அழகு பொருட்கள்",
    medicines: "மருந்துகள்",
    browseCategories: "வகைகளை உலாவுங்கள்",
    singleBlink: "ஒரு முறை கண் சிமிட்டு",
    doubleBlink: "இரு முறை கண் சிமிட்டு",
    activateVoice: "குரல் தேடலை இயக்கு",
    hearInstructions: "வழிமுறைகளைக் கேளுங்கள்",
    sayNext: "சொல்லுங்கள்",
    next: "அடுத்தது",
    addToCart: "கார்ட்டில் சேர்",
    viewCart: "கார்ட் பார்",
    goToCart: "கார்ட்டுக்கு செல்",
    readProduct: "பொருளைப் படி",
    help: "உதவி",
    checkout: "செக்அவுட்",
    goBack: "திரும்பு",
    cart: "கார்ட்",
    listening: "கேட்கிறேன்...",
    ready: "தயார் — குரல் தேடலை தொடங்க ஒரு முறை கண் சிமிட்டுங்கள்",
    categoryNotFound: "வகை கிடைக்கவில்லை. மீண்டும் கண் சிமிட்டுங்கள்.",
    navigatingTo: "செல்கிறது",
    products: "பொருட்கள்",
    inStock: "கிடைக்கும்",
    soldOut: "தீர்ந்தது",
    price: "விலை",
    features: "அம்சங்கள்",
    available: "கிடைக்கும்",
    outOfStock: "தற்போது கிடைக்கவில்லை",
    rupees: "ரூபாய்",
    addedToCart: "கார்ட்டில் சேர்க்கப்பட்டது",
    cartEmpty: "உங்கள் கார்ட் காலியாக உள்ளது",
    total: "மொத்தம்",
    items: "பொருட்கள்",
    startVoiceCheckout: "குரல் செக்அவுட் தொடங்கு",
    confirmOrder: "ஆர்டர் உறுதிசெய்",
    cancel: "ரத்து",
    orderPlaced: "ஆர்டர் வைக்கப்பட்டது!",
    orderProcessing: "உங்கள் ஆர்டர் செயலாக்கப்படுகிறது",
    continueShopping: "தொடர்ந்து ஷாப்பிங்",
    review: "மதிப்பாய்வு",
    name: "பெயர்",
    phone: "தொலைபேசி",
    verify: "சரிபார்",
    confirm: "உறுதி",
    done: "முடிந்தது",
    enterName: "உங்கள் பெயரை உள்ளிடுங்கள்",
    enterPhone: "தொலைபேசி எண் உள்ளிடுங்கள்",
    sayYourName: "உங்கள் முழு பெயரைச் சொல்லுங்கள்.",
    sayPhone: "உங்கள் தொலைபேசி எண்ணைச் சொல்லுங்கள்.",
    orType: "அல்லது கீழே தட்டச்சு செய்யுங்கள்",
    deliveryTimeline: "டெலிவரி டைம்லைன்",
    orderConfirmed: "ஆர்டர் உறுதி",
    packed: "பேக் செய்யப்பட்டது",
    outForDelivery: "டெலிவரிக்கு புறப்பட்டது",
    delivered: "டெலிவர் செய்யப்பட்டது",
    helpCommands: "கிடைக்கும் கட்டளைகள்: அடுத்தது பொருட்களை உலாவ, கார்ட்டில் சேர் நடப்பு பொருளை சேர்க்க, கார்ட் பார் அல்லது என் கார்ட் படி உங்கள் கார்ட் கேட்க, கார்ட்டுக்கு செல் கார்ட் பக்கம் திறக்க, பொருளைப் படி விவரங்கள் கேட்க, செக்அவுட் தொடர, திரும்பு திரும்ப செல்ல, உதவி கட்டளைகள் கேட்க.",
    smartDevices: "ஸ்மார்ட் சாதனங்கள்",
    freshFood: "புதிய உணவு & அத்தியாவசியங்கள்",
    healthBeauty: "ஆரோக்கியம் & அழகு பொருட்கள்",
    medicinesDesc: "ஆரோக்கிய மருந்துகள்",
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = useCallback(
    (key: keyof typeof translations.en) => {
      return translations[language][key] || translations.en[key] || key;
    },
    [language]
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
