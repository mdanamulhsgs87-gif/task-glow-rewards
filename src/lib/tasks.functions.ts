import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REVERIFY_INTERVAL_MS, TOTAL_TASKS } from "./constants";

async function notifyTelegram(text: string) {
  const { sendTelegram } = await import("./telegram.server");
  await sendTelegram(text);
}


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

/**
 * After client confirms GoodDollar whitelist, persist the binding:
 * photo + wallet_address + private_key + face_label on the task row.
 */
const BindInput = z.object({
  slot: z.number().int().min(1).max(TOTAL_TASKS),
  photoBase64: z.string().min(100),
  privateKey: z.string().min(10),
  walletAddress: z.string().min(10),
  faceLabel: z.string().min(1).max(60),
});

export const bindFirstVerify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => BindInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: task } = await supabase
      .from("tasks").select("*").eq("user_id", userId).eq("slot", data.slot).maybeSingle();
    if (!task) throw new Error("Task slot na");
    if (task.status !== "empty") throw new Error("Ei slot already verified");

    // Reject duplicate wallet across the whole app
    const { data: dup } = await supabaseAdmin
      .from("tasks").select("id").eq("wallet_address", data.walletAddress).maybeSingle();
    if (dup) throw new Error("Ei wallet already bind ache");

    const path = await uploadFace(supabaseAdmin, userId, data.slot, data.photoBase64);
    const now = new Date();
    const dueAt = new Date(now.getTime() + REVERIFY_INTERVAL_MS);

    const { error } = await supabaseAdmin
      .from("tasks")
      .update({
        face_photo_url: path,
        wallet_address: data.walletAddress,
        wallet_private_key: data.privateKey,
        face_label: data.faceLabel.trim(),
        status: "verified",
        initial_verify_at: now.toISOString(),
        reverify_due_at: dueAt.toISOString(),
      })
      .eq("id", task.id);
    if (error) throw new Error(error.message);

    return { ok: true, reverifyDueAt: dueAt.toISOString() };
  });

/**
 * Re-verify search: list this user's verified tasks (re-verify ready) matching name query.
 * Returns the stored private_key so the client can sign a fresh GoodDollar URL.
 */
const SearchInput = z.object({ query: z.string().default("") });

export const listReverifyCandidates = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchInput.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.query.trim().toLowerCase();

    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, slot, face_label, face_photo_url, wallet_address, wallet_private_key, reverify_due_at")
      .eq("user_id", userId)
      .eq("status", "verified")
      .order("face_label", { ascending: true });

    let list = (tasks ?? []).filter((t) => t.wallet_address && t.wallet_private_key);
    if (q) list = list.filter((t) => (t.face_label || "").toLowerCase().includes(q));

    // Sign storage URLs for thumbnail display
    const withUrls = await Promise.all(
      list.map(async (t) => {
        if (!t.face_photo_url) return { ...t, photo_url: null };
        const { data: signed } = await supabaseAdmin.storage
          .from("face-photos").createSignedUrl(t.face_photo_url, 60 * 10);
        return { ...t, photo_url: signed?.signedUrl ?? null };
      }),
    );
    return withUrls;
  });

/**
 * After re-verify whitelist confirmed: mark task done, refresh photo, activate mining if all done.
 */
const CompleteInput = z.object({
  taskId: z.string().uuid(),
  newPhotoBase64: z.string().optional(),
});

export const completeReverify = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CompleteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: task } = await supabase
      .from("tasks").select("*").eq("id", data.taskId).eq("user_id", userId).maybeSingle();
    if (!task) throw new Error("Task na");
    if (task.status !== "verified") throw new Error("Re-verify ready na");

    let newPath = task.face_photo_url;
    if (data.newPhotoBase64) {
      newPath = await uploadFace(supabaseAdmin, userId, task.slot, data.newPhotoBase64);
    }

    const now = new Date();
    const { error } = await supabaseAdmin.from("tasks")
      .update({ status: "done", done_at: now.toISOString(), face_photo_url: newPath })
      .eq("id", task.id);
    if (error) throw new Error(error.message);

    const { count } = await supabaseAdmin
      .from("tasks").select("id", { count: "exact", head: true })
      .eq("user_id", userId).eq("status", "done");

    let miningActivated = false;
    if ((count ?? 0) >= TOTAL_TASKS) {
      const { data: mining } = await supabaseAdmin
        .from("mining_state").select("is_active").eq("user_id", userId).maybeSingle();
      if (!mining?.is_active) {
        await supabaseAdmin.from("mining_state").update({
          is_active: true,
          activated_at: now.toISOString(),
          last_credited_at: now.toISOString(),
        }).eq("user_id", userId);
        miningActivated = true;
      }
    }

    return { ok: true, miningActivated };
  });
