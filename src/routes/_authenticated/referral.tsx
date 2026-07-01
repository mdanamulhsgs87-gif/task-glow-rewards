import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getMyReferrals } from "@/lib/referral.functions";
import { কপি, Share2, Users, Gift, CheckCircle2, Clock, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/_authenticated/referral")({
  ssr: false,
  component: ReferralPage,
});

function ReferralPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["referrals"],
    queryFn: () => getMyReferrals(),
    refetchInterval: 30_000,
  });

  const [shareUrl, setShareUrl] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined" && data?.referralCode) {
      setShareUrl(`${window.location.origin}/auth?ref=${data.referralCode}`);
    }
  }, [data?.referralCode]);

  if (isLoading || !data) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan" /></div>;
  }

  const code = data.referralCode ?? "—";
  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(`${label} কপি হয়েছে`);
  };
  const share = async () => {
    const text = `good-app এ যোগ দিন! আমার রেফারেল কোড: ${code}\n${shareUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: "good-app", text, url: shareUrl }); } catch {}
    } else { copy(text, "শেয়ার লিংক"); }
  };

  return (
    <div className="space-y-5 pt-2 pb-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-emerald mb-2 float-anim">
          <Gift className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-black text-navy">রেফার করুন · ১০% বোনাস</h1>
        <p className="text-[12px] text-muted-foreground mt-1 px-4 leading-relaxed">
          আপনার রেফারেল কোডে যিনি যোগ দেবেন, তাঁর <b>১০টি ঘর সম্পূর্ণ ভেরিফাই</b> হলে আপনি প্রতি মাসে তাঁর জন্য <b className="text-emerald">+৫০ টাকা</b> বোনাস পাবেন (১০%)।
        </p>
      </div>

      <div className="premium-panel rounded-3xl p-5 text-center">
        <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">আপনার কোড</p>
        <p className="mono-num text-4xl font-black text-emerald mt-2 tracking-widest">{code}</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button onClick={() => copy(code, "কোড")} className="py-2.5 rounded-xl gradient-cta font-black text-xs flex items-center justify-center gap-1.5 btn-press">
            <কপি className="w-3.5 h-3.5" /> কোড কপি
          </button>
          <button onClick={share} className="py-2.5 rounded-xl gradient-emerald font-black text-xs flex items-center justify-center gap-1.5 btn-press">
            <Share2 className="w-3.5 h-3.5" /> শেয়ার
          </button>
        </div>
        {shareUrl && (
          <button onClick={() => copy(shareUrl, "লিংক")}
            className="mt-2 w-full py-2 rounded-lg bg-surface-2 border border-border text-[11px] text-navy/80 font-bold truncate">
            🔗 {shareUrl}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="premium-panel rounded-2xl p-4 text-center">
          <Users className="w-5 h-5 text-cyan mx-auto" />
          <p className="text-[10px] text-muted-foreground mt-1 font-bold">মোট রেফার</p>
          <p className="text-2xl font-black text-cyan mono-num">{data.totalReferred}</p>
        </div>
        <div className="premium-panel rounded-2xl p-4 text-center">
          <Sparkles className="w-5 h-5 text-emerald mx-auto" />
          <p className="text-[10px] text-muted-foreground mt-1 font-bold">বোনাস সক্রিয়</p>
          <p className="text-2xl font-black text-emerald mono-num">{data.qualifiedCount}</p>
        </div>
      </div>

      <div className="premium-panel rounded-3xl p-5">
        <h2 className="font-black text-navy text-sm mb-3">📘 কিভাবে রেফার করবেন</h2>
        <ol className="space-y-2 text-[12px] text-navy/85 leading-relaxed">
          <li><b className="text-cyan">১.</b> উপরের কোড বা লিংক কপি করে বন্ধুকে পাঠান।</li>
          <li><b className="text-cyan">২.</b> বন্ধু সাইন আপ ফর্মে কোডটি বসিয়ে একাউন্ট খুলবেন।</li>
          <li><b className="text-cyan">৩.</b> বন্ধু যখন ১০টি ঘর Face Verify সম্পন্ন করবেন, তখনই আপনার বোনাস <b className="text-emerald">+১০% rate</b> চালু হয়ে যাবে — লাইভ মাইনিং কাউন্টারে যোগ হবে।</li>
          <li><b className="text-amber">⚠️</b> যদি কোনো একটি ঘরও Re-verify না করার কারণে whitelist হারায়, ঐ বন্ধুর জন্য বোনাস বন্ধ হয়ে যাবে। আবার Re-verify করালে বোনাস ফিরে আসবে।</li>
        </ol>
      </div>

      <div className="premium-panel rounded-3xl p-5">
        <h2 className="font-black text-navy text-sm mb-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-cyan" /> আপনার রেফার তালিকা
        </h2>
        {data.referees.length === 0 && (
          <p className="text-center text-[12px] text-muted-foreground py-6">
            এখনো কেউ আপনার কোড ব্যবহার করেননি। কোডটি বন্ধুদের শেয়ার করুন!
          </p>
        )}
        <ul className="space-y-2">
          {data.referees.map((r) => (
            <li key={r.id} className={`rounded-2xl p-3 border ${r.qualified ? "border-emerald/40 bg-emerald/5" : "border-border bg-white"}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-black text-sm text-navy truncate">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground mono-num">{r.phone}</p>
                </div>
                {r.qualified ? (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-emerald text-white px-2.5 py-1 text-[10px] font-black">
                    <CheckCircle2 className="w-3 h-3" /> বোনাস সক্রিয়
                  </span>
                ) : (
                  <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber/15 text-amber px-2.5 py-1 text-[10px] font-black">
                    <Clock className="w-3 h-3" /> {r.validDone}/10
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
        <button onClick={() => refetch()} className="mt-3 w-full text-[11px] text-muted-foreground underline">রিফ্রেশ</button>
      </div>

      <div className="text-center">
        <Link to="/home" className="text-[11px] text-cyan font-bold underline">← হোমে ফিরুন</Link>
      </div>
    </div>
  );
}
