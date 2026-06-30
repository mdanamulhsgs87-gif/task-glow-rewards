import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListUsers } from "@/lib/admin.functions";
import { Loader2 } from "lucide-react";
import { computeLiveBalance } from "@/lib/mining";

export const Route = createFileRoute("/admin/")({ component: AdminUsers });

function AdminUsers() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => adminListUsers() });

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-cyan" /></div>;

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1">
        Total: {data?.length ?? 0}
      </p>
      {(data ?? []).map((row: any) => {
        const m = row.mining;
        const bal = m ? computeLiveBalance({
          accrued: Number(m.accrued_amount), withdrawn: Number(m.withdrawn_amount),
          isActive: m.is_active, lastCreditedAt: m.last_credited_at,
        }) : 0;
        return (
          <div key={row.profile.id} className="glass rounded-xl p-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="font-bold text-sm truncate">{row.profile.display_name ?? "—"}</p>
                <p className="text-[10px] text-muted-foreground truncate mono-num">
                  {row.profile.phone_number ?? row.profile.email}
                </p>
              </div>
              <div className="text-right">
                <p className="mono-num font-black text-cyan text-sm">{bal.toFixed(2)}</p>
                <p className="text-[9px] text-muted-foreground">TK balance</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1 text-[10px]">
              <span className="px-2 py-0.5 rounded-full bg-emerald/15 text-emerald font-bold">{row.done}/10 done</span>
              {row.verified > 0 && <span className="px-2 py-0.5 rounded-full bg-amber/15 text-amber font-bold">{row.verified} pending re-verify</span>}
              {m?.is_active && <span className="px-2 py-0.5 rounded-full bg-cyan/15 text-cyan font-bold">MINING ON</span>}
              {row.wallet && <span className="px-2 py-0.5 rounded-full bg-surface-2 text-muted-foreground mono-num">{row.wallet.provider}:{row.wallet.number}</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
