import test from "node:test";
import assert from "node:assert/strict";
import { halfSimilarity, unlikeRef, GATE_MIN } from "../public/js/engine/gate.js";
import { detect } from "../public/js/engine/detect.js";

const img = (w, h, left, right) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = (x < w / 2 ? left : right)(x, y), p = (y * w + x) * 4; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255; }
  return d;
};

test("identical halves score 1, disjoint colors score 0", () => {
  const same = img(64, 8, () => [10, 200, 90], () => [20, 210, 100]);
  assert.equal(halfSimilarity(same, 64, 8), 1);
  const apart = img(64, 8, () => [255, 255, 255], () => [0, 0, 0]);
  assert.equal(halfSimilarity(apart, 64, 8), 0);
});

test("partial overlap is the shared share of pixels", () => {
  // Left: all white. Right: 3 of 4 columns white, 1 of 4 black.
  const d = img(64, 4, () => [250, 250, 250], (x) => (x % 4 === 0 ? [0, 0, 0] : [250, 250, 250]));
  assert.ok(Math.abs(halfSimilarity(d, 64, 4) - 0.75) < 1e-9);
});

test("threshold: under 0.5 is unlike the screenshot", () => {
  assert.equal(GATE_MIN, 0.5);
  assert.ok(unlikeRef(0.38));
  assert.ok(!unlikeRef(0.66));
  assert.ok(!unlikeRef(0.5));
});

test("a gated shot is a NO that costs no look and is not counted toward the video cap", async () => {
  const shots = [0, 1, 2].map((i) => ({ index: i, t: i * 3 + 0.5, forced: false, black: false, uniform: false, grid: null }));
  let asked = 0;
  const r = await detect({
    shots,
    look: async (s) => (s.index < 2 ? { app: false, skipped: "unlike_ref", gate: 0.3 } : (asked++, { app: true, gate: 0.9 })),
    refine: async (no, yes) => yes,
    maxLooks: 1,
  });
  assert.equal(r.status, "found");
  assert.equal(asked, 1);
  assert.equal(r.looks, 1);
  assert.deepEqual(r.verdicts.slice(0, 2).map((v) => [v.app, v.skipped, v.gate]), [[false, "unlike_ref", 0.3], [false, "unlike_ref", 0.3]]);
  assert.equal(r.verdicts[2].gate, 0.9);
});
