import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { adminReverifyQueue } from "@/lib/admin.functions";
import { Loader2, Clock, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/reverify")({ component: ReverifyQueue });

function ReverifyQueue() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-reverify-queue"], queryFn: () => adminReverifyQueue(), refetchInterval: 30_000 });
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  if (isLoading) return <div className="py-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-amber" /></div>;

  const rows = data ?? [];
  const ready = rows.filter((r: any) => r.reverify_due_at && new Date(r.reverify_due_at).getTime() <= now);
  const waiting = rows.filter((r: any) => !r.reverify_due_at || new Date(r.reverify_due_at).getTime() > now);

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1">
        Total in queue: {rows.length} · Ready now: {ready.length}
      </p>

      {ready.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-emerald font-bold px-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Ready to re-verify</p>
          {ready.map((r: any) => <Row key={r.id} r={r} ready />)}
        </div>
      )}

      {waiting.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-widest text-amber font-bold px-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Waiting</p>
          {waiting.map((r: any) => <Row key={r.id} r={r} now={now} />)}
        </div>
      )}

      {rows.length === 0 && <p className="text-center text-xs text-muted-foreground py-10">Queue empty</p>}
    </div>
  );
}

function Row({ r, ready, now }: { r: any; ready?: boolean; now?: number }) {
  const due = r.reverify_due_at ? new Date(r.reverify_due_at).getTime() : 0;
  const rem = Math.max(0, due - (now ?? Date.now()));
  const d = Math.floor(rem / 86400000);
  const h = Math.floor((rem % 86400000) / 3600000);
  const m = Math.floor((rem % 3600000) / 60000);
  const s = Math.floor((rem % 60000) / 1000);

  return (
    <div className="glass rounded-xl p-2 flex items-center gap-2">
      {r.signed_url ? (
        <img src={r.signed_url} className="w-14 h-14 rounded-lg object-cover shrink-0" />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-surface-2 shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold truncate">{r.face_label ?? "—"}</p>
        <p className="text-[10px] text-muted-foreground truncate">
          {r.profiles?.display_name ?? r.profiles?.phone_number ?? "—"} · Slot #{r.slot}
        </p>
      </div>
      <div className="text-right shrink-0">
        {ready ? (
          <span className="px-2 py-1 rounded-lg bg-emerald/20 text-emerald text-[10px] font-black">READY</span>
        ) : (
          <p className="mono-num text-amber text-[11px] font-black">
            {d}d {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
          </p>
        )}
      </div>
    </div>
  );
}
