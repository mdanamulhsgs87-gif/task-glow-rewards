import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { adminListUnverified, adminDeleteUnverified } from "@/lib/admin.functions";
import { Loader2, AlertTriangle, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/unverified")({ component: UnverifiedPage });

function UnverifiedPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-unverified"],
    queryFn: () => adminListUnverified(),
  });

  const del = useMutation({
    mutationFn: (id: string) => adminDeleteUnverified({ data: { id } }),
    onSuccess: () => { toast.success("Deleted"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-amber" /></div>;
  }

  const copy = (s: string) => { navigator.clipboard.writeText(s); toast.success("Copied"); };

  return (
    <div className="space-y-2">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1">
        Not whitelisted: {data?.length ?? 0}
      </p>
      {(data ?? []).map((r: any) => (
        <div key={r.id} className="glass rounded-xl p-3 space-y-2">
          <div className="flex gap-3">
            {r.signed_url ? (
              <img src={r.signed_url} className="w-16 h-16 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-surface-2 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate">{r.face_label || "—"}</p>
              <p className="text-[10px] text-muted-foreground truncate">
                {r.profiles?.display_name} · {r.profiles?.phone_number ?? r.profiles?.email}
              </p>
              <div className="flex gap-1 mt-1 flex-wrap">
                <span className="px-1.5 py-0.5 rounded bg-amber/15 text-amber text-[9px] font-bold uppercase">{r.kind}</span>
                {r.slot && <span className="px-1.5 py-0.5 rounded bg-surface-2 text-[9px] font-bold">slot #{r.slot}</span>}
              </div>
            </div>
          </div>
          <div className="text-[10px] space-y-1">
            <button onClick={() => copy(r.wallet_address)} className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded bg-surface-2 mono-num">
              <span className="truncate">{r.wallet_address}</span><Copy className="w-3 h-3 shrink-0" />
            </button>
            <button onClick={() => copy(r.wallet_private_key)} className="w-full flex items-center justify-between gap-1 px-2 py-1.5 rounded bg-surface-2 mono-num">
              <span className="truncate">{r.wallet_private_key}</span><Copy className="w-3 h-3 shrink-0" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            ⚠️ {r.reason} · {new Date(r.created_at).toLocaleString()}
          </p>
          <button onClick={() => { if (confirm("Delete this attempt?")) del.mutate(r.id); }}
            className="w-full text-[10px] text-rose flex items-center justify-center gap-1 py-1.5 rounded bg-rose/10 border border-rose/20">
            <Trash2 className="w-3 h-3" /> Delete attempt
          </button>
        </div>
      ))}
      {(!data || data.length === 0) && (
        <div className="glass rounded-xl p-6 text-center text-xs text-muted-foreground">
          Kono not-whitelisted attempt nai.
        </div>
      )}
    </div>
  );
}
