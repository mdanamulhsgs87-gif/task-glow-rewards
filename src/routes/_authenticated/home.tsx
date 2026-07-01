import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getDashboard } from "@/lib/dashboard.functions";
import { addMoreSlots } from "@/lib/tasks.functions";
import { MiningCounter } from "@/components/MiningCounter";
import { CheckCircle2, Camera, Lock, Sparkles, Loader2, X, Plus } from "lucide-react";
import { AnnouncementTicker } from "@/components/AnnouncementTicker";
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

  const addSlots = useMutation({
    mutationFn: () => addMoreSlots(),
    onSuccess: (r: any) => { toast.success(`✨ আরও ${r.added} টি ঘর খুলেছে`); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan" /></div>;
  }

  const tasks = data.tasks;
  const total = tasks.length;
  const doneCount = tasks.filter((t: any) => t.status === "done").length;
  const verifiedCount = tasks.filter((t: any) => t.status === "verified").length;
  const allDone = total > 0 && doneCount === total;
  const pct = total ? Math.round((doneCount / total) * 100) : 0;

  return (
    <div className="space-y-3 pt-2">
      <AnnouncementTicker />

      <div className="text-center">
        <p className="text-[11px] text-muted-foreground">স্বাগতম,</p>
        <h1 className="text-xl font-black mt-0.5">
          {data.profile?.display_name ?? "ইউজার"} 👋
        </h1>
      </div>

      <MiningCounter
        accrued={Number(data.mining?.accrued_amount ?? 0)}
        withdrawn={Number(data.mining?.withdrawn_amount ?? 0)}
        isActive={!!data.mining?.is_active}
        lastCreditedAt={data.mining?.last_credited_at ?? null}
        effectiveTaskCount={Number(data.mining?.effective_task_count ?? 0)}
        qualifyingReferees={Number(data.mining?.qualifying_referees ?? 0)}
      />

      <div className="premium-panel rounded-2xl p-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-[10px] uppercase text-muted-foreground tracking-[0.15em] font-bold">টাস্ক প্রগ্রেস</p>
            <p className="text-xl font-black mt-0.5 text-navy">
              {doneCount}<span className="text-muted-foreground text-sm">/{total}</span>
              <span className="text-xs font-bold text-emerald ml-2">সম্পন্ন</span>
            </p>
            {verifiedCount > 0 && (
              <p className="text-[10px] text-violet mt-0.5 font-bold">{verifiedCount} টি রি-ভেরিফাইয়ের অপেক্ষায়</p>
            )}
          </div>
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="3" fill="none" className="text-surface-2" />
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="3" fill="none"
                strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
                strokeLinecap="round" className="text-rose transition-all" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-rose">
              {pct}%
            </div>
          </div>
        </div>

        <div className={`grid gap-1.5 ${total === 10 ? "grid-cols-5" : total <= 12 ? "grid-cols-4" : "grid-cols-5"}`}>
          {tasks.map((t: any) => (
            <TaskCell key={t.slot} task={t}
              onClick={() => router.navigate({ to: "/task/$slot", params: { slot: String(t.slot) } })}
              onOpenPhoto={(url) => setLightbox({ url, label: `ঘর #${t.slot} · ${t.face_label || "ফেস"}` })} />
          ))}
        </div>

        {allDone && (
          <button onClick={() => addSlots.mutate()} disabled={addSlots.isPending}
            className="mt-3 w-full gradient-cta rounded-xl py-2.5 font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition">
            {addSlots.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> খোলা হচ্ছে…</>
              : <><Plus className="w-4 h-4" /> আরও ১০টি ঘর যোগ করুন</>}
          </button>
        )}
      </div>

      {!data.wallet && (
        <Link to="/wallet" className="block premium-panel rounded-2xl p-5 border-l-4" style={{ borderLeftColor: "var(--color-amber)" }}>
          <p className="text-base font-black text-amber">⚠️ ওয়ালেট সেট করুন</p>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            টাকা তোলার আগে bKash / Nagad নম্বর সেট করতে হবে — শুধু একবারই সেট করা যাবে, পরে আর পরিবর্তন করা যাবে না।
          </p>
        </Link>
      )}

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
  const whitelistLost = task.whitelist_ok === false;
  const readyToReverify = isVerified && (whitelistLost || dueMs <= now);
  const remainingMs = Math.max(0, dueMs - now);
  const faceUrl: string | undefined = task.signed_face_url;

  if (isVerified && !readyToReverify) {
    const totalSec = Math.floor(remainingMs / 1000);
    const d = Math.floor(totalSec / 86400);
    const h = Math.floor((totalSec % 86400) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return (
      <button onClick={() => faceUrl && onOpenPhoto(faceUrl)}
        className="relative aspect-square rounded-xl overflow-hidden border-2 border-rose/70 shadow-[0_8px_18px_-6px_rgba(239,71,111,0.7)] active:scale-95 transition">
        {faceUrl ? (
          <img src={faceUrl} alt={`Slot ${task.slot}`} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/45" />
        <div className="absolute top-0.5 left-1 right-1 flex items-center justify-between">
          <span className="text-[9px] font-black text-white drop-shadow">#{task.slot}</span>
          <span className="rounded-full bg-rose p-0.5 shadow"><Lock className="w-2 h-2 text-white" /></span>
        </div>
        <div className="absolute bottom-0.5 left-0 right-0 px-0.5">
          <p className="mono-num text-[10px] font-black text-white text-center drop-shadow leading-tight">
            {d}d {String(h).padStart(2,"0")}h
          </p>
          <p className="mono-num text-[9px] text-white/90 text-center drop-shadow font-bold leading-tight">
            {String(m).padStart(2,"0")}m {String(s).padStart(2,"0")}s
          </p>
        </div>
      </button>
    );
  }

  let cellClass = "task-cell-empty";
  let icon = <Camera className="w-5 h-5 text-white drop-shadow-lg" />;
  let label = "শুরু";

  if (isDone) {
    cellClass = "task-cell-done";
    icon = <CheckCircle2 className="w-5 h-5 text-white drop-shadow-lg bounce-soft" />;
    label = "সম্পন্ন";
  } else if (readyToReverify) {
    cellClass = "task-cell-reverify pulse-glow";
    icon = <Sparkles className="w-5 h-5 text-white drop-shadow-lg spin-slow" />;
    label = "রি-ভেরিফাই";
  }

  return (
    <button onClick={onClick}
      className={`relative aspect-square rounded-xl ${cellClass} flex flex-col items-center justify-center gap-0.5 btn-press overflow-hidden`}>
      <span className="absolute top-0.5 left-1 text-[9px] font-black text-white/90 mono-num drop-shadow">#{task.slot}</span>
      <span className="relative">{icon}</span>
      <span className="text-[9px] font-black text-white drop-shadow leading-none">{label}</span>
    </button>
  );
}
