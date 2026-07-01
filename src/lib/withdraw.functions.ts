import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { MIN_WITHDRAW_BDT } from "./constants";
import { computeLiveBalance } from "./mining";

const WithdrawInput = z.object({
  amount: z.number().positive(),
});

export const requestWithdraw = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => WithdrawInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Whole-taka only — no poisha.
    const amount = Math.floor(data.amount);

    if (amount < MIN_WITHDRAW_BDT) {
      throw new Error(`সর্বনিম্ন উইথড্র ${MIN_WITHDRAW_BDT}৳`);
    }

    const { data: wallet } = await supabase.from("wallets").select("*").eq("user_id", userId).maybeSingle();
    if (!wallet) throw new Error("Age wallet number set korun");

    const { data: mining } = await supabase.from("mining_state").select("*").eq("user_id", userId).maybeSingle();
    if (!mining || !mining.is_active) throw new Error("Mining active na — 10 ta task complete korun");

    const balance = computeLiveBalance({
      accrued: Number(mining.accrued_amount),
      withdrawn: Number(mining.withdrawn_amount),
      isActive: mining.is_active,
      lastCreditedAt: mining.last_credited_at,
    });

    if (data.amount > balance) {
      throw new Error(`Balance kom: ${balance.toFixed(2)} TK`);
    }

    // Settle current mining: bump accrued to "now" so withdrawn_amount is consistent.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const nowMs = now.getTime();
    const lastMs = mining.last_credited_at ? new Date(mining.last_credited_at).getTime() : nowMs;
    const elapsedSec = Math.max(0, (nowMs - lastMs) / 1000);
    const { MINING_RATE_BDT_PER_SEC } = await import("./constants");
    const newAccrued = Number(mining.accrued_amount) + elapsedSec * MINING_RATE_BDT_PER_SEC;
    const newWithdrawn = Number(mining.withdrawn_amount) + data.amount;

    const { error: mErr } = await supabaseAdmin
      .from("mining_state")
      .update({
        accrued_amount: newAccrued,
        withdrawn_amount: newWithdrawn,
        last_credited_at: now.toISOString(),
      })
      .eq("user_id", userId);
    if (mErr) throw new Error(mErr.message);

    const { error: wErr } = await supabaseAdmin.from("withdrawals").insert({
      user_id: userId,
      amount: data.amount,
      provider: wallet.provider,
      wallet_number: wallet.number,
    });
    if (wErr) throw new Error(wErr.message);

    return { ok: true };
  });
