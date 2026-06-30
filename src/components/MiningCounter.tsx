import { useEffect, useState } from "react";
import { computeLiveBalance } from "@/lib/mining";

type Props = {
  accrued: number;
  withdrawn: number;
  isActive: boolean;
  lastCreditedAt: string | null;
};

export function MiningCounter({ accrued, withdrawn, isActive, lastCreditedAt }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!isActive) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [isActive]);

  const balance = computeLiveBalance({ accrued, withdrawn, isActive, lastCreditedAt, now });

  return (
    <div className="gradient-mining rounded-2xl p-5 border border-cyan/20 text-center">
      <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
        {isActive ? "Live Mining Balance" : "Mining Locked"}
      </p>
      <p className="mono-num text-4xl font-black text-cyan">
        {balance.toFixed(6)} <span className="text-xl">TK</span>
      </p>
      <p className="text-[10px] text-muted-foreground mt-2">
        {isActive
          ? "500 TK / month rate — protiti secend e bare"
          : "10/10 task complete korle mining shuru hobe"}
      </p>
    </div>
  );
}
