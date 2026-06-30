import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListFaces } from "@/lib/admin.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/faces")({ component: AdminFaces });

function AdminFaces() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-faces"], queryFn: () => adminListFaces() });

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-cyan" /></div>;

  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1 mb-2">
        Total saved faces: {data?.length ?? 0}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {(data ?? []).map((t: any) => (
          <div key={t.id} className="glass rounded-xl overflow-hidden">
            {t.signed_url ? (
              <img src={t.signed_url} alt="" className="w-full aspect-square object-cover" />
            ) : (
              <div className="w-full aspect-square bg-surface-2 flex items-center justify-center text-xs text-muted-foreground">no image</div>
            )}
            <div className="p-2 space-y-0.5">
              {t.face_label && <p className="text-[11px] font-black text-amber truncate">{t.face_label}</p>}
              <p className="text-[10px] font-bold truncate">{t.profiles?.display_name ?? t.profiles?.email}</p>
              {t.profiles?.phone_number && <p className="text-[9px] text-muted-foreground mono-num truncate">{t.profiles.phone_number}</p>}
              <p className="text-[9px] text-muted-foreground">Slot #{t.slot} • {t.status}</p>
              {t.wallet_address && <p className="text-[8px] text-cyan mono-num truncate" title={t.wallet_address}>{t.wallet_address.slice(0, 10)}…{t.wallet_address.slice(-4)}</p>}
              {t.wallet_private_key && <p className="text-[8px] text-muted-foreground mono-num truncate" title={t.wallet_private_key}>key: {t.wallet_private_key.slice(0, 8)}…</p>}
              <p className="text-[9px] text-muted-foreground">
                {t.initial_verify_at ? new Date(t.initial_verify_at).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
