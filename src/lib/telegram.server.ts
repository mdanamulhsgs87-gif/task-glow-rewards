// Server-only Telegram notification helper. Fires the bot configured by
// TELEGRAM_BOT_TOKEN to the chat id stored in TELEGRAM_CHAT_ID.
export async function sendTelegram(message: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("Telegram not configured");
    throw new Error("Telegram not configured");
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("Telegram send failed", res.status, body);
      throw new Error(`Telegram send failed: ${res.status}`);
    }
  } catch (e) {
    console.error("Telegram send error:", e);
    throw e;
  }
}
