import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDashboard } from "@/lib/dashboard.functions";
import { verifyFace, reverifyFace } from "@/lib/tasks.functions";
import { FaceCapture } from "@/components/FaceCapture";
import { ArrowLeft, CheckCircle2, Loader2, Sparkles, Clock } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/task/$slot")({ component: TaskPage });

function TaskPage() {
  const { slot } = Route.useParams();
  const slotNum = parseInt(slot, 10);
  const nav = useNavigate();
  const [opened, setOpened] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => getDashboard(),
  });

  const task = data?.tasks.find((t: any) => t.slot === slotNum);

  const verifyMut = useMutation({
    mutationFn: (photoBase64: string) => verifyFace({ data: { slot: slotNum, photoBase64 } }),
    onSuccess: () => {
      toast.success("Face verify hoyeche! 3 din por re-verify korben.");
      refetch();
      setOpened(false);
      nav({ to: "/home" });
    },
    onError: (e: any) => { toast.error(e.message); setOpened(false); },
  });

  const reverifyMut = useMutation({
    mutationFn: (photoBase64: string) => reverifyFace({ data: { slot: slotNum, photoBase64 } }),
    onSuccess: (res: any) => {
      toast.success(res?.miningActivated ? "Task done! 🎉 Mining shuru hoyeche!" : "Re-verify successful! Task done.");
      refetch();
      setOpened(false);
      nav({ to: "/home" });
    },
    onError: (e: any) => { toast.error(e.message); setOpened(false); },
  });

  if (isLoading || !task) {
    return <div className="py-20 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-cyan" /></div>;
  }

  const isVerified = task.status === "verified";
  const isDone = task.status === "done";
  const dueMs = task.reverify_due_at ? new Date(task.reverify_due_at).getTime() : 0;
  const readyToReverify = isVerified && dueMs <= Date.now();
  const isReverify = readyToReverify;

  const onCapture = (b64: string) => {
    if (isReverify) reverifyMut.mutate(b64);
    else verifyMut.mutate(b64);
  };

  return (
    <div className="space-y-4 pt-2">
      <Link to="/home" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <ArrowLeft className="w-3.5 h-3.5" /> Back
      </Link>

      <div className="glass rounded-2xl p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Task</p>
        <h1 className="text-2xl font-black">#{task.slot} of 10</h1>
        <p className="text-[11px] text-muted-foreground mt-1">
          {isDone && "✅ Ei task complete hoye geche"}
          {isVerified && !readyToReverify && "⏳ 3 din opekkha korun re-verify er age"}
          {readyToReverify && "✨ Re-verify ready — same face deya lagbe"}
          {task.status === "empty" && "🔵 Start korun — face verify diye"}
        </p>
      </div>

      {isDone && (
        <div className="rounded-2xl bg-emerald/10 border border-emerald/40 p-5 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald mx-auto mb-2" />
          <p className="font-bold">Ei task complete</p>
          <Link to="/home" className="inline-block mt-3 px-4 py-2 rounded-xl gradient-cta text-sm font-bold">
            Home a firan
          </Link>
        </div>
      )}

      {isVerified && !readyToReverify && (
        <div className="rounded-2xl bg-amber/10 border border-amber/40 p-5 text-center">
          <Clock className="w-10 h-10 text-amber mx-auto mb-2" />
          <p className="font-bold">3 din opekkha korun</p>
          <p className="text-[11px] text-muted-foreground mt-2">
            Re-verify ready hobe: <br />
            <span className="text-amber font-bold">{new Date(task.reverify_due_at).toLocaleString()}</span>
          </p>
        </div>
      )}

      {(task.status === "empty" || readyToReverify) && (
        <div className="glass rounded-2xl p-4">
          {!opened ? (
            <button onClick={() => setOpened(true)}
              className="w-full py-4 rounded-xl gradient-cta font-black flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4" /> {isReverify ? "Re-verify korun" : "Face verify shuru"}
            </button>
          ) : (
            <FaceCapture
              title={isReverify ? `Re-verify task #${task.slot}` : `Verify task #${task.slot}`}
              onCapture={onCapture}
              onCancel={() => setOpened(false)}
              isUploading={verifyMut.isPending || reverifyMut.isPending}
            />
          )}
        </div>
      )}
    </div>
  );
}
