import { useEffect, useState } from "react";
import { Camera, ExternalLink, RefreshCw, AlertTriangle, CheckCircle2, XCircle, Mic } from "lucide-react";

interface Props {
  cameraError: string | null;
  cameraErrorName: string | null;
  isActive: boolean;
  devices: MediaDeviceInfo[];
  activeDeviceId: string | null;
  onRetry: (deviceId?: string) => Promise<boolean>;
  onRefreshDevices: () => void;
  suggestAudioOnly?: boolean;
  onEnableAudioOnly?: () => void;
}

function isInIframe() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

export default function CameraTroubleshoot({
  cameraError,
  cameraErrorName,
  isActive,
  devices,
  activeDeviceId,
  onRetry,
  onRefreshDevices,
  suggestAudioOnly,
  onEnableAudioOnly,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [lastResult, setLastResult] = useState<null | "ok" | "fail">(null);
  const [selectedId, setSelectedId] = useState<string>("");
  const inIframe = isInIframe();
  const secure = typeof window !== "undefined" ? window.isSecureContext : false;
  const supported = typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  const enumerable = typeof navigator !== "undefined" && !!navigator.mediaDevices?.enumerateDevices;

  useEffect(() => {
    setSelectedId(activeDeviceId || "");
  }, [activeDeviceId]);

  if (isActive && !cameraError) return null;

  const handleRetry = async (deviceId?: string) => {
    setRetrying(true);
    setLastResult(null);
    const ok = await onRetry(deviceId);
    setLastResult(ok ? "ok" : "fail");
    setRetrying(false);
    onRefreshDevices();
  };

  const openInNewTab = () => {
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  };

  const likelyIframeBlock =
    inIframe && (cameraErrorName === "NotAllowedError" || cameraErrorName === "SecurityError" || !isActive);

  return (
    <div className="glass rounded-xl p-4 border border-primary/40 max-w-md w-full text-left space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-display text-foreground">Camera not active</p>
          {cameraError && <p className="text-xs text-muted-foreground mt-0.5">{cameraError}</p>}
        </div>
      </div>

      {likelyIframeBlock && (
        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
          <p className="text-xs text-muted-foreground mb-2">
            Preview iframe often blocks camera access. Open in a new tab for full permission.
          </p>
          <button
            onClick={openInNewTab}
            className="glass px-3 py-1.5 rounded-md text-xs font-display text-primary shadow-neon inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open in new tab
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => handleRetry(selectedId || undefined)}
          disabled={retrying}
          className="glass px-3 py-1.5 rounded-md text-xs font-display text-primary shadow-neon inline-flex items-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${retrying ? "animate-spin" : ""}`} />
          {retrying ? "Retrying..." : "Retry camera"}
        </button>
        {lastResult === "ok" && (
          <span className="text-xs text-primary inline-flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Camera started</span>
        )}
        {lastResult === "fail" && (
          <span className="text-xs text-destructive inline-flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> Retry failed</span>
        )}
      </div>

      {devices.length > 0 && (
        <div>
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground block mb-1">
            <Camera className="w-3 h-3 inline mr-1" /> Camera device
          </label>
          <div className="flex gap-2">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 bg-background/60 border border-primary/30 rounded-md px-2 py-1.5 text-xs text-foreground"
            >
              <option value="">Default (front)</option>
              {devices.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
            <button
              onClick={() => handleRetry(selectedId || undefined)}
              disabled={retrying}
              className="glass px-3 py-1.5 rounded-md text-xs font-display text-primary shadow-neon disabled:opacity-50"
            >
              Use
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded((v) => !v)}
        className="text-[11px] text-muted-foreground underline underline-offset-2"
      >
        {expanded ? "Hide" : "Show"} troubleshooting details
      </button>

      {expanded && (
        <div className="text-[11px] text-muted-foreground space-y-1 border-t border-primary/20 pt-2">
          <Row label="Error" value={cameraErrorName || "none"} />
          <Row label="getUserMedia" value={supported ? "supported" : "unsupported"} ok={supported} />
          <Row label="enumerateDevices" value={enumerable ? "supported" : "unsupported"} ok={enumerable} />
          <Row label="Secure context (HTTPS)" value={secure ? "yes" : "no"} ok={secure} />
          <Row label="Inside iframe" value={inIframe ? "yes" : "no"} ok={!inIframe} />
          <Row label="Cameras detected" value={String(devices.length)} ok={devices.length > 0} />
          <Row label="Active device" value={activeDeviceId ? activeDeviceId.slice(0, 8) + "…" : "none"} />
        </div>
      )}
    </div>
  );
}

function Row({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}</span>
      <span className={ok === undefined ? "" : ok ? "text-primary" : "text-destructive"}>{value}</span>
    </div>
  );
}
