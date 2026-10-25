// POST one composite to /api/look. Retries once on a network error or a 5xx that is not "model off".
export class LookError extends Error {
  constructor(code) { super(code); this.code = code; }
}

export async function look(image, video) {
  let last = "network";
  for (let attempt = 0; attempt < 2; attempt++) {
    let res;
    try {
      res = await fetch("/api/look", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ image, video }) });
    } catch {
      last = "network";
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (res.ok) return body;
    last = body.error || "http_" + res.status;
    if (res.status < 500 || last === "model_off") break;
  }
  throw new LookError(last);
}

export const MESSAGES = {
  daily_cap: "Today's shared model budget for this site is used up. It resets at 00:00 UTC.",
  visitor_cap: "You have used your 40 looks for today. They reset at 00:00 UTC.",
  video_cap: "This video reached its 25-look limit.",
  ai_quota: "Cloudflare's free model allowance for this account is used up for today.",
  model_off: "The model is switched off on this server.",
  model_failed: "The model did not answer, even after a retry.",
  network: "The server could not be reached.",
};
