import type { NarrationKey } from "@/lib/narrations";
import { isNarrationKey } from "@/lib/narrations";

export const VOICE_MUTE_KEY = "voice-guide-muted";

const SILENT_WAV =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

const urlCache = new Map<NarrationKey, string>();
const bufferCache = new Map<NarrationKey, AudioBuffer>();
const loadingCache = new Map<NarrationKey, Promise<AudioBuffer | string | null>>();

let audioContext: AudioContext | null = null;
let currentAudio: HTMLAudioElement | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let playToken = 0;
let clickListenerAttached = false;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) audioContext = new AudioCtor({ sampleRate: 24000 });
  return audioContext;
}

function stopCurrent() {
  try { currentAudio?.pause(); } catch {}
  try { currentSource?.stop(); } catch {}
  currentAudio = null;
  currentSource = null;
}

export function stopVoice() {
  playToken += 1;
  stopCurrent();
}

export function isVoiceMuted() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(VOICE_MUTE_KEY) === "1";
}

export function setVoiceMuted(muted: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(VOICE_MUTE_KEY, muted ? "1" : "0");
  if (muted) stopVoice();
}

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
      console.warn("[voice] audio endpoint failed", key, res.status);
      return null;
    }
    const json = await res.json();
    if (typeof json?.url === "string") {
      urlCache.set(key, json.url);
      return json.url;
    }
  } catch (error) {
    console.warn("[voice] audio url fetch failed", key, error);
  }
  return null;
}

async function prepareVoice(key: NarrationKey): Promise<AudioBuffer | string | null> {
  const ready = bufferCache.get(key);
  if (ready) return ready;
  const existing = loadingCache.get(key);
  if (existing) return existing;

  const promise = (async () => {
    const url = await fetchAudioUrl(key);
    if (!url) return null;
    const ctx = getAudioContext();
    if (!ctx) return url;
    try {
      const response = await fetch(url, { cache: "force-cache" });
      if (!response.ok) return url;
      const arrayBuffer = await response.arrayBuffer();
      const decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
      bufferCache.set(key, decoded);
      return decoded;
    } catch (error) {
      console.warn("[voice] decode failed, falling back to audio tag", key, error);
      return url;
    }
  })();

  loadingCache.set(key, promise);
  return promise;
}

function unlockFromGesture() {
  const ctx = getAudioContext();
  if (ctx) {
    void ctx.resume().catch(() => {});
    try {
      const source = ctx.createBufferSource();
      source.buffer = ctx.createBuffer(1, 1, 24000);
      source.connect(ctx.destination);
      source.start(0);
    } catch {}
  }

  // iOS/Safari also likes a real HTMLAudioElement to be touched during gesture.
  const primingAudio = new Audio(SILENT_WAV);
  primingAudio.volume = 0.01;
  void primingAudio.play().catch(() => {});
}

async function playBuffer(buffer: AudioBuffer) {
  const ctx = getAudioContext();
  if (!ctx) return false;
  await ctx.resume().catch(() => {});
  stopCurrent();
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  currentSource = source;
  source.start(Math.max(ctx.currentTime + 0.015, ctx.currentTime));
  source.onended = () => {
    if (currentSource === source) currentSource = null;
  };
  return true;
}

function playUrl(url: string) {
  stopCurrent();
  const audio = new Audio(url);
  audio.preload = "auto";
  currentAudio = audio;
  void audio.play().catch((error) => {
    console.warn("[voice] audio play blocked", error?.message ?? error);
  });
}

export function playVoiceFromGesture(key: NarrationKey) {
  if (typeof window === "undefined" || isVoiceMuted()) return;
  unlockFromGesture();
  const token = ++playToken;
  const ready = bufferCache.get(key);
  if (ready) {
    void playBuffer(ready);
    return;
  }

  stopCurrent();
  prepareVoice(key).then((prepared) => {
    if (!prepared || token !== playToken || isVoiceMuted()) return;
    if (prepared instanceof AudioBuffer) void playBuffer(prepared);
    else playUrl(prepared);
  });
}

export function preloadVoices(keys: readonly NarrationKey[] = []) {
  if (typeof window === "undefined") return;
  const unique = Array.from(new Set(keys.filter(isNarrationKey)));
  window.setTimeout(() => {
    unique.forEach((key, index) => {
      window.setTimeout(() => { void prepareVoice(key); }, index * 180);
    });
  }, 350);
}

export function attachVoiceClickListener() {
  if (typeof document === "undefined" || clickListenerAttached) return;
  clickListenerAttached = true;
  document.addEventListener("click", (event) => {
    const target = event.target as HTMLElement | null;
    const holder = target?.closest<HTMLElement>("[data-voice]");
    if (!holder) return;
    const key = holder.getAttribute("data-voice") ?? "";
    if (!isNarrationKey(key)) {
      console.warn("[voice] unknown key", key);
      return;
    }
    playVoiceFromGesture(key);
  }, { capture: true });

  (window as any).__voice = (key: string) => {
    if (isNarrationKey(key)) playVoiceFromGesture(key);
    else console.warn("[voice] unknown key", key);
  };
}