// Budget rules, independent of the Durable Object so they can be unit-tested.
export const DAILY_NEURON_CAP = 6000; // leaves room for Can I Park Here on the same free account
export const LOOKS_PER_VISITOR_DAY = 40;
export const LOOKS_PER_VIDEO = 25;
export const RESERVE = 70; // one Llama call (25) plus one Mistral call (45)

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

// store: { get(key) -> number, set(key, number) }
export function reserve(store, visitor, video, amount = RESERVE) {
  const used = store.get("neurons");
  if (used + amount > DAILY_NEURON_CAP) return { ok: false, error: "daily_cap" };
  const v = store.get("ip:" + visitor);
  if (v >= LOOKS_PER_VISITOR_DAY) return { ok: false, error: "visitor_cap" };
  const pv = store.get("vid:" + visitor + ":" + video);
  if (pv >= LOOKS_PER_VIDEO) return { ok: false, error: "video_cap" };
  store.set("neurons", used + amount);
  store.set("ip:" + visitor, v + 1);
  store.set("vid:" + visitor + ":" + video, pv + 1);
  return { ok: true, used: used + amount };
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
