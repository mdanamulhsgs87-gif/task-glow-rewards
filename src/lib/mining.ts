import { MINING_RATE_BDT_PER_SEC, TOTAL_TASKS } from "./constants";

// Live computed mining balance.
// Effective rate = base_rate * (effective_task_count / TOTAL_TASKS).
// If a previously-done task fails the daily whitelist re-check, its
// effective_task_count drops on the server so the live rate slows down.
export function computeLiveBalance(input: {
  accrued: number;
  withdrawn: number;
  isActive: boolean;
  lastCreditedAt: string | null;
  effectiveTaskCount?: number;
  now?: number;
}): number {
  const now = input.now ?? Date.now();
  let total = input.accrued;
  const eff = Math.max(0, Math.min(TOTAL_TASKS, input.effectiveTaskCount ?? 0));
  if (input.isActive && input.lastCreditedAt && eff > 0) {
    const last = new Date(input.lastCreditedAt).getTime();
    const elapsedSec = Math.max(0, (now - last) / 1000);
    const effectiveRate = MINING_RATE_BDT_PER_SEC * (eff / TOTAL_TASKS);
    total += elapsedSec * effectiveRate;
  }
  return Math.max(0, total - input.withdrawn);
}

export function formatBdt(value: number, decimals = 6): string {
  return value.toFixed(decimals);
}
