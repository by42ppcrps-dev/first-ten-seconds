# Offline replay of the skip and reuse rules

Run on 2026-10-25 by `python3 -I bench/replay.py /workspace/fts/gt/videos <run logs>` against the four Python
run logs in `work/bench` (`run-3298053.json`, `run-3303230.json`, `run-3305127.json`, `run-3309591.json`).
No model calls were made. Truth files were not read.

## Result

No logged YES shot is skipped or reused under the current rules. On all 11 videos the replay stops at the same
shot as the Python run, with the same last NO before it, so the refine bracket and the answer are unchanged.

- **The P3 rule (reuse on any shot) would have broken motiontracker-v1.** Its YES at 18.5 s is a forced 6 s split
  inside one long shot, and that grid is 0.0191 from the NO grids at 0.5, 6.5 and 12.5 s, under the 0.02 reuse
  line. The P3 rule copies the NO there and never asks. With reuse limited to shots that start on a real cut, the
  18.5 s shot is asked and the hit stays. h-taint-v1 has the same shape, but its 18.5 s grid is 0.050 to 0.061
  from the earlier ones, so it was safe under both rules.
- **The blank-frame skip never fired** on these 11 videos (0 black, 0 near-uniform sample frames).
- **Reuse fired only on rcv-yt**: shots at 39.5, 43.5 and 49.0 s start on real cuts and match earlier NO shots
  (0.0006 to 0.0091), so 3 Llama looks are saved. One of them (49.0 s) was a model error in the Python run.
  The rcv-yt false positive (YES at 59.5 s on a video with no app) is still there under the current rules,
  because it sits on a forced split. The P3 rule would have removed it, by luck, not by design.
- motiontracker-v5 uses the first dev run only; every look in the second dev run errored.

Limit: the replay uses ffmpeg's area scale for the grids, as `pipe.py` does. The browser builds them from a
canvas, so values can differ slightly. The rcv-yt last shot is sampled at 60.0 s here and at 59.5 s in the
Python log, because the Python scan stopped at 60 s and cut that shot short; the replay matches a logged look to
the shot it falls inside.

Rules replayed: black or near-uniform sample frame skips the model (counts as NO); a shot whose grid is within
0.02 mean difference of an already judged shot reuses that verdict, but only if the shot began on a real cut
(a forced 6 s split is always asked).

## boardclerk-v06 (run-3298053.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | YES |

## boardclerk-v06 (run-3309591.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | YES |

## ciph (run-3298053.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 3.00 | cut | ask | NO |
| 3 | 4.00 | cut | ask | NO |
| 4 | 5.00 | cut | ask | NO |
| 5 | 6.00 | cut | ask | NO |
| 6 | 7.00 | cut | ask | NO |
| 7 | 8.00 | cut | ask | NO |
| 8 | 9.00 | cut | ask | NO |
| 9 | 10.50 | cut | ask | NO |
| 10 | 11.50 | cut | ask | NO |
| 11 | 12.00 | cut | ask | NO |
| 12 | 13.00 | cut | ask | YES |

## ciph (run-3309591.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 3.00 | cut | ask | NO |
| 3 | 4.00 | cut | ask | NO |
| 4 | 5.00 | cut | ask | NO |
| 5 | 6.00 | cut | ask | NO |
| 6 | 7.00 | cut | ask | NO |
| 7 | 8.00 | cut | ask | NO |
| 8 | 9.00 | cut | ask | NO |
| 9 | 10.50 | cut | ask | NO |
| 10 | 11.50 | cut | ask | NO |
| 11 | 12.00 | cut | ask | NO |
| 12 | 13.00 | cut | ask | YES |

## faultrehearsal-v4 (run-3298053.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 4.50 | cut | ask | NO |
| 3 | 5.50 | cut | ask | NO |
| 4 | 9.00 | cut | ask | NO |
| 5 | 10.00 | cut | ask | YES |

## faultrehearsal-v4 (run-3309591.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 4.50 | cut | ask | NO |
| 3 | 5.50 | cut | ask | NO |
| 4 | 9.00 | cut | ask | NO |
| 5 | 10.00 | cut | ask | YES |

## graphhacks-yt (run-3298053.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 6.50 | 6 s split | ask | NO |
| 3 | 12.50 | 6 s split | ask | NO |
| 4 | 16.50 | cut | ask | YES |

## graphhacks-yt (run-3309591.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 6.50 | 6 s split | ask | NO |
| 3 | 12.50 | 6 s split | ask | NO |
| 4 | 16.50 | cut | ask | YES |

