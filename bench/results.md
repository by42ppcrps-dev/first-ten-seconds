# Benchmark results

Every browser run is appended. Misses are kept.

## Run 2026-10-26T06:53:36.783Z (commit f001ffd)

Models: @cf/meta/llama-4-scout-17b-16e-instruct, then @cf/mistralai/mistral-small-3.1-24b-instruct for candidates. Cut 0.06, forced split 6 s, refine at the video frame rate. Hard stop 4000 neurons; batch total ~563.

```
ground-truth.json: OK
holdout-truth.json: OK
refs/boardclerk-v06__ref1.png: OK
refs/boardclerk-v06__ref2.png: OK
refs/ciph__ref1.png: OK
refs/ciph__ref2.png: OK
refs/faultrehearsal-v4__ref1.png: OK
refs/faultrehearsal-v4__ref2.png: OK
refs/graphhacks-yt__ref1.png: OK
refs/graphhacks-yt__ref2.png: OK
refs/h-boardclerk-v04__ref1.png: OK
refs/h-boardclerk-v04__ref2.png: OK
refs/h-faultrehearsal-v1__ref1.png: OK
refs/h-faultrehearsal-v1__ref2.png: OK
refs/h-motiontracker-v3__ref1.png: OK
refs/h-motiontracker-v3__ref2.png: OK
refs/h-taint-v1__ref1.png: OK
refs/h-taint-v1__ref2.png: OK
refs/motiontracker-v1__ref1.png: OK
refs/motiontracker-v1__ref2.png: OK
refs/motiontracker-v5__ref1.png: OK
refs/motiontracker-v5__ref2.png: OK
videos/boardclerk-v04.mp4: OK
videos/boardclerk-v06.mp4: OK
videos/ciph.mp4: OK
videos/faultrehearsal-v4.mp4: OK
videos/graphhacks-yt.mp4: OK
videos/h-boardclerk-v04.mp4: OK
videos/h-faultrehearsal-v1.mp4: OK
videos/h-motiontracker-v3.mp4: OK
videos/h-taint-v1.mp4: OK
videos/motiontracker-v1.mp4: OK
videos/motiontracker-v5.mp4: OK
videos/rcv-yt.mp4: OK
videos/ref-src-faultrehearsal-v1.mp4: OK
```

| video | set | answer s | truth s | error s | hit (1.0 s) | calls | neurons | cached | skipped |
|---|---|---|---|---|---|---|---|---|---|
| h-boardclerk-v04 | holdout | 0.2 | 0 | 0.2 | hit | 3 | 67.4 | 0 | 67.4 |
| h-motiontracker-v3 | holdout | 12.333333333333334 | 0 | 12.33 | MISS | 4 | 91.1 | 0 | 91.1 |
| h-taint-v1 | holdout | 22.1 | 18.33 | 3.77 | MISS | 11 | 243 | 0 | 243 |
| h-faultrehearsal-v1 | holdout | 14.133333333333333 | 9.27 | 4.86 | MISS | 7 | 161.4 | 0 | 161.4 |

holdout: 1 of 4 hit

## Run 2026-10-26T07:00:29.107Z (commit f001ffd)

Models: @cf/meta/llama-4-scout-17b-16e-instruct, then @cf/mistralai/mistral-small-3.1-24b-instruct for candidates. Cut 0.06, forced split 6 s, refine at the video frame rate. Hard stop 4000 neurons; batch total ~592.

```
ground-truth.json: OK
holdout-truth.json: OK
refs/boardclerk-v06__ref1.png: OK
refs/boardclerk-v06__ref2.png: OK
refs/ciph__ref1.png: OK
refs/ciph__ref2.png: OK
refs/faultrehearsal-v4__ref1.png: OK
refs/faultrehearsal-v4__ref2.png: OK
refs/graphhacks-yt__ref1.png: OK
refs/graphhacks-yt__ref2.png: OK
refs/h-boardclerk-v04__ref1.png: OK
refs/h-boardclerk-v04__ref2.png: OK
refs/h-faultrehearsal-v1__ref1.png: OK
refs/h-faultrehearsal-v1__ref2.png: OK
refs/h-motiontracker-v3__ref1.png: OK
refs/h-motiontracker-v3__ref2.png: OK
refs/h-taint-v1__ref1.png: OK
refs/h-taint-v1__ref2.png: OK
refs/motiontracker-v1__ref1.png: OK
refs/motiontracker-v1__ref2.png: OK
refs/motiontracker-v5__ref1.png: OK
refs/motiontracker-v5__ref2.png: OK
videos/boardclerk-v04.mp4: OK
videos/boardclerk-v06.mp4: OK
videos/ciph.mp4: OK
videos/faultrehearsal-v4.mp4: OK
videos/graphhacks-yt.mp4: OK
videos/h-boardclerk-v04.mp4: OK
videos/h-faultrehearsal-v1.mp4: OK
videos/h-motiontracker-v3.mp4: OK
videos/h-taint-v1.mp4: OK
videos/motiontracker-v1.mp4: OK
videos/motiontracker-v5.mp4: OK
videos/rcv-yt.mp4: OK
videos/ref-src-faultrehearsal-v1.mp4: OK
```

