// Composite pixels the way the reference builds them with ffmpeg: bicubic scale with
// force_original_aspect_ratio=decrease, pad centered with black, reference left, frame right.
// Pure: works on RGBA byte arrays so it runs in node tests and in the page.

export const HALF_W = 512, HALF_H = 288;

// Keys cubic kernel; a = -0.5 is Catmull-Rom.
export function cubic(x, a = -0.5) {
  x = Math.abs(x);
  if (x < 1) return ((a + 2) * x - (a + 3)) * x * x + 1;
  if (x < 2) return (((x - 5) * x + 8) * x - 4) * a;
  return 0;
}

const cache = new Map();

// Filter taps for sn -> dn samples. On a downscale the kernel is widened by the factor so it antialiases.
export function weights(sn, dn, a = -0.5) {
  const key = sn + "x" + dn + "x" + a;
  if (cache.has(key)) return cache.get(key);
  const sc = sn / dn, f = Math.max(sc, 1), sup = 2 * f, taps = Math.ceil(2 * sup) + 3;
  const lo = new Int32Array(dn), count = new Int32Array(dn), w = new Float32Array(dn * taps);
  for (let i = 0; i < dn; i++) {
    const c = (i + 0.5) * sc;
    const l = Math.max(0, Math.floor(c - sup)), h = Math.min(sn - 1, Math.ceil(c + sup));
    let sum = 0;
    for (let j = l; j <= h; j++) { const k = cubic((j + 0.5 - c) / f, a); w[i * taps + j - l] = k; sum += k; }
    for (let j = l; j <= h; j++) w[i * taps + j - l] /= sum;
    lo[i] = l; count[i] = h - l + 1;
  }
  const out = { lo, count, w, taps };
  if (cache.size > 16) cache.clear();
  cache.set(key, out);
  return out;
}

// Resample RGBA src (sw x sh) to dw x dh, written into dst (RGBA, dstW wide) at x0, y0. Horizontal pass first.
export function resampleInto(src, sw, sh, dw, dh, dst, dstW, x0, y0) {
  const wx = weights(sw, dw), wy = weights(sh, dh);
  const tmp = new Float32Array(dw * sh * 3);
  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;
    for (let x = 0; x < dw; x++) {
      const l = wx.lo[x], n = wx.count[x], base = x * wx.taps;
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < n; k++) { const p = row + (l + k) * 4, q = wx.w[base + k]; r += src[p] * q; g += src[p + 1] * q; b += src[p + 2] * q; }
      const o = (y * dw + x) * 3; tmp[o] = r; tmp[o + 1] = g; tmp[o + 2] = b;
    }
  }
  for (let y = 0; y < dh; y++) {
    const l = wy.lo[y], n = wy.count[y], base = y * wy.taps, out = ((y0 + y) * dstW + x0) * 4;
    for (let x = 0; x < dw; x++) {
      let r = 0, g = 0, b = 0;
      for (let k = 0; k < n; k++) { const o = ((l + k) * dw + x) * 3, q = wy.w[base + k]; r += tmp[o] * q; g += tmp[o + 1] * q; b += tmp[o + 2] * q; }
      const p = out + x * 4; dst[p] = r; dst[p + 1] = g; dst[p + 2] = b; dst[p + 3] = 255;
    }
  }
}

// ffmpeg force_original_aspect_ratio=decrease: each side rounded to nearest, never over the box.
export function fitSize(sw, sh, W = HALF_W, H = HALF_H) {
  return { w: Math.min(W, Math.round((H * sw) / sh)), h: Math.min(H, Math.round((W * sh) / sw)) };
}

// pad=(ow-iw)/2:(oh-ih)/2; on 4:2:0 video ffmpeg rounds the offset down to even.
export function padOffset(outer, inner, even) {
  const o = Math.floor((outer - inner) / 2);
  return even ? o - (o % 2) : o;
}

// 1024x288 RGBA: ref letterboxed in the left half, frame in the right half, black elsewhere.
// ref and frame are { data, width, height } (RGBA). The frame is 4:2:0 video, the ref an RGB image.
// refBox and frameBox are each image's content rectangle { x, y, w, h } in composite pixels, padding excluded.
export function compositePixels(ref, frame) {
  const W = HALF_W * 2, data = new Uint8ClampedArray(W * HALF_H * 4);
  for (let p = 3; p < data.length; p += 4) data[p] = 255;
  const [refBox, frameBox] = [[ref, 0, false], [frame, HALF_W, true]].map(([img, left, even]) => {
    const { w, h } = fitSize(img.width, img.height), x = left + padOffset(HALF_W, w, even), y = padOffset(HALF_H, h, even);
    resampleInto(img.data, img.width, img.height, w, h, data, W, x, y);
    return { x, y, w, h };
  });
  return { data, width: W, height: HALF_H, refBox, frameBox };
}
