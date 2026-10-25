import { meanAbsDiff } from "./grid.js";

export const SAMPLE_FPS = 2;
export const CUT = 0.06;
export const MAX_SHOT_S = 6;
export const CAP_S = 180;

// New shot when the mean abs diff to the previous sample is over CUT,
// or every MAX_SHOT_S inside a long shot (slow fades, titles over a dimmed app).
export function shotStarts(grids, opts) {
  return shotBounds(grids, opts).starts;
}

// Same split, plus forced[k]: true when shot k began on the MAX_SHOT_S rule rather than a real cut.
export function shotBounds(grids, { fps = SAMPLE_FPS, cut = CUT, maxLen = MAX_SHOT_S } = {}) {
  const starts = [0], forced = [false];
  for (let i = 1; i < grids.length; i++) {
    const d = meanAbsDiff(grids[i], grids[i - 1]);
    if (d > cut) { starts.push(i); forced.push(false); }
    else if ((i - starts[starts.length - 1]) / fps >= maxLen) { starts.push(i); forced.push(true); }
  }
  return { starts, forced };
}

// Sample 0.5 s into the shot when it is at least 1 s long, else at its start.
export function shotSampleTime(starts, k, n, fps = SAMPLE_FPS) {
  const s = starts[k];
  const end = k + 1 < starts.length ? starts[k + 1] : n;
  const t = s / fps + (end - s >= 2 ? 0.5 : 0);
  return round2(t);
}

export function round2(t) {
  return Math.round(t * 100) / 100;
}