| video | set | answer s | truth s | error s | hit (1.0 s) | calls | neurons | cached | skipped |
|---|---|---|---|---|---|---|---|---|---|
| h-boardclerk-v04 | holdout | 0.2 | 0 | 0.2 | hit | 0 | 0 | 2 | 67.4 |
| h-motiontracker-v3 | holdout | 12.333333333333334 | 0 | 12.33 | MISS | 0 | 0 | 3 | 91.1 |
| h-taint-v1 | holdout | 22.1 | 18.33 | 3.77 | MISS | 0 | 0 | 6 | 243 |
| h-faultrehearsal-v1 | holdout | 14.133333333333333 | 9.27 | 4.86 | MISS | 0 | 0 | 6 | 161.4 |
| ciph | dev | 12.266666666666667 | 12.27 | 0 | hit | 11 | 255.4 | 0 | 0 |
| faultrehearsal-v4 | dev | 14.633333333333333 | 9.33 | 5.3 | MISS | 7 | 161.4 | 0 | 0 |
| graphhacks-yt | dev | 16.033333333333335 | 16.2 | -0.17 | hit | 8 | 175.6 | 0 | 0 |
| motiontracker-v1 | dev | none | 13.62 |  | MISS (no answer: visitor_cap) | 0 | 0 | 0 | 0 |
| boardclerk-v06 | dev | none | 0 |  | MISS (no answer: visitor_cap) | 0 | 0 | 0 | 0 |
| motiontracker-v5 | dev | none | 0 |  | MISS (no answer: visitor_cap) | 0 | 0 | 0 | 0 |
| rcv-yt | rcv | none | none |  | hit | 0 | 0 | 0 | 0 |

dev: 2 of 6 hit

holdout: 1 of 4 hit

rcv: 1 of 1 hit

## Run 2026-10-26T07:01:24.829Z (commit f001ffd)

Models: @cf/meta/llama-4-scout-17b-16e-instruct, then @cf/mistralai/mistral-small-3.1-24b-instruct for candidates. Cut 0.06, forced split 6 s, refine at the video frame rate. Hard stop 2800 neurons; batch total ~91.

```
ground-truth.json: OK
holdout-truth.json: OK
refs/boardclerk-v06__ref1.png: OK
refs/boardclerk-v06__ref2.png: OK
refs/ciph__ref1.png: OK
refs/ciph__ref2.png: OK
refs/faultrehearsal-v4__ref1.png: OK
refs/faultrehearsal-v4__ref2.png: OK
refs/graphhacks-yt__ref1.png: OK
refs/graphhacks-yt__ref2.png: OK
refs/h-boardclerk-v04__ref1.png: OK
refs/h-boardclerk-v04__ref2.png: OK
refs/h-faultrehearsal-v1__ref1.png: OK
refs/h-faultrehearsal-v1__ref2.png: OK
refs/h-motiontracker-v3__ref1.png: OK
refs/h-motiontracker-v3__ref2.png: OK
refs/h-taint-v1__ref1.png: OK
refs/h-taint-v1__ref2.png: OK
refs/motiontracker-v1__ref1.png: OK
refs/motiontracker-v1__ref2.png: OK
refs/motiontracker-v5__ref1.png: OK
refs/motiontracker-v5__ref2.png: OK
videos/boardclerk-v04.mp4: OK
videos/boardclerk-v06.mp4: OK
videos/ciph.mp4: OK
videos/faultrehearsal-v4.mp4: OK
videos/graphhacks-yt.mp4: OK
videos/h-boardclerk-v04.mp4: OK
videos/h-faultrehearsal-v1.mp4: OK
videos/h-motiontracker-v3.mp4: OK
videos/h-taint-v1.mp4: OK
videos/motiontracker-v1.mp4: OK
videos/motiontracker-v5.mp4: OK
videos/rcv-yt.mp4: OK
videos/ref-src-faultrehearsal-v1.mp4: OK
```

