import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Home, Wallet, ArrowDownToLine, LogOut, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AuthedLayout,
});

function AuthedLayout() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        router.navigate({ to: "/auth", replace: true });
        return;
      }
      setReady(true);
    });

    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session) router.navigate({ to: "/auth" });
    });
    return () => {
      active = false;
      sub.data.subscription.unsubscribe();
    };
  }, [router]);

  const logout = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/auth" });
  };

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="glass w-full max-w-sm rounded-2xl p-6 text-center">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-cyan" />
          <p className="text-sm font-bold">Account check hocche...</p>
        </div>
      </div>
    );
  }

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
