import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { createHash } from "crypto";

const BUCKET = "tour-audio";
const VOICE = "shimmer";
const MODEL = "openai/gpt-4o-mini-tts";
const SIGN_TTL = 60 * 60 * 24 * 365; // 1 year

function hashKey(text: string) {
  return createHash("sha256").update(`${VOICE}|${text}`).digest("hex");
}

/**
 * Returns a signed URL for the cached TTS audio of `text`.
 * If not cached, generates via Lovable AI TTS, uploads, then signs.
 * First call by any user pays credits; every subsequent call = 0 credits.
 */
export const getTourAudio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { text: string }) => {
    if (!input?.text || typeof input.text !== "string") throw new Error("text required");
    if (input.text.length > 800) throw new Error("text too long");
    return input;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const hash = hashKey(data.text);
    const path = `cache/${hash}.mp3`;

    // Check if already cached
    const { data: list } = await supabaseAdmin.storage
      .from(BUCKET)
      .list("cache", { search: `${hash}.mp3`, limit: 1 });

    if (!list || list.length === 0) {
      // Generate via Lovable AI TTS
      const apiKey = process.env.LOVABLE_API_KEY;
      if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

      const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: MODEL,
          input: data.text,
          voice: VOICE,
          response_format: "mp3",
          instructions: "You are a warm, friendly young Bangladeshi woman speaking natural, fluent Bengali (Bangla, bn-BD). Pronounce every Bengali word clearly and correctly with proper Bangla intonation — do NOT read it as English or Hindi. Speak at a calm, gentle, conversational pace. Warm, soft, human tone. Never robotic.",
        }),
      });

      if (!res.ok) {
        const errTxt = await res.text().catch(() => "");
        if (res.status === 402) throw new Error("Lovable AI credits শেষ — অ্যাডমিনকে জানান।");
        if (res.status === 429) throw new Error("Rate limit — কিছুক্ষণ পরে চেষ্টা করুন।");
        throw new Error(`TTS failed: ${res.status} ${errTxt.slice(0, 200)}`);
      }

      const audioBuf = new Uint8Array(await res.arrayBuffer());
      const { error: upErr } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, audioBuf, { contentType: "audio/mpeg", upsert: true });
      if (upErr) throw new Error(`upload failed: ${upErr.message}`);
    }

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, SIGN_TTL);
    if (signErr || !signed?.signedUrl) throw new Error(signErr?.message || "sign failed");

    return { url: signed.signedUrl, cached: !!(list && list.length > 0) };
  });
