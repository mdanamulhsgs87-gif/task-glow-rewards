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
    <div className="mining-card relative rounded-3xl p-6 text-center overflow-hidden">
      {/* rotating conic ring */}
      <div className="mining-ring absolute -inset-1 pointer-events-none" aria-hidden />
      {/* aurora wash */}
      <div className="absolute inset-0 gradient-aurora opacity-30 pointer-events-none" />
      {/* corner glow */}
      <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full blur-3xl opacity-50 pointer-events-none animate-pulse"
           style={{ background: "var(--color-gold)" }} />
      <div className="absolute -bottom-20 -left-16 w-56 h-56 rounded-full blur-3xl opacity-40 pointer-events-none animate-pulse"
           style={{ background: "var(--color-violet)", animationDuration: "3.5s" }} />

      {/* floating coin particles */}
      {live && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="mining-coin"
              style={{
                left: `${10 + i * 18}%`,
                animationDelay: `${i * 0.6}s`,
                animationDuration: `${4 + (i % 3)}s`,
              }}
            >⛏</span>
          ))}
        </div>
      )}

      <div className="relative">
        <p className="text-[10px] uppercase tracking-[0.35em] font-black mb-2"
           style={{ color: "color-mix(in oklch, white 82%, transparent)" }}>
          {live ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald animate-ping opacity-80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald" />
              </span>
              লাইভ মাইনিং ব্যালেন্স
            </span>
          ) : "🔒 মাইনিং লক"}
        </p>

        <p className={`mining-number mono-num text-[2.6rem] leading-none font-black bg-gradient-to-r from-amber-200 via-white to-cyan-200 bg-clip-text text-transparent ${live ? "shine" : ""}`}>
          {balance.toFixed(6)}
        </p>
        <p className="text-xs font-black text-gold mt-1.5 tracking-widest">৳ টাকা</p>

        <p className="text-[11px] mt-3 font-bold" style={{ color: "color-mix(in oklch, white 85%, transparent)" }}>
          {live
            ? `${effectiveTaskCount}/১০ ঘর সক্রিয় · ${ratePerMonth.toFixed(0)}৳ / মাস`
            : "১০টি ঘর সম্পন্ন করলে মাইনিং শুরু হবে"}
        </p>

        {qualifyingReferees > 0 && (
          <p className="mt-3 inline-block rounded-full px-3 py-1 text-[10px] font-black bounce-soft"
             style={{
               background: "color-mix(in oklch, var(--color-emerald) 28%, transparent)",
               border: "1px solid color-mix(in oklch, var(--color-emerald) 55%, transparent)",
               color: "white",
             }}>
            🎁 {qualifyingReferees} জন রেফার · +{bonusMonth.toFixed(0)}৳ বোনাস/মাস
          </p>
        )}
      </div>
    </div>
  );
}
