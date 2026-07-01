import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { adminLogin } from "@/lib/admin-auth.functions";
import { Shield, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin-login")({
  ssr: false,
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const router = useRouter();
  const login = useServerFn(adminLogin);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await login({ data: { password } });
      if (res.ok) {
        await router.navigate({ to: "/admin" });
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="glass rounded-2xl p-6 w-full max-w-sm space-y-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber/15 flex items-center justify-center">
            <Shield className="w-6 h-6 text-amber" />
          </div>
          <h1 className="text-lg font-black">Admin Panel</h1>
          <p className="text-[11px] text-muted-foreground">
            Sudhu admin password diye dhuken. User account er sathe ei panel er kono somporko nai.
          </p>
        </div>
        <input
          type="password"
          autoFocus
          autoComplete="current-password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-surface-2 border border-border focus:border-cyan outline-none text-sm mono-num"
        />
        {error && <p className="text-rose text-[11px] text-center">Wrong password</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 rounded-xl gradient-cta font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unlock"}
        </button>
      </form>
    </div>
  );
}
