import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { getProfileHistory, uploadAvatar } from "@/lib/profile.functions";
import { computeLiveBalance } from "@/lib/mining";
import { Camera, Download, Loader2, User, IdCard, History, Sparkles, CheckCircle2, XCircle, Clock, Copy } from "lucide-react";
import { toast } from "sonner";
import { PageVoice } from "@/components/PageVoice";
import { QrCode } from "@/components/QrCode";
import html2canvas from "html2canvas";


export const Route = createFileRoute("/_authenticated/profile")({ component: ProfilePage });

function ProfilePage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["profile-history"], queryFn: () => getProfileHistory(), refetchInterval: 30_000,
  });
  const [tab, setTab] = useState<"card" | "withdraw" | "claim">("card");
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);

  const upload = useMutation({
    mutationFn: async (file: File) => {
      if (!file.type.startsWith("image/")) throw new Error("শুধু ছবি আপলোড করা যাবে");
      // Client-side resize to keep payload well under limits (any MB in → ~150KB out)
      const dataUrl: string = await new Promise((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => res(reader.result as string);
        reader.onerror = () => rej(new Error("ফাইল পড়া যায়নি"));
        reader.readAsDataURL(file);
      });
      const img = new Image();
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = () => rej(new Error("ছবি লোড করা যায়নি"));
        img.src = dataUrl;
      });
      const MAX = 800;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, w, h);
      const jpeg = canvas.toDataURL("image/jpeg", 0.85);
      const base64 = jpeg.split(",")[1];
      return uploadAvatar({ data: { base64, contentType: "image/jpeg" } });
    },
    onSuccess: () => { toast.success("প্রোফাইল ছবি আপডেট হয়েছে ✨"); refetch(); },
    onError: (e: any) => toast.error(e.message ?? "আপলোড ব্যর্থ হয়েছে"),
  });

  if (isLoading || !data) {
    return <div className="py-24 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-violet" /></div>;
  }

  const p = data.profile!;
  const uidFull = String(p.id);
  const uid = uidFull.replace(/-/g, "").slice(0, 12).toUpperCase();
  const cardUrl = typeof window !== "undefined" ? `${window.location.origin}/card/${uidFull}` : `/card/${uidFull}`;
  const mining = data.mining;
  const balance = mining ? computeLiveBalance({
    accrued: Number(mining.accrued_amount), withdrawn: Number(mining.withdrawn_amount),
    isActive: !!mining.is_active, lastCreditedAt: mining.last_credited_at, now,
  }) : 0;
  const doneCount = (data.tasks ?? []).filter((t: any) => t.status === "done" && (t.whitelist_ok ?? true)).length;
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, { backgroundColor: null, scale: 2, useCORS: true });
      const link = document.createElement("a");
      link.download = `good-app-card-${uid}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("কার্ড ডাউনলোড হয়েছে ✨");
    } catch (e: any) {
      toast.error(e?.message ?? "ডাউনলোড ব্যর্থ");
    } finally { setDownloading(false); }
  };

  return (
    <div className="space-y-5 pt-2 pop-in">
      <PageVoice pageId="profile" steps={["profile.intro","profile.avatar","profile.uid","profile.card","profile.qr","profile.download"]} />
      <div className="text-center">
        <h1 className="text-2xl font-black flex items-center justify-center gap-2">
          <Sparkles className="w-5 h-5 text-gold bounce-soft" /> আমার প্রোফাইল
        </h1>
        <p className="text-xs text-muted-foreground mt-1">সম্পূর্ণ তথ্য, কার্ড ও হিস্ট্রি</p>
      </div>

      {/* Avatar + basic */}
      <div className="glass rounded-2xl p-5 flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-2xl overflow-hidden shimmer-border bg-surface-2 flex items-center justify-center">
            {data.avatar_signed ? (
              <img src={data.avatar_signed} className="w-full h-full object-cover" alt="avatar" />
            ) : (
              <User className="w-10 h-10 text-muted-foreground" />
            )}
          </div>
          <label data-voice="profile.avatar" className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full gradient-cta flex items-center justify-center cursor-pointer btn-press glow-violet">
            {upload.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
            <input type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); }} />
          </label>
        </div>
        <button
          type="button"
          onClick={() => { navigator.clipboard.writeText(uid); toast.success("UID কপি হয়েছে"); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gold/15 border border-gold/40 text-gold font-black text-[11px] btn-press"
          title="UID কপি করুন"
        >
          <IdCard className="w-3.5 h-3.5" />
          <span className="mono-num tracking-widest">UID: {uid}</span>
          <Camera className="w-0 h-0" />
          <span className="text-[10px]">📋</span>
        </button>
        <div className="text-center min-w-0 w-full">
          <p className="text-lg font-black truncate">{p.display_name ?? "ইউজার"}</p>
          <p className="text-xs text-muted-foreground mono-num">{p.phone_number ?? "-"}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-2">
        <TabBtn active={tab === "card"}    onClick={() => setTab("card")}    icon={<IdCard className="w-4 h-4" />} label="কার্ড" voice="profile.card" />
        <TabBtn active={tab === "withdraw"} onClick={() => setTab("withdraw")} icon={<History className="w-4 h-4" />} label="উইথড্র" voice="profile.history" />
        <TabBtn active={tab === "claim"}    onClick={() => setTab("claim")}    icon={<Sparkles className="w-4 h-4" />} label="ক্লেইম" voice="profile.history" />
      </div>

      {tab === "card" && (
        <div className="space-y-3" data-voice="profile.card">
          <div id="print-card" className="id-card p-5 pop-in">
            <div className="id-watermark">GOOD</div>
            <div className="relative flex items-start justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-gold font-bold">good-app · Official</p>
                <p className="text-[10px] text-white/60 mt-0.5">সদস্য পরিচয়পত্র</p>
              </div>
              <div className="w-10 h-10 rounded-lg gradient-gold flex items-center justify-center shine">
                <span className="text-[10px] font-black">GA</span>
              </div>
            </div>

            <div className="relative mt-5 flex gap-4">
              <div className="w-24 h-28 rounded-lg overflow-hidden border-2 border-gold/60 bg-surface-2 flex items-center justify-center shrink-0">
                {data.avatar_signed
                  ? <img src={data.avatar_signed} className="w-full h-full object-cover" alt="" />
                  : <User className="w-10 h-10 text-white/40" />}
              </div>
              <div className="flex-1 min-w-0 text-white space-y-1.5">
                <Row k="নাম" v={p.display_name ?? "-"} />
                <Row k="মোবাইল" v={p.phone_number ?? "-"} mono />
                <Row k="রেফার কোড" v={p.referral_code} mono />
                <Row k="যোগদান" v={new Date(p.created_at).toLocaleDateString("bn-BD")} />
              </div>
            </div>

            <div className="relative mt-4 pt-4 border-t border-gold/25 grid grid-cols-3 gap-2 text-white">
              <Stat label="টাস্ক" value={`${doneCount}/${(data.tasks ?? []).length}`} />
              <Stat label="ব্যালান্স" value={`${balance.toFixed(2)}৳`} />
              <Stat label="উইথড্র" value={`${(data.withdrawals ?? []).length}x`} />
            </div>

            <div className="relative mt-4 flex items-end justify-between">
              <div>
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/50">Card No.</p>
                <p className="mono-num text-lg font-black text-gold tracking-widest">
                  {uid.match(/.{1,4}/g)?.join(" ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-[0.25em] text-white/50">Signature</p>
                <p className="font-black text-cyan italic">~ {p.display_name?.split(" ")[0] ?? "user"}</p>
              </div>
            </div>
          </div>

          <button onClick={() => window.print()}
            className="no-print w-full gradient-gold rounded-2xl py-3.5 font-black text-sm flex items-center justify-center gap-2 btn-press glow-gold">
            <Printer className="w-4 h-4" /> কার্ড প্রিন্ট / ডাউনলোড
          </button>
        </div>
      )}

      {tab === "withdraw" && (
        <HistoryList
          empty="এখনো কোনো উইথড্র হয়নি"
          items={(data.withdrawals ?? []).map((w: any) => ({
            id: w.id,
            amount: Number(w.amount),
            date: w.created_at,
            status: w.status,
            meta: `${w.provider} · ${w.wallet_number}`,
          }))}
        />
      )}

      {tab === "claim" && (
        <HistoryList
          empty="এখনো কোনো মাইনিং ক্লেইম নেই"
          items={(data.claims ?? []).map((c: any) => ({
            id: c.id,
            amount: Number(c.amount),
            date: c.created_at,
            status: "claim",
            meta: c.note ?? "Snapshot",
          }))}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon, label, voice }: any) {
  return (
    <button onClick={onClick} data-voice={voice}
      className={`btn-press py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition-all ${
        active ? "gradient-cta border-transparent glow-violet" : "bg-surface-2 border-border text-muted-foreground"
      }`}>
      {icon} {label}
    </button>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[9px] uppercase tracking-widest text-white/50 w-16 shrink-0">{k}</span>
      <span className={`text-sm font-bold truncate ${mono ? "mono-num" : ""}`}>{v}</span>
    </div>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center rounded-lg bg-white/5 py-2">
      <p className="text-[9px] uppercase tracking-widest text-white/50">{label}</p>
      <p className="text-sm font-black mono-num text-gold mt-0.5">{value}</p>
    </div>
  );
}

function HistoryList({ items, empty }: { items: any[]; empty: string }) {
  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <History className="w-8 h-8 text-muted-foreground mx-auto mb-2 float-anim" />
        <p className="text-xs text-muted-foreground">{empty}</p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {items.map((it, idx) => (
        <div key={it.id} className="glass rounded-xl p-3 flex items-center justify-between pop-in"
          style={{ animationDelay: `${idx * 40}ms` }}>
          <div className="min-w-0">
            <p className="mono-num font-black text-base text-gold">{it.amount.toFixed(4)} ৳</p>
            <p className="text-[10px] text-muted-foreground truncate">
              {new Date(it.date).toLocaleString("bn-BD")} · {it.meta}
            </p>
          </div>
          <StatusPill status={it.status} />
        </div>
      ))}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: any; label: string }> = {
    paid:     { cls: "bg-emerald/15 text-emerald border-emerald/30", icon: CheckCircle2, label: "PAID" },
    pending:  { cls: "bg-amber/15 text-amber border-amber/30",       icon: Clock, label: "PENDING" },
    rejected: { cls: "bg-rose/15 text-rose border-rose/30",          icon: XCircle, label: "REJECTED" },
    claim:    { cls: "bg-violet/15 text-violet border-violet/30",    icon: Sparkles, label: "CLAIM" },
  };
  const s = map[status] ?? map.pending;
  const Icon = s.icon;
  return (
    <span className={`text-[10px] font-black px-2 py-1 rounded-full border flex items-center gap-1 ${s.cls}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}
