import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { adminListWithdrawals, adminUpdateWithdrawal } from "@/lib/admin.functions";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/withdrawals")({ component: AdminWithdrawals });

function AdminWithdrawals() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["admin-withdrawals"], queryFn: () => adminListWithdrawals() });

  const mut = useMutation({
    mutationFn: (input: { id: string; action: "paid" | "rejected" }) => adminUpdateWithdrawal({ data: input }),
    onSuccess: () => { toast.success("Updated"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-cyan" /></div>;

  return (
    <div className="space-y-2">
      {(data ?? []).length === 0 && <p className="text-center text-xs text-muted-foreground py-6">No withdrawals</p>}
      {(data ?? []).map((w: any) => (
        <div key={w.id} className="glass rounded-xl p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="mono-num font-black text-lg">{Number(w.amount).toFixed(2)} TK</p>
              <p className="text-[10px] text-muted-foreground">
                {w.profiles?.display_name ?? w.profiles?.email}
              </p>
              {w.profiles?.phone_number && (
                <p className="text-[10px] text-muted-foreground mono-num">User: {w.profiles.phone_number}</p>
              )}
              <p className="text-[10px] text-muted-foreground mono-num">
                {w.provider} • {w.wallet_number}
              </p>
              <p className="text-[10px] text-muted-foreground">{new Date(w.created_at).toLocaleString()}</p>
            </div>
            <div>
              <span className={`text-[10px] font-black px-2 py-1 rounded-full ${
                w.status === "paid" ? "bg-emerald/15 text-emerald" :
                w.status === "rejected" ? "bg-rose/15 text-rose" :
                "bg-amber/15 text-amber"
              }`}>{w.status.toUpperCase()}</span>
            </div>
          </div>
          {w.status === "pending" && (
            <div className="flex gap-2 mt-3">
              <button onClick={() => mut.mutate({ id: w.id, action: "paid" })}
                className="flex-1 py-2 rounded-lg bg-emerald/20 text-emerald font-bold text-xs flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5" /> Mark paid
              </button>
              <button onClick={() => mut.mutate({ id: w.id, action: "rejected" })}
                className="flex-1 py-2 rounded-lg bg-rose/20 text-rose font-bold text-xs flex items-center justify-center gap-1">
                <X className="w-3.5 h-3.5" /> Reject (refund)
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
