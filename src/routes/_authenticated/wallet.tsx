import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDashboard } from "@/lib/dashboard.functions";
import { setWallet } from "@/lib/wallet.functions";
import { useState } from "react";
import { Wallet, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wallet")({ component: WalletPage });

function WalletPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const [provider, setProvider] = useState<"bkash" | "nagad">("bkash");
  const [number, setNumber] = useState("");

  const mut = useMutation({
    mutationFn: () => setWallet({ data: { provider, number } }),
    onSuccess: () => { toast.success("ওয়ালেট সেভ হয়েছে"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan" /></div>;
  const wallet = data?.wallet;

  return (
    <div className="space-y-4 pt-2">
      <div className="text-center">
        <Wallet className="w-8 h-8 text-cyan mx-auto" />
        <h1 className="text-xl font-black mt-1">ওয়ালেট</h1>
        <p className="text-[11px] text-muted-foreground">টাকা তোলার জন্য মোবাইল নম্বর সেট করুন</p>
      </div>

      {wallet ? (
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">সেট হয়েছে</span>
            <CheckCircle2 className="w-4 h-4 text-emerald" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">প্রোভাইডার</p>
            <p className="font-black text-lg capitalize">{wallet.provider === "bkash" ? "বিকাশ" : "নগদ"}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">নম্বর</p>
            <p className="mono-num font-black text-lg">{wallet.number}</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald/10 border border-emerald/30 rounded-xl p-3">
            <ShieldCheck className="w-4 h-4 text-emerald shrink-0" />
            <p className="text-[10px] text-emerald font-bold leading-relaxed">
              এই নম্বরটি স্থায়ীভাবে সংরক্ষিত হয়েছে। আপনার সকল পেমেন্ট এই নম্বরেই পাঠানো হবে।
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="glass rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">প্রোভাইডার নির্বাচন</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(["bkash", "nagad"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setProvider(p)}
                  className={`py-3 rounded-xl border-2 font-black text-sm transition ${
                    provider === p ? "border-cyan bg-cyan/15 text-cyan" : "border-border bg-surface-2 text-muted-foreground"
                  }`}>
                  {p === "bkash" ? "বিকাশ" : "নগদ"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">মোবাইল নম্বর</label>
            <input value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="numeric" placeholder="০১XXXXXXXXX (১১ ডিজিট)" maxLength={11}
              className="w-full mt-2 px-4 py-3 mono-num bg-surface-2 border border-border rounded-xl text-base outline-none focus:border-cyan" />
            <p className="text-[10px] text-amber mt-2 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> একবার সেভ করার পর নম্বর আর পরিবর্তন করা যাবে না। ভেবে-চিন্তে দিন।
            </p>
          </div>
          <button disabled={mut.isPending || number.length !== 11}
            className="w-full py-3 rounded-xl gradient-cta font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            সেভ করুন
          </button>
        </form>
      )}
    </div>
  );
}
