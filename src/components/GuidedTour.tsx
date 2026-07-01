import { useEffect, useState, useRef } from "react";
import { X, Volume2, VolumeX, ChevronRight, SkipForward } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { getTourAudio } from "@/lib/tour-audio.functions";

export type TourStep = {
  selector: string;
  title: string;
  text: string; // bengali narration + tooltip
};

const DEFAULT_STEPS: TourStep[] = [
  {
    selector: "[data-tour='mining']",
    title: "মাইনিং কার্ড",
    text: "এখানে আপনার আয় লাইভ বাড়তে থাকবে। প্রতি সেকেন্ডে টাকা জমা হবে এবং জমা টাকা আপনি যেকোনো সময় তুলতে পারবেন।",
  },
  {
    selector: "[data-tour='main-identity']",
    title: "প্রধান পরিচয়",
    text: "এটি আপনার নিজের মুখ। প্রথমে এই ঘরে ক্লিক করে নিজের ফেস ভেরিফাই করুন।",
  },
  {
    selector: "[data-tour='witness-grid']",
    title: "সাক্ষী ঘর",
    text: "এই নয়টি ঘরে আপনার পরিচিত সুবিধাবঞ্চিত মানুষের মুখ যোগ করুন। যত বেশি সাক্ষী, তত বেশি মাসিক আয়।",
  },
  {
    selector: "[data-tour='nav-reverify']",
    title: "রি-ভেরিফাই",
    text: "তিন দিন পর অথবা প্রয়োজনে এখান থেকে পুরনো মুখ আবার ভেরিফাই করতে পারবেন।",
  },
  {
    selector: "[data-tour='nav-referral']",
    title: "রেফার করুন",
    text: "বন্ধুদের রেফার করলে তাদের আয়ের দশ শতাংশ বোনাস আপনি পাবেন।",
  },
  {
    selector: "[data-tour='nav-wallet']",
    title: "ওয়ালেট সেট",
    text: "বিকাশ বা নগদ নম্বর একবার সেট করলে সব উইথড্র এই নম্বরেই আসবে।",
  },
  {
    selector: "[data-tour='nav-withdraw']",
    title: "উইথড্র",
    text: "জমা টাকা এখান থেকে যেকোনো সময় তুলতে পারবেন।",
  },
  {
    selector: "[data-tour='profile']",
    title: "প্রোফাইল",
    text: "উপরের বাম কোণে আপনার প্রোফাইল, পাসপোর্ট কার্ড ও লেনদেনের ইতিহাস দেখতে পাবেন।",
  },
];

const STORAGE_KEY = "good-app-tour-v1";

// In-memory cache: text -> signed URL (persists for the session)
const urlCache = new Map<string, string>();
// LocalStorage cache too, so cross-session hits skip the server round trip
const LS_URL_CACHE = "good-app-tour-urls-v1";
function readLsUrlCache(): Record<string, string> {
  try { return JSON.parse(localStorage.getItem(LS_URL_CACHE) || "{}"); } catch { return {}; }
}
function writeLsUrlCache(map: Record<string, string>) {
  try { localStorage.setItem(LS_URL_CACHE, JSON.stringify(map)); } catch {}
}

function pickBengaliVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "bn-BD") ||
    voices.find((v) => v.lang === "bn-IN") ||
    voices.find((v) => v.lang?.startsWith("bn")) ||
    voices.find((v) => v.lang?.startsWith("hi")) ||
    null
  );
}

function speakFallback(text: string) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickBengaliVoice();
    if (v) u.voice = v;
    u.lang = v?.lang || "bn-BD";
    u.rate = 0.95;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
  } catch {}
}

