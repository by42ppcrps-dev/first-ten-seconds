import test from "node:test";
import assert from "node:assert/strict";
import { GW, GH, gridFromRGBA, meanAbsDiff, isNearBlack } from "../public/js/engine/grid.js";
import { shotStarts, shotSampleTime } from "../public/js/engine/shots.js";
import { buildShots, detect, refinePick, bracketForPick } from "../public/js/engine/detect.js";
import { parseDescription, isCandidate, isApp } from "../public/js/engine/parse.js";

const N = GW * GH * 3;
const flat = (v) => new Float32Array(N).fill(v);

test("grid area-averages RGBA down to 32x18", () => {
  const w = 64, h = 36, data = new Uint8ClampedArray(w * h * 4).fill(255);
  const g = gridFromRGBA(data, w, h);
  assert.equal(g.length, N);
  assert.ok(Math.abs(g[0] - 1) < 1e-6);
  assert.ok(isNearBlack(flat(0.01)));
  assert.ok(!isNearBlack(flat(0.5)));
});

test("shots split on cuts over 0.06 and every 6 s inside a long shot", () => {
  const grids = [];
  for (let i = 0; i < 30; i++) grids.push(flat(i < 10 ? 0.2 : 0.6)); // cut at sample 10 (5.0 s)
  assert.deepEqual(shotStarts(grids), [0, 10, 22]);
  assert.equal(shotSampleTime([0, 10, 22], 0, 30), 0.5);
  assert.equal(shotSampleTime([0, 1], 0, 5), 0); // under 1 s: sample at the start
});

const fakeShots = (apps) => apps.map((app, k) => ({ index: k, start: k * 2, end: k * 2 + 2, t: k * 2 + 0.5, black: false, app }));

test("detect stops at the first app shot and refines between last NO and YES", async () => {
  const shots = fakeShots([false, false, true, true]);
  const calls = [];
  const r = await detect({
    shots,
    look: async (s) => { calls.push(s.t); return { app: s.app }; },
    refine: async (no, yes) => { assert.deepEqual([no, yes], [2.5, 4.5]); return 4.27; },
  });
  assert.equal(r.status, "found");
  assert.equal(r.answer, 4.27);
  assert.deepEqual(calls, [0.5, 2.5, 4.5]);
});

test("app in the very first shot answers 0.0", async () => {
  const r = await detect({ shots: fakeShots([true]), look: async () => ({ app: true }), refine: async () => assert.fail("no refine") });
  assert.equal(r.answer, 0);
});

test("an error is not a NO: auto mode stops", async () => {
  const shots = fakeShots([false, true]);
  const r = await detect({
    shots,
    look: async (s) => { if (s.index === 1) { const e = new Error("cap"); e.code = "daily_cap"; throw e; } return { app: false }; },
    refine: async () => assert.fail("no refine"),
  });
  assert.equal(r.status, "error");
  assert.equal(r.error, "daily_cap");
  assert.equal(r.failedShot, 1);
});

test("black shots skip the model and count as not yet", async () => {
  const shots = fakeShots([false, true]);
  shots[0].black = true;
  let looks = 0;
  const r = await detect({ shots, look: async (s) => { looks++; return { app: s.app }; }, refine: async (no, yes) => (no + yes) / 2 });
  assert.equal(looks, 1);
  assert.equal(r.answer, 1.5);
});

test("no app found returns none", async () => {
  const r = await detect({ shots: fakeShots([false, false]), look: async () => ({ app: false }), refine: async () => 0 });
  assert.equal(r.status, "none");
});

test("refinePick takes the first frame closer to YES than NO (crossfade)", () => {
  const no = flat(0), yes = flat(1);
  const frames = [0, 0.1, 0.3, 0.45, 0.55, 0.8, 1].map(flat);
  assert.equal(refinePick(frames, yes, no, 12, 12.5), Math.round((12 + 4 / 30) * 100) / 100);
  assert.equal(refinePick([flat(0)], yes, no, 3, 3.5), 3.5);
});

test("buildShots marks black sample frames and confirm mode brackets the pick", () => {
  const grids = [flat(0), flat(0), flat(0), flat(0.7), flat(0.7), flat(0.7)];
  const shots = buildShots(grids);
  assert.equal(shots.length, 2);
  assert.equal(shots[0].black, true);
  assert.equal(shots[1].t, 2);
  assert.deepEqual(bracketForPick(shots, 1), { noT: 0.5, yesT: 2 });
  assert.deepEqual(bracketForPick(shots, 0), { answerAtZero: true });
});

test("parse handles fences, string booleans and junk", () => {
  assert.deepEqual(parseDescription('```json\n{"ui_share": "Most", "headline": "false", "photo": false}\n```'), { ui_share: "most", headline: false, photo: false });
  assert.deepEqual(parseDescription({ ui_share: "all", headline: "true", photo: "false" }), { ui_share: "all", headline: true, photo: false });
  assert.equal(parseDescription("no json here"), null);
  assert.ok(isCandidate({ ui_share: "all", headline: false }));
  assert.ok(!isCandidate({ ui_share: "all", headline: true }));
  assert.ok(!isCandidate({ ui_share: "part", headline: false }));
  assert.ok(isApp({ ui_share: "most", headline: false }, { ui_share: "part" }));
  assert.ok(!isApp({ ui_share: "most", headline: false }, { ui_share: "none" }));
});