| video | set | answer s | truth s | error s | hit (1.0 s) | calls | neurons | cached | skipped |
|---|---|---|---|---|---|---|---|---|---|
| motiontracker-v1 | dev | 13.633333333333333 | 13.62 | 0.01 | hit | 4 | 90.9 | 1 | 0 |

dev: 1 of 1 hit

## Run 2026-10-26T07:02:00.367Z (commit f001ffd)

Models: @cf/meta/llama-4-scout-17b-16e-instruct, then @cf/mistralai/mistral-small-3.1-24b-instruct for candidates. Cut 0.06, forced split 6 s, refine at the video frame rate. Hard stop 2800 neurons; batch total ~44.

```
ground-truth.json: OK
holdout-truth.json: OK
refs/boardclerk-v06__ref1.png: OK
refs/boardclerk-v06__ref2.png: OK
refs/ciph__ref1.png: OK
refs/ciph__ref2.png: OK
refs/faultrehearsal-v4__ref1.png: OK
refs/faultrehearsal-v4__ref2.png: OK
refs/graphhacks-yt__ref1.png: OK
refs/graphhacks-yt__ref2.png: OK
refs/h-boardclerk-v04__ref1.png: OK
refs/h-boardclerk-v04__ref2.png: OK
refs/h-faultrehearsal-v1__ref1.png: OK
refs/h-faultrehearsal-v1__ref2.png: OK
refs/h-motiontracker-v3__ref1.png: OK
refs/h-motiontracker-v3__ref2.png: OK
refs/h-taint-v1__ref1.png: OK
refs/h-taint-v1__ref2.png: OK
refs/motiontracker-v1__ref1.png: OK
refs/motiontracker-v1__ref2.png: OK
refs/motiontracker-v5__ref1.png: OK
refs/motiontracker-v5__ref2.png: OK
videos/boardclerk-v04.mp4: OK
videos/boardclerk-v06.mp4: OK
videos/ciph.mp4: OK
videos/faultrehearsal-v4.mp4: OK
videos/graphhacks-yt.mp4: OK
videos/h-boardclerk-v04.mp4: OK
videos/h-faultrehearsal-v1.mp4: OK
videos/h-motiontracker-v3.mp4: OK
videos/h-taint-v1.mp4: OK
videos/motiontracker-v1.mp4: OK
videos/motiontracker-v5.mp4: OK
videos/rcv-yt.mp4: OK
videos/ref-src-faultrehearsal-v1.mp4: OK
```

| video | set | answer s | truth s | error s | hit (1.0 s) | calls | neurons | cached | skipped |
|---|---|---|---|---|---|---|---|---|---|
| boardclerk-v06 | dev | 0 | 0 | 0 | hit | 2 | 43.9 | 0 | 0 |

dev: 1 of 1 hit

## Run 2026-10-26T07:02:35.484Z (commit f001ffd)

Models: @cf/meta/llama-4-scout-17b-16e-instruct, then @cf/mistralai/mistral-small-3.1-24b-instruct for candidates. Cut 0.06, forced split 6 s, refine at the video frame rate. Hard stop 2800 neurons; batch total ~67.

```
ground-truth.json: OK
holdout-truth.json: OK
refs/boardclerk-v06__ref1.png: OK
refs/boardclerk-v06__ref2.png: OK
refs/ciph__ref1.png: OK
refs/ciph__ref2.png: OK
refs/faultrehearsal-v4__ref1.png: OK
refs/faultrehearsal-v4__ref2.png: OK
refs/graphhacks-yt__ref1.png: OK
refs/graphhacks-yt__ref2.png: OK
refs/h-boardclerk-v04__ref1.png: OK
refs/h-boardclerk-v04__ref2.png: OK
refs/h-faultrehearsal-v1__ref1.png: OK
refs/h-faultrehearsal-v1__ref2.png: OK
refs/h-motiontracker-v3__ref1.png: OK
refs/h-motiontracker-v3__ref2.png: OK
refs/h-taint-v1__ref1.png: OK
refs/h-taint-v1__ref2.png: OK
refs/motiontracker-v1__ref1.png: OK
refs/motiontracker-v1__ref2.png: OK
refs/motiontracker-v5__ref1.png: OK
refs/motiontracker-v5__ref2.png: OK
videos/boardclerk-v04.mp4: OK
videos/boardclerk-v06.mp4: OK
videos/ciph.mp4: OK
videos/faultrehearsal-v4.mp4: OK
videos/graphhacks-yt.mp4: OK
videos/h-boardclerk-v04.mp4: OK
videos/h-faultrehearsal-v1.mp4: OK
videos/h-motiontracker-v3.mp4: OK
videos/h-taint-v1.mp4: OK
videos/motiontracker-v1.mp4: OK
videos/motiontracker-v5.mp4: OK
videos/rcv-yt.mp4: OK
videos/ref-src-faultrehearsal-v1.mp4: OK
```

