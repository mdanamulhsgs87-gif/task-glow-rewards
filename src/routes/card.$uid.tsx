import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getPublicCardDetails } from "@/lib/profile.functions";
import { QrCode } from "@/components/QrCode";
import { User, Sparkles, ShieldCheck, Wallet, Users, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/card/$uid")({ component: PublicCardPage });

function PublicCardPage() {
  const { uid } = Route.useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-card", uid],
    queryFn: () => getPublicCardDetails({ data: { uid } }),
    retry: false,
  });

  if (isLoading) return <div className="p-8 text-center text-sm text-muted-foreground">লোড হচ্ছে…</div>;
  if (error || !data) return (
    <div className="p-8 text-center space-y-3">
      <p className="text-sm text-destructive font-bold">কার্ড খুঁজে পাওয়া যায়নি</p>
      <Link to="/auth" className="text-xs underline">হোমে ফিরে যান</Link>
    </div>
  );

  const p = data.profile;
  const uidCompact = String(p.id).replace(/-/g, "").slice(0, 12).toUpperCase();
  const cardUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <div className="min-h-screen p-4 flex items-center justify-center"
         style={{ background: "linear-gradient(135deg,#0f0c29,#302b63,#24243e)" }}>
      <div className="w-full max-w-md space-y-4">
        <div className="relative rounded-3xl p-5 text-white overflow-hidden shadow-2xl"
          style={{ background: "linear-gradient(135deg,#ff6b6b 0%,#f59e0b 25%,#10b981 55%,#06b6d4 78%,#8b5cf6 100%)" }}>
          <div className="absolute inset-0 opacity-25 pointer-events-none"
            style={{ background: "repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 2px, transparent 2px 14px)" }} />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.3em] font-black">good-app · Official</p>
              <p className="text-[11px] mt-0.5 font-bold">সদস্য পরিচয়পত্র (পাবলিক)</p>
            </div>
            <div className="rounded-xl bg-white p-1.5 shadow-lg">
              <QrCode value={cardUrl} size={64} />
            </div>
          </div>

          <div className="relative mt-4 flex gap-3">
            <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-white/80 bg-white/20 flex items-center justify-center shrink-0 shadow-lg">
              {data.avatar_signed
                ? <img src={data.avatar_signed} className="w-full h-full object-cover" alt="" />
                : <User className="w-10 h-10 text-white/80" />}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5 text-[12px] font-bold">
              <p><span className="opacity-75">নাম:</span> {p.display_name ?? "-"}</p>
              <p><span className="opacity-75">রেফার:</span> {p.referral_code}</p>
              <p><span className="opacity-75">যোগদান:</span> {new Date(p.created_at).toLocaleDateString("bn-BD")}</p>
              <p className="mono-num tracking-widest text-[11px] pt-1">
                UID {uidCompact.match(/.{1,4}/g)?.join(" ")}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <PublicStat icon={<ShieldCheck className="w-4 h-4" />} label="ভেরিফাই সাক্ষী" value={`${data.stats.verified}/${data.stats.totalTasks}`} c="#10b981" />
          <PublicStat icon={<Wallet className="w-4 h-4" />} label="ব্যালান্স" value={`${data.stats.balance.toFixed(2)}৳`} c="#f59e0b" />
          <PublicStat icon={<TrendingUp className="w-4 h-4" />} label="মোট উইথড্র" value={`${data.stats.totalWithdrawn.toFixed(0)}৳ (${data.stats.withdrawCount}x)`} c="#06b6d4" />
          <PublicStat icon={<Users className="w-4 h-4" />} label="রেফার" value={`${data.stats.referrals} জন`} c="#8b5cf6" />
        </div>

        <div className="text-center text-white/70 text-[11px] flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" /> good-app · সমাজের সুবিধাবঞ্চিতদের পাশে
        </div>
      </div>
    </div>
  );
}

function PublicStat({ icon, label, value, c }: { icon: React.ReactNode; label: string; value: string; c: string }) {
  return (
    <div className="rounded-2xl p-3 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${c}CC, ${c}77)` }}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-95">{icon}{label}</div>
      <p className="text-lg font-black mt-1 mono-num">{value}</p>
    </div>
  );
}
