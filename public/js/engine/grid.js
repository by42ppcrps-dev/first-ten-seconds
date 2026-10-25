// 32x18 RGB grids, values 0..1. Mirrors pipe.py: ffmpeg scale=32:18:flags=area.
export const GW = 32;
export const GH = 18;

// Area-average RGBA pixels (w x h) down to a 32x18 RGB grid.
export function gridFromRGBA(data, w, h) {
  const g = new Float32Array(GW * GH * 3);
  for (let gy = 0; gy < GH; gy++) {
    const y0 = Math.floor((gy * h) / GH), y1 = Math.max(y0 + 1, Math.floor(((gy + 1) * h) / GH));
    for (let gx = 0; gx < GW; gx++) {
      const x0 = Math.floor((gx * w) / GW), x1 = Math.max(x0 + 1, Math.floor(((gx + 1) * w) / GW));
      let r = 0, gr = 0, b = 0, n = 0;
      for (let y = y0; y < y1; y++) {
        let p = (y * w + x0) * 4;
        for (let x = x0; x < x1; x++, p += 4) { r += data[p]; gr += data[p + 1]; b += data[p + 2]; n++; }
      }
      const o = (gy * GW + gx) * 3;
      g[o] = r / n / 255; g[o + 1] = gr / n / 255; g[o + 2] = b / n / 255;
    }
  }
  return g;
}

export function meanAbsDiff(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length;
}

// Black or nearly black frames skip the model and count as "not the app yet".
export function isNearBlack(g) {
  let s = 0, max = 0;
  for (let i = 0; i < g.length; i++) { s += g[i]; if (g[i] > max) max = g[i]; }
  return s / g.length < 0.04 && max < 0.12;
}
