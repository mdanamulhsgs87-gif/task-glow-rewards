import { MINING_RATE_BDT_PER_SEC } from "./constants";

// Live computed mining balance: settled accrued + (now - last_credited) * rate
export function computeLiveBalance(input: {
  accrued: number;
  withdrawn: number;
  isActive: boolean;
  lastCreditedAt: string | null;
  now?: number;
}): number {
  const now = input.now ?? Date.now();
  let total = input.accrued;
  if (input.isActive && input.lastCreditedAt) {
    const last = new Date(input.lastCreditedAt).getTime();
    const elapsedSec = Math.max(0, (now - last) / 1000);
    total += elapsedSec * MINING_RATE_BDT_PER_SEC;
  }
  return Math.max(0, total - input.withdrawn);
}

export function formatBdt(value: number, decimals = 6): string {
  return value.toFixed(decimals);
}
