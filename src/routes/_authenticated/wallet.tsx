import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDashboard } from "@/lib/dashboard.functions";
import { setWallet } from "@/lib/wallet.functions";
import { useState } from "react";
import { Wallet, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/wallet")({ component: WalletPage });

function WalletPage() {
  const { data, isLoading, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const [provider, setProvider] = useState<"bkash" | "nagad">("bkash");
  const [number, setNumber] = useState("");

  const mut = useMutation({
    mutationFn: () => setWallet({ data: { provider, number } }),
    onSuccess: () => { toast.success("Wallet save hoyeche!"); refetch(); },
    onError: (e: any) => toast.error(e.message),
  });

  if (isLoading) return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan" /></div>;
  const wallet = data?.wallet;

  return (
    <div className="space-y-4 pt-2">
      <div className="text-center">
        <Wallet className="w-8 h-8 text-cyan mx-auto" />
        <h1 className="text-xl font-black mt-1">Wallet</h1>
        <p className="text-[11px] text-muted-foreground">Withdraw er jonno mobile number set korun</p>
      </div>

      {wallet ? (
        <div className="glass rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Set hoyeche</span>
            <CheckCircle2 className="w-4 h-4 text-emerald" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Provider</p>
            <p className="font-black text-lg capitalize">{wallet.provider}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Number</p>
            <p className="mono-num font-black text-lg">{wallet.number}</p>
          </div>
          <div className="flex items-center gap-2 bg-rose/10 border border-rose/30 rounded-xl p-3">
            <Lock className="w-4 h-4 text-rose shrink-0" />
            <p className="text-[10px] text-rose font-bold">
              Ei number lock — change kora jabe na. Sob payment ei number e ashbe.
            </p>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); mut.mutate(); }} className="glass rounded-2xl p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Provider</label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {(["bkash", "nagad"] as const).map((p) => (
                <button key={p} type="button" onClick={() => setProvider(p)}
                  className={`py-3 rounded-xl border-2 font-black text-sm capitalize transition ${
                    provider === p ? "border-cyan bg-cyan/15 text-cyan" : "border-border bg-surface-2 text-muted-foreground"
                  }`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Mobile number</label>
            <input value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="01XXXXXXXXX" maxLength={11}
              className="w-full mt-2 px-4 py-3 mono-num bg-surface-2 border border-border rounded-xl text-base outline-none focus:border-cyan" />
            <p className="text-[10px] text-amber mt-2 flex items-center gap-1">
              <Lock className="w-3 h-3" /> Ekbar save korle ar change kora jabe na
            </p>
          </div>
          <button disabled={mut.isPending || number.length !== 11}
            className="w-full py-3 rounded-xl gradient-cta font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {mut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & Lock
          </button>
        </form>
      )}
    </div>
  );
}
