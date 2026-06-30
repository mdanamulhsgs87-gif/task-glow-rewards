import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function gate() {
  const { requireAdminSession } = await import("@/lib/admin-session.server");
  await requireAdminSession();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const adminListUsers = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await gate();
  const { data: profiles } = await supabaseAdmin.from("profiles").select("*").order("created_at", { ascending: false });
  const { data: tasks } = await supabaseAdmin.from("tasks").select("user_id, status");
  const { data: minings } = await supabaseAdmin.from("mining_state").select("*");
  const { data: wallets } = await supabaseAdmin.from("wallets").select("*");

  return (profiles ?? []).map((p) => {
    const userTasks = (tasks ?? []).filter((t) => t.user_id === p.id);
    const done = userTasks.filter((t) => t.status === "done").length;
    const verified = userTasks.filter((t) => t.status === "verified").length;
    const m = (minings ?? []).find((x) => x.user_id === p.id);
    const w = (wallets ?? []).find((x) => x.user_id === p.id);
    return { profile: p, done, verified, mining: m, wallet: w };
  });
});

export const adminListWithdrawals = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await gate();
  const { data } = await supabaseAdmin
    .from("withdrawals")
    .select("*, profiles:user_id(display_name, email, phone_number)")
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const adminListFaces = createServerFn({ method: "GET" }).handler(async () => {
  const supabaseAdmin = await gate();
  const { data: tasks } = await supabaseAdmin
    .from("tasks")
    .select("id, user_id, slot, status, face_photo_url, initial_verify_at, profiles:user_id(display_name, email, phone_number)")
    .not("face_photo_url", "is", null)
    .order("initial_verify_at", { ascending: false });

  const withUrls = await Promise.all(
    (tasks ?? []).map(async (t) => {
      const { data: signed } = await supabaseAdmin.storage
        .from("face-photos")
        .createSignedUrl(t.face_photo_url!, 60 * 30);
      return { ...t, signed_url: signed?.signedUrl ?? null };
    }),
  );
  return withUrls;
});

const ActionInput = z.object({
  id: z.string().uuid(),
  action: z.enum(["paid", "rejected"]),
  note: z.string().optional(),
});

export const adminUpdateWithdrawal = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => ActionInput.parse(input))
  .handler(async ({ data }) => {
    const supabaseAdmin = await gate();

    const { data: w } = await supabaseAdmin.from("withdrawals").select("*").eq("id", data.id).maybeSingle();
    if (!w) throw new Error("Withdrawal na");
    if (w.status !== "pending") throw new Error("Already processed");

    const { error } = await supabaseAdmin
      .from("withdrawals")
      .update({
        status: data.action,
        admin_note: data.note ?? null,
        processed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    if (data.action === "rejected") {
      const { data: mining } = await supabaseAdmin
        .from("mining_state")
        .select("withdrawn_amount")
        .eq("user_id", w.user_id)
        .maybeSingle();
      if (mining) {
        await supabaseAdmin
          .from("mining_state")
          .update({ withdrawn_amount: Math.max(0, Number(mining.withdrawn_amount) - Number(w.amount)) })
          .eq("user_id", w.user_id);
      }
    }

    return { ok: true };
  });
