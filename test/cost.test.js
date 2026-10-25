import test from "node:test";
import assert from "node:assert/strict";
import { GW, GH, isNearUniform } from "../public/js/engine/grid.js";
import { detect, buildShots } from "../public/js/engine/detect.js";
import { busyMessage, stopMessage, LookError, nextUtcMidnight } from "../public/js/api.js";

const N = GW * GH * 3;
const flat = (v) => new Float32Array(N).fill(v);
// A grid with structure: left half dark panel, right half light, plus a value offset per shot.
const ui = (o) => { const g = new Float32Array(N); for (let i = 0; i < N; i++) g[i] = ((i / 3) % GW < GW / 2 ? 0.2 : 0.8) + o; return g; };
const shot = (k, grid, extra = {}) => ({ index: k, start: k * 2, end: k * 2 + 2, t: k * 2 + 0.5, black: false, uniform: isNearUniform(grid), grid, ...extra });

test("near-uniform frames are detected; UI-like frames are not", () => {
  assert.ok(isNearUniform(flat(0.7)));
  assert.ok(!isNearUniform(ui(0)));
  assert.equal(buildShots([flat(0.7), flat(0.7), flat(0.7)])[0].uniform, true);
});

test("uniform shots and shots identical to a judged shot skip the model", async () => {
  const shots = [shot(0, flat(0.9)), shot(1, ui(0)), shot(2, ui(0.005)), shot(3, ui(0.15))];
  const seen = [];
  const r = await detect({ shots, look: async (s) => { seen.push(s.index); return { app: s.index === 3 }; }, refine: async (n, y) => y });
  assert.deepEqual(seen, [1, 3]);
  assert.equal(r.status, "found");
  assert.equal(r.verdicts[0].skipped, "uniform");
  assert.equal(r.verdicts[2].skipped, "same_as_1");
  assert.equal(r.looks, 2);
});

test("a forced 6 s split never reuses an earlier verdict", async () => {
  // Same grid both times; shot 1 began on the 6 s rule, so it must still be asked.
  const shots = [shot(0, ui(0)), shot(1, ui(0.005), { forced: true })];
  const seen = [];
  const r = await detect({ shots, look: async (s) => { seen.push(s.index); return { app: s.index === 1 }; }, refine: async (n, y) => y });
  assert.deepEqual(seen, [0, 1]);
  assert.equal(r.status, "found");
  assert.equal(r.shot, 1);
});

test("buildShots marks forced splits inside one long still shot", () => {
  const still = Array.from({ length: 30 }, () => ui(0));
  const shots = buildShots(still);
  assert.deepEqual(shots.map((s) => s.start), [0, 6, 12]);
  assert.deepEqual(shots.map((s) => s.forced), [false, true, true]);
  const cut = buildShots([...Array.from({ length: 4 }, () => ui(0)), ...Array.from({ length: 4 }, () => ui(0.15))]);
  assert.deepEqual(cut.map((s) => s.forced), [false, false]);
});

test("cached answers do not count as looks; the per-video limit returns video_cap", async () => {
  const shots = Array.from({ length: 6 }, (_, k) => shot(k, ui(k * 0.1)));
  const cached = await detect({ shots, maxLooks: 2, look: async () => ({ app: false, cached: true }), refine: async () => 0 });
  assert.equal(cached.status, "none");
  assert.equal(cached.looks, 0);
  const capped = await detect({ shots, maxLooks: 2, look: async () => ({ app: false }), refine: async () => 0 });
  assert.equal(capped.status, "stopped");
  assert.equal(capped.error, "video_cap");
  assert.match(stopMessage(capped.error), /25-look limit.*Pick it yourself: click the first shot/);
  assert.match(stopMessage("http_500"), /^Automatic finding stopped on this shot\. Pick it yourself/);
  assert.doesNotMatch(stopMessage("origin"), /retry/);
});

test("busy state: daily cap or quota stops the search with a calm message and the reset time", async () => {
  const resets = "2026-10-26T00:00:00.000Z";
  const r = await detect({ shots: [shot(0, ui(0))], look: async () => { throw new LookError("daily_cap", resets); }, refine: async () => 0 });
  assert.equal(r.status, "error");
  assert.equal(r.error, "daily_cap");
  assert.equal(r.resetsAt, resets);
  const msg = stopMessage(r.error, r.resetsAt, { timeZone: "America/Denver" });
  assert.equal(msg, "Busy right now. Automatic finding is paused until 6:00 PM (resets daily). You can still pick the shot yourself below.");
  assert.equal(stopMessage("daily_cap", resets, { timeZone: "America/New_York" }), "Busy right now. Automatic finding is paused until 8:00 PM (resets daily at 6 PM Mountain). You can still pick the shot yourself below.");
  assert.match(stopMessage("daily_cap", "2026-11-03T00:00:00.000Z", { timeZone: "UTC" }), /until 12:00 AM \(resets daily at 5 PM Mountain\)/);
  assert.match(stopMessage("hit_cap"), /^You have used today's 400 saved answers\./);
  assert.equal(stopMessage("ai_quota", resets, { timeZone: "America/Denver" }), msg);
  assert.match(busyMessage(null, { now: new Date("2026-10-25T07:00:00Z"), timeZone: "UTC" }), /until 12:00 AM/);
  assert.equal(nextUtcMidnight(new Date("2026-10-25T23:59:00Z")).toISOString(), resets);
});
