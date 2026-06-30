import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Sparkles, Loader2, ShieldCheck, Check, ArrowRight } from "lucide-react";
import { registerWithPhone } from "@/lib/auth.functions";

export const Route = createFileRoute("/auth")({ ssr: false, component: AuthPage });

function phoneToEmail(phone: string) {
  return `u${phone}@facemine.app`;
}

const RULES: { title: string; body: string }[] = [
  { title: "১ নম্বর = ১ একাউন্ট", body: "একটি মোবাইল নম্বর দিয়ে শুধু একটি একাউন্ট খোলা যাবে। ডুপ্লিকেট পেলে ব্যান।" },
  { title: "আসল মুখ দিয়েই ভেরিফাই", body: "নিজের আসল মুখ দিয়ে Face Verification করতে হবে। অন্যের ছবি বা ফেক ফেস দিলে একাউন্ট স্থায়ীভাবে বাতিল।" },
  { title: "১০টি টাস্ক = ৫০০৳/মাস", body: "১০টি স্লট সম্পূর্ণ ভেরিফাই হলেই মাসিক ৫০০৳ হারে লাইভ মাইনিং শুরু হবে।" },
  { title: "প্রথমবার ৩ দিন পর Re-verify", body: "প্রথমবার Face Verify করার ৩ দিন পর একবার Re-verify করতে হবে। এরপর যেকোনো সময় (১-৪ মাস পরেও) অ্যাডমিন যাচাইয়ের জন্য আবার Re-verify চাইতে পারে।" },
  { title: "Withdraw নিয়ম", body: "ন্যূনতম ৫০৳ থেকে bKash / Nagad এ Withdraw। Wallet নম্বর একবার সেট করার পর আর পরিবর্তন করা যাবে না।" },
  { title: "মিথ্যা তথ্য নিষিদ্ধ", body: "ভুল নাম, ভুল নম্বর বা অন্যের পরিচয় দিলে একাউন্ট সাসপেন্ড ও পেমেন্ট আটকে দেওয়া হবে।" },
  { title: "অ্যাডমিনের সিদ্ধান্তই চূড়ান্ত", body: "যেকোনো বিতর্কিত বিষয়ে অ্যাডমিনের সিদ্ধান্তই চূড়ান্ত বলে গণ্য হবে।" },
];

