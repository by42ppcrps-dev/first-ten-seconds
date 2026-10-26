import test from "node:test";
import assert from "node:assert/strict";
import { gridFrame, frameAtOrAfter, frameMid } from "../public/js/engine/frames.js";
import { rateInfo } from "../public/js/engine/timecode.js";

test("2 fps grid picks the ffmpeg fps=2 frame at 30 fps (15i + 7)", () => {
  const r = rateInfo(30);
  for (let i = 0; i < 400; i++) assert.equal(gridFrame(i, 2, r), 15 * i + 7);
});

test("2 fps grid at 29.97, 25 and 60 fps is the last frame before (i + 0.5) / 2", () => {
  for (const fps of [29.97, 25, 60, 23.976, 59.94]) {
    const r = rateInfo(fps);
    for (let i = 0; i < 400; i++) {
      const k = gridFrame(i, 2, r), edge = (i + 0.5) / 2;
      assert.ok(frameMid(k, r) - 0.5 * r.den / r.num < edge, `${fps} ${i} start below edge`);
      assert.ok(((k + 1) * r.den) / r.num >= edge - 1e-9, `${fps} ${i} next frame not below edge`);
    }
  }
  assert.equal(gridFrame(0, 2, rateInfo(25)), 6);
  assert.equal(gridFrame(1, 2, rateInfo(25)), 18);
  assert.equal(gridFrame(0, 2, rateInfo(60)), 14);
  assert.equal(gridFrame(3, 2, rateInfo(60)), 104);
  assert.equal(gridFrame(0, 2, rateInfo(29.97)), 7);
  assert.equal(gridFrame(100, 2, rateInfo(29.97)), 1505);
});

test("shot time seeks to the first frame starting at or after t, like ffmpeg -ss", () => {
  const r30 = rateInfo(30), r2997 = rateInfo(29.97), r25 = rateInfo(25);
  assert.equal(frameAtOrAfter(0, r30), 0);
  assert.equal(frameAtOrAfter(0.5, r30), 15);
  assert.equal(frameAtOrAfter(18.5, r30), 555);
  assert.equal(frameAtOrAfter(0.51, r30), 16);
  assert.equal(frameAtOrAfter(0.5, r2997), 15);
  assert.equal(frameAtOrAfter(10, r2997), 300);
  assert.equal(frameAtOrAfter(6.5, r25), 163);
  assert.ok(Math.abs(frameMid(15, r30) - 0.5167) < 1e-3);
});
