import { buildInput, LLAMA, MISTRAL, PROMPT } from "./prompt.js";
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
// Every attempt is charged through charge(): the usage estimate when the model reports usage, else the
// fallback estimate. A failed or timed-out attempt may still have spent neurons, so it is never free.
async function describe(env, model, dataUrl, charge) {
  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    let out;
    try {
      out = await withTimeout(env.AI.run(model, buildInput(dataUrl)), TIMEOUT_MS);
    } catch (err) {
      charge(estimateNeurons(model, null));
      if (isQuotaError(err)) {
        const e = new Error("ai_quota");
        e.code = "ai_quota";
        throw e;
      }
      lastErr = err;
      continue;
    }
    charge(estimateNeurons(model, out && out.usage));
    const parsed = parseDescription(out && out.response !== undefined ? out.response : out);
    if (parsed && parsed.ui_share) return parsed;
    lastErr = new Error("unreadable_answer");
  }
  const e = new Error(String(lastErr && lastErr.message ? lastErr.message : lastErr).slice(0, 200));
  e.code = "model_failed";
  throw e;
}

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha(s) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))).slice(0, 32);
}

// Cache key: SHA-256 of the JPEG bytes plus the models and prompt, so a prompt change starts a fresh cache.
export async function cacheKey(bytes) {
  const tag = new TextEncoder().encode(LLAMA + "|" + MISTRAL + "|" + PROMPT + "|");
  const all = new Uint8Array(tag.length + bytes.length);
  all.set(tag); all.set(bytes, tag.length);
  return hex(await crypto.subtle.digest("SHA-256", all));
}

export function nextResetIso(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)).toISOString();
}

const isDev = (env) => String(env.DEV) === "1";

// Same host only. Other localhost ports are allowed only when the DEV variable is set.
function originOk(request, env) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const o = new URL(origin), u = new URL(request.url);
    return o.host === u.host || (isDev(env) && (o.hostname === "localhost" || o.hostname === "127.0.0.1"));
  } catch {
    return false;
  }
}

export async function handleLook(request, env) {
  if (request.method !== "POST") return json(405, { error: "method" });
  if (!originOk(request, env)) return json(403, { error: "origin" });
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY) return json(413, { error: "too_large" });
  const text = await request.text();
  if (text.length > MAX_BODY) return json(413, { error: "too_large" });
  let body;
  try { body = JSON.parse(text); } catch { return json(400, { error: "bad_json" }); }
  const image = body && body.image;
  const video = String((body && body.video) || "").slice(0, 64);
  if (typeof image !== "string" || !image.startsWith("data:image/jpeg;base64,")) return json(400, { error: "not_an_image" });
  if (!/^[a-z0-9-]{4,64}$/.test(video)) return json(400, { error: "no_video_id" });
  let bytes, size;
  try { bytes = b64bytes(image.slice(23)); size = jpegSize(bytes); } catch { size = null; }
  if (!size || size.width !== 1024 || size.height !== 288) return json(400, { error: "wrong_size" });
  // Without a secret salt the visitor hash is guessable, so production refuses to run.
  if (!env.IP_SALT && !isDev(env)) return json(503, { error: "not_configured" });

  const day = new Date().toISOString().slice(0, 10);
  const ip = request.headers.get("cf-connecting-ip") || "local";
  const visitor = await sha(ip + "|" + day + "|" + (env.IP_SALT || "dev"));
  const budget = env.BUDGET.get(env.BUDGET.idFromName(day));
  const cache = env.BUDGET.get(env.BUDGET.idFromName("cache"));

  // A picture already answered costs no neurons and does not count against the neuron cap.
  const key = await cacheKey(bytes);
  const hit = await cache.cacheGet(key);
  if (hit) {
    const h = await budget.countHit(visitor);
    if (!h.ok) return json(429, { error: h.error });
    return json(200, { ...hit, cached: true, neurons_used_estimate: 0 });
  }

  if (String(env.AI_DISABLED) === "1") return json(503, { error: "model_off" });

  const r = await budget.reserve(visitor, video, RESERVE);
  if (!r.ok) return json(429, r.error === "daily_cap" ? { error: r.error, resets_at: nextResetIso() } : { error: r.error });

  let spent = 0, llama = null, mistral = null;
  const charge = (n) => { spent += n; };
  try {
    llama = await describe(env, LLAMA, image, charge);
    if (isCandidate(llama)) mistral = await describe(env, MISTRAL, image, charge);
  } catch (err) {
    await budget.settle(spent - RESERVE);
    const code = err.code || "model_failed";
    return json(code === "ai_quota" ? 429 : 502, code === "ai_quota" ? { error: code, resets_at: nextResetIso() } : { error: code });
  }
  await budget.settle(spent - RESERVE);
  const app = isCandidate(llama) && !!mistral && mistral.ui_share !== "none";
  const answer = { app, llama, mistral };
  await cache.cachePut(key, answer);
  return json(200, { ...answer, neurons_used_estimate: Math.round(spent * 10) / 10 });
}
