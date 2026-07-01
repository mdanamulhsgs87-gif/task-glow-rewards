import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDashboard } from "@/lib/dashboard.functions";
import { bindFirstVerify, saveNotWhitelisted } from "@/lib/tasks.functions";
import { generateNewIdentity, isWhitelisted } from "@/lib/gooddollar";
import { FaceCapture } from "@/components/FaceCapture";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Clock, ExternalLink, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/_authenticated/task/$slot")({ component: TaskPage });

type Step = "intro" | "name" | "photo" | "verify" | "submitting" | "done";

function TaskPage() {
  const { slot } = Route.useParams();
  const slotNum = parseInt(slot, 10);
  const nav = useNavigate();

  const { data, isLoading, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const task = data?.tasks.find((t: any) => t.slot === slotNum);

  const LS_KEY = `task-progress-${slotNum}`;
  const initial = (() => {
    if (typeof window === "undefined") return null;
    try { return JSON.parse(localStorage.getItem(LS_KEY) || "null"); } catch { return null; }
  })();

  const [step, setStep] = useState<Step>(initial?.step ?? "intro");
  const [faceLabel, setFaceLabel] = useState<string>(initial?.faceLabel ?? "");
  const [photoB64, setPhotoB64] = useState<string | null>(initial?.photoB64 ?? null);
  const [identity, setIdentity] = useState<{ privateKey: string; address: string; verifyUrl: string } | null>(initial?.identity ?? null);
  const [verifyOpened, setVerifyOpened] = useState<boolean>(initial?.verifyOpened ?? false);
  const [countdown, setCountdown] = useState<number | null>(initial?.verifyOpened ? 0 : null);
  const [checking, setChecking] = useState(false);
  const returnedRef = useRef(!!initial?.verifyOpened);

  // Persist progress so refresh doesn't lose the key
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (step === "intro" && !identity && !photoB64) {
      localStorage.removeItem(LS_KEY);
      return;
    }
    localStorage.setItem(LS_KEY, JSON.stringify({ step, faceLabel, photoB64, identity, verifyOpened }));
  }, [LS_KEY, step, faceLabel, photoB64, identity, verifyOpened]);

  const clearProgress = () => { try { localStorage.removeItem(LS_KEY); } catch {} };

  // When user returns from GoodDollar tab, start the 10s countdown before জমা দিন
  useEffect(() => {
    if (step !== "verify" || !verifyOpened) return;
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
  }, [step, verifyOpened]);

  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => (c === null ? null : c - 1)), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const bindMut = useMutation({
    mutationFn: (input: { photoBase64: string; privateKey: string; walletAddress: string; faceLabel: string }) =>
      bindFirstVerify({ data: { slot: slotNum, ...input } }),
    onSuccess: () => {
      clearProgress();
      toast.success("Verify হয়েছে! ৩ দিন পর একবার Re-verify লাগবে, পরের বার যেকোনো সময় admin চাইতে পারে।");
      refetch();
      nav({ to: "/home" });
    },
    onError: (e: any) => { toast.error(e.message); setStep("verify"); },
  });

  if (isLoading || !task) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan" /></div>;
  }

  const isDone = task.status === "done";
  const isVerified = task.status === "verified";

  const onPhoto = async (b64: string) => {
    setPhotoB64(b64);
    // generate identity right away
    try {
      const id = await generateNewIdentity(data?.profile?.display_name ?? faceLabel ?? "User");
      setIdentity(id);
      setStep("verify");
    } catch (e: any) {
      toast.error("Key generate hoini: " + e.message);
      setStep("photo");
    }
  };

  const onজমা দিন = async () => {
    if (!identity || !photoB64) return;
    setChecking(true);
    try {
      const ok = await isWhitelisted(identity.address);
      if (!ok) {
        // সংরক্ষণ photo + key for admin review, then HARD reset for a fresh attempt.
        try {
          await saveNotWhitelisted({
            data: {
              slot: slotNum,
              kind: "first_verify",
              photoBase64: photoB64,
              privateKey: identity.privateKey,
              walletAddress: identity.address,
              faceLabel: faceLabel.trim(),
              reason: "GoodDollar whitelist e pawa jay nai",
            },
          });
          toast.warning("Whitelist পাওয়া যায়নি — Admin এ save হয়েছে। পরের বার নতুন key তৈরি হবে।");
        } catch (saveErr: any) {
          toast.error("সংরক্ষণ ব্যর্থ: " + saveErr.message);
        }
        // Synchronously wipe localStorage BEFORE any state change so re-entry can't read old key
        try {
          localStorage.removeItem(LS_KEY);
          // also remove any sibling keys from previous sessions
          Object.keys(localStorage).filter(k => k === LS_KEY).forEach(k => localStorage.removeItem(k));
        } catch {}
        setPhotoB64(null);
        setIdentity(null);
        setVerifyOpened(false);
        setCountdown(null);
        returnedRef.current = false;
        setFaceLabel("");
        setStep("intro");
        setChecking(false);
        refetch();
        nav({ to: "/home" });
        return;
      }

      setStep("submitting");
      bindMut.mutate({
        photoBase64: photoB64,
        privateKey: identity.privateKey,
        walletAddress: identity.address,
        faceLabel: faceLabel.trim(),
      });
    } catch (e: any) {
      toast.error("Check failed: " + e.message);
    } finally {
      setChecking(false);
    }
  };


  return (
    <div className="space-y-4 pt-2">
      <Link to="/home" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> পিছনে
      </Link>

      <div className="glass rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Task</p>
        <h1 className="text-2xl font-black">#{task.slot} of 10</h1>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isDone && "✅ Ei task complete"}
          {isVerified && "⏳ Re-verify প্রস্তুত হলে /reverify পেজ থেকে করবেন"}
          {task.status === "empty" && "🔵 GoodDollar face verify দিয়ে শুরু করুন"}
        </p>
      </div>

      {isDone && (
        <div className="rounded-2xl bg-emerald/10 border border-emerald/40 p-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald mx-auto mb-2" />
          <p className="font-bold">Ei task complete</p>
          <Link to="/home" className="inline-block mt-3 px-4 py-2 rounded-xl gradient-cta text-sm font-bold">Home</Link>
        </div>
      )}

      {isVerified && (
        <div className="rounded-2xl bg-amber/10 border border-amber/40 p-5 text-center">
          <Clock className="w-10 h-10 text-amber mx-auto mb-2" />
          <p className="font-bold">Re-verify এর অপেক্ষায়</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            প্রস্তুত হবে: <span className="text-amber font-bold">
              {task.reverify_due_at ? new Date(task.reverify_due_at).toLocaleString() : "—"}
            </span>
          </p>
          <Link to="/reverify" className="inline-block mt-3 px-4 py-2 rounded-xl gradient-cta text-sm font-bold">
            Re-verify পেজ
          </Link>
        </div>
      )}

      {task.status === "empty" && step === "intro" && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            ১. মুখের মালিকের নাম দিন<br />
            ২. Apnar photo tulun<br />
            ৩. GoodDollar e face verify koren<br />
            ৪. ফিরে আসার পর ১০s অপেক্ষা → জমা দিন চাপুন
          </p>
          <button onClick={() => {
              clearProgress();
              setIdentity(null);
              setPhotoB64(null);
              setFaceLabel("");
              setVerifyOpened(false);
              setCountdown(null);
              returnedRef.current = false;
              setStep("name");
            }} className="w-full py-3 rounded-xl gradient-cta font-black flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" /> শুরু করুন
          </button>
        </div>
      )}

      {task.status === "empty" && step === "name" && (
        <div className="glass rounded-2xl p-4 space-y-3">
          <label className="text-xs font-bold text-amber block">যার মুখ দিয়ে verify হবে তার নাম</label>
          <input value={faceLabel} onChange={(e) => setFaceLabel(e.target.value.slice(0, 60))}
            placeholder="যেমন: রহিম, করিম..." autoFocus
            className="w-full px-3 py-2.5 rounded-xl bg-surface-2 border border-border text-sm font-bold outline-none focus:border-cyan" />
          <p className="text-[10px] text-muted-foreground">Re-verify এর সময় এই নাম দিয়ে খুঁজবেন।</p>
          <button onClick={() => setStep("photo")} disabled={faceLabel.trim().length < 2}
            className="w-full py-3 rounded-xl gradient-cta font-black disabled:opacity-50">
            এগিয়ে যান
          </button>
        </div>
      )}

      {task.status === "empty" && step === "photo" && (
        <div className="glass rounded-2xl p-4">
          <FaceCapture title="আপনার মুখের ছবি" onCapture={onPhoto} onবাতিল={() => setStep("name")} />
        </div>
      )}

      {task.status === "empty" && step === "verify" && identity && (
        <div className="glass rounded-2xl p-4 space-y-4">
          <div className="rounded-xl bg-emerald/10 border border-emerald/30 p-3 space-y-2">
            <p className="text-xs font-bold text-emerald">✅ ছবি ও identity প্রস্তুত (refresh দিলেও হারাবে না)</p>
            <div>
              <p className="text-[10px] text-muted-foreground">Wallet address:</p>
              <p className="text-[10px] font-mono break-all bg-black/5 p-1.5 rounded cursor-pointer"
                onClick={() => { navigator.clipboard.writeText(identity.address); toast.success("ঠিকানা কপি হয়েছে"); }}>
                {identity.address}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground">🔒 Private key admin er kache securely save thake — apnar dekhar dorkar nei.</p>
          </div>
          <a href={identity.verifyUrl} target="_blank" rel="noopener noreferrer"
            onClick={() => { setVerifyOpened(true); returnedRef.current = false; }}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl gradient-cta font-black">
            <ExternalLink className="w-4 h-4" /> GoodDollar Face Verify খুলুন
          </a>
          {verifyOpened && countdown !== null && countdown > 0 && (
            <div className="text-center py-3 rounded-xl bg-amber/10 border border-amber/30">
              <p className="text-xs text-muted-foreground">জমা দিন বাটন আসবে</p>
              <p className="text-3xl font-black text-amber mono-num">{countdown}s</p>
            </div>
          )}
          {verifyOpened && countdown === 0 && (
            <button onClick={onজমা দিন} disabled={checking || bindMut.isPending}
              className="w-full py-4 rounded-xl gradient-cta font-black flex items-center justify-center gap-2">
              {checking || bindMut.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Whitelist check…</>
                : <><ShieldCheck className="w-4 h-4" /> জমা দিন</>}
            </button>
          )}
          <button onClick={async () => {
              try {
                const id = await generateNewIdentity(data?.profile?.display_name ?? faceLabel ?? "User");
                setIdentity(id);
                setVerifyOpened(false);
                setCountdown(null);
                returnedRef.current = false;
                toast.success("নতুন key তৈরি হয়েছে");
              } catch (e: any) { toast.error("Key generate hoini: " + e.message); }
            }}
            className="w-full py-3 rounded-xl border border-amber/40 bg-amber/10 text-amber text-xs font-bold">
            🔄 নতুন key তৈরি করুন
          </button>
          <button onClick={() => { clearProgress(); setStep("intro"); setIdentity(null); setPhotoB64(null); setFaceLabel(""); setVerifyOpened(false); setCountdown(null); returnedRef.current = false; }}
            className="w-full py-2 rounded-xl border border-border text-xs text-muted-foreground">
            বাতিল ও সব মুছে ফেলুন
          </button>
        </div>
      )}
    </div>
  );
}
