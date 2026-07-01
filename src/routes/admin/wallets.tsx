import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListWallets } from "@/lib/admin.functions";
import { Loader2, Copy, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wallets")({ component: AdminWallets });

function AdminWallets() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-wallets"], queryFn: () => adminListWallets() });
  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copy হয়েছে"); };
  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-cyan" /></div>;

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1">
        Bound wallets: {data?.length ?? 0}
      </p>
      {(data ?? []).map((w: any) => (
        <button key={w.user_id} onClick={() => copy(w.number)}
          className="w-full glass rounded-xl p-3 text-left flex items-center justify-between gap-2 hover:border-cyan transition">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-surface-2 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4 text-cyan" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate">{w.profiles?.display_name ?? "—"}</p>
              <p className="text-[10px] text-muted-foreground truncate mono-num">{w.profiles?.phone_number}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="mono-num font-black text-sm">{w.number}</p>
            <p className="text-[9px] uppercase font-bold text-amber">{w.provider}</p>
          </div>
          <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      ))}
      {(data ?? []).length === 0 && <p className="text-center text-xs text-muted-foreground py-10">No wallets set yet</p>}
    </div>
  );
}
