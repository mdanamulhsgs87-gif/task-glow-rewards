// Shared constants for the 10-task mining app.

// Monthly target: 500 BDT per 30 days when mining is active.
export const MINING_RATE_BDT_PER_SEC = 500 / (30 * 24 * 60 * 60);

// Re-verify becomes available 3 days after the initial face verify.
export const REVERIFY_INTERVAL_MS = 3 * 24 * 60 * 60 * 1000;

export const TOTAL_TASKS = 10;

export const MIN_WITHDRAW_BDT = 50;

export type WalletProvider = "bkash" | "nagad";
export type TaskStatus = "empty" | "verified" | "done";
export type WithdrawalStatus = "pending" | "paid" | "rejected";