| video | set | answer s | truth s | error s | hit (1.0 s) | calls | neurons | cached | skipped |
|---|---|---|---|---|---|---|---|---|---|
| motiontracker-v5 | dev | 5.3 | 0 | 5.3 | MISS | 3 | 67.4 | 0 | 0 |

dev: 0 of 1 hit

## Run 2026-10-26T07:03:05.169Z (commit f001ffd)

Models: @cf/meta/llama-4-scout-17b-16e-instruct, then @cf/mistralai/mistral-small-3.1-24b-instruct for candidates. Cut 0.06, forced split 6 s, refine at the video frame rate. Hard stop 2800 neurons; batch total ~232.

```
ground-truth.json: OK
holdout-truth.json: OK
refs/boardclerk-v06__ref1.png: OK
refs/boardclerk-v06__ref2.png: OK
refs/ciph__ref1.png: OK
refs/ciph__ref2.png: OK
refs/faultrehearsal-v4__ref1.png: OK
refs/faultrehearsal-v4__ref2.png: OK
refs/graphhacks-yt__ref1.png: OK
refs/graphhacks-yt__ref2.png: OK
refs/h-boardclerk-v04__ref1.png: OK
refs/h-boardclerk-v04__ref2.png: OK
refs/h-faultrehearsal-v1__ref1.png: OK
refs/h-faultrehearsal-v1__ref2.png: OK
refs/h-motiontracker-v3__ref1.png: OK
refs/h-motiontracker-v3__ref2.png: OK
refs/h-taint-v1__ref1.png: OK
refs/h-taint-v1__ref2.png: OK
refs/motiontracker-v1__ref1.png: OK
refs/motiontracker-v1__ref2.png: OK
refs/motiontracker-v5__ref1.png: OK
refs/motiontracker-v5__ref2.png: OK
videos/boardclerk-v04.mp4: OK
videos/boardclerk-v06.mp4: OK
videos/ciph.mp4: OK
videos/faultrehearsal-v4.mp4: OK
videos/graphhacks-yt.mp4: OK
videos/h-boardclerk-v04.mp4: OK
videos/h-faultrehearsal-v1.mp4: OK
videos/h-motiontracker-v3.mp4: OK
videos/h-taint-v1.mp4: OK
videos/motiontracker-v1.mp4: OK
videos/motiontracker-v5.mp4: OK
videos/rcv-yt.mp4: OK
videos/ref-src-faultrehearsal-v1.mp4: OK
```

| video | set | answer s | truth s | error s | hit (1.0 s) | calls | neurons | cached | skipped |
|---|---|---|---|---|---|---|---|---|---|
| rcv-yt | rcv | 53.5 | none |  | MISS (false positive: no app in this video) | 10 | 231.9 | 0 | 3 |

rcv: 0 of 1 hit

## Combined result, Oct 26 2026 (commit f001ffd)

The full run stopped at the per-visitor limit of 40 looks after graphhacks-yt (cached replays count as looks). Correction: cached answers never counted; the 40 were real model looks. The last four videos were run again on a fresh local server, one at a time. This table merges both, and it is what public/data/bench.json holds.

| video | set | answer s | truth s | error s | hit (1.0 s) | neurons |
|---|---|---|---|---|---|---|
| h-boardclerk-v04 | holdout | 0.2 | 0 | 0.2 | hit | 67.4 |
| h-motiontracker-v3 | holdout | 12.33 | 0 | 12.33 | MISS | 91.1 |
| h-taint-v1 | holdout | 22.1 | 18.33 | 3.77 | MISS | 243 |
| h-faultrehearsal-v1 | holdout | 14.13 | 9.27 | 4.86 | MISS | 161.4 |
| ciph | dev | 12.27 | 12.27 | 0 | hit | 255.4 |
| faultrehearsal-v4 | dev | 14.63 | 9.33 | 5.3 | MISS | 161.4 |
| graphhacks-yt | dev | 16.03 | 16.2 | -0.17 | hit | 175.6 |
| motiontracker-v1 | dev | 13.63 | 13.62 | 0.01 | hit | 90.9 |
| boardclerk-v06 | dev | 0 | 0 | 0 | hit | 43.9 |
| motiontracker-v5 | dev | 5.3 | 0 | 5.3 | MISS | 67.4 |
| rcv-yt | rcv | 53.5 | none |  | MISS (false positive: no app in this video) | 231.9 |

