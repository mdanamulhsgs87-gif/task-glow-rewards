import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const uploadAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: { base64: string; contentType: string }) => data)
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buf = Buffer.from(data.base64, "base64");
    const ext = data.contentType.includes("png") ? "png" : "jpg";
    const path = `${context.userId}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("avatars")
      .upload(path, buf, { contentType: data.contentType, upsert: true });
    if (upErr) throw new Error(upErr.message);
    const { error: pErr } = await supabaseAdmin
      .from("profiles")
      .update({ avatar_url: path })
      .eq("id", context.userId);
    if (pErr) throw new Error(pErr.message);
    return { ok: true, path };
  });

export const getProfileHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: profile }, { data: mining }, { data: wallet }, { data: withdrawals }, { data: claims }, { data: tasks }] =
      await Promise.all([
        context.supabase.from("profiles").select("*").eq("id", context.userId).maybeSingle(),
        context.supabase.from("mining_state").select("*").eq("user_id", context.userId).maybeSingle(),
        context.supabase.from("wallets").select("*").eq("user_id", context.userId).maybeSingle(),
        context.supabase.from("withdrawals").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }),
        context.supabase.from("mining_claims").select("*").eq("user_id", context.userId).order("created_at", { ascending: false }),
        supabaseAdmin.from("tasks").select("slot,status,whitelist_ok,initial_verify_at").eq("user_id", context.userId),
      ]);

    let avatar_signed: string | null = null;
    if (profile?.avatar_url) {
      const { data: signed } = await supabaseAdmin.storage
        .from("avatars")
        .createSignedUrl(profile.avatar_url, 60 * 60);
      avatar_signed = signed?.signedUrl ?? null;
    }
    return { profile, mining, wallet, withdrawals: withdrawals ?? [], claims: claims ?? [], tasks: tasks ?? [], avatar_signed };
  });

export const claimMining = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("settle_mining", { _user_id: context.userId });
    const { data: mining } = await supabaseAdmin.from("mining_state").select("*").eq("user_id", context.userId).maybeSingle();
    const balance = Number(mining?.accrued_amount ?? 0) - Number(mining?.withdrawn_amount ?? 0);
    const { error } = await supabaseAdmin.from("mining_claims").insert({
      user_id: context.userId,
      amount: balance,
      balance_after: balance,
      note: "Manual claim snapshot",
    });
    if (error) throw new Error(error.message);
    return { ok: true, balance };
  });
