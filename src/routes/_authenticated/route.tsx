import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Wallet, ArrowDownToLine, LogOut } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.navigate({ to: "/auth" });
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
