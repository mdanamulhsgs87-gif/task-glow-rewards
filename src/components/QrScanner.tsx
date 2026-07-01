import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, Camera, Loader2 } from "lucide-react";

export function QrScanner({ onResult, onClose }: { onResult: (text: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, audio: false,
        });
        if (!active) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();
        setLoading(false);
        const canvas = document.createElement("canvas");
        canvasRef.current = canvas;
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        const tick = () => {
          if (!active || !videoRef.current) return;
          const v = videoRef.current;
          if (v.readyState === v.HAVE_ENOUGH_DATA) {
            canvas.width = v.videoWidth;
            canvas.height = v.videoHeight;
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (code?.data) { onResult(code.data.trim()); return; }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        setError(e?.message ?? "ক্যামেরা খোলা গেল না");
        setLoading(false);
      }
    })();
    return () => {
      active = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult]);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white">
        <X className="w-5 h-5" />
      </button>
      <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden border-2 border-cyan-400/50 shadow-2xl">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white z-10 gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <p className="text-xs font-bold">ক্যামেরা চালু হচ্ছে…</p>
          </div>
        )}
        <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
        <div className="pointer-events-none absolute inset-6 rounded-2xl border-4 border-emerald-400/80 shadow-[0_0_40px_rgba(52,211,153,0.6)]" />
      </div>
      {error
        ? <p className="mt-4 text-rose-200 font-bold text-sm text-center">{error}</p>
        : <p className="mt-4 text-white/90 font-bold text-sm flex items-center gap-2"><Camera className="w-4 h-4" /> QR কোডটা ফ্রেমের ভিতরে রাখুন</p>}
    </div>
  );
}
