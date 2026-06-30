import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/dashboard.functions";
import { MiningCounter } from "@/components/MiningCounter";
import { CheckCircle2, Clock, Camera, Lock, Sparkles, Loader2, Copy } from "lucide-react";
import { REVERIFY_INTERVAL_MS, TOTAL_TASKS } from "@/lib/constants";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/home")({ component: HomePage });

function HomePage() {
  const router = useRouter();
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

        <div className="grid grid-cols-5 gap-2">
          {tasks.map((t: any) => (
            <TaskCell key={t.slot} task={t} onClick={() => router.navigate({ to: "/task/$slot", params: { slot: String(t.slot) } })} />
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
                  <img src={t.signed_face_url} alt={`Slot ${t.slot} face`} className="h-16 w-16 shrink-0 rounded-lg object-cover" />
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
    </div>
  );
}

function TaskCell({ task, onClick }: { task: any; onClick: () => void }) {
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

  let bg = "bg-surface-2 border-border";
  let icon = <Camera className="w-4 h-4" />;
  let label = "Start";
  let labelColor = "text-cyan";

  if (isDone) {
    bg = "bg-emerald/15 border-emerald/40";
    icon = <CheckCircle2 className="w-4 h-4 text-emerald" />;
    label = "Done";
    labelColor = "text-emerald";
  } else if (isVerified && !readyToReverify) {
    bg = "bg-amber/10 border-amber/30";
    icon = <Lock className="w-4 h-4 text-amber" />;
    const h = Math.floor(remainingMs / 3600000);
    const m = Math.floor((remainingMs % 3600000) / 60000);
    label = h > 0 ? `${h}h ${m}m` : `${m}m`;
    labelColor = "text-amber";
  } else if (readyToReverify) {
    bg = "bg-cyan/15 border-cyan/50 animate-pulse";
    icon = <Sparkles className="w-4 h-4 text-cyan" />;
    label = "Re-verify";
    labelColor = "text-cyan";
  }

  return (
    <button onClick={onClick} disabled={isVerified && !readyToReverify}
      className={`aspect-square rounded-xl border-2 ${bg} flex flex-col items-center justify-center gap-1 transition disabled:opacity-90`}>
      <span className="text-[10px] font-black text-muted-foreground">#{task.slot}</span>
      {icon}
      <span className={`text-[8px] font-bold ${labelColor} leading-tight text-center px-1`}>{label}</span>
    </button>
  );
}

// silence
void Clock; void REVERIFY_INTERVAL_MS;
