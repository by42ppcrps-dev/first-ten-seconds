# Validation batch budget (after 6 PM Mountain)

The Workers AI free allowance is 10,000 neurons a day, shared with Can I Park Here. It resets at 00:00 UTC (6 PM MDT, 5 PM MST after Nov 1). The site caps itself at 6,000 a day. This batch stops at 4,000.

## Batch

11 videos: holdout 4, dev 6, rcv 1. Run them in this order, so the holdout numbers exist even if the batch is cut short:

1. holdout: h-boardclerk-v04, h-motiontracker-v3, h-taint-v1, h-faultrehearsal-v1
2. dev: ciph, faultrehearsal-v4, graphhacks-yt, motiontracker-v1, boardclerk-v06, motiontracker-v5
3. rcv: rcv-yt

`npm run bench` already runs them in this order (`--set all`). Start the server with `npm run dev` (real AI binding, `DEV=1`).

## Hard stop: 4,000 neurons

`bench/run.mjs --max-neurons 4000` (the default) adds up `neurons_used_estimate` from every `/api/look` answer, failures included. Before each look it checks whether the batch total plus one worst-case look (160: both models, both retried) would pass 4,000. If so, the look is answered inside the browser with `daily_cap` and never reaches the Worker, the page drops to confirm mode, and the run is marked HARD STOP. The site's own 6,000 cap is the backstop.

## Estimate per video

From the Python reference runs (`work/bench/*.log`). Python called both models on every shot it looked at, so its call count is twice the shots looked at. Upper bound here = shots x 70 (25 Llama + 45 Mistral). The page calls Mistral only when Llama says "most or all software, no headline", and skips blank shots and repeats, so the real spend should be lower. The bench logs the real estimate per video (`neurons~`, `cached=`, `skipped=`) and a batch total.

| order | video | set | python calls | shots looked | upper bound (neurons) |
|---|---|---|---|---|---|
| 1 | h-boardclerk-v04 | holdout | 2 | 1 | 70 |
| 2 | h-motiontracker-v3 | holdout | 2 | 1 | 70 |
| 3 | h-taint-v1 | holdout | 8 | 4 | 280 |
| 4 | h-faultrehearsal-v1 | holdout | 10 | 5 | 350 |
| 5 | ciph | dev | 24 | 12 | 840 |
| 6 | faultrehearsal-v4 | dev | 10 | 5 | 350 |
| 7 | graphhacks-yt | dev | 8 | 4 | 280 |
| 8 | motiontracker-v1 | dev | 8 | 4 | 280 |
| 9 | boardclerk-v06 | dev | 2 | 1 | 70 |
| 10 | motiontracker-v5 | dev | 4 (18 in the second run) | 2 to 9 | 140 to 630 |
| 11 | rcv-yt | rcv | 24 | 12 | 840 |

Totals (upper bound): holdout 770, dev 1,960 to 2,450, rcv 840. All 11: 3,570 to 4,060.

Lower bound (Llama on every shot looked at, Mistral only on the shot that answers): about 51 to 58 shots x 25 + 10 x 45, so 1,725 to 1,900.

The batch fits under 4,000 unless motiontracker-v5 takes its long path and most shots are Llama candidates. If the hard stop trips, it trips on rcv-yt, which is last on purpose. Retries are charged too, so a flaky evening costs more. If `model_failed` shows up on more than two videos, stop and run the rest the next day.

The browser splits shots from a canvas downscale, not ffmpeg, so its shot count can differ from Python's. Check `looks=` against the "shots looked" column after the first two holdout videos; if it is more than double, stop and look before spending more.

## Replays are free

The Worker caches each answer under a SHA-256 of the composite JPEG. A second run of the same video in the same Chrome version sends the same pictures and costs 0 neurons.

## After the batch

This site's day total stays at or under 4,000, so Can I Park Here keeps at least 6,000 that day. The `/how` table switches to the browser run once `public/data/bench.json` is written.
