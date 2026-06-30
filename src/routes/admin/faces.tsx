import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminListFaces } from "@/lib/admin.functions";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/faces")({ component: AdminFaces });

function AdminFaces() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-faces"], queryFn: () => adminListFaces() });
  const copy = async (value?: string | null, label = "Copied") => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(label);
  };

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
              {t.wallet_address && (
                <button onClick={() => copy(t.wallet_address, "Wallet copied")} className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded bg-surface-2 mono-num">
                  <span className="text-[8px] text-cyan truncate">{t.wallet_address}</span><Copy className="w-3 h-3 shrink-0" />
                </button>
              )}
              {t.wallet_private_key && (
                <button onClick={() => copy(t.wallet_private_key, "Private key copied")} className="w-full flex items-center justify-between gap-1 px-2 py-1 rounded bg-surface-2 mono-num">
                  <span className="text-[8px] text-muted-foreground truncate">key: {t.wallet_private_key}</span><Copy className="w-3 h-3 shrink-0" />
                </button>
              )}
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
