import { useEffect, useRef, useState, useCallback } from "react";

// Eye Aspect Ratio landmarks for MediaPipe FaceMesh (468 points)
const RIGHT_EYE = { p1: 33, p2: 160, p3: 158, p4: 133, p5: 153, p6: 144 };
const LEFT_EYE = { p1: 362, p2: 385, p3: 387, p4: 263, p5: 373, p6: 380 };
const EAR_THRESHOLD = 0.23;
const DOUBLE_BLINK_WINDOW = 900;
const BLINK_MIN_DURATION = 50;
const POST_ACTION_COOLDOWN = 1400;

interface Point { x: number; y: number; z: number }

function dist(a: Point, b: Point) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function calcEAR(lm: Point[], eye: typeof RIGHT_EYE) {
  const v1 = dist(lm[eye.p2], lm[eye.p6]);
  const v2 = dist(lm[eye.p3], lm[eye.p5]);
  const h = dist(lm[eye.p1], lm[eye.p4]);
  return h > 0 ? (v1 + v2) / (2 * h) : 1;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src;
    s.crossOrigin = "anonymous";
    s.onload = () => resolve();
    s.onerror = () => reject();
    document.head.appendChild(s);
  });
}

interface BlinkOptions {
  onSingleBlink?: () => void;
  onDoubleBlink?: () => void;
  enabled?: boolean;
}

export function useBlinkDetection({ onSingleBlink, onDoubleBlink, enabled = true }: BlinkOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const callbacksRef = useRef({ onSingleBlink, onDoubleBlink });
  callbacksRef.current = { onSingleBlink, onDoubleBlink };

  const blinkStateRef = useRef({
    wasClosed: false,
    blinkTimes: [] as number[],
    pendingTimer: null as ReturnType<typeof setTimeout> | null,
    cooldownUntil: 0,
  });

  const isBusy = () => {
    const st = blinkStateRef.current;
    if (Date.now() < st.cooldownUntil) return true;
    try {
      if (typeof window !== "undefined" && window.speechSynthesis?.speaking) return true;
    } catch {}
    return false;
  };

  const triggerCooldown = () => {
    blinkStateRef.current.cooldownUntil = Date.now() + POST_ACTION_COOLDOWN;
  };

  const handleBlink = useCallback(() => {
    const st = blinkStateRef.current;
    // Ignore blinks while a previous action / speech is still in progress
    if (isBusy()) return;
    const now = Date.now();
    st.blinkTimes.push(now);
    st.blinkTimes = st.blinkTimes.filter((t) => now - t < DOUBLE_BLINK_WINDOW + 200);

    if (st.pendingTimer) clearTimeout(st.pendingTimer);

    if (st.blinkTimes.length >= 2) {
      const gap = st.blinkTimes[st.blinkTimes.length - 1] - st.blinkTimes[st.blinkTimes.length - 2];
      if (gap < DOUBLE_BLINK_WINDOW) {
        st.blinkTimes = [];
        triggerCooldown();
        callbacksRef.current.onDoubleBlink?.();
        // extend cooldown a bit after callback so any speech started inside it is respected
        setTimeout(triggerCooldown, 50);
        return;
      }
    }

    st.pendingTimer = setTimeout(() => {
      st.blinkTimes = [];
      triggerCooldown();
      callbacksRef.current.onSingleBlink?.();
      setTimeout(triggerCooldown, 50);
    }, DOUBLE_BLINK_WINDOW);
  }, []);

  // Keyboard fallback: B = blink
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "b" || e.key === "B") handleBlink();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled, handleBlink]);

  // Camera setup — auto-start, and expose startCamera() for user-gesture fallback
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    if (streamRef.current) return true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
      setIsActive(true);
      setCameraError(null);
      return true;
    } catch (err: any) {
      const name = err?.name || "Error";
      setCameraError(
        name === "NotAllowedError"
          ? "Camera permission denied. Click Enable Camera and allow access."
          : name === "NotFoundError"
          ? "No camera found on this device."
          : name === "NotReadableError"
          ? "Camera is in use by another app."
          : `Camera error: ${name}`
      );
      setIsActive(false);
      return false;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    startCamera();
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [enabled, startCamera]);

  // MediaPipe FaceMesh setup
  useEffect(() => {
    if (!cameraReady || !enabled) return;
    let cancelled = false;
    let camera: any = null;

    (async () => {
      try {
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/face_mesh.js");
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3.1632432234/camera_utils.js");
        if (cancelled) return;

        const FaceMesh = (window as any).FaceMesh;
        const Camera = (window as any).Camera;
        if (!FaceMesh || !Camera || !videoRef.current) return;

        const faceMesh = new FaceMesh({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`,
        });

        faceMesh.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.onResults((results: any) => {
          if (!results.multiFaceLandmarks?.[0]) return;
          const lm = results.multiFaceLandmarks[0] as Point[];
          const ear = (calcEAR(lm, LEFT_EYE) + calcEAR(lm, RIGHT_EYE)) / 2;
          const st = blinkStateRef.current;

          if (ear < EAR_THRESHOLD && !st.wasClosed) {
            st.wasClosed = true;
          } else if (ear >= EAR_THRESHOLD && st.wasClosed) {
            st.wasClosed = false;
            handleBlink();
          }
        });

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current) await faceMesh.send({ image: videoRef.current });
          },
          width: 640,
          height: 480,
        });
        camera.start();
        setMediaPipeLoaded(true);
      } catch {
        console.log("MediaPipe not available, using keyboard fallback (press B to blink)");
      }
    })();

    return () => {
      cancelled = true;
      camera?.stop?.();
    };
  }, [cameraReady, enabled, handleBlink]);

  return { videoRef, isActive, mediaPipeLoaded, cameraReady, cameraError, startCamera };
}