export function GuidedTour({ steps = DEFAULT_STEPS, autoStart = true }: { steps?: TourStep[]; autoStart?: boolean }) {
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [muted, setMuted] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!autoStart || startedRef.current) return;
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY) === "done") return;
    startedRef.current = true;
    // wait a beat for the DOM & voices
    const t = setTimeout(() => {
      window.speechSynthesis?.getVoices();
      setActive(true);
    }, 800);
    return () => clearTimeout(t);
  }, [autoStart]);

  useEffect(() => {
    if (!active) return;
    const step = steps[idx];
    if (!step) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // give scroll a moment before measuring
      setTimeout(() => setRect(el.getBoundingClientRect()), 350);
    } else {
      setRect(null);
    }
    speak(step.text, muted);
    const onResize = () => {
      const e = document.querySelector(step.selector) as HTMLElement | null;
      if (e) setRect(e.getBoundingClientRect());
    };
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
  }, [active, idx, steps, muted]);

  const finish = () => {
    setActive(false);
    try { window.speechSynthesis?.cancel(); } catch {}
    try { localStorage.setItem(STORAGE_KEY, "done"); } catch {}
  };

  const next = () => {
    if (idx >= steps.length - 1) finish();
    else setIdx(idx + 1);
  };

  // Expose replay via global for a button anywhere
  useEffect(() => {
    (window as any).__startGoodAppTour = () => {
      setIdx(0);
      setActive(true);
    };
  }, []);

  if (!active) return null;

  const step = steps[idx];
  const pad = 8;
  const spot = rect
    ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 }
    : null;

  // Tooltip position: below spotlight if room, else above
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const tooltipBelow = !spot || spot.top + spot.height + 180 < vh;
  const tooltipStyle: React.CSSProperties = spot
    ? tooltipBelow
      ? { top: spot.top + spot.height + 12, left: 12, right: 12 }
      : { top: Math.max(12, spot.top - 180), left: 12, right: 12 }
    : { top: "40%", left: 16, right: 16 };

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Dim overlay with SVG mask for spotlight */}
      <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={next}>
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {spot && (
              <rect
                x={spot.left}
                y={spot.top}
                width={spot.width}
                height={spot.height}
                rx="16"
                ry="16"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(9,12,28,0.72)" mask="url(#tour-mask)" />
        {spot && (
          <rect
            x={spot.left}
            y={spot.top}
            width={spot.width}
            height={spot.height}
            rx="16"
            ry="16"
            fill="none"
            stroke="url(#tour-stroke)"
            strokeWidth="3"
            className="tour-pulse"
          />
        )}
        <defs>
          <linearGradient id="tour-stroke" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#ef476f" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Tooltip card */}
      <div
        className="absolute pointer-events-auto rounded-2xl p-4 shadow-2xl border-2 border-white/40 backdrop-blur-xl"
        style={{
          ...tooltipStyle,
          background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(250,245,255,0.95))",
        }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.15em] font-black text-violet-500">
              ধাপ {idx + 1} / {steps.length}
            </p>
            <h3 className="text-base font-black text-navy mt-0.5 leading-tight">{step.title}</h3>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => {
                const m = !muted;
                setMuted(m);
                if (m) { try { window.speechSynthesis?.cancel(); } catch {} }
                else speak(step.text, false);
              }}
              className="p-2 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-600"
              title={muted ? "ভয়েস চালু" : "ভয়েস বন্ধ"}
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              onClick={finish}
              className="p-2 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-600"
              title="বন্ধ করুন"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-[13px] text-navy leading-relaxed font-medium">{step.text}</p>

        <div className="flex items-center justify-between gap-2 mt-3">
          <button
            onClick={finish}
            className="text-[11px] font-bold text-muted-foreground flex items-center gap-1 hover:text-rose"
          >
            <SkipForward className="w-3.5 h-3.5" /> স্কিপ করুন
          </button>
          <button
            onClick={next}
            className="gradient-cta rounded-xl px-4 py-2 text-xs font-black flex items-center gap-1.5 active:scale-95 transition"
          >
            {idx >= steps.length - 1 ? "শেষ" : "পরবর্তী"} <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* progress bar */}
        <div className="mt-3 h-1 rounded-full bg-violet-100 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 transition-all"
            style={{ width: `${((idx + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function TourReplayButton() {
  return (
    <button
      onClick={() => {
        try { localStorage.removeItem(STORAGE_KEY); } catch {}
        (window as any).__startGoodAppTour?.();
      }}
      className="text-[11px] font-bold text-violet-600 hover:text-violet-800 underline"
    >
      🎧 গাইড ট্যুর আবার দেখুন
    </button>
  );
}
