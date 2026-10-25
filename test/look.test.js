import test from "node:test";
import assert from "node:assert/strict";
import { handleLook, jpegSize } from "../src/look.js";
import { reserve, settle, countHit, memoryStore, memoryCache, estimateNeurons, dailyCap, DAILY_NEURON_CAP, LOOKS_PER_VIDEO, RESERVE, CACHED_LOOKS_PER_VISITOR_DAY } from "../src/budget-core.js";

// Minimal JPEG header with a SOF0 of the given size.
function fakeJpeg(w, h) {
  const b = [0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9];
  return "data:image/jpeg;base64," + Buffer.from(b).toString("base64");
}

// Fake AI binding and Durable Objects; no network. answers.llama / answers.mistral: a value, an Error,
// or a function of the call number.
function fakeEnv(answers, opts = {}) {
  const store = memoryStore();
  const cache = memoryCache();
  const calls = [];
  return {
    calls,
    store,
    cache,
    DEV: opts.prod ? "0" : "1",
    IP_SALT: opts.salt,
    AI_DISABLED: opts.off ? "1" : "0",
    FTS_DAILY_CAP: opts.cap,
    AI: {
      async run(model, input) {
        calls.push(model);
        let a = answers[model.includes("llama") ? "llama" : "mistral"];
        if (typeof a === "function") a = a(calls.length);
        if (a instanceof Error) throw a;
        return opts.noUsage ? { response: a } : { response: a, usage: { prompt_tokens: 1000, completion_tokens: 20 } };
      },
    },
    BUDGET: {
      idFromName: (d) => d,
      get: (name) => name === "cache"
        ? { cacheGet: cache.get, cachePut: cache.put }
        : {
            reserve: async (v, vid, amt, cap) => reserve(store, v, vid, amt, cap),
            settle: async (d) => settle(store, d),
            countHit: async (v) => countHit(store, v),
          },
    },
  };
}

