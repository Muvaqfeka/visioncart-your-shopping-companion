import { useState, useCallback, useRef } from "react";

export function speak(text: string, rate = 0.92): Promise<void> {
  return new Promise((resolve) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
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

  const startListening = useCallback((onResult?: (text: string) => void) => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      speak("Speech recognition is not supported in this browser.");
      return;
    }

    // Stop any ongoing speech & previous recognition
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
    }

    callbackRef.current = onResult || null;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 3;

    recognition.onresult = (event: any) => {
      const result = event.results[0][0].transcript;
      setTranscript(result);
      setIsListening(false);
      callbackRef.current?.(result);
    };

    recognition.onend = () => setIsListening(false);
    recognition.onerror = (e: any) => {
      console.log("Speech recognition error:", e.error);
      setIsListening(false);
    };

    // Small delay to ensure TTS is fully stopped before mic activates
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
