import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const TASK_COLS = "id,slot,status,face_label,face_photo_url,wallet_address,verified_at,reverify_due_at,whitelist_ok,created_at,updated_at,user_id";
    const [{ data: profile }, { data: tasks }, { data: mining }, { data: wallet }, { data: roles }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabaseAdmin.from("tasks").select(TASK_COLS).eq("user_id", userId).order("slot"),
        supabase.from("mining_state").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    const tasksWithPhotos = await Promise.all(
      (tasks ?? []).map(async (task: any) => {
        if (!task.face_photo_url) return { ...task, signed_face_url: null };
        const { data: signed } = await supabaseAdmin.storage
          .from("face-photos")
          .createSignedUrl(task.face_photo_url, 60 * 30);
        return { ...task, signed_face_url: signed?.signedUrl ?? null };
      }),
    );

    return {
      profile,
      tasks: tasksWithPhotos,
      mining,
      wallet,
      isAdmin,
    };
  });

export const getMyWithdrawals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });
