// Click-driven voice guide.
//
// Behaviour: user taps any element carrying `data-voice="some.key"` and the
// matching narration plays ONCE (contextual "here's what to do next").
//
// Autoplay policy notes:
//   Browsers only let us play <audio> during a real user gesture. If we `await`
//   before creating the Audio element, the gesture is lost and .play() rejects.
//   So we create the Audio element SYNCHRONOUSLY inside the click handler, then
//   set .src after the fetch resolves. First tap "unlocks" playback for the
//   whole session.
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { NarrationKey } from "@/lib/narrations";
import { isNarrationKey } from "@/lib/narrations";

const urlCache = new Map<string, string>();
const MUTE_KEY = "voice-guide-muted";

async function fetchAudioUrl(key: NarrationKey): Promise<string | null> {
  const cached = urlCache.get(key);
  if (cached) return cached;
  try {
    const res = await fetch("/api/public/tour-audio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key }),
    });
    if (!res.ok) {
      console.warn("[voice] tour-audio HTTP", res.status);
      return null;
    }
    const j = await res.json();
    if (j?.url) { urlCache.set(key, j.url as string); return j.url as string; }
    console.warn("[voice] tour-audio response missing url", j);
    return null;
  } catch (e) {
    console.warn("[voice] tour-audio fetch failed", e);
    return null;
  }
}

let currentAudio: HTMLAudioElement | null = null;

// Play by key. MUST be called from inside a real user-gesture handler so the
// audio element is constructed synchronously — otherwise mobile browsers
// reject .play() with NotAllowedError.
function playFromGesture(key: NarrationKey) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(MUTE_KEY) === "1") return;

  try { currentAudio?.pause(); } catch {}
  const a = new Audio();
  a.preload = "auto";
  currentAudio = a;

  // Try to prime playback immediately (some browsers accept a play() call
  // on an empty element to reserve the gesture, then swapping src works).
  const primed = a.play().catch(() => { /* expected on empty src */ });

  fetchAudioUrl(key).then((url) => {
    if (!url || currentAudio !== a) return;
    a.src = url;
    // If primed already resolved (rare), we can play again; else, primed
    // may be pending — either way calling play again is safe.
    Promise.resolve(primed).finally(() => {
      a.play().catch((err) => {
        console.warn("[voice] play blocked", err?.message ?? err);
      });
    });
  });
}

export interface PageVoiceProps {
  pageId?: string;
  steps?: NarrationKey[];
  autoStart?: boolean;
  compact?: boolean;
}

export function PageVoice(_props: PageVoiceProps = {}) {
  const [muted, setMuted] = useState(false);
  const listenerAttached = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setMuted(localStorage.getItem(MUTE_KEY) === "1");
    if (listenerAttached.current) return;
    listenerAttached.current = true;

    const onClick = (ev: MouseEvent) => {
      const target = ev.target as HTMLElement | null;
      if (!target) return;
      const holder = target.closest<HTMLElement>("[data-voice]");
      if (!holder) return;
      const key = holder.getAttribute("data-voice") ?? "";
      if (!isNarrationKey(key)) {
        console.warn("[voice] unknown key on element:", key);
        return;
      }
      playFromGesture(key);
    };
    document.addEventListener("click", onClick, { capture: true });

    // Expose for debugging: window.__voice("home.mining") from devtools.
    (window as any).__voice = (k: string) => {
      if (isNarrationKey(k)) playFromGesture(k);
      else console.warn("[voice] unknown key", k);
    };

    return () => {
      document.removeEventListener("click", onClick, { capture: true } as any);
    };
  }, []);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch {}
    if (m) { try { currentAudio?.pause(); } catch {} }
  };

  return (
    <button
      onClick={toggleMute}
      className="fixed bottom-20 right-3 z-40 rounded-full shadow-2xl px-3 py-2 text-[11px] font-black text-white flex items-center gap-1.5 active:scale-95 transition"
      style={{
        background: muted
          ? "linear-gradient(90deg, #64748b, #334155)"
          : "linear-gradient(90deg, #8b5cf6, #ef476f, #ffd166)",
      }}
      aria-label={muted ? "ভয়েস চালু করুন" : "ভয়েস বন্ধ করুন"}
    >
      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
      {muted ? "ভয়েস বন্ধ" : "ভয়েস চালু"}
    </button>
  );
}

// Inline speaker button — plays one specific hint on demand.
export function SpeakChip({ narrationKey, label }: { narrationKey: NarrationKey; label?: string }) {
  const [busy, setBusy] = useState(false);
  const onClick = () => {
    if (busy) return;
    setBusy(true);
    playFromGesture(narrationKey);
    // Reset busy after a short window (audio duration is unknown until loaded).
    setTimeout(() => setBusy(false), 4000);
  };
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black text-violet-600 bg-violet-100 hover:bg-violet-200 active:scale-95 transition"
      aria-label="Speak">
      <Volume2 className={`w-3 h-3 ${busy ? "animate-pulse" : ""}`} />
      {label ?? "শুনুন"}
    </button>
  );
}
