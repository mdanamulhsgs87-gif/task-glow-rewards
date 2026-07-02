import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const KycInput = z.object({
  photo: z.string().min(100), // base64 of face photo (jpeg)
  nid_front: z.string().min(100),
  nid_back: z.string().optional().nullable(),
});

type ExtractedNid = {
  name?: string | null;
  nid_number?: string | null;
  date_of_birth?: string | null; // YYYY-MM-DD
  father_name?: string | null;
  mother_name?: string | null;
  full_address?: string | null;
  village_area?: string | null;
  post_office?: string | null;
  thana_upazila?: string | null;
  district?: string | null;
};

async function extractNidFields(frontB64: string, backB64?: string | null): Promise<ExtractedNid> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) return {};
  const content: any[] = [
    {
      type: "text",
      text:
        "You are an OCR agent for Bangladeshi NID cards. Read the NID image(s) and return STRICT JSON with these keys (any missing → null): name, nid_number (digits only), date_of_birth (YYYY-MM-DD), father_name, mother_name, full_address, village_area, post_office, thana_upazila, district. Bangla text should stay in Bangla. Return JSON only, no prose.",
    },
    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${frontB64}` } },
  ];
  if (backB64) {
    content.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${backB64}` } });
  }

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content }],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("KYC OCR failed:", res.status, await res.text().catch(() => ""));
      return {};
    }
    const j: any = await res.json();
    const raw = j?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed as ExtractedNid;
  } catch (e) {
    console.error("KYC OCR error:", e);
    return {};
  }
}

export const submitKyc = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => KycInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const stamp = Date.now();
    const photoPath = `${userId}/kyc-photo-${stamp}.jpg`;
    const nidFrontPath = `${userId}/nid-front-${stamp}.jpg`;
    const nidBackPath = data.nid_back ? `${userId}/nid-back-${stamp}.jpg` : null;

    const photoBuf = Buffer.from(data.photo, "base64");
    const nidFrontBuf = Buffer.from(data.nid_front, "base64");

    // Upload NID images to private kyc bucket
    const up1 = await supabaseAdmin.storage.from("kyc").upload(nidFrontPath, nidFrontBuf, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (up1.error) throw new Error(up1.error.message);

    if (nidBackPath && data.nid_back) {
      const backBuf = Buffer.from(data.nid_back, "base64");
      const up2 = await supabaseAdmin.storage.from("kyc").upload(nidBackPath, backBuf, {
        contentType: "image/jpeg",
        upsert: true,
      });
      if (up2.error) throw new Error(up2.error.message);
    }

    // Upload face photo also to avatars bucket → becomes profile picture
    const avatarPath = `${userId}/kyc-avatar-${stamp}.jpg`;
    const upA = await supabaseAdmin.storage.from("avatars").upload(avatarPath, photoBuf, {
      contentType: "image/jpeg",
      upsert: true,
    });
    if (upA.error) throw new Error(upA.error.message);

    // Also store photo in kyc bucket for admin audit
    await supabaseAdmin.storage.from("kyc").upload(photoPath, photoBuf, {
      contentType: "image/jpeg",
      upsert: true,
    });

    // Extract NID details (best effort — never blocks KYC)
    const extracted = await extractNidFields(data.nid_front, data.nid_back ?? null);

    const cleanStr = (v: any, max = 180) => {
      const t = typeof v === "string" ? v.trim() : "";
      return t ? t.slice(0, max) : null;
    };
    const cleanDob = (v: any) => {
      const t = typeof v === "string" ? v.trim() : "";
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
      return null;
    };
    const cleanNid = (v: any) => {
      const digits = String(v ?? "").replace(/\D/g, "");
      return digits ? digits.slice(0, 20) : null;
    };

    // Load current profile — don't overwrite user's non-empty fields
    const { data: current } = await supabaseAdmin
      .from("profiles")
      .select("display_name,nid_number,date_of_birth,father_name,mother_name,full_address,village_area,post_office,thana_upazila,district")
      .eq("id", userId)
      .maybeSingle();

    const keepOrSet = (currentVal: any, newVal: any) => {
      const cur = typeof currentVal === "string" ? currentVal.trim() : currentVal;
      return cur ? cur : newVal;
    };

    const patch: Record<string, any> = {
      kyc_verified: true,
      kyc_verified_at: new Date().toISOString(),
      kyc_photo_url: photoPath,
      kyc_nid_front_url: nidFrontPath,
      kyc_nid_back_url: nidBackPath,
      avatar_url: avatarPath,
      display_name: keepOrSet(current?.display_name, cleanStr(extracted.name, 80)),
      nid_number: keepOrSet(current?.nid_number, cleanNid(extracted.nid_number)),
      date_of_birth: keepOrSet(current?.date_of_birth, cleanDob(extracted.date_of_birth)),
      father_name: keepOrSet(current?.father_name, cleanStr(extracted.father_name)),
      mother_name: keepOrSet(current?.mother_name, cleanStr(extracted.mother_name)),
      full_address: keepOrSet(current?.full_address, cleanStr(extracted.full_address, 500)),
      village_area: keepOrSet(current?.village_area, cleanStr(extracted.village_area)),
      post_office: keepOrSet(current?.post_office, cleanStr(extracted.post_office)),
      thana_upazila: keepOrSet(current?.thana_upazila, cleanStr(extracted.thana_upazila)),
      district: keepOrSet(current?.district, cleanStr(extracted.district)),
    };

    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
    if (error) throw new Error(error.message);

    return { ok: true, extracted };
  });
