import { meanAbsDiff, isNearBlack } from "./grid.js";
import { shotStarts, shotSampleTime, round2, SAMPLE_FPS } from "./shots.js";

export const REFINE_FPS = 30;
export const MAX_LOOKS_PER_VIDEO = 25;

// Build the shot list from 2 fps grids.
export function buildShots(grids, fps = SAMPLE_FPS) {
  const starts = shotStarts(grids, { fps });
  return starts.map((s, k) => {
    const t = shotSampleTime(starts, k, grids.length, fps);
    const end = k + 1 < starts.length ? starts[k + 1] : grids.length;
    const gi = Math.min(grids.length - 1, Math.round(t * fps));
    return { index: k, start: round2(s / fps), end: round2(end / fps), t, black: isNearBlack(grids[gi]) };
  });
}

// First frame (from t0, stepping 1/fps) whose grid is closer to YES than to NO.
export function refinePick(frames, yesGrid, noGrid, t0, t1, fps = REFINE_FPS) {
  for (let i = 0; i < frames.length; i++) {
    if (meanAbsDiff(frames[i], yesGrid) < meanAbsDiff(frames[i], noGrid)) return round2(t0 + i / fps);
  }
  return round2(t1);
}

// Walk shots in order. look(shot) resolves to { app } or throws; an error is not a NO.
// refine(noT, yesT) resolves to the answer time.
export async function detect({ shots, look, refine, onShot = () => {}, maxLooks = MAX_LOOKS_PER_VIDEO }) {
  let lastNo = null, looks = 0;
  const verdicts = [];
  for (const shot of shots) {
    let app;
    if (shot.black) {
      app = false;
      verdicts.push({ shot: shot.index, t: shot.t, app, skipped: "black" });
    } else {
      if (looks >= maxLooks) return { status: "stopped", verdicts, lastNo, looks };
      let res;
      try {
        looks++;
        res = await look(shot);
      } catch (err) {
        verdicts.push({ shot: shot.index, t: shot.t, error: err.code || String(err.message || err) });
        onShot(shot, null, verdicts);
        return { status: "error", error: err.code || "look_failed", message: err.message, failedShot: shot.index, verdicts, lastNo, looks };
      }
      app = !!res.app;
      verdicts.push({ shot: shot.index, t: shot.t, app, llama: res.llama, mistral: res.mistral, neurons: res.neurons_used_estimate });
    }
    onShot(shot, app, verdicts);
    if (app) {
      if (lastNo === null) {
        const answer = shot.index === 0 ? 0 : await refine(0, shot.t);
        return { status: "found", answer, yesT: shot.t, noT: lastNo, shot: shot.index, verdicts, looks };
      }
      const answer = await refine(lastNo, shot.t);
      return { status: "found", answer, yesT: shot.t, noT: lastNo, shot: shot.index, verdicts, looks };
    }
    lastNo = shot.t;
  }
  return { status: "none", verdicts, lastNo, looks };
}

// "Suggests, you confirm": the user picked the first shot that shows the app.
export function bracketForPick(shots, picked) {
  if (picked === 0) return { answerAtZero: true };
  return { noT: shots[picked - 1].t, yesT: shots[picked].t };
}
