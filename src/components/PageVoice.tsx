// Sequential page narrator. Auto-plays a list of narration keys on mount,
// one after another. Audio is fetched via /api/public/tour-audio which
// returns the same cached MP3 for every user on every browser (0 credits
// after first play).
//
// Works on both public (auth) and authenticated pages. Persists "seen" per
// page so it doesn't auto-replay every visit — but the floating 🔊 button
// lets user replay whenever they want.
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Play, Pause, ChevronRight, X } from "lucide-react";
import type { NarrationKey } from "@/lib/narrations";
import { NARRATIONS } from "@/lib/narrations";

// In-memory cache for the current session — instant re-play.
const urlCache = new Map<NarrationKey, string>();

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
    if (j?.url) { urlCache.set(key, j.url); return j.url as string; }
    return null;
  } catch { return null; }
}

// Browser speechSynthesis fallback removed — it sounded robotic and could
// overlap with the premium cached audio. Silent fail is preferred.


export interface PageVoiceProps {
  pageId: string;                 // storage key for "seen"
  steps: NarrationKey[];
  autoStart?: boolean;            // default true
  compact?: boolean;              // small chip UI
}

export function PageVoice({ pageId, steps, autoStart = true, compact = false }: PageVoiceProps) {
  const [idx, setIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [visible, setVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const storageKey = `page-voice-seen:${pageId}`;

  // Kick off first-visit auto play
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem(storageKey) === "1";
    if (autoStart && !seen && steps.length > 0) {
      setVisible(true);
      setIdx(0);
      // small delay so page mounts first
      const t = setTimeout(() => void play(0), 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  const stop = () => {
    try { audioRef.current?.pause(); } catch {}
    try { window.speechSynthesis?.cancel(); } catch {}
    audioRef.current = null;
    setPlaying(false);
  };

  const play = async (at: number) => {
    if (muted) return;
    stop();
    const key = steps[at];
    if (!key) return;
    setIdx(at);
    setPlaying(true);
    const url = await fetchAudioUrl(key);
    if (!url) { setPlaying(false); return; }
    const a = new Audio(url);
    audioRef.current = a;
    a.onended = () => {
      setPlaying(false);
      // auto-advance
      if (at + 1 < steps.length) { void play(at + 1); }
      else { try { localStorage.setItem(storageKey, "1"); } catch {} }
    };
    a.onerror = () => { setPlaying(false); };
    a.play().catch(() => { setPlaying(false); });
  };

  const replay = () => { setVisible(true); void play(0); };
  const next = () => { if (idx + 1 < steps.length) void play(idx + 1); else close(); };
  const close = () => {
    stop(); setVisible(false);
    try { localStorage.setItem(storageKey, "1"); } catch {}
  };
  const togglePlay = () => {
    if (playing) { stop(); }
    else void play(idx);
  };
  const toggleMute = () => {
    const m = !muted; setMuted(m);
    if (m) stop();
  };

  // Floating replay chip is always mounted (compact)
  if (!visible) {
    return (
      <button
        onClick={replay}
        className="fixed bottom-20 right-3 z-40 rounded-full shadow-2xl px-3 py-2 text-[11px] font-black bg-gradient-to-r from-violet-500 via-rose-500 to-amber-500 text-white flex items-center gap-1.5 active:scale-95 transition"
        aria-label="Voice guide"
      >
        <Volume2 className="w-4 h-4" /> ভয়েস গাইড
      </button>
    );
  }

  const currentText = NARRATIONS[steps[idx]] ?? "";

  return (
    <div className="fixed bottom-20 inset-x-2 z-40 max-w-md mx-auto rounded-2xl shadow-2xl border-2 border-white/50 backdrop-blur-xl p-3"
      style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.98), rgba(250,245,255,0.95))" }}>
      <div className="flex items-start gap-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 via-rose-500 to-amber-500 text-white flex items-center justify-center shrink-0 shadow-lg">
          {playing ? <Volume2 className="w-4 h-4 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black text-violet-500 uppercase tracking-wider">
            ধাপ {idx + 1} / {steps.length}
          </p>
          <p className="text-[12px] text-navy leading-snug font-medium mt-0.5">{currentText}</p>
        </div>
        <button onClick={close} className="p-1.5 rounded-lg bg-rose-100 text-rose-600 shrink-0" aria-label="বন্ধ">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="flex items-center justify-between gap-1.5 mt-2.5">
        <div className="flex items-center gap-1.5">
          <button onClick={toggleMute} className="p-1.5 rounded-lg bg-violet-100 text-violet-600" aria-label="mute">
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
          <button onClick={togglePlay} className="p-1.5 rounded-lg bg-amber-100 text-amber-700" aria-label="play/pause">
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button onClick={next}
          className="rounded-lg px-3 py-1.5 text-[11px] font-black text-white bg-gradient-to-r from-violet-500 via-rose-500 to-amber-500 flex items-center gap-1 active:scale-95">
          {idx + 1 >= steps.length ? "শেষ" : "পরবর্তী"} <ChevronRight className="w-3 h-3" />
        </button>
      </div>
      <div className="mt-2 h-1 rounded-full bg-violet-100 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-amber-400 via-rose-500 to-violet-500 transition-all"
          style={{ width: `${((idx + 1) / steps.length) * 100}%` }} />
      </div>
    </div>
  );
}

// Small inline speaker button: attach next to any control to play one hint.
export function SpeakChip({ narrationKey, label }: { narrationKey: NarrationKey; label?: string }) {
  const [busy, setBusy] = useState(false);
  const onClick = async () => {
    if (busy) return; setBusy(true);
    try {
      const url = await fetchAudioUrl(narrationKey);
      if (url) {
        const a = new Audio(url);
        a.onended = () => setBusy(false);
        a.onerror = () => { setBusy(false); };
        a.play().catch(() => { setBusy(false); });
      } else {
        setBusy(false);
      }
    } catch { setBusy(false); }
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
