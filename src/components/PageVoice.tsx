import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import type { NarrationKey } from "@/lib/narrations";
import {
  attachVoiceClickListener,
  isVoiceMuted,
  playVoiceFromGesture,
  preloadVoices,
  setVoiceMuted,
  stopVoice,
} from "@/lib/voice-guide";

export interface PageVoiceProps {
  pageId?: string;
  steps?: NarrationKey[];
  autoStart?: boolean;
  compact?: boolean;
}

export function PageVoice(_props: PageVoiceProps = {}) {
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    attachVoiceClickListener();
    setMuted(isVoiceMuted());
    preloadVoices(_props.steps ?? []);
  }, [_props.steps]);

  const toggleMute = () => {
    const m = !muted;
    setMuted(m);
    setVoiceMuted(m);
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
    stopVoice();
    playVoiceFromGesture(narrationKey);
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
