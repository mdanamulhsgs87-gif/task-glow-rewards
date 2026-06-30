import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REVERIFY_INTERVAL_MS, TOTAL_TASKS } from "./constants";

const VerifyInput = z.object({
  slot: z.number().int().min(1).max(TOTAL_TASKS),
  photoBase64: z.string().min(100),
});

async function uploadFace(adminClient: any, userId: string, slot: number, base64: string) {
  const buf = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
  const path = `${userId}/${slot}-${Date.now()}.jpg`;
  const { error } = await adminClient.storage.from("face-photos").upload(path, buf, {
    contentType: "image/jpeg",
    upsert: false,
  });
  if (error) throw new Error("Photo upload failed: " + error.message);
  return path;
}

async function downloadFaceBase64(adminClient: any, path: string): Promise<string | null> {
  const { data, error } = await adminClient.storage.from("face-photos").download(path);
  if (error || !data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}

export const verifyFace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => VerifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { checkDuplicate } = await import("./face-match.server");

    // Get this task slot
    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("slot", data.slot)
      .maybeSingle();
    if (!task) throw new Error("Task slot na");
    if (task.status !== "empty") throw new Error("Ei task slot already verified");

    // Cross-user duplicate check: gather all existing tasks' photos (excluding empty)
    const { data: existing } = await supabaseAdmin
      .from("tasks")
      .select("id, face_photo_url")
      .not("face_photo_url", "is", null)
      .limit(200);

    const refs: { id: string; base64: string }[] = [];
    for (const e of existing ?? []) {
      const b64 = await downloadFaceBase64(supabaseAdmin, e.face_photo_url!);
      if (b64) refs.push({ id: e.id, base64: b64 });
    }

    if (refs.length > 0) {
      const dup = await checkDuplicate(data.photoBase64, refs);
      if (dup.isDuplicate) {
        throw new Error("Ei face age use kora hoyeche — onno user er sathe match");
      }
    }

    // Upload + mark verified
    const path = await uploadFace(supabaseAdmin, userId, data.slot, data.photoBase64);
    const now = new Date();
    const dueAt = new Date(now.getTime() + REVERIFY_INTERVAL_MS);

    const { error: upErr } = await supabaseAdmin
      .from("tasks")
      .update({
        face_photo_url: path,
        status: "verified",
        initial_verify_at: now.toISOString(),
        reverify_due_at: dueAt.toISOString(),
      })
      .eq("id", task.id);
    if (upErr) throw new Error(upErr.message);

    return { ok: true, reverifyDueAt: dueAt.toISOString() };
  });

const ReverifyInput = z.object({
  slot: z.number().int().min(1).max(TOTAL_TASKS),
  photoBase64: z.string().min(100),
});

export const reverifyFace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReverifyInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { matchSingleReference } = await import("./face-match.server");

    const { data: task } = await supabase
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .eq("slot", data.slot)
      .maybeSingle();
    if (!task) throw new Error("Task na");
    if (task.status !== "verified") throw new Error("Ei task re-verify er jonno ready na");
    if (!task.reverify_due_at || new Date(task.reverify_due_at).getTime() > Date.now()) {
      throw new Error("3 din pure hoye nai");
    }
    if (!task.face_photo_url) throw new Error("Reference photo na");

    const refBase64 = await downloadFaceBase64(supabaseAdmin, task.face_photo_url);
    if (!refBase64) throw new Error("Reference photo load hoini");

    const result = await matchSingleReference(data.photoBase64, { id: task.id, base64: refBase64 });
    if (!result.matches) {
      throw new Error(`Face match korle na (confidence ${(result.confidence * 100).toFixed(0)}%) — same face deya lagbe`);
    }

    const now = new Date();
    const { error: upErr } = await supabaseAdmin
      .from("tasks")
      .update({ status: "done", done_at: now.toISOString() })
      .eq("id", task.id);
    if (upErr) throw new Error(upErr.message);

    // If all 10 tasks done, activate mining
    const { data: doneCount } = await supabaseAdmin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "done");
    void doneCount;

    const { count } = await supabaseAdmin
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "done");

    if ((count ?? 0) >= TOTAL_TASKS) {
      // Activate mining
      const { data: mining } = await supabaseAdmin
        .from("mining_state")
        .select("is_active")
        .eq("user_id", userId)
        .maybeSingle();
      if (!mining?.is_active) {
        await supabaseAdmin
          .from("mining_state")
          .update({
            is_active: true,
            activated_at: now.toISOString(),
            last_credited_at: now.toISOString(),
          })
          .eq("user_id", userId);
      }
    }

    return { ok: true, miningActivated: (count ?? 0) >= TOTAL_TASKS };
  });

// Signed URL for a stored face photo (admin views).
export const getFaceSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ path: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Check that user owns this photo OR is admin
    const { data: owns } = await supabase
      .from("tasks")
      .select("id")
      .eq("user_id", userId)
      .eq("face_photo_url", data.path)
      .maybeSingle();

    if (!owns) {
      const { data: role } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (role ?? []).some((r) => r.role === "admin");
      if (!isAdmin) throw new Error("Not allowed");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: signed, error } = await supabaseAdmin.storage
      .from("face-photos")
      .createSignedUrl(data.path, 60 * 10);
    if (error || !signed) throw new Error("Signed URL failed");
    return { url: signed.signedUrl };
  });
