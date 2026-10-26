// Browser-only: the local <video>, frame grabs, composites and the frame-exact refine.
import { gridFromRGBA, meanAbsDiff } from "../engine/grid.js";
import { refineFrames, frameStart } from "../engine/detect.js";
import { gridFrame, frameAtOrAfter, frameMid } from "../engine/frames.js";
import { compositePixels } from "../engine/resample.js";

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
  return gridAtSeek(v, t + EPS);
}

async function gridAtSeek(v, seekT) {
  await seek(v, seekT);
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
// Sample i is labeled i / fps but shows the frame ffmpeg fps=2 keeps for it (rate is the video's own rate).
export async function sample(v, { fps = 2, cap = 180, rate, onProgress = () => {}, cancelled = () => false } = {}) {
  const end = Math.min(v.duration, cap);
  const grids = [], thumbs = [];
  for (let i = 0; i / fps < end - 0.01; i++) {
    if (cancelled()) break;
    grids.push(await gridAtSeek(v, frameMid(gridFrame(i, fps, rate), rate)));
    thumbCtx.drawImage(v, 0, 0, 128, 72);
    thumbs.push(thumbCanvas.toDataURL("image/jpeg", 0.6));
    onProgress(i, Math.ceil(end * fps));
  }
  return { grids, thumbs };
}

// The whole image at native size as RGBA.
function pixelsOf(src, w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(src, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, width: w, height: h };
}

const refCache = new WeakMap();

// 1024x288: reference letterboxed on the left, the frame ffmpeg -ss t would show on the right.
// Cubic resample from native pixels, like the reference pipeline's ffmpeg composite. ms is the build time.
export async function composite(v, t, ref, rate) {
  await seek(v, frameMid(frameAtOrAfter(t, rate), rate));
  const t0 = performance.now();
  if (!refCache.has(ref)) refCache.set(ref, pixelsOf(ref, ref.width, ref.height));
  const px = compositePixels(refCache.get(ref), pixelsOf(v, v.videoWidth, v.videoHeight));
  const c = document.createElement("canvas");
  c.width = px.width; c.height = px.height;
  c.getContext("2d").putImageData(new ImageData(px.data, px.width, px.height), 0, 0);
  const image = c.toDataURL("image/jpeg", 0.92);
  return { image, ms: Math.round(performance.now() - t0) };
}

// Step through every real frame (at the video's rate) from the last NO time to the YES time.
// Returns the unrounded start time of the first frame closer to YES; frameAt() floors it back to that frame.
export async function refine(v, noT, yesT, rate) {
  const y = await gridAt(v, yesT), n = await gridAt(v, noT);
  const list = refineFrames(noT, yesT, rate);
  for (const f of list) {
    const g = await gridAt(v, f.seekT);
    if (meanAbsDiff(g, y) < meanAbsDiff(g, n)) return frameStart(f.index, rate);
  }
  return frameStart(list[list.length - 1].index, rate);
}
