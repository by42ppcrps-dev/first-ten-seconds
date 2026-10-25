// Browser-only: the local <video>, frame grabs, composites and the 30 fps refine.
import { gridFromRGBA, meanAbsDiff } from "../engine/grid.js";
import { round2 } from "../engine/shots.js";
import { REFINE_FPS } from "../engine/detect.js";

const GRAB_W = 256, GRAB_H = 144; // 8x the 32x18 grid, then area-averaged
const EPS = 0.001;

const grabCanvas = document.createElement("canvas");
grabCanvas.width = GRAB_W; grabCanvas.height = GRAB_H;
const grabCtx = grabCanvas.getContext("2d", { willReadFrequently: true });
const thumbCanvas = document.createElement("canvas");
thumbCanvas.width = 128; thumbCanvas.height = 72;
const thumbCtx = thumbCanvas.getContext("2d");

export function loadVideo(url) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.muted = true; v.playsInline = true; v.preload = "auto"; v.className = "offscreen";
    const timer = setTimeout(() => reject(new Error("cannot_play")), 15000);
    v.addEventListener("loadeddata", () => { clearTimeout(timer); resolve(v); }, { once: true });
    v.addEventListener("error", () => { clearTimeout(timer); reject(new Error("cannot_play")); }, { once: true });
    v.src = url;
    document.body.appendChild(v);
  });
}

export function seek(v, t) {
  return new Promise((resolve) => {
    const target = Math.max(0, Math.min(t, v.duration - EPS));
    const done = () => { clearTimeout(timer); v.removeEventListener("seeked", done); resolve(); };
    const timer = setTimeout(done, 4000);
    v.addEventListener("seeked", done);
    v.currentTime = target;
  });
}

export async function gridAt(v, t) {
  await seek(v, t + EPS);
  grabCtx.drawImage(v, 0, 0, GRAB_W, GRAB_H);
  return gridFromRGBA(grabCtx.getImageData(0, 0, GRAB_W, GRAB_H).data, GRAB_W, GRAB_H);
}

// Measure the frame rate from presented frames while playing muted for about 0.6 s.
export function estimateFps(v) {
  return new Promise((resolve) => {
    if (!("requestVideoFrameCallback" in v)) return resolve(30);
    const times = [];
    let stopped = false;
    const finish = () => {
      if (stopped) return;
      stopped = true; v.pause();
      const gaps = [];
      for (let i = 1; i < times.length; i++) if (times[i] > times[i - 1]) gaps.push(times[i] - times[i - 1]);
      gaps.sort((a, b) => a - b);
      resolve(gaps.length >= 4 ? 1 / gaps[Math.floor(gaps.length / 2)] : 30);
    };
    const cb = (_now, meta) => { times.push(meta.mediaTime); if (times.length < 24 && !stopped) v.requestVideoFrameCallback(cb); else finish(); };
    v.requestVideoFrameCallback(cb);
    setTimeout(finish, 1500);
    v.play().catch(finish);
  });
}

// 2 fps grids over the first min(duration, cap) seconds, with a small thumbnail per sample.
export async function sample(v, { fps = 2, cap = 180, onProgress = () => {} } = {}) {
  const end = Math.min(v.duration, cap);
  const grids = [], thumbs = [];
  for (let i = 0; i / fps < end - 0.01; i++) {
    const t = i / fps;
    grids.push(await gridAt(v, t));
    thumbCtx.drawImage(v, 0, 0, 128, 72);
    thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.6));
    onProgress(i, Math.ceil(end * fps));
  }
  return { grids, thumbs };
}

function contain(ctx, src, sw, sh, x, y, w, h) {
  const s = Math.min(w / sw, h / sh);
  const dw = Math.round(sw * s), dh = Math.round(sh * s);
  ctx.drawImage(src, x + Math.floor((w - dw) / 2), y + Math.floor((h - dh) / 2), dw, dh);
}

// 1024x288: reference letterboxed on the left, the frame at t on the right.
export async function composite(v, t, ref) {
  await seek(v, t + EPS);
  const c = document.createElement("canvas");
  c.width = 1024; c.height = 288;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, 1024, 288);
  ctx.imageSmoothingQuality = "high";
  contain(ctx, ref, ref.width, ref.height, 0, 0, 512, 288);
  contain(ctx, v, v.videoWidth, v.videoHeight, 512, 0, 512, 288);
  return c.toDataURL("image/jpeg", 0.85);
}

// Step at 30 fps from the last NO time to the YES time; first frame closer to YES wins.
export async function refine(v, noT, yesT) {
  const y = await gridAt(v, yesT), n = await gridAt(v, noT);
  const count = Math.floor((yesT - noT) * REFINE_FPS + 1e-6) + 1;
  for (let i = 0; i < count; i++) {
    const f = await gridAt(v, noT + i / REFINE_FPS);
    if (meanAbsDiff(f, y) < meanAbsDiff(f, n)) return round2(noT + i / REFINE_FPS);
  }
  return round2(yesT);
}
