import { cache } from "react";
import bundled from "@/data/grossing-history.json";
import { validateGrossingHistory } from "./grossing.mjs";

export const HISTORY_URL = "https://raw.githubusercontent.com/Aks22-64/openkitty/main/src/data/grossing-history.json";

// Public, non-personal observations only. Passwords and sessions never leave the app.
export const loadGrossingHistory = cache(async () => {
  const fallback = validateGrossingHistory(bundled);
  try {
    if (process.env.OPENKITTY_GROSSING_BUNDLED === "1") throw new Error("Offline verification");
    const response = await fetch(HISTORY_URL, {
      next: { revalidate: 3600 }, redirect: "error", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || !response.body) throw new Error("History source unavailable");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 2_000_000) throw new Error("History too large");
        chunks.push(value);
      }
    } finally { await reader.cancel(); }
    const history = validateGrossingHistory(JSON.parse(Buffer.concat(chunks).toString("utf8")));
    if (Date.parse(history.updatedAt) < Date.parse(fallback.updatedAt) || Date.parse(history.updatedAt) > Date.now() + 300_000) throw new Error("Outdated or invalid history");
    return { history, sourceFallback: false };
  } catch {
    return { history: fallback, sourceFallback: true };
  }
});
