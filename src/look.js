import { buildInput, LLAMA, MISTRAL } from "./prompt.js";
import { parseDescription, isCandidate } from "../public/js/engine/parse.js";
import { estimateNeurons, RESERVE } from "./budget-core.js";

const MAX_BODY = 300 * 1024;
const TIMEOUT_MS = 30000;

const json = (status, body) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

// Read width and height from a JPEG's SOF marker.
export function jpegSize(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const m = bytes[i + 1];
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if ((m >= 0xc0 && m <= 0xc3) || (m >= 0xc5 && m <= 0xc7) || (m >= 0xc9 && m <= 0xcb) || (m >= 0xcd && m <= 0xcf)) {
      return { height: (bytes[i + 5] << 8) | bytes[i + 6], width: (bytes[i + 7] << 8) | bytes[i + 8] };
    }
    i += 2 + len;
  }
  return null;
}

function b64bytes(b64) {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

export function isQuotaError(err) {
  return /4006|daily free allocation|neurons/i.test(String(err && err.message ? err.message : err));
}

function withTimeout(p, ms) {
  return Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms))]);
}

// One model call, retried once on a transient error. Quota errors are not retried.
async function describe(env, model, dataUrl) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const out = await withTimeout(env.AI.run(model, buildInput(dataUrl)), TIMEOUT_MS);
      const parsed = parseDescription(out && out.response !== undefined ? out.response : out);
      const neurons = estimateNeurons(model, out && out.usage);
      if (parsed && parsed.ui_share) return { parsed, neurons };
      lastErr = new Error("unreadable_answer");
    } catch (err) {
      if (isQuotaError(err)) {
        const e = new Error("ai_quota");
        e.code = "ai_quota";
        throw e;
      }
      lastErr = err;
    }
  }
  const e = new Error(String(lastErr && lastErr.message ? lastErr.message : lastErr).slice(0, 200));
  e.code = "model_failed";
  throw e;
}

async function sha(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function originOk(request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin), u = new URL(request.url);
    return o.host === u.host || o.hostname === "localhost" || o.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export async function handleLook(request, env) {
  if (request.method !== "POST") return json(405, { error: "method" });
  if (!originOk(request)) return json(403, { error: "origin" });
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { error: "too_large" });
  let body;
  try { body = JSON.parse(text); } catch { return json(400, { error: "bad_json" }); }
  const image = body && body.image;
  const video = String((body && body.video) || "").slice(0, 64);
  if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,")) return json(400, { error: "not_an_image" });
  if (!/^[a-z0-9-]{4,64}$/.test(video)) return json(400, { error: "no_video_id" });
  let size;
  try { size = jpegSize(b64bytes(image.slice(23))); } catch { size = null; }
  if (!size || size.width !== 1024 || size.height !== 288) return json(400, { error: "wrong_size" });

  if (String(env.AI_DISABLED) === "1") return json(503, { error: "model_off" });

  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const visitor = await sha(ip + "|" + day + "|" + (env.IP_SALT || "dev"));
  const budget = env.BUDGET.get(env.BUDGET.idFromName(day));
  const r = await budget.reserve(visitor, video, RESERVE);
  if (!r.ok) return json(429, { error: r.error });

  let spent = 0, llama = null, mistral = null;
  try {
    const l = await describe(env, LLAMA, image);
    spent += l.neurons;
    llama = l.parsed;
    if (isCandidate(llama)) {
      const m = await describe(env, MISTRAL, image);
      spent += m.neurons;
      mistral = m.parsed;
    }
  } catch (err) {
    await budget.settle(spent - RESERVE);
    return json(err.code === "ai_quota" ? 429 : 502, { error: err.code || "model_failed" });
  }
  await budget.settle(spent - RESERVE);
  const app = isCandidate(llama) && !!mistral && mistral.ui_share !== "none";
  return json(200, { app, llama, mistral, neurons_used_estimate: Math.round(spent * 10) / 10 });
}
