// Timecode at the video's real rate. 29.97 and 59.94 support drop frame (;) and non-drop (:).
const RATES = [
  { label: "23.976", base: 24, num: 24000, den: 1001 },
  { label: "24", base: 24, num: 24, den: 1 },
  { label: "25", base: 25, num: 25, den: 1 },
  { label: "29.97", base: 30, num: 30000, den: 1001 },
  { label: "30", base: 30, num: 30, den: 1 },
  { label: "50", base: 50, num: 50, den: 1 },
  { label: "59.94", base: 60, num: 60000, den: 1001 },
  { label: "60", base: 60, num: 60, den: 1 },
];

export const RATE_LABELS = RATES.map((r) => r.label);

// Snap a measured or chosen frame rate to the nearest standard rate.
export function rateInfo(fps, drop) {
  let best = RATES[4], bestD = Infinity;
  for (const r of RATES) {
    const d = Math.abs(r.num / r.den - Number(fps));
    if (d < bestD) { bestD = d; best = r; }
  }
  const canDrop = best.den === 1001 && (best.base === 30 || best.base === 60);
  return { ...best, fps: best.num / best.den, ntsc: best.den === 1001, drop: canDrop && !!drop, canDrop };
}

export function frameAt(t, rate) {
  return Math.round(t * rate.fps + 1e-9);
}

export function secondsAt(frame, rate) {
  return (frame * rate.den) / rate.num;
}

const pad = (n, w = 2) => String(n).padStart(w, "0");

// Frame count to SMPTE timecode string.
export function smpte(frame, rate) {
  const base = rate.base;
  let f = frame;
  if (rate.drop) {
    const dropN = base === 60 ? 4 : 2;
    const per10 = base * 600 - dropN * 9;
    const perMin = base * 60 - dropN;
    const d = Math.floor(f / per10), m = f % per10;
    f += dropN * 9 * d + (m > dropN ? dropN * Math.floor((m - dropN) / perMin) : 0);
  }
  const ff = f % base, ss = Math.floor(f / base) % 60, mm = Math.floor(f / (base * 60)) % 60, hh = Math.floor(f / (base * 3600)) % 24;
  return `${pad(hh)}:${pad(mm)}:${pad(ss)}${rate.drop ? ";" : ":"}${pad(ff)}`;
}

// SMPTE hours/minutes/seconds/frames to a frame count.
export function framesFromHMSF(h, m, s, f, rate) {
  const base = rate.base;
  let n = ((h * 60 + m) * 60 + s) * base + f;
  if (rate.drop) {
    const dropN = base === 60 ? 4 : 2;
    const mins = h * 60 + m;
    n -= dropN * (mins - Math.floor(mins / 10));
  }
  return n;
}

// Human display, minutes:seconds with two decimals: 0:12.27
export function display(t) {
  if (t === null || t === undefined || Number.isNaN(t)) return "-:--.--";
  const cs = Math.round(t * 100);
  const m = Math.floor(cs / 6000), s = Math.floor((cs % 6000) / 100), c = cs % 100;
  return `${m}:${pad(s)}.${pad(c)}`;
}