const req = (body, origin = "http://localhost:8787", headers = {}) =>
  new Request("http://localhost:8787/api/look", { method: "POST", headers: { origin, "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
const APP = '{"ui_share":"all","headline":false,"photo":false}';
const good = { image: fakeJpeg(1024, 288), video: "test-video-1" };

test("jpegSize reads SOF", () => {
  const b = Buffer.from(fakeJpeg(1024, 288).slice(23), "base64");
  assert.deepEqual(jpegSize(b), { width: 1024, height: 288 });
});

test("refuses bad input", async () => {
  const env = fakeEnv({});
  assert.equal((await handleLook(new Request("http://localhost:8787/api/look"), env)).status, 405);
  assert.equal((await handleLook(req(good, "https://evil.example"), env)).status, 403);
  assert.equal((await handleLook(req({ image: "data:image/png;base64,AAAA", video: "abcd" }), env)).status, 400);
  assert.equal((await handleLook(req({ image: fakeJpeg(800, 600), video: "abcd" }), env)).status, 400);
  assert.equal(env.calls.length, 0);
});

test("model off returns 503 with zero calls", async () => {
  const env = fakeEnv({}, { off: true });
  const r = await handleLook(req(good), env);
  assert.equal(r.status, 503);
  assert.equal((await r.json()).error, "model_off");
  assert.equal(env.calls.length, 0);
});

test("mistral runs only for candidates", async () => {
  const env = fakeEnv({ llama: '{"ui_share":"part","headline":false,"photo":false}', mistral: "{}" });
  const out = await (await handleLook(req(good), env)).json();
  assert.equal(out.app, false);
  assert.equal(out.mistral, null);
  assert.equal(env.calls.length, 1);
});

test("candidate confirmed by mistral is app", async () => {
  const env = fakeEnv({ llama: { ui_share: "all", headline: "false", photo: false }, mistral: '```json\n{"ui_share":"most","headline":false,"photo":false}\n```' });
  const out = await (await handleLook(req(good), env)).json();
  assert.equal(out.app, true);
  assert.equal(out.mistral.ui_share, "most");
  assert.ok(out.neurons_used_estimate > 0);
});

test("4006 maps to ai_quota 429 and is not retried", async () => {
  const env = fakeEnv({ llama: new Error("AiError: 4006: you have used up your daily free allocation of 10,000 neurons") });
  const r = await handleLook(req(good), env);
  assert.equal(r.status, 429);
  assert.equal((await r.json()).error, "ai_quota");
  assert.equal(env.calls.length, 1);
});

test("transient error retried once, then model_failed, and both attempts are charged", async () => {
  const env = fakeEnv({ llama: new Error("socket hang up") });
  const r = await handleLook(req(good), env);
  assert.equal(r.status, 502);
  assert.equal((await r.json()).error, "model_failed");
  assert.equal(env.calls.length, 2);
  assert.equal(env.store.get("neurons"), 2 * estimateNeurons("@cf/meta/llama-4-scout-17b-16e-instruct", null));
  assert.equal(env.cache.size(), 0);
});

test("unreadable answers are charged from usage, or the fallback when there is no usage", async () => {
  const env = fakeEnv({ llama: "no json" });
  await handleLook(req(good), env);
  assert.equal(env.store.get("neurons"), 2 * estimateNeurons("@cf/meta/llama-4-scout-17b-16e-instruct", { prompt_tokens: 1000, completion_tokens: 20 }));
  const env2 = fakeEnv({ llama: APP, mistral: () => new Error("timeout") }, { noUsage: true });
  const r = await handleLook(req(good), env2);
  assert.equal(r.status, 502);
  assert.equal(env2.calls.length, 3);
  assert.equal(env2.store.get("neurons"), 25 + 45 + 45);
});

test("daily cap: 429 with reset time, zero model calls, and the cap stays at or under 6,000", async () => {
  assert.ok(DAILY_NEURON_CAP <= 6000);
  const env = fakeEnv({ llama: APP, mistral: APP });
  env.store.set("neurons", DAILY_NEURON_CAP - RESERVE + 1);
  const r = await handleLook(req(good), env);
  assert.equal(r.status, 429);
  const b = await r.json();
  assert.equal(b.error, "daily_cap");
  assert.match(b.resets_at, /T00:00:00\.000Z$/);
  assert.equal(env.calls.length, 0);
  // Worst case for one look (both models, both retried) never pushes the day past the cap.
  const s = memoryStore();
  while (reserve(s, "v" + Math.random(), "x", RESERVE).ok) settle(s, 2 * 25 + 2 * 45 - RESERVE);
  assert.ok(s.get("neurons") <= DAILY_NEURON_CAP);
});

test("cache hit: same picture costs zero neurons, zero calls, and works while the cap is reached", async () => {
  const env = fakeEnv({ llama: APP, mistral: APP });
  const first = await (await handleLook(req(good), env)).json();
  assert.equal(first.app, true);
  assert.equal(env.calls.length, 2);
  const spent = env.store.get("neurons");
  env.store.set("neurons", DAILY_NEURON_CAP);
  const r = await handleLook(req(good), env);
  assert.equal(r.status, 200);
  const again = await r.json();
  assert.equal(again.cached, true);
  assert.equal(again.app, true);
  assert.equal(again.neurons_used_estimate, 0);
  assert.equal(env.calls.length, 2);
  assert.equal(env.store.get("neurons"), DAILY_NEURON_CAP);
  assert.ok(spent > 0);
  // A different picture is not a hit.
  assert.equal((await handleLook(req({ image: "data:image/jpeg;base64," + Buffer.concat([Buffer.from(fakeJpeg(1024, 288).slice(23), "base64"), Buffer.from([1, 2, 3])]).toString("base64"), video: "test-video-1" }), env)).status, 429);
});

test("FTS_DAILY_CAP: default 6,000, clamped to 6,000, 0 turns automatic finding off", async () => {
  assert.equal(dailyCap({}), 6000);
  assert.equal(dailyCap({ FTS_DAILY_CAP: "" }), 6000);
  assert.equal(dailyCap({ FTS_DAILY_CAP: "2000" }), 2000);
  assert.equal(dailyCap({ FTS_DAILY_CAP: "9000" }), 6000);
  assert.equal(dailyCap({ FTS_DAILY_CAP: "-5" }), 0);
  assert.equal(dailyCap({ FTS_DAILY_CAP: "two thousand" }), 0);
  const off = fakeEnv({ llama: APP, mistral: APP }, { cap: "0" });
  const r = await handleLook(req(good), off);
  assert.equal(r.status, 429);
  const b = await r.json();
  assert.equal(b.error, "daily_cap");
  assert.match(b.resets_at, /T00:00:00\.000Z$/);
  assert.equal(off.calls.length, 0);
  assert.equal(off.store.get("neurons"), 0);
  // A lowered cap holds the same way the default one does.
  const low = fakeEnv({ llama: APP, mistral: APP }, { cap: "2000" });
  low.store.set("neurons", 2000 - RESERVE + 1);
  assert.equal((await (await handleLook(req(good), low)).json()).error, "daily_cap");
  assert.equal(low.calls.length, 0);
});

test("cache hits past the daily hit limit return hit_cap, not visitor_cap", () => {
  const s = memoryStore();
  for (let i = 0; i < CACHED_LOOKS_PER_VISITOR_DAY; i++) assert.ok(countHit(s, "a").ok);
  assert.equal(countHit(s, "a").error, "hit_cap");
});

test("hardening: salt required in production, localhost ports only in dev, content-length checked", async () => {
  const prod = fakeEnv({ llama: APP }, { prod: true });
  assert.equal((await (await handleLook(req(good), prod)).json()).error, "not_configured");
  assert.equal(prod.calls.length, 0);
  assert.equal((await handleLook(req(good, "http://localhost:3000"), prod)).status, 403);
  const dev = fakeEnv({ llama: '{"ui_share":"none","headline":false,"photo":false}' });
  assert.equal((await handleLook(req(good, "http://localhost:3000"), dev)).status, 200);
  const big = new Request("http://localhost:8787/api/look", { method: "POST", headers: { origin: "http://localhost:8787", "content-length": String(400 * 1024) }, body: "x" });
  assert.equal((await handleLook(big, dev)).status, 413);
});

test("budget caps", () => {
  const s = memoryStore();
  s.set("neurons", DAILY_NEURON_CAP - 10);
  assert.equal(reserve(s, "a", "v", 70).error, "daily_cap");
  const s2 = memoryStore();
  for (let i = 0; i < LOOKS_PER_VIDEO; i++) assert.ok(reserve(s2, "a", "v", 1).ok);
  assert.equal(reserve(s2, "a", "v", 1).error, "video_cap");
  for (let i = 0; i < 15; i++) assert.ok(reserve(s2, "a", "w" + i, 1).ok);
  assert.equal(reserve(s2, "a", "x", 1).error, "visitor_cap");
  assert.equal(estimateNeurons("@cf/meta/llama-4-scout-17b-16e-instruct", null), 25);
});
