import { meanAbsDiff, isNearBlack, isNearUniform } from "./grid.js";
import { shotStarts, shotSampleTime, round2, SAMPLE_FPS } from "./shots.js";

export const MAX_LOOKS_PER_VIDEO = 25;
// A shot whose grid is this close to an already judged shot reuses that verdict (well under the 0.06 cut).
export const REUSE_DIFF = 0.02;

// Build the shot list from 2 fps grids.
export function buildShots(grids, fps = SAMPLE_FPS) {
  const starts = shotStarts(grids, { fps });
  return starts.map((s, k) => {
    const t = shotSampleTime(starts, k, grids.length, fps);
    const end = k + 1 < starts.length ? starts[k + 1] : grids.length;
    const gi = Math.min(grids.length - 1, Math.round(t * fps));
    const black = isNearBlack(grids[gi]);
    return { index: k, start: round2(s / fps), end: round2(end / fps), t, black, uniform: !black && isNearUniform(grids[gi]), grid: grids[gi] };
  });
}

// Every real frame of the video between the NO and YES times, at the video's own rate (num/den).
// seekT is the middle of the frame, so a seek there shows exactly that frame.
export function refineFrames(noT, yesT, rate) {
  const first = Math.floor((noT * rate.num) / rate.den + 1e-6), last = Math.floor((yesT * rate.num) / rate.den + 1e-6);
  const out = [];
  for (let i = first; i <= last; i++) out.push({ index: i, seekT: ((i + 0.5) * rate.den) / rate.num });
  return out;
}

// Start time of a frame, unrounded. frameAt(frameStart(i, rate), rate) === i.
export function frameStart(index, rate) {
  return (index * rate.den) / rate.num;
}

// First frame whose grid is closer to YES than to NO. frames[k] is the grid of list[k]; returns a frame index.
export function refinePick(frames, yesGrid, noGrid, list) {
  for (let i = 0; i < frames.length; i++) {
    if (meanAbsDiff(frames[i], yesGrid) < meanAbsDiff(frames[i], noGrid)) return list[i].index;
  }
  return list[list.length - 1].index;
}

// Walk shots in order. look(shot) resolves to { app } or throws; an error is not a NO.
// refine(noT, yesT) resolves to the answer time. Black or near-uniform shots, and shots nearly identical
// to one already judged, skip the model. Cached answers ({ cached: true }) do not count as looks.
export async function detect({ shots, look, refine, onShot = () => {}, maxLooks = MAX_LOOKS_PER_VIDEO }) {
  let lastNo = null, looks = 0;
  const verdicts = [], judged = [];
  for (const shot of shots) {
    let app;
    const same = shot.grid ? judged.find((j) => meanAbsDiff(j.grid, shot.grid) < REUSE_DIFF) : null;
    if (shot.black || shot.uniform) {
      app = false;
      verdicts.push({ shot: shot.index, t: shot.t, app, skipped: shot.black ? "black" : "uniform" });
    } else if (same) {
      app = same.app;
      verdicts.push({ shot: shot.index, t: shot.t, app, skipped: "same_as_" + same.shot });
    } else {
      if (looks >= maxLooks) return { status: "stopped", error: "video_cap", verdicts, lastNo, looks };
      let res;
      try {
        res = await look(shot);
      } catch (err) {
        looks++;
        verdicts.push({ shot: shot.index, t: shot.t, error: err.code || String(err.message || err) });
        onShot(shot, null, verdicts);
        return { status: "error", error: err.code || "look_failed", message: err.message, resetsAt: err.resetsAt || null, failedShot: shot.index, verdicts, lastNo, looks };
      }
      if (!res.cached) looks++;
      app = !!res.app;
      if (shot.grid) judged.push({ grid: shot.grid, app, shot: shot.index });
      verdicts.push({ shot: shot.index, t: shot.t, app, llama: res.llama, mistral: res.mistral, neurons: res.neurons_used_estimate, cached: !!res.cached });
    }
    onShot(shot, app, verdicts);
    if (app) {
      const answer = lastNo === null && shot.index === 0 ? 0 : await refine(lastNo === null ? 0 : lastNo, shot.t);
      return { status: "found", answer, yesT: shot.t, noT: lastNo, shot: shot.index, verdicts, looks };
    }
    lastNo = shot.t;
  }
  return { status: "none", verdicts, lastNo, looks };
}

// Confirm mode: the user picked the first shot that shows the app.
export function bracketForPick(shots, picked) {
  if (picked === 0) return { answerAtZero: true };
  return { noT: shots[picked - 1].t, yesT: shots[picked].t };
}
