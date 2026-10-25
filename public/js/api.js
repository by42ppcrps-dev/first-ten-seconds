// POST one composite to /api/look. Retries once only when the request never reached the server;
// the server already retries the model, so a model_failed answer is final.
export class LookError extends Error {
  constructor(code, resetsAt = null) { super(code); this.code = code; this.resetsAt = resetsAt; }
}

export async function look(image, video) {
  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await fetch("/api/look", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image, video }) });
    } catch {
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    throw new LookError(body.error || "http_" + res.status, body.resets_at || null);
  }
  throw new LookError("network");
}

// Next 00:00 UTC, when the site budget and the Cloudflare free allowance both reset.
export function nextUtcMidnight(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
}

// Shown when the site's daily budget or the account allowance is used up. timeZone is for tests.
// The Mountain time is added only when the visitor's clock shows a different hour from Mountain time.
export function busyMessage(resetsAt, { now = new Date(), timeZone } = {}) {
  const at = resetsAt ? new Date(resetsAt) : nextUtcMidnight(now);
  const local = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone });
  const mountain = at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });
  const when = local === mountain ? "resets daily" : `resets daily at ${mountain.replace(":00", "")} Mountain`;
  return `Busy right now. Automatic finding is paused until ${local} (${when}). You can still pick the shot yourself below.`;
}

export const BUSY = new Set(["daily_cap", "ai_quota"]);

export const MESSAGES = {
  visitor_cap: "You have used your 40 looks for today. They reset at 00:00 UTC.",
  hit_cap: "You have used today's 400 saved answers. They reset at 00:00 UTC.",
  video_cap: "This video reached its 25-look limit before the app showed up.",
  model_off: "Automatic finding is off for now and comes back after 6 PM Mountain.",
  model_failed: "The model did not answer, even after a retry.",
  network: "The server could not be reached.",
};
export const UNKNOWN_MESSAGE = "Automatic finding stopped on this shot.";
export const PICK_YOURSELF = "Pick it yourself: click the first shot that shows your app. The exact frame is still found on your computer.";

// Status text for a stopped or failed search.
export function stopMessage(error, resetsAt, opts) {
  if (BUSY.has(error)) return busyMessage(resetsAt, opts);
  return (MESSAGES[error] || UNKNOWN_MESSAGE) + " " + PICK_YOURSELF;
}
