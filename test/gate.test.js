import test from "node:test";
import assert from "node:assert/strict";
import { halfSimilarity, unlikeRef, GATE_MIN } from "../public/js/engine/gate.js";
import { detect } from "../public/js/engine/detect.js";
import { compositePixels } from "../public/js/engine/resample.js";

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

// A light app screen: blue top bar (12% of the height), gray text rows, near-white background.
const appShot = (w, h) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = y < h * 0.12 ? [40, 90, 200] : Math.floor(y / (h / 20)) % 3 === 0 && x > w * 0.1 && x < w * 0.7 ? [120, 120, 120] : [235, 238, 242];
    const p = (y * w + x) * 4; d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = 255;
  }
  return { data: d, width: w, height: h };
};

test("a phone-shaped screenshot is not marked down for its black bars", () => {
  const px = compositePixels(appShot(1080, 1920), appShot(1920, 1080));
  assert.deepEqual(px.refBox, { x: 175, y: 0, w: 162, h: 288 });
  assert.deepEqual(px.frameBox, { x: 512, y: 0, w: 512, h: 288 });
  const whole = halfSimilarity(px.data, px.width, px.height), boxed = halfSimilarity(px.data, px.width, px.height, px.refBox, px.frameBox);
  assert.ok(whole < GATE_MIN, `whole-half score ${whole}`);
  assert.ok(boxed > 0.95, `boxed score ${boxed}`);
});

test("a 4:3 screenshot next to a matching 16:9 frame scores on its content only", () => {
  const px = compositePixels(appShot(1024, 768), appShot(1280, 720));
  assert.deepEqual(px.refBox, { x: 64, y: 0, w: 384, h: 288 });
  assert.ok(halfSimilarity(px.data, px.width, px.height, px.refBox, px.frameBox) > 0.95);
});

test("16:9 boxes cover the whole halves and give exactly the no-box score", () => {
  const grad = (w, h, k) => {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = (y * w + x) * 4; d[p] = (x * k) % 256; d[p + 1] = (y * 3) % 256; d[p + 2] = (x + y) % 256; d[p + 3] = 255; }
    return { data: d, width: w, height: h };
  };
  const px = compositePixels(grad(1280, 720, 1), grad(1920, 1080, 2));
  assert.deepEqual(px.refBox, { x: 0, y: 0, w: 512, h: 288 });
  assert.deepEqual(px.frameBox, { x: 512, y: 0, w: 512, h: 288 });
  const plain = halfSimilarity(px.data, px.width, px.height);
  assert.ok(plain > 0 && plain < 1);
  assert.equal(halfSimilarity(px.data, px.width, px.height, px.refBox, px.frameBox), plain);
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
