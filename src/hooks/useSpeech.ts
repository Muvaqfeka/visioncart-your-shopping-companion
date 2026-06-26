import { useState, useCallback, useRef } from "react";

// Module-level language so plain speak() picks the right voice.
let currentLang: "en" | "ta" = "en";
export function setSpeechLanguage(lang: "en" | "ta") {
  currentLang = lang;
}

function pickVoice(lang: "en" | "ta"): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return undefined;
  const target = lang === "ta" ? ["ta-IN", "ta"] : ["en-IN", "en-GB", "en-US", "en"];
  for (const code of target) {
    const v = voices.find((vv) => vv.lang?.toLowerCase().startsWith(code.toLowerCase()));
    if (v) return v;
  }
  return undefined;
}

export function speak(text: string, rate = 0.95): Promise<void> {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voice = pickVoice(currentLang);
    utterance.lang = currentLang === "ta" ? "ta-IN" : "en-IN";
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    utterance.pitch = 1.05;
    utterance.volume = 1;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  window.speechSynthesis.cancel();
}

// ============= Confidence-aware command matching =============
// Matches a transcript against a list of phrases (any language). Uses
// substring + fuzzy token overlap to be more forgiving for Indian
// English / Tamil accents.

export interface CommandMatch {
  matched: boolean;
  phrase?: string;
  score: number; // 0..1
}

export function matchCommand(transcript: string, phrases: string[], threshold = 0.45): CommandMatch {
  const t = (transcript || "").toLowerCase().trim();
  if (!t) return { matched: false, score: 0 };
  let best: CommandMatch = { matched: false, score: 0 };
  for (const phrase of phrases) {
    const p = phrase.toLowerCase().trim();
    if (!p) continue;
    let score = 0;
    if (t.includes(p) || p.includes(t)) score = 1;
    else {
      const tTokens = new Set(t.split(/\s+/));
      const pTokens = p.split(/\s+/);
      const hit = pTokens.filter((x) => tTokens.has(x)).length;
      score = pTokens.length ? hit / pTokens.length : 0;
    }
    if (score > best.score) best = { matched: score >= threshold, phrase, score };
  }
  return best;
}

// Convenience phrase banks — covers Indian English variants + Tamil
export const COMMAND_PHRASES = {
  goToCart: [
    "go to cart", "open cart", "open my cart", "show cart", "show my cart",
    "view cart", "view my cart", "see cart", "checkout cart", "cart page",
    "take me to cart", "go cart", "goto cart", "navigate to cart", "my cart",
    "கார்ட்டுக்கு செல்", "என் கார்ட் காட்டு", "கார்ட் திற",
  ],
  addToCart: [
    "add to cart", "add this", "add it", "add product", "add this product",
    "add to my cart", "put in cart", "buy this", "buy it", "order this",
    "i want this", "take this", "add cart",
    "கார்ட்டில் சேர்", "சேர்", "இதை சேர்", "வாங்கு", "எனக்கு வேண்டும்",
  ],
  english: ["english", "inglish", "anglish", "इंग्लिश", "ஆங்கிலம்"],
  tamil: ["tamil", "tamizh", "thamil", "தமிழ்", "तमिल"],
  help: ["help", "commands", "what can i say", "options", "உதவி", "கட்டளைகள்"],
  next: ["next", "next product", "next one", "forward", "அடுத்தது", "அடுத்த"],
  previous: ["previous", "back", "previous product", "முந்தையது"],
  readCart: ["read cart", "read my cart", "tell me my cart", "என் கார்ட் படி"],
  checkout: ["checkout", "pay", "pay now", "proceed to pay", "செக்அவுட்"],
  whereIsOrder: ["where is my order", "track order", "order status", "where is order", "என் ஆர்டர் எங்கே"],
};

interface ListenOpts {
  onResult: (text: string, confidence: number) => void;
  onInterim?: (text: string) => void;
  langOverride?: string;
  retries?: number; // auto-retry count when no speech detected
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback((
    onResultOrOpts?: ((text: string) => void) | ListenOpts,
    langOverride?: string,
  ) => {
    const opts: ListenOpts = typeof onResultOrOpts === "function"
      ? { onResult: (t) => (onResultOrOpts as any)(t), langOverride, retries: 1 }
      : (onResultOrOpts as ListenOpts) || { onResult: () => {}, retries: 1 };

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speak("Speech recognition is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = opts.langOverride || (currentLang === "ta" ? "ta-IN" : "en-IN");
    recognition.maxAlternatives = 8;

    let finalFired = false;
    let lastInterim = "";

    recognition.onresult = (event: any) => {
      let bestFinal = "";
      let bestConf = 0;
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          try {
            const alts = Array.from(res as any) as Array<{ transcript: string; confidence: number }>;
            alts.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
            bestFinal = alts[0]?.transcript || res[0].transcript;
            bestConf = alts[0]?.confidence ?? 0;
          } catch { bestFinal = res[0].transcript; }
        } else {
          interim += res[0].transcript;
        }
      }
      if (interim && interim !== lastInterim) {
        lastInterim = interim;
        setInterimText(interim);
        opts.onInterim?.(interim);
      }
      if (bestFinal && !finalFired) {
        finalFired = true;
        setTranscript(bestFinal);
        setInterimText("");
        setIsListening(false);
        opts.onResult(bestFinal, bestConf);
        try { recognition.stop(); } catch {}
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!finalFired && lastInterim) {
        // Promote interim to final if engine ended without firing.
        finalFired = true;
        setTranscript(lastInterim);
        setInterimText("");
        opts.onResult(lastInterim, 0.4);
      }
    };

    recognition.onerror = (e: any) => {
      console.log("Speech recognition error:", e.error);
      setIsListening(false);
      const retries = opts.retries ?? 0;
      if ((e.error === "no-speech" || e.error === "aborted") && retries > 0 && !finalFired) {
        setTimeout(() => {
          startListening({ ...opts, retries: retries - 1 } as any);
        }, 250);
      }
    };

    setTimeout(() => {
      try {
        recognition.start();
        setIsListening(true);
        setInterimText("");
        recognitionRef.current = recognition;
      } catch (e) {
        console.log("Recognition start error:", e);
        setIsListening(false);
      }
    }, 300);
  }, []);

  const stopListening = useCallback(() => {
    try { recognitionRef.current?.stop(); } catch {}
    setIsListening(false);
  }, []);

  return { isListening, transcript, interimText, startListening, stopListening };
}
