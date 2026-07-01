import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { listReverifyCandidates, completeReverify } from "@/lib/tasks.functions";
import { buildVerifyUrl, isWhitelisted } from "@/lib/gooddollar";
import { FaceCapture } from "@/components/FaceCapture";
import { ArrowLeft, ExternalLink, Loader2, RefreshCcw, Search, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reverify")({ component: ReverifyPage });

type Step = "list" | "verify" | "photo" | "done";

function ReverifyPage() {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<any | null>(null);
  const [verifyUrl, setVerifyUrl] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("list");
  const [opened, setOpened] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const returnedRef = useRef(false);

  const { data: candidates, isFetching, refetch } = useQuery({
    queryKey: ["reverify-candidates", query],
    queryFn: () => listReverifyCandidates({ data: { query } }),
  });

  const completeMut = useMutation({
    mutationFn: (input: { taskId: string; newPhotoBase64?: string }) => completeReverify({ data: input }),
    onSuccess: (r: any) => {
      toast.success(r.miningActivated ? "🎉 Mining shuru hoyeche!" : "Re-verify done!");
      setStep("done");
      setTimeout(() => { setStep("list"); setSelected(null); setVerifyUrl(null); refetch(); }, 2500);
    },
    onError: (e: any) => toast.error(e.message),
  });

  useEffect(() => {
    if (step !== "verify" || !opened) return;
    const onVis = () => {
      if (document.visibilityState === "visible" && !returnedRef.current) {
        returnedRef.current = true;
        setCountdown(10);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, [step, opened]);

  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const onSelect = async (cand: any) => {
    setSelected(cand);
    try {
      const { url } = await buildVerifyUrl(cand.wallet_private_key, cand.face_label || "User");
      setVerifyUrl(url);
      setStep("verify");
      setOpened(false);
      returnedRef.current = false;
      setCountdown(null);
    } catch (e: any) {
      toast.error("URL banano gelo na: " + e.message);
    }
  };

  const onSubmit = async () => {
    if (!selected) return;
    setChecking(true);
    try {
      const ok = await isWhitelisted(selected.wallet_address);
      if (!ok) {
        toast.error("Whitelist e pawa jay nai — GoodDollar e verify shesh koren");
        return;
      }
      setStep("photo");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  };

  const onNewPhoto = (b64: string) => {
    if (!selected) return;
    completeMut.mutate({ taskId: selected.id, newPhotoBase64: b64 });
  };

  return (
    <div className="space-y-4 pt-2">
      <Link to="/home" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> পিছনে
      </Link>

      <div className="glass rounded-2xl p-4 flex items-center gap-3">
        <RefreshCcw className="w-5 h-5 text-amber" />
        <div>
          <h1 className="text-base font-black text-amber">Re-verify</h1>
          <p className="text-[10px] text-muted-foreground">Nam diye search kore re-verify koren</p>
        </div>
      </div>

      {step === "list" && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="relative">
            <খুঁজুন className="w-4 h-4 absolute top-3 left-3 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Nam likhe khujun..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm outline-none focus:border-amber" />
          </div>

          {isFetching ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-4 h-4 animate-spin text-amber" /></div>
          ) : !candidates || candidates.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              {query ? "Ei name e kichu nai" : "Re-verify er jonno kichu nai"}
            </p>
          ) : (
            <div className="space-y-2">
              {candidates.map((c: any) => {
                const due = c.reverify_due_at ? new Date(c.reverify_due_at).getTime() : 0;
                const ready = due <= Date.now();
                return (
                  <button key={c.id} disabled={!ready} onClick={() => onSelect(c)}
                    className={`w-full flex items-center gap-3 p-2 rounded-xl border text-left transition ${
                      ready ? "border-amber/40 bg-amber/5 hover:bg-amber/10" : "border-border bg-surface-2 opacity-60"
                    }`}>
                    {c.photo_url
                      ? <img src={c.photo_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
                      : <div className="w-12 h-12 rounded-lg bg-surface-2" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{c.face_label || "Untitled"}</p>
                      <p className="text-[10px] text-muted-foreground mono-num truncate">{c.wallet_address?.slice(0, 16)}…</p>
                      <p className="text-[10px] font-bold" style={{ color: ready ? "var(--amber)" : undefined }}>
                        {ready ? "✨ Ready" : `Slot #${c.slot} · 3 din opekkha`}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {step === "verify" && selected && verifyUrl && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <div className="rounded-xl bg-amber/10 border border-amber/30 p-3">
            <p className="text-xs font-bold text-amber">🔄 {selected.face_label}</p>
            <p className="text-[10px] text-muted-foreground mt-1 break-all">{selected.wallet_address}</p>
          </div>
          <a href={verifyUrl} target="_blank" rel="noopener noreferrer"
            onClick={() => { setOpened(true); returnedRef.current = false; }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl gradient-cta font-black">
            <ExternalLink className="w-4 h-4" /> GoodDollar Re-verify khulun
          </a>
          {opened && countdown !== null && countdown > 0 && (
            <div className="text-center py-3 rounded-xl bg-amber/10 border border-amber/30">
              <p className="text-xs text-muted-foreground">জমা দিন asbe</p>
              <p className="text-3xl font-black text-amber mono-num">{countdown}s</p>
            </div>
          )}
          {opened && countdown === 0 && (
            <button onClick={onSubmit} disabled={checking}
              className="w-full py-4 rounded-xl gradient-cta font-black flex items-center justify-center gap-2">
              {checking ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking…</> : <><ShieldCheck className="w-4 h-4" /> জমা দিন</>}
            </button>
          )}
          <button onClick={() => { setStep("list"); setSelected(null); setVerifyUrl(null); setOpened(false); setCountdown(null); }}
            className="w-full py-2 rounded-xl border border-border text-xs text-muted-foreground">বাতিল</button>
        </div>
      )}

      {step === "photo" && selected && (
        <div className="glass rounded-2xl p-4 space-y-2">
          <p className="text-xs text-emerald font-bold text-center">✅ Whitelist confirmed — notun chobi tulun</p>
          <FaceCapture title="Notun chobi" onCapture={onNewPhoto}
            onCancel={() => setStep("verify")} isUploading={completeMut.isPending} />
        </div>
      )}

      {step === "done" && (
        <div className="rounded-2xl bg-emerald/10 border border-emerald/40 p-6 text-center">
          <ShieldCheck className="w-12 h-12 text-emerald mx-auto mb-2" />
          <p className="font-black text-emerald">Re-verify successful</p>
        </div>
      )}
    </div>
  );
}
