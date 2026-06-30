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
            <div className="p-2">
              <p className="text-[10px] font-bold truncate">{t.profiles?.display_name ?? t.profiles?.email}</p>
              <p className="text-[9px] text-muted-foreground">Slot #{t.slot} • {t.status}</p>
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