## h-boardclerk-v04 (run-3303230.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | YES |

## h-faultrehearsal-v1 (run-3303230.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 4.50 | cut | ask | NO |
| 3 | 5.50 | cut | ask | NO |
| 4 | 9.00 | cut | ask | NO |
| 5 | 10.00 | cut | ask | YES |

## h-motiontracker-v3 (run-3303230.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | YES |

## h-taint-v1 (run-3303230.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 6.50 | 6 s split | ask | NO |
| 3 | 12.50 | 6 s split | ask | NO |
| 4 | 18.50 | 6 s split | ask | YES |

## motiontracker-v1 (run-3298053.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 6.50 | 6 s split | ask | NO |
| 3 | 12.50 | 6 s split | ask | NO |
| 4 | 18.50 | 6 s split | ask | YES |

## motiontracker-v1 (run-3309591.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 6.50 | 6 s split | ask | NO |
| 3 | 12.50 | 6 s split | ask | NO |
| 4 | 18.50 | 6 s split | ask | YES |

## motiontracker-v5 (run-3298053.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 6.50 | 6 s split | ask | YES |

## rcv-yt (run-3305127.json)

| Shot | Sample t | Starts on | Rule | Logged verdict |
|---|---|---|---|---|
| 1 | 0.50 | start | ask | NO |
| 2 | 6.50 | 6 s split | ask | NO |
| 3 | 12.50 | 6 s split | ask | NO |
| 4 | 18.50 | 6 s split | ask | NO |
| 5 | 24.50 | 6 s split | ask | NO |
| 6 | 30.50 | cut | ask | NO |
| 7 | 36.50 | 6 s split | ask | NO |
| 8 | 39.50 | cut | reuse shot 1 (0.0086) |  |
| 9 | 43.50 | cut | reuse shot 6 (0.0006) |  |
| 10 | 49.00 | cut | reuse shot 1 (0.0091) |  |
| 11 | 54.00 | cut | ask | NO |
| 12 | 60.00 | 6 s split | ask (logged at 59.50) | YES |

## Summary

| Video | Run | Python looks | Asked now | Skipped | Reused | Logged YES at | New rules stop at | YES kept | YES kept with P3 rule |
|---|---|---|---|---|---|---|---|---|---|
| boardclerk-v06 | run-3298053.json | 1 | 1 | 0 | 0 | 0.50 | 0.50 | yes | yes |
| boardclerk-v06 | run-3309591.json | 1 | 1 | 0 | 0 | 0.50 | 0.50 | yes | yes |
| ciph | run-3298053.json | 12 | 12 | 0 | 0 | 13.00 | 13.00 | yes | yes |
| ciph | run-3309591.json | 12 | 12 | 0 | 0 | 13.00 | 13.00 | yes | yes |
| faultrehearsal-v4 | run-3298053.json | 5 | 5 | 0 | 0 | 10.00 | 10.00 | yes | yes |
| faultrehearsal-v4 | run-3309591.json | 5 | 5 | 0 | 0 | 10.00 | 10.00 | yes | yes |
| graphhacks-yt | run-3298053.json | 4 | 4 | 0 | 0 | 16.50 | 16.50 | yes | yes |
| graphhacks-yt | run-3309591.json | 4 | 4 | 0 | 0 | 16.50 | 16.50 | yes | yes |
| h-boardclerk-v04 | run-3303230.json | 1 | 1 | 0 | 0 | 0.50 | 0.50 | yes | yes |
| h-faultrehearsal-v1 | run-3303230.json | 5 | 5 | 0 | 0 | 10.00 | 10.00 | yes | yes |
| h-motiontracker-v3 | run-3303230.json | 1 | 1 | 0 | 0 | 0.50 | 0.50 | yes | yes |
| h-taint-v1 | run-3303230.json | 4 | 4 | 0 | 0 | 18.50 | 18.50 | yes | yes |
| motiontracker-v1 | run-3298053.json | 4 | 4 | 0 | 0 | 18.50 | 18.50 | yes | NO |
| motiontracker-v1 | run-3309591.json | 4 | 4 | 0 | 0 | 18.50 | 18.50 | yes | NO |
| motiontracker-v5 | run-3298053.json | 2 | 2 | 0 | 0 | 6.50 | 6.50 | yes | yes |
| rcv-yt | run-3305127.json | 12 | 9 | 0 | 3 | 59.50 | 60.00 | yes | NO |

Result: no YES shot is skipped or reused.
