# Browser vs reference parity (P5)

Offline only: no model calls. The page (this commit) runs in headless Chrome from `python3 -m http.server 8797` with `/api/look` answered locally (always NO, so every shot up to the 25-look or 3:00 limit is composited). Harness: `bench/parity.mjs`. Analysis: work/p5/parity.py (ffmpeg composites built with the pipe.py command, `-q:v 4`). Shot times for Python come from work/diag/pyref.py (first 45 s).

**Status: partial, 6 of 11 videos analyzed when the 15-minute chunk ended** (boardclerk-v06, ciph, faultrehearsal-v4, graphhacks-yt, h-boardclerk-v04, h-faultrehearsal-v1). The harness was still running the rest; rerun `python3 -I work/p5/parity.py <ids>` and `work/p5/report.py` to fill in the other 5.

Changes measured: grid sample i shows frame ceil((i + 0.5) / 2 * rate) - 1 (ffmpeg fps=2), the composite shows the first frame starting at or after t (ffmpeg -ss), cubic resample (Keys a = -0.5, widened on downscale) from native pixels, JPEG 0.92, and the local color gate (skip under 0.5).

Composite build time in headless Chrome (desktop CPU, 1920x1080 source): median 76 to 86 ms per composite, max 132 ms. It runs once per looked-at shot.

## Findings so far

- (a) Shot times: all 6 match pipe.py exactly, including the faultrehearsal 4.5 s shot that the old page asked at 5 and 6. The only difference is the last browser shot before 45 s (41.5, 44, 42.5): pyref.py cuts the clip at 45 s, so its last shot has no next start and gets no +0.5. Not a real difference.
- (b) Pixel diff vs ffmpeg dropped on the one video with an old harvest (faultrehearsal-v4: 6.31 to 4.11, h-faultrehearsal-v1: 6.11 to 4.11). The yuvj420p (full range) faultrehearsal clips still differ most; the browser's YUV to RGB conversion for full range is outside the page's control. Others are 1.6 to 2.3.
- (c) Gate: never skips the reference's YES shot (gates there: 0.66, 0.72, 0.98, 0.84, 0.78, 0.98). On ciph it skips 6 title/slide shots before the app (saves looks). It does skip some shots after the true first-app time (late boardclerk shots, many faultrehearsal shots after 9.3 s); the reference stopped at an earlier YES on both, so the answers do not change, but a miss on the first app shot would not be rescued by those later shots. Ground truth (gt/ground-truth.json, gt/holdout-truth.json) was read only for this check.
- The 0.5 threshold was chosen after seeing results, including holdout frames; disclose it as such.

### (a) Shot sample times, first 45 s, browser vs pipe.py

| Video | Match | Browser only | Python only |
|---|---|---|---|
| boardclerk-v06 | yes | 41.5 | - |
| ciph | yes | - | - |
| faultrehearsal-v4 | yes | 44 | - |
| graphhacks-yt | yes | 42.5 | - |
| h-boardclerk-v04 | yes | - | - |
| h-faultrehearsal-v1 | yes | - | - |

### (b) Mean abs pixel diff (0 to 255) vs the ffmpeg composite at the same t

| Video | Before (old canvas, its own times) | After (cubic, this commit) | Composites after |
|---|---|---|---|
| boardclerk-v06 | not harvested | 2.06 | 37 |
| ciph | not harvested | 1.98 | 27 |
| faultrehearsal-v4 | 6.31 | 4.11 | 22 |
| graphhacks-yt | not harvested | 1.56 | 21 |
| h-boardclerk-v04 | not harvested | 2.27 | 27 |
| h-faultrehearsal-v1 | 6.11 | 4.11 | 18 |

### (c) Gate value per shot (t:value; '-' = black, uniform or reused, no composite) and skips

- **boardclerk-v06**: skipped [91.5, 100.5, 106.5]; true first app 0.0; reference YES shot 0.5 (gate there 0.663, skipped: no); skipped at or after the true time: [91.5, 100.5, 106.5]
  - 0.5:0.663 1:0.691 2:0.665 3.5:0.624 4.5:0.747 10.5:0.746 12.5:0.821 13.5:0.641 19.5:0.643 25.5:0.642 30:0.672 30.5:- 31.5:0.663 32.5:0.866 38:0.872 39:0.876 41.5:0.87 47.5:0.859 50:0.863 50.5:0.82 51:- 51.5:0.668 52.5:0.814 54:0.814 55:0.918 58:0.723 60:0.75 63:0.749 63.5:- 64.5:0.653 65.5:0.969 68:0.877 71:- 73.5:- 74.5:- 77:0.781 80.5:0.78 81.5:- 84:0.736 85:0.836 87:0.834 91.5:0.411 96:0.568 98:0.563 99.5:0.57 100.5:0.395 106.5:0.391
