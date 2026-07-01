// Click-driven voice guide.
//
// ✨ NEW behaviour (July 2026): the app no longer auto-plays narration from
// the top of every page. Instead, the user taps any element that carries
// `data-voice="some.key"` and ONLY that one contextual hint plays —
// "you just tapped this, so here's what to do next".
//
// - `<PageVoice />` mounts a single global click listener on the document.
// - Every click walks up to the closest `[data-voice]`. If none, nothing plays.
// - A small floating chip lets the user mute/unmute the whole feature.
// - Audio is fetched from /api/public/tour-audio which serves the same cached
//   MP3 to every user on every browser (0 credits after first play).
// - `pageId` and `steps` props are accepted for backward-compat but ignored.
//   They no longer trigger any sequential auto-play.
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
    if (!res.ok) return null;
    const j = await res.json();
    if (j?.url) { urlCache.set(key, j.url as string); return j.url as string; }
    return null;
  } catch { return null; }
}

// Shared audio slot so a new click always cancels the previous line.
let currentAudio: HTMLAudioElement | null = null;
function playKey(key: NarrationKey) {
  if (typeof window === "undefined") return;
  const muted = localStorage.getItem(MUTE_KEY) === "1";
  if (muted) return;
  fetchAudioUrl(key).then((url) => {
    if (!url) return;
    try { currentAudio?.pause(); } catch {}
    const a = new Audio(url);
    currentAudio = a;
    a.play().catch(() => {});
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
      if (!isNarrationKey(key)) return;
      playKey(key);
    };
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true } as any);
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
  const onClick = async () => {
    if (busy) return;
    setBusy(true);
    const url = await fetchAudioUrl(narrationKey);
    if (!url) { setBusy(false); return; }
    try { currentAudio?.pause(); } catch {}
    const a = new Audio(url);
    currentAudio = a;
    a.onended = () => setBusy(false);
    a.onerror = () => setBusy(false);
    a.play().catch(() => setBusy(false));
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
