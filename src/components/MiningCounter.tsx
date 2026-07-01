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
    <div className="premium-panel rounded-2xl p-5 text-center relative overflow-hidden">
      <div className="absolute inset-0 gradient-aurora opacity-40 pointer-events-none" />
      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.3em] text-white/70 font-bold mb-2">
          {live ? "⛏ লাইভ মাইনিং ব্যালেন্স" : "🔒 মাইনিং লক"}
        </p>
        <p className={`mono-num text-4xl font-black bg-gradient-to-r from-yellow-300 via-cyan-300 to-violet-300 bg-clip-text text-transparent ${live ? "shine" : ""}`}>
          {balance.toFixed(6)}
        </p>
        <p className="text-xs font-bold text-gold mt-1">TAKA</p>
        <p className="text-[10px] text-white/70 mt-3">
          {live
            ? `${effectiveTaskCount}/10 ঘর বৈধ · ${ratePerMonth.toFixed(0)} ৳ / মাস`
            : "১০টি ঘর সম্পন্ন করলে মাইনিং শুরু হবে"}
        </p>
        {qualifyingReferees > 0 && (
          <p className="mt-2 inline-block rounded-full bg-emerald/20 border border-emerald/40 px-2.5 py-0.5 text-[10px] font-black text-emerald bounce-soft">
            🎁 {qualifyingReferees} জন রেফার · +{bonusMonth.toFixed(0)} ৳/মাস বোনাস
          </p>
        )}
      </div>
    </div>
  );
}
