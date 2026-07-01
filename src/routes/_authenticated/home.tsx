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
    <div className="space-y-6 pt-3">
      <AnnouncementTicker />

      <div className="text-center">
        <p className="text-sm text-muted-foreground">স্বাগতম,</p>
        <h1 className="text-3xl font-black mt-1">
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

      <div className="premium-panel rounded-3xl p-5">
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="text-xs uppercase text-muted-foreground tracking-[0.2em] font-bold">টাস্ক প্রগ্রেস</p>
            <p className="text-3xl font-black mt-1 text-navy">
              {doneCount}<span className="text-muted-foreground text-lg">/{total}</span>
              <span className="text-sm font-bold text-emerald ml-2">সম্পন্ন</span>
            </p>
            {verifiedCount > 0 && (
              <p className="text-xs text-violet mt-1 font-bold">{verifiedCount} টি রি-ভেরিফাইয়ের অপেক্ষায়</p>
            )}
          </div>
          <div className="relative w-20 h-20">
            <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="3" fill="none" className="text-surface-2" />
              <circle cx="18" cy="18" r="15" stroke="currentColor" strokeWidth="3" fill="none"
                strokeDasharray={`${(pct / 100) * 94.2} 94.2`}
                strokeLinecap="round" className="text-rose transition-all" />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-black text-rose">
              {pct}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3.5">
          {tasks.map((t: any) => (
            <TaskCell key={t.slot} task={t}
              onClick={() => router.navigate({ to: "/task/$slot", params: { slot: String(t.slot) } })}
              onOpenPhoto={(url) => setLightbox({ url, label: `ঘর #${t.slot} · ${t.face_label || "ফেস"}` })} />
          ))}
        </div>

        {allDone && (
          <button onClick={() => addSlots.mutate()} disabled={addSlots.isPending}
            className="mt-5 w-full gradient-cta rounded-2xl py-4 font-black text-base flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] transition">
            {addSlots.isPending
              ? <><Loader2 className="w-5 h-5 animate-spin" /> খোলা হচ্ছে…</>
              : <><Plus className="w-5 h-5" /> আরও ১০টি ঘর যোগ করুন</>}
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
  const readyToReverify = isVerified && dueMs <= now;
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
        className="relative aspect-square rounded-2xl overflow-hidden border-2 border-violet/60 shadow-[0_10px_30px_-10px_rgba(139,92,246,0.6)] active:scale-95 transition">
        {faceUrl ? (
          <img src={faceUrl} alt={`Slot ${task.slot}`} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-surface-2" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40" />
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

  let bg = "bg-white";
  let border = "border-2 border-dashed border-cyan/40";
  let icon = <Camera className="w-6 h-6 text-cyan drop-shadow" />;
  let label = "শুরু";
  let labelColor = "text-cyan";
  let extra = "hover:border-cyan hover:shadow-[0_10px_28px_-10px_color-mix(in_oklch,var(--color-cyan)_60%,transparent)]";

  if (isDone) {
    bg = "bg-gradient-to-br from-emerald/20 via-white to-cyan/10";
    border = "border-2 border-emerald/60";
    icon = <CheckCircle2 className="w-6 h-6 text-emerald drop-shadow bounce-soft" />;
    label = "সম্পন্ন";
    labelColor = "text-emerald";
    extra = "shadow-[0_12px_30px_-12px_color-mix(in_oklch,var(--color-emerald)_65%,transparent)]";
  } else if (readyToReverify) {
    bg = "bg-gradient-to-br from-violet/20 via-white to-cyan/15";
    border = "border-2 border-violet/60";
    icon = <Sparkles className="w-6 h-6 text-violet drop-shadow spin-slow" />;
    label = "রি-ভেরিফাই";
    labelColor = "text-violet";
    extra = "pulse-glow shadow-[0_12px_30px_-10px_color-mix(in_oklch,var(--color-violet)_70%,transparent)]";
  }

  return (
    <button onClick={onClick}
      className={`relative aspect-square rounded-2xl ${border} ${bg} ${extra} flex flex-col items-center justify-center gap-1.5 btn-press overflow-hidden`}>
      <span className="absolute top-1 left-1.5 text-[10px] font-black text-navy/50 mono-num">#{task.slot}</span>
      <span className="relative">{icon}</span>
      <span className={`text-[10px] font-black ${labelColor}`}>{label}</span>
    </button>
  );
}
