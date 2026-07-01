import { useEffect, useState } from "react";
import { computeLiveBalance } from "@/lib/mining";

type Props = {
  accrued: number;
  withdrawn: number;
  isActive: boolean;
  lastCreditedAt: string | null;
  effectiveTaskCount?: number;
  qualifyingReferees?: number;
};

export function MiningCounter({
  accrued, withdrawn, isActive, lastCreditedAt,
  effectiveTaskCount = 0, qualifyingReferees = 0,
}: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [isActive]);

  const balance = computeLiveBalance({
    accrued, withdrawn, isActive, lastCreditedAt,
    effectiveTaskCount, qualifyingReferees, now,
  });
  const live = isActive && (effectiveTaskCount > 0 || qualifyingReferees > 0);
  const ratePerMonth = 500 * (effectiveTaskCount / 10 + 0.10 * qualifyingReferees);
  const bonusMonth = 500 * 0.10 * qualifyingReferees;

  return (
    <div className="relative rounded-3xl p-6 text-center overflow-hidden shimmer-border"
         style={{
           background: "linear-gradient(140deg, oklch(0.18 0.06 265), oklch(0.28 0.10 285) 55%, oklch(0.22 0.08 210))",
           boxShadow: "0 24px 60px -20px color-mix(in oklch, var(--color-violet) 50%, transparent), 0 8px 24px -8px color-mix(in oklch, var(--color-cyan) 30%, transparent)",
         }}>
      <div className="absolute inset-0 gradient-aurora opacity-30 pointer-events-none" />
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-40 pointer-events-none"
           style={{ background: "var(--color-gold)" }} />
      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.35em] font-black mb-2"
           style={{ color: "color-mix(in oklch, white 78%, transparent)" }}>
          {live ? "⛏ লাইভ মাইনিং ব্যালেন্স" : "🔒 মাইনিং লক"}
        </p>
        <p className={`mono-num text-[2.6rem] leading-none font-black bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent ${live ? "shine" : ""}`}>
          {balance.toFixed(6)}
        </p>
        <p className="text-xs font-black text-gold mt-1.5 tracking-widest">৳ টাকা</p>
        <p className="text-[11px] mt-3 font-bold" style={{ color: "color-mix(in oklch, white 82%, transparent)" }}>
          {live
            ? `${effectiveTaskCount}/১০ ঘর সক্রিয় · ${ratePerMonth.toFixed(0)}৳ / মাস`
            : "১০টি ঘর সম্পন্ন করলে মাইনিং শুরু হবে"}
        </p>
        {qualifyingReferees > 0 && (
          <p className="mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-black bounce-soft"
             style={{
               background: "color-mix(in oklch, var(--color-emerald) 25%, transparent)",
               border: "1px solid color-mix(in oklch, var(--color-emerald) 50%, transparent)",
               color: "color-mix(in oklch, var(--color-emerald) 40%, white)",
             }}>
            🎁 {qualifyingReferees} জন রেফার · +{bonusMonth.toFixed(0)}৳ বোনাস/মাস
          </p>
        )}
      </div>
    </div>
  );
}
