// src/utils/share.ts
// Web Share prioritization: Web Share API -> X intent -> Clipboard

export type SharePlatform = "x" | "threads" | undefined;
export type ShareMethod = "web" | "x" | "clipboard";

// Minimal units for testing
export function encodeForQuery(text: string): string {
  return encodeURIComponent(text);
}

export function buildXIntentUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeForQuery(text)}`;
}

export function hasWebShare(): boolean {
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}

export function pickShareTarget(platform?: SharePlatform, canWebShare: boolean = hasWebShare()): ShareMethod {
  if (canWebShare) return "web";
  if (platform === "x") return "x";
  return "clipboard";
}

/**
 * Share text with priority: Web Share API -> X intent -> Clipboard
 * Falls back on exceptions; last failure alerts and rethrows.
 */
export async function shareText(text: string, platform?: SharePlatform): Promise<ShareMethod> {
  let lastError: unknown = null;

  // 1) Web Share API
  try {
    if (hasWebShare()) {
      await navigator.share({ text });
      return "web";
    }
  } catch (e) {
    lastError = e;
    // continue fallback
  }

  // 2) X intent URL (only when explicitly asked for X)
  try {
    if (platform === "x" && typeof window !== "undefined") {
      const url = buildXIntentUrl(text);
      const w = window.open(url, "_blank", "noopener,noreferrer");
      if (w) return "x";
      // Popup blocked: continue fallback to clipboard
    }
  } catch (e) {
    lastError = e;
  }

  // 3) Clipboard fallback
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return "clipboard";
    }
    throw new Error("Clipboard API is not available");
  } catch (e) {
    // User guidance on failure
    try {
      // eslint-disable-next-line no-alert
      alert("共有に失敗しました。テキストのコピーができませんでした。画面のテキストを選択して手動でコピーしてください。");
    } catch {}
    // propagate the most recent error if available
    throw (e ?? lastError ?? new Error("Failed to share text"));
  }
}

