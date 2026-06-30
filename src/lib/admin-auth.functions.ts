import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ password: z.string().min(1) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) throw new Error("ADMIN_PASSWORD not configured");
    const { useSession } = await import("@tanstack/react-start/server");
    const { getAdminSessionConfig, passwordMatches } = await import("@/lib/admin-session.server");

    if (!passwordMatches(data.password, expected)) {
      return { ok: false as const };
    }
    const session = await useSession(getAdminSessionConfig());
    await session.update({ unlocked: true, at: Date.now() });
    return { ok: true as const };
  });

export const adminLogout = createServerFn({ method: "POST" }).handler(async () => {
  const { useSession } = await import("@tanstack/react-start/server");
  const { getAdminSessionConfig } = await import("@/lib/admin-session.server");
  const session = await useSession(getAdminSessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const adminCheck = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { useSession } = await import("@tanstack/react-start/server");
    const { getAdminSessionConfig } = await import("@/lib/admin-session.server");
    const session = await useSession<{ unlocked?: boolean }>(getAdminSessionConfig());
    return { unlocked: !!session.data.unlocked };
  } catch {
    return { unlocked: false };
  }
});
