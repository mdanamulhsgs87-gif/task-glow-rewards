import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Wallet, ArrowDownToLine, ShieldCheck, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.navigate({ to: "/auth" });
    });
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", data.user.id);
      setIsAdmin((roles ?? []).some((r) => r.role === "admin"));
    });
    return () => { sub.data.subscription.unsubscribe(); };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 glass">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/home" className="font-black text-cyan tracking-tight">FaceMine</Link>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin"
                className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-amber/15 text-amber border border-amber/30">
                ADMIN
              </Link>
            )}
            <button onClick={logout}
              className="p-2 rounded-lg bg-surface-2 border border-border text-muted-foreground hover:text-rose">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 glass border-t border-cyan/15">
        <div className="max-w-md mx-auto px-4 py-2 grid grid-cols-3 gap-1">
          <NavItem to="/home" icon={<Home className="w-5 h-5" />} label="Home" />
          <NavItem to="/wallet" icon={<Wallet className="w-5 h-5" />} label="Wallet" />
          <NavItem to="/withdraw" icon={<ArrowDownToLine className="w-5 h-5" />} label="Withdraw" />
        </div>
      </nav>
    </div>
  );
}

function NavItem({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to as any}
      activeProps={{ className: "text-cyan" }}
      inactiveProps={{ className: "text-muted-foreground" }}
      className="flex flex-col items-center gap-0.5 py-2 rounded-xl text-[10px] font-bold">
      {icon}
      {label}
    </Link>
  );
}

// silence unused import warning
void ShieldCheck;