holdout: 1 of 4 hit

dev: 4 of 6 hit

rcv: 0 of 1 hit

Batch spend estimate across all runs: about 1,590 neurons (holdout 563, dev part 592, last four 435).

## Run 2026-10-26T08:24:47.741Z (commit 91a808b)

Models: @cf/meta/llama-4-scout-17b-16e-instruct, then @cf/mistralai/mistral-small-3.1-24b-instruct for candidates. Cut 0.06, forced split 6 s, refine at the video frame rate. Hard stop 2200 neurons; batch total ~1031.

```
ground-truth.json: OK
holdout-truth.json: OK
refs/boardclerk-v06__ref1.png: OK
refs/boardclerk-v06__ref2.png: OK
refs/ciph__ref1.png: OK
refs/ciph__ref2.png: OK
refs/faultrehearsal-v4__ref1.png: OK
refs/faultrehearsal-v4__ref2.png: OK
refs/graphhacks-yt__ref1.png: OK
refs/graphhacks-yt__ref2.png: OK
refs/h-boardclerk-v04__ref1.png: OK
refs/h-boardclerk-v04__ref2.png: OK
refs/h-faultrehearsal-v1__ref1.png: OK
refs/h-faultrehearsal-v1__ref2.png: OK
refs/h-motiontracker-v3__ref1.png: OK
refs/h-motiontracker-v3__ref2.png: OK
refs/h-taint-v1__ref1.png: OK
refs/h-taint-v1__ref2.png: OK
refs/motiontracker-v1__ref1.png: OK
refs/motiontracker-v1__ref2.png: OK
refs/motiontracker-v5__ref1.png: OK
refs/motiontracker-v5__ref2.png: OK
videos/boardclerk-v04.mp4: OK
videos/boardclerk-v06.mp4: OK
videos/ciph.mp4: OK
videos/faultrehearsal-v4.mp4: OK
videos/graphhacks-yt.mp4: OK
videos/h-boardclerk-v04.mp4: OK
videos/h-faultrehearsal-v1.mp4: OK
videos/h-motiontracker-v3.mp4: OK
videos/h-taint-v1.mp4: OK
videos/motiontracker-v1.mp4: OK
videos/motiontracker-v5.mp4: OK
videos/rcv-yt.mp4: OK
videos/ref-src-faultrehearsal-v1.mp4: OK
```

| video | set | answer s | truth s | error s | hit (1.0 s) | calls | neurons | cached | skipped |
|---|---|---|---|---|---|---|---|---|---|
| h-boardclerk-v04 | holdout | 0 | 0 | 0 | hit | 2 | 43.9 | 0 | 0 |
| h-motiontracker-v3 | holdout | 0 | 0 | 0 | hit | 2 | 43.9 | 0 | 0 |
| h-taint-v1 | holdout | 26.633333333333333 | 18.33 | 8.3 | MISS | 10 | 222.6 | 0 | 0 |
| h-faultrehearsal-v1 | holdout | 9.266666666666667 | 9.27 | 0 | hit | 3 | 67.4 | 0 | 3 |
| ciph | dev | 12.266666666666667 | 12.27 | 0 | hit | 7 | 161.4 | 0 | 6 |
| faultrehearsal-v4 | dev | 9.266666666666667 | 9.33 | -0.06 | hit | 3 | 67.4 | 0 | 3 |
| graphhacks-yt | dev | 15.966666666666667 | 16.2 | -0.23 | hit | 8 | 175.6 | 0 | 0 |
| motiontracker-v1 | dev | 13.633333333333333 | 13.62 | 0.01 | hit | 4 | 90.9 | 1 | 0 |
| boardclerk-v06 | dev | 0 | 0 | 0 | hit | 2 | 43.9 | 0 | 0 |
| motiontracker-v5 | dev | 5.3 | 0 | 5.3 | MISS | 3 | 67.4 | 0 | 0 |
| rcv-yt | rcv | none | none |  | hit | 2 | 47 | 0 | 14 |

dev: 5 of 6 hit

holdout: 3 of 4 hit

rcv: 1 of 1 hit
