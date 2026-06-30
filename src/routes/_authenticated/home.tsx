import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/dashboard.functions";
import { MiningCounter } from "@/components/MiningCounter";
import { CheckCircle2, Clock, Camera, Lock, Sparkles, Loader2, Copy, X } from "lucide-react";
import { REVERIFY_INTERVAL_MS, TOTAL_TASKS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({ component: HomePage });

function HomePage() {
  const router = useRouter();
  const [lightbox, setLightbox] = useState<{ url: string; label: string } | null>(null);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
    refetchInterval: 30_000,
  });

  if (isLoading || !data) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan" /></div>;
  }

  const tasks = data.tasks;
  const doneCount = tasks.filter((t: any) => t.status === "done").length;
  const verifiedCount = tasks.filter((t: any) => t.status === "verified").length;
  const savedTasks = tasks.filter((t: any) => t.wallet_private_key || t.wallet_address || t.signed_face_url);
  const copy = async (value?: string | null, label = "Copied") => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    toast.success(label);
  };

  return (
    <div className="space-y-5 pt-2">
      <div className="text-center">
        <p className="text-xs text-muted-foreground">Hello,</p>
        <h1 className="text-xl font-black mt-0.5">
          {data.profile?.display_name ?? "User"} 👋
        </h1>
      </div>

      <MiningCounter
        accrued={Number(data.mining?.accrued_amount ?? 0)}
        withdrawn={Number(data.mining?.withdrawn_amount ?? 0)}
        isActive={!!data.mining?.is_active}
        lastCreditedAt={data.mining?.last_credited_at ?? null}
      />

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground tracking-widest">Task progress</p>
            <p className="text-2xl font-black mt-1">
              {doneCount}<span className="text-muted-foreground text-base">/{TOTAL_TASKS}</span>
              <span className="text-xs font-bold text-emerald ml-2">done</span>
            </p>
            {verifiedCount > 0 && (
              <p className="text-[11px] text-amber mt-0.5">{verifiedCount} ta re-verify er opekkhay</p>
            )}
          </div>
          <div className="relative w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="3" fill="none"
                className="text-surface-2" />
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="3" fill="none"
                strokeDasharray={`${(doneCount / TOTAL_TASKS) * 94.2} 94.2`}
                strokeLinecap="round" className="text-cyan transition-all" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-cyan">
              {Math.round((doneCount / TOTAL_TASKS) * 100)}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {tasks.map((t: any) => (
            <TaskCell key={t.slot} task={t}
              onClick={() => router.navigate({ to: "/task/$slot", params: { slot: String(t.slot) } })}
              onOpenPhoto={(url) => setLightbox({ url, label: `Slot #${t.slot} · ${t.face_label || "Face"}` })} />
          ))}
        </div>
      </div>

      {!data.wallet && (
        <Link to="/wallet" className="block rounded-2xl p-4 border border-amber/40 bg-amber/10">
          <p className="text-sm font-bold text-amber">⚠️ Wallet set koren</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Withdraw er age bKash / Nagad number set kora lagbe — ektai number, change kora jabe na.
          </p>
        </Link>
      )}

      {savedTasks.length > 0 && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <p className="text-xs uppercase text-muted-foreground tracking-widest">Saved face & key</p>
          <div className="space-y-2">
            {savedTasks.map((t: any) => (
              <div key={t.id} className="flex gap-3 rounded-xl border border-border bg-surface-2 p-2">
                {t.signed_face_url ? (
                  <button onClick={() => setLightbox({ url: t.signed_face_url, label: `Slot #${t.slot} · ${t.face_label || "Face"}` })}
                    className="h-16 w-16 shrink-0 rounded-lg overflow-hidden active:scale-95 transition">
                    <img src={t.signed_face_url} alt={`Slot ${t.slot} face`} className="h-full w-full object-cover" />
                  </button>
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-background" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-xs font-black text-amber truncate">Slot #{t.slot} · {t.face_label || "Saved"}</p>
                  <button onClick={() => copy(t.wallet_address, "Wallet copied")} className="flex w-full items-center justify-between gap-2 rounded bg-background/60 px-2 py-1 text-left">
                    <span className="mono-num truncate text-[9px] text-cyan">{t.wallet_address}</span><Copy className="h-3 w-3 shrink-0" />
                  </button>
                  <button onClick={() => copy(t.wallet_private_key, "Private key copied")} className="flex w-full items-center justify-between gap-2 rounded bg-background/60 px-2 py-1 text-left">
                    <span className="mono-num truncate text-[9px] text-muted-foreground">key: {t.wallet_private_key}</span><Copy className="h-3 w-3 shrink-0" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button onClick={() => refetch()} className="text-[11px] text-muted-foreground underline">
          Refresh
        </button>
      </div>

      {lightbox && (
        <div onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 animate-in fade-in">
          <button onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="flex flex-col items-center gap-3 max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
            <img src={lightbox.url} alt={lightbox.label}
              className="max-w-full max-h-[80vh] rounded-2xl border-2 border-white/20 shadow-2xl object-contain" />
            <p className="text-white font-bold text-sm">{lightbox.label}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCell({ task, onClick, onOpenPhoto }: { task: any; onClick: () => void; onOpenPhoto: (url: string) => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const isDone = task.status === "done";
  const isVerified = task.status === "verified";
  const dueMs = task.reverify_due_at ? new Date(task.reverify_due_at).getTime() : 0;
  const readyToReverify = isVerified && dueMs <= now;
  const remainingMs = Math.max(0, dueMs - now);

  const faceUrl: string | undefined = task.signed_face_url;

  // Locked / waiting re-verify state — premium face card with live D H M S countdown
  if (isVerified && !readyToReverify) {
    const totalSec = Math.floor(remainingMs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return (
      <button onClick={() => faceUrl && onOpenPhoto(faceUrl)}
        className="relative aspect-square rounded-2xl overflow-hidden border-2 border-violet/60 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)] group transition active:scale-95">
        {faceUrl ? (
          <img src={faceUrl} alt={`Slot ${task.slot}`} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />
        <div className="absolute top-1.5 left-1.5 right-1.5 flex items-center justify-between">
          <span className="text-[10px] font-black text-white drop-shadow">#{task.slot}</span>
          <span className="rounded-full bg-rose p-0.5 shadow"><Lock className="w-2.5 h-2.5 text-white" /></span>
        </div>
        <div className="absolute bottom-1 left-0 right-0 px-1">
          <div className="flex items-end justify-center gap-0.5 mono-num leading-none text-white drop-shadow">
            <span className="text-sm font-black">{d}</span><span className="text-[8px] mb-0.5 opacity-80">d</span>
            <span className="text-sm font-black ml-0.5">{String(h).padStart(2,"0")}</span><span className="text-[8px] mb-0.5 opacity-80">h</span>
            <span className="text-sm font-black ml-0.5">{String(m).padStart(2,"0")}</span><span className="text-[8px] mb-0.5 opacity-80">m</span>
          </div>
          <p className="mono-num text-[10px] text-white text-center mt-0.5 drop-shadow font-bold">{String(s).padStart(2,"0")}s</p>
        </div>
      </button>
    );
  }

  let bg = "bg-gradient-to-br from-surface-2 to-background border-border/60";
  let icon = <Camera className="w-5 h-5" />;
  let label = "Start";
  let labelColor = "text-cyan";

  if (isDone) {
    bg = "bg-gradient-to-br from-emerald/25 to-emerald/5 border-emerald/50 shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)]";
    icon = <CheckCircle2 className="w-5 h-5 text-emerald" />;
    label = "Done";
    labelColor = "text-emerald";
  } else if (readyToReverify) {
    bg = "bg-gradient-to-br from-cyan/25 to-cyan/5 border-cyan/60 shadow-[0_8px_24px_-8px_rgba(34,211,238,0.6)] animate-pulse";
    icon = <Sparkles className="w-5 h-5 text-cyan" />;
    label = "Re-verify";
    labelColor = "text-cyan";
  }

  return (
    <button onClick={onClick}
      className={`relative aspect-square rounded-2xl border ${bg} flex flex-col items-center justify-center gap-1.5 transition hover:scale-[1.03] active:scale-95`}>
      <span className="absolute top-1.5 left-2 text-[10px] font-black text-muted-foreground">#{task.slot}</span>
      {icon}
      <span className={`text-[10px] font-bold ${labelColor}`}>{label}</span>
    </button>
  );
}

// silence
void Clock; void REVERIFY_INTERVAL_MS;
