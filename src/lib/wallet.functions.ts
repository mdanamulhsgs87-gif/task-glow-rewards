import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SetWalletInput = z.object({
  provider: z.enum(["bkash", "nagad"]),
  number: z.string().trim().regex(/^01\d{9}$/, "Bangladeshi mobile number lagbe (11 digit, 01 diye shuru)"),
});

export const setWallet = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SetWalletInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase.from("wallets").select("user_id").eq("user_id", userId).maybeSingle();
    if (existing) throw new Error("Wallet number ekbar set hoye geche — change kora jabe na");

    const { error } = await supabase.from("wallets").insert({
      user_id: userId,
      provider: data.provider,
      number: data.number,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
