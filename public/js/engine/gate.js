// Zero-model check that the frame could be the app at all: compare the color mix of the two composite halves.
// 4 levels per channel, joint RGB histogram (64 bins) over each half's content box (whole half if no box),
// histogram intersection in 0..1. The box keeps the black padding out, so a 4:3 or phone screenshot
// is not marked down for its bars. First-app frames of the scored videos measure 0.66 to 0.99;
// an architecture diagram measured 0.38.
export const GATE_MIN = 0.5;

function hist(data, width, { x, y, w, h }) {
  const out = new Float64Array(64);
  for (let r = y; r < y + h; r++) {
    for (let c = x, p = (r * width + x) * 4; c < x + w; c++, p += 4) out[((data[p] >> 6) << 4) | ((data[p + 1] >> 6) << 2) | (data[p + 2] >> 6)]++;
  }
  const n = w * h;
  for (let i = 0; i < 64; i++) out[i] /= n;
  return out;
}

// data is RGBA, width x height, left half = reference, right half = frame.
// refBox and frameBox ({ x, y, w, h }, from compositePixels) limit each histogram to that half's content.
export function halfSimilarity(data, width, height, refBox, frameBox) {
  const half = width >> 1;
  const a = hist(data, width, refBox || { x: 0, y: 0, w: half, h: height });
  const b = hist(data, width, frameBox || { x: half, y: 0, w: width - half, h: height });
  let s = 0;
  for (let i = 0; i < 64; i++) s += Math.min(a[i], b[i]);
  return s;
}

export function unlikeRef(similarity) {
  return similarity < GATE_MIN;
}
