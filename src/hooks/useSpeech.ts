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

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const callbackRef = useRef<((text: string) => void) | null>(null);

  const startListening = useCallback((onResult?: (text: string) => void, langOverride?: string) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speak("Speech recognition is not supported in this browser.");
      return;
    }

    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    callbackRef.current = onResult || null;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true; // capture interim for partial Tamil/Hinglish phrases
    // Default to Indian English; Tamil mode uses ta-IN.
    recognition.lang = langOverride || (currentLang === "ta" ? "ta-IN" : "en-IN");
    recognition.maxAlternatives = 8;

    recognition.onresult = (event: any) => {
      let best = event.results[0][0].transcript;
      try {
        const alts = Array.from(event.results[0] as any) as Array<{ transcript: string; confidence: number }>;
        alts.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
        best = alts[0]?.transcript || best;
      } catch {}
      setTranscript(best);
      setIsListening(false);
      callbackRef.current?.(best);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      console.log("Speech recognition error:", e.error);
      setIsListening(false);
    };

    setTimeout(() => {
      try {
        recognition.start();
        setIsListening(true);
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

  return { isListening, transcript, startListening, stopListening };
}
