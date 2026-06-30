import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({ component: AuthPage });

function AuthPage() {
  const nav = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/home" });
    });
  }, [nav]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: name }, emailRedirectTo: `${window.location.origin}/home` },
        });
        if (error) throw error;
        toast.success("Account toiri hoyeche! Login korun.");
        setMode("login");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back!");
        nav({ to: "/home" });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Kichu somossha hoyeche");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm glass rounded-3xl p-7 shadow-2xl">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-cta mb-3">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-cyan">FaceMine</h1>
          <p className="text-xs text-muted-foreground mt-1">10 task → 500 TK / month mining</p>
        </div>

        <div className="flex bg-surface-2 rounded-xl p-1 mb-5">
          {(["login", "signup"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                mode === m ? "gradient-cta" : "text-muted-foreground"
              }`}>
              {m === "login" ? "Login" : "Sign up"}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Name</label>
              <input required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 px-4 py-3 bg-surface-2 border border-border rounded-xl text-sm outline-none focus:border-cyan" />
            </div>
          )}
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-surface-2 border border-border rounded-xl text-sm outline-none focus:border-cyan" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Password</label>
            <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-surface-2 border border-border rounded-xl text-sm outline-none focus:border-cyan" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full py-3 rounded-xl gradient-cta font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login" ? "Login" : "Account toiri korun"}
          </button>
        </form>

        <p className="text-[10px] text-center text-muted-foreground mt-5">
          Sign up korle apnar information protected thake. <Link to="/" className="text-cyan">Home</Link>
        </p>
      </div>
    </div>
  );
}
