// Zero-model check that the frame could be the app at all: compare the color mix of the two composite halves.
// 4 levels per channel, joint RGB histogram (64 bins) over each whole half, histogram intersection in 0..1.
// First-app frames of the scored videos measure 0.66 to 0.99; an architecture diagram measured 0.38.
export const GATE_MIN = 0.5;

function hist(data, width, x0, x1, height) {
  const h = new Float64Array(64);
  for (let y = 0; y < height; y++) {
    for (let x = x0, p = (y * width + x0) * 4; x < x1; x++, p += 4) h[((data[p] >> 6) << 4) | ((data[p + 1] >> 6) << 2) | (data[p + 2] >> 6)]++;
  }
  const n = (x1 - x0) * height;
  for (let i = 0; i < 64; i++) h[i] /= n;
  return h;
}

// data is RGBA, width x height, left half = reference, right half = frame.
export function halfSimilarity(data, width, height) {
  const half = width >> 1, a = hist(data, width, 0, half, height), b = hist(data, width, half, width, height);
  let s = 0;
  for (let i = 0; i < 64; i++) s += Math.min(a[i], b[i]);
  return s;
}

export function unlikeRef(similarity) {
  return similarity < GATE_MIN;
}
