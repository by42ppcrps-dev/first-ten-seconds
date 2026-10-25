import test from "node:test";
import assert from "node:assert/strict";
import { handleLook, jpegSize } from "../src/look.js";
import { reserve, memoryStore, estimateNeurons, DAILY_NEURON_CAP, LOOKS_PER_VIDEO } from "../src/budget-core.js";

// Minimal JPEG header with a SOF0 of the given size.
function fakeJpeg(w, h) {
  const b = [0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, h >> 8, h & 255, w >> 8, w & 255, 3, 1, 0x22, 0, 2, 0x11, 1, 3, 0x11, 1, 0xff, 0xd9];
  return "data:image/jpeg;base64," + Buffer.from(b).toString("base64");
}

function fakeEnv(answers, opts = {}) {
  const store = memoryStore();
  const calls = [];
  return {
    calls,
    store,
    AI_DISABLED: opts.off ? "1" : "0",
    AI: {
      async run(model, input) {
        calls.push(model);
        const a = answers[model.includes("llama") ? "llama" : "mistral"];
        if (a instanceof Error) throw a;
        return { response: a, usage: { prompt_tokens: 1000, completion_tokens: 20 } };
      },
    },
    BUDGET: {
      idFromName: (d) => d,
      get: () => ({
        reserve: async (v, vid, amt) => reserve(store, v, vid, amt),
        settle: async (d) => store.set("neurons", store.get("neurons") + d),
      }),
    },
  };
}

const req = (body, origin = "http://localhost:8787") =>
  new Request("http://localhost:8787/api/look", { method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body) });
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

test("transient error retried once, then model_failed", async () => {
  const env = fakeEnv({ llama: new Error("socket hang up") });
  const r = await handleLook(req(good), env);
  assert.equal(r.status, 502);
  assert.equal(env.calls.length, 2);
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
