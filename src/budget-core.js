// Budget rules, independent of the Durable Object so they can be unit-tested.
export const DAILY_NEURON_CAP = 6000; // leaves room for Can I Park Here on the same free account
export const LOOKS_PER_VISITOR_DAY = 40;
export const LOOKS_PER_VIDEO = 25;
// Worst case for one look: Llama and Mistral, each tried twice, with headroom over the fallback estimates.
// Reserved up front so the cap holds even when every attempt fails; settled to the real charge after.
// 30 and 50 per call are guesses. If a call costs more, the last look of a day can pass the cap by a few
// tens of neurons. Reset both from the highest per-call cost logged in the first real bench run.
export const RESERVE = 2 * (30 + 50);
export const CACHED_LOOKS_PER_VISITOR_DAY = 400; // cached answers cost no neurons; this only stops abuse

// Neurons per million tokens (Assumption: copied from the Workers AI pricing page; recheck).
const RATES = {
  "@cf/meta/llama-4-scout-17b-16e-instruct": { in: 24545, out: 77273, fallback: 25 },
  "@cf/mistralai/mistral-small-3.1-24b-instruct": { in: 31876, out: 50488, fallback: 45 },
};

export function estimateNeurons(model, usage) {
  const r = RATES[model];
  if (!r) return 50;
  const pin = Number(usage && usage.prompt_tokens), pout = Number(usage && usage.completion_tokens);
  if (!Number.isFinite(pin) || pin <= 0) return r.fallback;
  return Math.round(((pin * r.in + (Number.isFinite(pout) ? pout : 0) * r.out) / 1e6) * 10) / 10;
}

// Site cap for today from the FTS_DAILY_CAP variable. Unset means 6,000; anything higher is clamped to
// 6,000; 0 turns automatic finding off (the page shows the busy state). A value that is not a number
// also gives 0, so a typo fails closed.
export function dailyCap(env) {
  const raw = env && env.FTS_DAILY_CAP;
  if (raw === undefined || raw === null || String(raw).trim() === "") return DAILY_NEURON_CAP;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(DAILY_NEURON_CAP, Math.floor(n)));
}

// store: { get(key) -> number, set(key, number) }
export function reserve(store, visitor, video, amount = RESERVE, cap = DAILY_NEURON_CAP) {
  const used = store.get("neurons");
  if (used + amount > cap) return { ok: false, error: "daily_cap" };
  const v = store.get("ip:" + visitor);
  if (v >= LOOKS_PER_VISITOR_DAY) return { ok: false, error: "visitor_cap" };
  const pv = store.get("vid:" + visitor + ":" + video);
  if (pv >= LOOKS_PER_VIDEO) return { ok: false, error: "video_cap" };
  store.set("neurons", used + amount);
  store.set("ip:" + visitor, v + 1);
  store.set("vid:" + visitor + ":" + video, pv + 1);
  return { ok: true, used: used + amount };
}

// Count one cached answer for a visitor. Does not touch the neuron count.
export function countHit(store, visitor) {
  const k = "hit:" + visitor, n = store.get(k);
  if (n >= CACHED_LOOKS_PER_VISITOR_DAY) return { ok: false, error: "hit_cap" };
  store.set(k, n + 1);
  return { ok: true };
}

export function settle(store, delta) {
  const used = store.get("neurons");
  store.set("neurons", Math.max(0, used + delta));
  return store.get("neurons");
}

export function memoryStore() {
  const m = new Map();
  return { get: (k) => m.get(k) || 0, set: (k, v) => m.set(k, v) };
}

// In-memory answer cache with the same shape as the Durable Object's (tests and local fakes).
export function memoryCache() {
  const m = new Map();
  return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); }, size: () => m.size };
}
