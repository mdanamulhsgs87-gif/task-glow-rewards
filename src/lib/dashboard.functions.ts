import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: tasks }, { data: mining }, { data: wallet }, { data: roles }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        supabase.from("tasks").select("*").eq("user_id", userId).order("slot"),
        supabase.from("mining_state").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
      ]);

    const isAdmin = (roles ?? []).some((r) => r.role === "admin");

    return {
      profile,
      tasks: tasks ?? [],
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