- **ciph**: skipped [0.5, 3, 6, 7, 8, 9]; true first app 12.27; reference YES shot 13.0 (gate there 0.724, skipped: no); skipped at or after the true time: none
  - 0.5:0.234 3:0.393 4:0.666 5:0.666 6:0.315 7:0.23 8:0.396 9:0.265 10.5:0.679 11.5:0.637 12:0.636 13:0.724 17.5:0.973 23.5:0.906 29:0.711 31:0.715 32:0.723 33:0.811 36.5:0.821 38.5:0.867 40:- 40.5:0.893 41.5:0.903 42.5:0.832 45:0.858 47:0.862 48:0.703 52.5:0.693 58.5:0.708 59.5:0.715 63.5:0.649 69:0.678 69.5:0.678 70.5:0.666
- **faultrehearsal-v4**: skipped [0.5, 4.5, 9, 26, 32, 38, 44, 50, 56, 57, 58, 64, 118.5, 124, 129.5, 130.5, 136.5, 139, 149, 155, 161, 167]; true first app 9.33; reference YES shot 10.0 (gate there 0.98, skipped: no); skipped at or after the true time: [26, 32, 38, 44, 50, 56, 57, 58, 64, 118.5, 124, 129.5, 130.5, 136.5, 139, 149, 155, 161, 167]
  - 0.5:0.344 4.5:0.359 5.5:0.669 9:0.358 10:0.98 16:0.967 22:0.967 26:0.342 32:0.358 38:0.36 39.5:- 44:0.42 50:0.387 56:0.389 57:0.36 58:0.399 64:0.391 66.5:0.768 70:0.976 73.5:0.944 74.5:0.753 77:0.978 79.5:0.977 80.5:0.583 83.5:0.978 89.5:0.957 95:0.973 96:0.984 102:0.96 105:0.96 106:- 111.5:0.955 112:0.955 113:0.982 118.5:0.402 124:0.408 129.5:0.359 130.5:0.405 136.5:0.397 139:0.397 140:0.968 144.5:0.753 149:0.359 155:0.361 161:0.346 167:0.355
- **graphhacks-yt**: skipped none; true first app 16.2; reference YES shot 16.5 (gate there 0.844, skipped: no); skipped at or after the true time: none
  - 0.5:0.96 6.5:0.962 12.5:0.966 16.5:0.844 22.5:0.988 28.5:0.82 34.5:0.792 36.5:- 42.5:0.978 48.5:0.948 54:0.972 55:0.866 61:0.882 62.5:0.74 63.5:0.72 69.5:0.805 74.5:- 80.5:0.874 86.5:0.968 92.5:0.971 98.5:0.971 104.5:0.965 110.5:0.966
- **h-boardclerk-v04**: skipped [44.5, 138, 143.5, 149.5, 155.5, 161.5]; true first app 0.0; reference YES shot 0.5 (gate there 0.779, skipped: no); skipped at or after the true time: [44.5, 138, 143.5, 149.5, 155.5, 161.5]
  - 0.5:0.779 6:0.872 12:0.873 18:0.875 20:0.87 21:0.517 27:0.518 33:0.518 39:0.518 44.5:0.388 45.5:0.796 46.5:0.875 47.5:0.817 53.5:0.829 56:0.847 58.5:- 64.5:0.822 70.5:0.812 72:- 74:0.832 76.5:- 82.5:0.887 85:0.851 91:- 93.5:0.835 99.5:0.837 105.5:0.841 108.5:0.825 109.5:- 112.5:0.885 118.5:0.886 124.5:0.887 127:- 128.5:- 134.5:0.885 138:0.281 143.5:0.356 149.5:0.268 155.5:0.266 161.5:0.268
- **h-faultrehearsal-v1**: skipped [0.5, 4.5, 9, 23, 29, 39, 45, 51, 52, 53, 59, 111, 117, 130, 136, 142, 148]; true first app 9.27; reference YES shot 10.0 (gate there 0.98, skipped: no); skipped at or after the true time: [23, 29, 39, 45, 51, 52, 53, 59, 111, 117, 130, 136, 142, 148]
  - 0.5:0.344 4.5:0.359 5.5:0.669 9:0.358 10:0.98 16:0.973 22:0.973 23:0.339 29:0.353 34.5:- 39:0.42 45:0.387 51:0.389 52:0.36 53:0.399 59:0.391 61.5:0.977 67.5:0.942 70:0.978 76:0.951 82:0.984 87.5:0.973 88:0.973 89:0.984 95:0.96 98:0.96 99:- 105:0.955 111:0.425 117:0.397 120.5:0.968 126.5:0.942 129:0.942 130:0.359 136:0.361 142:0.35 148:0.355

