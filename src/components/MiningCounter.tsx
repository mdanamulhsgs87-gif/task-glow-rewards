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
    <div className="gradient-mining rounded-2xl p-5 border border-cyan/20 text-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
        {live ? "লাইভ মাইনিং ব্যালেন্স" : "মাইনিং লক"}
      </p>
      <p className="mono-num text-4xl font-black text-cyan">
        {balance.toFixed(6)} <span className="text-xl">TK</span>
      </p>
      <p className="text-[10px] text-muted-foreground mt-2">
        {live
          ? `${effectiveTaskCount}/10 ঘর বৈধ · ${ratePerMonth.toFixed(0)} TK / মাস`
          : "১০টি ঘর সম্পন্ন করলে মাইনিং শুরু হবে"}
      </p>
      {qualifyingReferees > 0 && (
        <p className="mt-1 inline-block rounded-full bg-emerald/15 border border-emerald/30 px-2.5 py-0.5 text-[10px] font-black text-emerald">
          🎁 {qualifyingReferees} জন রেফার · +{bonusMonth.toFixed(0)} TK/মাস বোনাস
        </p>
      )}
    </div>
  );
}
