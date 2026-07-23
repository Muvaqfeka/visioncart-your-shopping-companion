import { useEffect, useRef, useState, useCallback } from "react";

// Eye Aspect Ratio landmarks for MediaPipe FaceMesh (468 points)
const RIGHT_EYE = { p1: 33, p2: 160, p3: 158, p4: 133, p5: 153, p6: 144 };
const LEFT_EYE = { p1: 362, p2: 385, p3: 387, p4: 263, p5: 373, p6: 380 };
const DEFAULT_THRESHOLD = 0.23;
const DOUBLE_BLINK_WINDOW = 900;
const POST_ACTION_COOLDOWN = 1400;
const MAX_CAMERA_RETRIES_BEFORE_AUDIO = 2;
const SMOOTH_WINDOW = 3;           // frames averaged for EAR smoothing
const MIN_CLOSED_FRAMES = 2;       // consecutive frames below thr to count as closed
const MIN_OPEN_FRAMES = 2;         // consecutive frames above thr to count as re-opened
const MIN_BLINK_GAP = 220;         // ms — ignore any blink within this window of last raw blink
const EAR_SAMPLE_LIMIT = 600;      // ring buffer of recent EAR samples

const LS_DEVICE = "svc.cameraDeviceId";
const LS_THRESHOLD = "svc.blinkThreshold";
const LS_AUDIO_ONLY = "svc.audioOnly";

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

export interface BlinkEvent {
  t: number;
  type: "single" | "double" | "raw";
}

interface BlinkOptions {
  onSingleBlink?: () => void;
  onDoubleBlink?: () => void;
  enabled?: boolean;
}

const EYE_LANDMARK_IDS = [
  ...Object.values(LEFT_EYE),
  ...Object.values(RIGHT_EYE),
];

function readStoredThreshold(): number {
  try {
    const raw = localStorage.getItem(LS_THRESHOLD);
    if (!raw) return DEFAULT_THRESHOLD;
    const v = parseFloat(raw);
    if (Number.isFinite(v) && v > 0.05 && v < 0.5) return v;
  } catch {}
  return DEFAULT_THRESHOLD;
}

function readStoredDevice(): string | null {
  try { return localStorage.getItem(LS_DEVICE); } catch { return null; }
}

function readStoredAudioOnly(): boolean {
  try { return localStorage.getItem(LS_AUDIO_ONLY) === "1"; } catch { return false; }
}

