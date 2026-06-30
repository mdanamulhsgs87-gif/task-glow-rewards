import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const PhoneSignupInput = z.object({
  name: z.string().trim().min(2, "Name lagbe").max(80, "Name beshi boro"),
  phone: z.string().trim().regex(/^01\d{9}$/, "11 digit BD number lagbe"),
  password: z.string().min(6, "Password minimum 6 character"),
  referralCode: z.string().trim().max(20).optional().nullable(),
});

function phoneToEmail(phone: string) {
  return `u${phone}@facemine.app`;
}

export const registerWithPhone = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => PhoneSignupInput.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const email = phoneToEmail(data.phone);

    let refCode: string | null = null;
    if (data.referralCode && data.referralCode.trim().length > 0) {
      const cleaned = data.referralCode.trim().toUpperCase();
      const { data: ref } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("referral_code", cleaned)
        .maybeSingle();
      if (!ref) throw new Error("Referral code thik na");
      refCode = cleaned;
    }

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        display_name: data.name,
        phone_number: data.phone,
        ...(refCode ? { referral_code: refCode } : {}),
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("already")) {
        throw new Error("Ei number diye already account ache");
      }
      throw new Error(error.message);
    }

    return { ok: true, email };
  });