export function AuthPage() {
  const nav = useNavigate();
  const register = useServerFn(registerWithPhone);
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [step, setStep] = useState<"form" | "agreement">("form");
  const [agreed, setAgreed] = useState(false);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) nav({ to: "/home" });
    });
  }, [nav]);

  const validateForm = () => {
    const cleanPhone = phone.replace(/\D/g, "").slice(0, 11);
    if (!/^01\d{9}$/.test(cleanPhone)) {
      toast.error("১১ ডিজিটের সঠিক মোবাইল নম্বর দিন (০১ দিয়ে শুরু)");
      return null;
    }
    if (mode === "signup" && name.trim().length < 2) {
      toast.error("আপনার নাম লিখুন");
      return null;
    }
    if (password.length < 6) {
      toast.error("পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে");
      return null;
    }
    return cleanPhone;
  };

  const onFormNext = (e: React.FormEvent) => {
    e.preventDefault();
    const ok = validateForm();
    if (!ok) return;
    if (mode === "signup") {
      setStep("agreement");
    } else {
      doLogin(ok);
    }
  };

  async function doLogin(cleanPhone: string) {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(cleanPhone),
        password,
      });
      if (error) throw error;
      toast.success("স্বাগতম!");
      nav({ to: "/home" });
    } catch (e: any) {
      toast.error(e.message ?? "কিছু সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }

  async function doSignup() {
    const cleanPhone = phone.replace(/\D/g, "").slice(0, 11);
    setLoading(true);
    try {
      await register({ data: { name, phone: cleanPhone, password } });
      const { error } = await supabase.auth.signInWithPassword({
        email: phoneToEmail(cleanPhone),
        password,
      });
      if (error) throw error;
      toast.success("একাউন্ট তৈরি হয়েছে!");
      nav({ to: "/home" });
    } catch (e: any) {
      toast.error(e.message ?? "কিছু সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  }

  if (step === "agreement") {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md premium-panel rounded-3xl p-6">
          <div className="text-center mb-5">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-navy mb-3">
              <ShieldCheck className="w-7 h-7 text-gold" />
            </div>
            <h1 className="text-xl font-black text-navy">নিয়মাবলি ও শর্তাবলি</h1>
            <p className="text-[11px] text-muted-foreground mt-1">
              একাউন্ট তৈরি করার আগে অনুগ্রহ করে পড়ুন
            </p>
            <div className="gold-divider mt-3" />
          </div>

          <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
            {RULES.map((r, i) => (
              <div key={i} className="glass rounded-2xl p-3 flex gap-3">
                <div className="shrink-0 w-7 h-7 rounded-full gradient-cta flex items-center justify-center font-black text-xs">
                  {i + 1}
                </div>
                <div>
                  <p className="font-black text-sm text-navy">{r.title}</p>
                  <p className="text-[12px] leading-relaxed text-muted-foreground mt-0.5">{r.body}</p>
                </div>
              </div>
            ))}
          </div>

          <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
            <span
              className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                agreed ? "bg-gold border-gold" : "border-border bg-white"
              }`}
              onClick={() => setAgreed((v) => !v)}
            >
              {agreed && <Check className="w-3.5 h-3.5 text-navy" strokeWidth={3} />}
            </span>
            <span className="text-[12px] text-navy font-bold leading-snug" onClick={() => setAgreed((v) => !v)}>
              আমি উপরের সকল নিয়মাবলি পড়েছি এবং মেনে চলতে রাজি আছি।
            </span>
          </label>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => setStep("form")}
              className="py-3 rounded-xl bg-surface-2 border border-border font-bold text-sm text-navy"
              disabled={loading}
            >
              পিছনে
            </button>
            <button
              onClick={doSignup}
              disabled={!agreed || loading}
              className="py-3 rounded-xl gradient-cta font-black text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
              রাজি, একাউন্ট তৈরি করুন
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm premium-panel rounded-3xl p-7">
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-cta mb-3">
            <Sparkles className="w-7 h-7 text-navy" />
          </div>
          <h1 className="text-2xl font-black text-navy">FaceMine</h1>
          <p className="text-xs text-muted-foreground mt-1">১০টি টাস্ক → মাসে ৫০০৳ মাইনিং</p>
          <div className="gold-divider mt-3" />
        </div>

        <div className="flex bg-surface-2 rounded-xl p-1 mb-5">
          {(["login", "signup"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                mode === m ? "gradient-cta" : "text-muted-foreground"
              }`}
            >
              {m === "login" ? "লগইন" : "সাইন আপ"}
            </button>
          ))}
        </div>

        <form onSubmit={onFormNext} className="space-y-3">
          {mode === "signup" && (
            <div>
              <label className="text-[11px] font-bold text-navy uppercase tracking-wider">নাম</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full mt-1 px-4 py-3 bg-white border border-border rounded-xl text-sm outline-none focus:border-gold text-navy"
              />
            </div>
          )}
          <div>
            <label className="text-[11px] font-bold text-navy uppercase tracking-wider">মোবাইল নম্বর</label>
            <input
              inputMode="numeric"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              placeholder="01XXXXXXXXX"
              maxLength={11}
              className="w-full mt-1 px-4 py-3 bg-white border border-border rounded-xl text-sm outline-none focus:border-gold mono-num text-navy"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-navy uppercase tracking-wider">পাসওয়ার্ড</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mt-1 px-4 py-3 bg-white border border-border rounded-xl text-sm outline-none focus:border-gold text-navy"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl gradient-cta font-black text-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login" ? "লগইন" : "পরবর্তী ধাপ"}
          </button>
        </form>

        <p className="text-[10px] text-center text-muted-foreground mt-5">
          আপনার তথ্য সম্পূর্ণ নিরাপদ। <Link to="/admin-login" className="text-gold font-bold">Admin</Link>
        </p>
      </div>
    </div>
  );
}