export function useBlinkDetection({ onSingleBlink, onDoubleBlink, enabled = true }: BlinkOptions) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const callbacksRef = useRef({ onSingleBlink, onDoubleBlink });
  callbacksRef.current = { onSingleBlink, onDoubleBlink };

  // Live debug state
  const [ear, setEar] = useState(1);
  const [landmarks, setLandmarks] = useState<Array<{ x: number; y: number }>>([]);
  const [blinkEvents, setBlinkEvents] = useState<BlinkEvent[]>([]);
  const pushEvent = (type: BlinkEvent["type"]) => {
    setBlinkEvents((prev) => [{ t: Date.now(), type }, ...prev].slice(0, 20));
  };

  // Adjustable threshold (persisted)
  const [threshold, setThresholdState] = useState<number>(() => readStoredThreshold());
  const thresholdRef = useRef(threshold);
  useEffect(() => { thresholdRef.current = threshold; }, [threshold]);
  const setThreshold = useCallback((v: number) => {
    const clamped = Math.min(0.45, Math.max(0.1, v));
    setThresholdState(clamped);
    try { localStorage.setItem(LS_THRESHOLD, String(clamped)); } catch {}
  }, []);

  // Audio-only mode (persisted)
  const [audioOnly, setAudioOnlyState] = useState<boolean>(() => readStoredAudioOnly());
  const setAudioOnly = useCallback((v: boolean) => {
    setAudioOnlyState(v);
    try { localStorage.setItem(LS_AUDIO_ONLY, v ? "1" : "0"); } catch {}
    if (v) {
      // Stop any existing stream
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setIsActive(false);
      setCameraReady(false);
    }
  }, []);

  const blinkStateRef = useRef({
    wasClosed: false,
    closedFrames: 0,
    openFrames: 0,
    lastRawBlinkAt: 0,
    blinkTimes: [] as number[],
    pendingTimer: null as ReturnType<typeof setTimeout> | null,
    cooldownUntil: 0,
  });

  // Rolling EAR window (smoothing) and sample buffer (diagnostics)
  const earWindowRef = useRef<number[]>([]);
  const earSamplesRef = useRef<Array<{ t: number; ear: number; smoothed: number; closed: boolean }>>([]);

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
    pushEvent("raw");
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
        pushEvent("double");
        callbacksRef.current.onDoubleBlink?.();
        setTimeout(triggerCooldown, 50);
        return;
      }
    }

    st.pendingTimer = setTimeout(() => {
      st.blinkTimes = [];
      triggerCooldown();
      pushEvent("single");
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

  // Camera setup
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraErrorName, setCameraErrorName] = useState<string | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const failCountRef = useRef(0);

  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list.filter((d) => d.kind === "videoinput"));
    } catch {}
  }, []);

  const startCamera = useCallback(async (deviceId?: string, opts?: { persist?: boolean }) => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setRetryCount((c) => c + 1);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw Object.assign(new Error("getUserMedia not supported"), { name: "NotSupportedError" });
      }
      if (typeof window !== "undefined" && !window.isSecureContext && location.hostname !== "localhost") {
        throw Object.assign(new Error("Insecure context"), { name: "SecurityError" });
      }
      const resolvedId = deviceId ?? readStoredDevice() ?? undefined;
      const constraints: MediaStreamConstraints = {
        video: resolvedId
          ? { deviceId: { exact: resolvedId }, width: 640, height: 480 }
          : { width: 640, height: 480, facingMode: "user" },
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      const track = stream.getVideoTracks()[0];
      const settledId = (track?.getSettings() as any)?.deviceId || resolvedId || null;
      setActiveDeviceId(settledId);
      if (opts?.persist !== false && settledId) {
        try { localStorage.setItem(LS_DEVICE, settledId); } catch {}
      }
      setCameraReady(true);
      setIsActive(true);
      setCameraError(null);
      setCameraErrorName(null);
      failCountRef.current = 0;
      refreshDevices();
      return true;
    } catch (err: any) {
      const name = err?.name || "Error";
      failCountRef.current += 1;
      setCameraErrorName(name);
      setCameraError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Camera permission denied. Click Retry and allow access."
          : name === "NotFoundError" || name === "DevicesNotFoundError"
          ? "No camera found on this device."
          : name === "NotReadableError" || name === "TrackStartError"
          ? "Camera is in use by another app."
          : name === "OverconstrainedError"
          ? "Selected camera doesn't support required settings."
          : name === "SecurityError"
          ? "Insecure context — camera requires HTTPS."
          : name === "NotSupportedError"
          ? "This browser does not support camera access."
          : `Camera error: ${name}`
      );
      setIsActive(false);
      return false;
    }
  }, [refreshDevices]);

  useEffect(() => {
    if (!enabled || audioOnly) return;
    startCamera();
    refreshDevices();
    const handler = () => refreshDevices();
    navigator.mediaDevices?.addEventListener?.("devicechange", handler);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      navigator.mediaDevices?.removeEventListener?.("devicechange", handler);
    };
  }, [enabled, audioOnly, startCamera, refreshDevices]);

  // MediaPipe FaceMesh setup
  useEffect(() => {
    if (!cameraReady || !enabled || audioOnly) return;
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
          if (!results.multiFaceLandmarks?.[0]) {
            setLandmarks([]);
            return;
          }
          const lm = results.multiFaceLandmarks[0] as Point[];
          const eyeEar = (calcEAR(lm, LEFT_EYE) + calcEAR(lm, RIGHT_EYE)) / 2;
          setEar(eyeEar);
          setLandmarks(EYE_LANDMARK_IDS.map((i) => ({ x: lm[i].x, y: lm[i].y })));
          const st = blinkStateRef.current;
          const thr = thresholdRef.current;

          if (eyeEar < thr && !st.wasClosed) {
            st.wasClosed = true;
          } else if (eyeEar >= thr && st.wasClosed) {
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
  }, [cameraReady, enabled, audioOnly, handleBlink]);

  const suggestAudioOnly = failCountRef.current >= MAX_CAMERA_RETRIES_BEFORE_AUDIO;

  return {
    videoRef,
    isActive,
    mediaPipeLoaded,
    cameraReady,
    cameraError,
    cameraErrorName,
    startCamera,
    devices,
    activeDeviceId,
    refreshDevices,
    // debug / calibration / audio-only
    ear,
    landmarks,
    blinkEvents,
    threshold,
    setThreshold,
    audioOnly,
    setAudioOnly,
    manualBlink: handleBlink,
    retryCount,
    suggestAudioOnly,
  };
}
