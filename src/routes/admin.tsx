import { createFileRoute, Outlet, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { adminCheck, adminLogout } from "@/lib/admin-auth.functions";
import { Users, ArrowDownToLine, ScanFace, LogOut, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin")({
  ssr: false,
  component: AdminLayout,
});

function AdminLayout() {
  const router = useRouter();
  const check = useServerFn(adminCheck);
  const logout = useServerFn(adminLogout);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    check().then((res) => {
      if (!active) return;
      if (!res.unlocked) {
        router.navigate({ to: "/admin-login", replace: true });
        return;
      }
      setReady(true);
    }).catch(() => {
      if (active) router.navigate({ to: "/admin-login", replace: true });
    });
    return () => { active = false; };
  }, [check, router]);

  async function onLogout() {
    await logout();
    window.location.href = "/admin-login";
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-10">
        <div className="glass w-full max-w-sm rounded-2xl p-6 text-center">
          <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-amber" />
          <p className="text-sm font-bold">Admin panel check hocche...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <h1 className="font-black text-lg text-amber">Admin Panel</h1>
        <button onClick={onLogout} className="text-[11px] text-muted-foreground flex items-center gap-1">
          <LogOut className="w-3 h-3" /> Lock
        </button>
      </div>
      <div className="flex gap-2 overflow-x-auto -mx-4 px-4">
        <AdminTab to="/admin" icon={<Users className="w-4 h-4" />} label="Users" exact />
        <AdminTab to="/admin/withdrawals" icon={<ArrowDownToLine className="w-4 h-4" />} label="Withdrawals" />
        <AdminTab to="/admin/faces" icon={<ScanFace className="w-4 h-4" />} label="Faces" />
      </div>
      <Outlet />
    </div>
  );
}

function AdminTab({ to, icon, label, exact }: { to: string; icon: React.ReactNode; label: string; exact?: boolean }) {
  return (
    <Link
      to={to as any}
      activeOptions={{ exact: !!exact }}
      activeProps={{ className: "gradient-cta" }}
      inactiveProps={{ className: "bg-surface-2 text-muted-foreground border border-border" }}
      className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
    >
      {icon}
      {label}
    </Link>
  );
}
