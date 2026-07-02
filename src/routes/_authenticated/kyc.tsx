import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { submitKyc } from "@/lib/kyc.functions";
import { getDashboard } from "@/lib/dashboard.functions";
import { CheckCircle2, Loader2, ShieldCheck, Upload, IdCard, Camera, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/kyc")({ component: KycPage });

async function fileToJpegBase64(file: File, max = 1400): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("শুধু ছবি চলবে");
  const dataUrl: string = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(new Error("ফাইল পড়া যায়নি"));
    r.readAsDataURL(file);
  });
  const img = new Image();
  await new Promise<void>((res, rej) => {
    img.onload = () => res();
    img.onerror = () => rej(new Error("ছবি লোড হয়নি"));
    img.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

function KycPage() {
  const router = useRouter();
  const { data, refetch } = useQuery({ queryKey: ["dashboard"], queryFn: () => getDashboard() });
  const [photo, setPhoto] = useState<{ b64: string; preview: string } | null>(null);
  const [nidFront, setNidFront] = useState<{ b64: string; preview: string } | null>(null);
  const [nidBack, setNidBack] = useState<{ b64: string; preview: string } | null>(null);
  const [preparing, setPreparing] = useState(false);

  const kycVerified = !!(data?.profile as any)?.kyc_verified;

  const mut = useMutation({
    mutationFn: async () => {
      if (!photo || !nidFront) throw new Error("ছবি ও NID front লাগবে");
      return submitKyc({ data: { photo: photo.b64, nid_front: nidFront.b64, nid_back: nidBack?.b64 ?? null } });
    },
    onSuccess: () => { toast.success("✅ KYC সম্পন্ন হয়েছে! এখন উইথড্র করা যাবে"); refetch(); setTimeout(() => router.navigate({ to: "/profile" }), 600); },
    onError: (e: any) => toast.error(e.message ?? "KYC ব্যর্থ হয়েছে"),
  });

  const pick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (v: { b64: string; preview: string } | null) => void,
  ) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreparing(true);
    try {
      const b64 = await fileToJpegBase64(f);
      setter({ b64, preview: `data:image/jpeg;base64,${b64}` });
    } catch (err: any) {
      toast.error(err.message ?? "ছবি প্রস্তুত করা যায়নি");
    } finally {
      setPreparing(false);
      e.target.value = "";
    }
  };

  if (kycVerified) {
    return (
      <div className="pt-6 space-y-4 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald/15 border-2 border-emerald text-emerald">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-2xl font-black">KYC ভেরিফাইড ✅</h1>
        <p className="text-sm text-muted-foreground">আপনার পরিচয় নিশ্চিত হয়েছে। এখন সব সুবিধা ব্যবহার করা যাবে।</p>
        <button onClick={() => router.navigate({ to: "/profile" })} className="rounded-2xl px-6 py-3 gradient-cta font-black btn-press">প্রোফাইলে যান</button>
      </div>
    );
  }

  const canSubmit = !!photo && !!nidFront && !mut.isPending;

  return (
    <div className="space-y-4 pt-2">
      <div className="text-center">
        <ShieldCheck className="w-8 h-8 text-emerald mx-auto" />
        <h1 className="text-2xl font-black mt-1">KYC ভেরিফিকেশন</h1>
        <p className="text-[11px] text-muted-foreground mt-1">NID ও নিজের ছবি দিন — উইথড্র চালু হবে</p>
      </div>

      <div className="glass rounded-2xl p-4 space-y-2 text-[12px] font-bold text-navy">
        <p>✔ শুধু <b>NID</b> এবং <b>নিজের একটি ছবি</b> লাগবে</p>
        <p>✔ NID থেকে নাম, ঠিকানা <b>স্বয়ংক্রিয়ভাবে</b> কার্ডে বসবে</p>
        <p>✔ আপনার দেওয়া ছবি <b>প্রোফাইল ছবি</b> হয়ে যাবে</p>
        <p>⚠ KYC ছাড়া উইথড্র করা যাবে না</p>
      </div>

      <PickCard
        label="আপনার ছবি (Selfie)"
        hint="ক্যামেরা দিয়ে সরাসরি তুলুন অথবা গ্যালারি থেকে দিন"
        icon={<Camera className="w-5 h-5" />}
        capture="user"
        value={photo}
        onPick={(e) => pick(e, setPhoto)}
        onClear={() => setPhoto(null)}
        color="from-rose-500 to-amber-500"
      />
      <PickCard
        label="NID কার্ডের সামনের দিক"
        hint="নাম, ছবি, NID নম্বর যেন স্পষ্ট থাকে"
        icon={<IdCard className="w-5 h-5" />}
        value={nidFront}
        onPick={(e) => pick(e, setNidFront)}
        onClear={() => setNidFront(null)}
        color="from-cyan-500 to-emerald-500"
      />
      <PickCard
        label="NID কার্ডের পিছনের দিক (ঐচ্ছিক)"
        hint="ঠিকানা আরও ভালোভাবে পড়ার জন্য"
        icon={<IdCard className="w-5 h-5" />}
        value={nidBack}
        onPick={(e) => pick(e, setNidBack)}
        onClear={() => setNidBack(null)}
        color="from-violet-500 to-fuchsia-500"
      />

      <button
        disabled={!canSubmit}
        onClick={() => mut.mutate()}
        className="w-full py-4 rounded-2xl gradient-cta font-black text-base flex items-center justify-center gap-2 disabled:opacity-50 btn-press"
      >
        {(mut.isPending || preparing) && <Loader2 className="w-4 h-4 animate-spin" />}
        <ShieldCheck className="w-5 h-5" /> KYC সাবমিট করুন
      </button>
      <p className="text-center text-[10px] text-muted-foreground">সাবমিটের পর NID থেকে তথ্য পড়তে কয়েক সেকেন্ড লাগতে পারে</p>
    </div>
  );
}

function PickCard({
  label, hint, icon, value, onPick, onClear, color, capture,
}: {
  label: string; hint: string; icon: React.ReactNode; color: string;
  value: { b64: string; preview: string } | null;
  onPick: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  capture?: "user" | "environment";
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className={`rounded-2xl p-0.5 bg-gradient-to-r ${color} shadow-lg`}>
      <div className="rounded-[15px] bg-white p-3">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">{icon}</div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black text-navy leading-tight">{label}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{hint}</p>
          </div>
          {value && (
            <button onClick={onClear} className="w-7 h-7 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center btn-press" title="বাদ দিন">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {value ? (
          <img src={value.preview} alt={label} className="w-full h-40 object-cover rounded-xl border-2 border-slate-100" />
        ) : (
          <button
            type="button"
            onClick={() => ref.current?.click()}
            className="w-full h-32 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center gap-1 text-slate-500 btn-press"
          >
            <Upload className="w-5 h-5" />
            <span className="text-[11px] font-bold">ছবি বেছে নিন / তুলুন</span>
          </button>
        )}
        <input
          ref={ref}
          type="file"
          accept="image/*"
          capture={capture as any}
          className="hidden"
          onChange={onPick}
        />
      </div>
    </div>
  );
}
