import test from "node:test";
import assert from "node:assert/strict";
import { cubic, weights, resampleInto, fitSize, padOffset, compositePixels } from "../public/js/engine/resample.js";

const solid = (w, h, rgb) => {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let p = 0; p < d.length; p += 4) { d[p] = rgb[0]; d[p + 1] = rgb[1]; d[p + 2] = rgb[2]; d[p + 3] = 255; }
  return { data: d, width: w, height: h };
};

test("Keys cubic kernel: 1 at 0, 0 at integers, zero past 2", () => {
  assert.equal(cubic(0), 1);
  assert.ok(Math.abs(cubic(1)) < 1e-12 && Math.abs(cubic(-1)) < 1e-12);
  assert.equal(cubic(2.5), 0);
  assert.ok(cubic(1.5) < 0);
});

test("weights sum to 1 and widen on a downscale", () => {
  const w = weights(1920, 512);
  for (let i = 0; i < 512; i++) {
    let s = 0;
    for (let k = 0; k < w.count[i]; k++) s += w.w[i * w.taps + k];
    assert.ok(Math.abs(s - 1) < 1e-5);
  }
  assert.ok(w.count[256] >= 15, "kernel spans about 4 x 3.75 source pixels");
  assert.ok(weights(512, 512).count[256] <= 6);
});

test("flat color stays flat; identity size keeps pixels", () => {
  const src = solid(1920, 1080, [200, 100, 50]), dst = new Uint8ClampedArray(512 * 288 * 4);
  resampleInto(src.data, 1920, 1080, 512, 288, dst, 512, 0, 0);
  for (const p of [0, 4 * 1000, dst.length - 4]) assert.deepEqual([...dst.slice(p, p + 4)], [200, 100, 50, 255]);
  const g = new Uint8ClampedArray(8 * 4 * 4);
  for (let i = 0; i < g.length; i++) g[i] = (i * 37) % 256;
  const out = new Uint8ClampedArray(g.length);
  resampleInto(g, 8, 4, 8, 4, out, 8, 0, 0);
  for (let i = 0; i < g.length; i++) if (i % 4 !== 3) assert.equal(out[i], g[i]);
});

test("downscale antialiases a 1-pixel checkerboard to mid gray", () => {
  const w = 64, h = 36, d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = (x + y) % 2 ? 255 : 0, p = (y * w + x) * 4; d[p] = d[p + 1] = d[p + 2] = v; d[p + 3] = 255; }
  const out = new Uint8ClampedArray(16 * 9 * 4);
  resampleInto(d, w, h, 16, 9, out, 16, 0, 0);
  const p = (4 * 16 + 8) * 4;
  assert.ok(Math.abs(out[p] - 127.5) < 6, "got " + out[p]);
});

test("letterbox matches ffmpeg decrease + centered pad", () => {
  assert.deepEqual(fitSize(1920, 1080), { w: 512, h: 288 });
  assert.deepEqual(fitSize(1280, 720), { w: 512, h: 288 });
  assert.deepEqual(fitSize(1080, 1920), { w: 162, h: 288 });
  assert.deepEqual(fitSize(1440, 1080), { w: 384, h: 288 });
  assert.deepEqual(fitSize(2560, 1080), { w: 512, h: 216 });
  assert.equal(padOffset(512, 162, false), 175);
  assert.equal(padOffset(512, 162, true), 174);
});

test("composite is 1024x288: ref left, frame right, black bars", () => {
  const c = compositePixels(solid(1280, 720, [255, 0, 0]), solid(1080, 1920, [0, 0, 255]));
  assert.equal(c.width, 1024); assert.equal(c.height, 288); assert.equal(c.data.length, 1024 * 288 * 4);
  const at = (x, y) => [...c.data.slice((y * 1024 + x) * 4, (y * 1024 + x) * 4 + 4)];
  assert.deepEqual(at(10, 10), [255, 0, 0, 255]);
  assert.deepEqual(at(512 + 256, 144), [0, 0, 255, 255]);
  assert.deepEqual(at(512 + 10, 144), [0, 0, 0, 255]);
});
