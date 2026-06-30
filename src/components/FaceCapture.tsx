import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, X, Loader2, Scan, AlertTriangle } from "lucide-react";

type FaceCaptureProps = {
  onCapture: (photoBase64: string) => void;
  onCancel: () => void;
  isUploading?: boolean;
  title?: string;
};

export function FaceCapture({ onCapture, onCancel, isUploading, title }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [faceDetecting, setFaceDetecting] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const [faceWarning, setFaceWarning] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => setCameraReady(true);
      }
    } catch {
      setCameraError("Camera chalu hoini — permission din");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
    if (detectionRef.current) {
      clearInterval(detectionRef.current);
      detectionRef.current = null;
    }
    if (countdownTimerRef.current) {
      clearTimeout(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, [startCamera, stopCamera]);

  const countSkinInRegion = (
    ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number,
  ) => {
    const imageData = ctx.getImageData(x, y, w, h);
    const data = imageData.data;
    let skin = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      if (r > 60 && g > 40 && b > 20 && r > g && r > b &&
          Math.abs(r - g) > 10 && r - b > 15 && r < 250) skin++;
    }
    return skin / (w * h);
  };

  useEffect(() => {
    if (!cameraReady || capturedImage) return;
    let consecutiveDetections = 0;
    const REQUIRED = 6;

    detectionRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = 160; canvas.height = 120;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 160, 120);

      const fx = 38, fy = 12, fw = 84, fh = 96;
      const zh = Math.floor(fh / 3), zw = Math.floor(fw / 3);
      const upper = countSkinInRegion(ctx, fx + zw, fy, zw, zh);
      const bottom = countSkinInRegion(ctx, fx + zw, fy + zh * 2, zw, zh);
      const left = countSkinInRegion(ctx, fx, fy + zh, zw, zh);
      const right = countSkinInRegion(ctx, fx + zw * 2, fy + zh, zw, zh);
      const center = countSkinInRegion(ctx, fx + zw, fy + zh, zw, zh);
      const total = countSkinInRegion(ctx, fx, fy, fw, fh);
      const bg = (
        countSkinInRegion(ctx, 0, 0, 30, 30) +
        countSkinInRegion(ctx, 130, 0, 30, 30) +
        countSkinInRegion(ctx, 0, 90, 30, 30) +
        countSkinInRegion(ctx, 130, 90, 30, 30)
      ) / 4;

      const MIN_ZONE = 0.18, MIN_CENTER = 0.28, MIN_TOTAL = 0.30, MAX_TOTAL = 0.85, BG_DIFF = 0.18;
      const visible = [upper, bottom, left, right].filter((v) => v > MIN_ZONE).length;
      const faceVsBg = total - bg;
      const ok = center > MIN_CENTER && total > MIN_TOTAL && total < MAX_TOTAL && visible === 4 && faceVsBg > BG_DIFF;

      if (total < MIN_TOTAL || faceVsBg < BG_DIFF) setFaceWarning("Mukh dekha jache na — frame e sojha takan");
      else if (center < MIN_CENTER) setFaceWarning("Mukh frame er thik majhe rakhun");
      else if (total > MAX_TOTAL) setFaceWarning("Ektu dure jan");
      else if (visible < 4) setFaceWarning("Puro mukh frame e anun");
      else setFaceWarning(null);

      if (ok) {
        consecutiveDetections++;
        if (consecutiveDetections >= REQUIRED) {
          setFaceDetecting(true);
          setAutoCountdown(2);
          if (detectionRef.current) { clearInterval(detectionRef.current); detectionRef.current = null; }
          let count = 2;
          const tick = () => {
            count--;
            if (count > 0) { setAutoCountdown(count); countdownTimerRef.current = setTimeout(tick, 800); }
            else { setAutoCountdown(null); takePhoto(); }
          };
          countdownTimerRef.current = setTimeout(tick, 800);
        }
      } else {
        consecutiveDetections = Math.max(0, consecutiveDetections - 1);
        setFaceDetecting(false);
      }
    }, 400);

    return () => {
      if (detectionRef.current) { clearInterval(detectionRef.current); detectionRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraReady, capturedImage]);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const c = document.createElement("canvas");
    c.width = video.videoWidth; c.height = video.videoHeight;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.translate(c.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0);
    const dataUrl = c.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
    const base64 = dataUrl.split(",")[1] ?? "";
    onCapture(base64);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Camera className="w-5 h-5 text-cyan" />
        <p className="text-sm font-bold text-cyan">{title ?? "Face photo tulun"}</p>
      </div>

      <div className="bg-amber/10 border border-amber/30 rounded-xl p-3 space-y-1.5 text-foreground">
        <p className="text-[11px] font-bold text-amber flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Photo tular niom:
        </p>
        <ul className="text-[10px] text-foreground/80 leading-relaxed space-y-1 pl-1">
          <li>• Sojha samne takan — mukh baka korben na</li>
          <li>• Bhalo aalo te thakun</li>
          <li>• Chosma / mask khulun</li>
          <li>• Puro mukh frame e ante hobe</li>
          <li>⚠️ Ei photo pore chenar jonno use hobe</li>
        </ul>
      </div>

      <div className="relative rounded-2xl overflow-hidden bg-surface-2 aspect-[4/3]">
        {cameraError ? (
          <div className="absolute inset-0 flex items-center justify-center text-center p-4">
            <div>
              <Camera className="w-10 h-10 text-destructive mx-auto mb-2" />
              <p className="text-sm text-destructive font-bold">{cameraError}</p>
              <button onClick={startCamera} className="mt-3 text-xs text-cyan font-bold underline">
                Abar chesta korun
              </button>
            </div>
          </div>
        ) : capturedImage ? (
          <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
        ) : (
          <>
            <video
              ref={videoRef} autoPlay playsInline muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />
            {!cameraReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-surface-2">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-44 h-56 border-2 border-dashed rounded-[40%] transition-colors ${
                faceDetecting ? "border-emerald animate-pulse" : "border-cyan/50"
              }`} />
            </div>
            {faceDetecting && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-emerald/90 text-primary-foreground px-4 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5">
                <Scan className="w-3.5 h-3.5" />
                {autoCountdown !== null ? `${autoCountdown}...` : "Face dhora poreche!"}
              </div>
            )}
            {cameraReady && !faceDetecting && faceWarning && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-amber/90 text-primary-foreground px-4 py-1.5 rounded-full text-[10px] font-black flex items-center gap-1.5 max-w-[85%] text-center">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                {faceWarning}
              </div>
            )}
            {cameraReady && !faceDetecting && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-background/70 text-muted-foreground px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" />
                Puro mukh khujche...
              </div>
            )}
          </>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className="flex gap-3">
        {capturedImage || isUploading ? (
          <div className="flex-1 py-3 rounded-xl gradient-cta text-sm font-bold flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Check hocche...
          </div>
        ) : (
          <>
            <button onClick={onCancel} className="flex-1 py-3 rounded-xl border border-border bg-surface text-sm font-bold flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> Batil
            </button>
            <button onClick={takePhoto} disabled={!cameraReady}
              className="flex-1 py-3 rounded-xl gradient-cta text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <Camera className="w-4 h-4" /> Photo tulun
            </button>
          </>
        )}
      </div>
    </div>
  );
}
