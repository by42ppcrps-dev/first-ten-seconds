# Validation batch budget (after 6 PM Mountain)

The Workers AI free allowance is 10,000 neurons a day, shared with Can I Park Here. It resets at 00:00 UTC (6 PM MDT, 5 PM MST after Nov 1). The site caps itself at `FTS_DAILY_CAP` neurons a day (default 6,000, never more than 6,000; 0 turns automatic finding off and the page shows the busy state). This batch stops at 4,000.

The batch runs on `npm run dev`, which uses a local Durable Object, so its spend never reaches the production counter. The production cap has to be lowered by hand for that UTC day (see "Production on the bench day" below).

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

## Production on the bench day

The bench UTC day runs from 6 PM MDT Oct 25 to 6 PM MDT Oct 26 (00:00 UTC Oct 26 to 00:00 UTC Oct 27).

1. Until the 6 PM batch finishes, production runs with `AI_DISABLED=1`, which is the committed default in `wrangler.jsonc`, so a plain `npm run deploy` always ships with the model off. Visitors get confirm mode; cached answers still work. No production neurons are spent.
2. When the batch ends, read the real spend for the day from the Workers AI usage page in the Cloudflare dashboard (the bench total in `bench/results.md` is only an estimate; use the higher of the two). Deploy with `FTS_DAILY_CAP = max(0, 6000 - batch spend)` and `AI_DISABLED=0` for the rest of that UTC day, with an explicit command: `npx wrangler deploy --var AI_DISABLED:0 --var FTS_DAILY_CAP:<n>`. Example: a 3,800 batch gives a cap of 2,200. If the batch spent 6,000 or more, the cap is 0 and the page shows the busy state.
3. After the next 00:00 UTC: `npx wrangler deploy --var AI_DISABLED:0 --var FTS_DAILY_CAP:6000`. Any later plain `npm run deploy` (for example a copy fix) switches the model off again, so repeat the explicit command after it.

Bench plus production then stay at or under 6,000 on the bench day, so Can I Park Here always keeps at least 4,000. On every other day the site alone stays at or under 6,000.

## After the batch

Check the highest per-call neuron cost in the bench log. `RESERVE` in `src/budget-core.js` (160 = 2 x (30 + 50)) assumes at most 30 per Llama call and 50 per Mistral call. If any call cost more, raise those two numbers to the highest seen, and correct the "about 25 / 45" figures on `/how`. Until then the last look of a day can pass the cap by a few tens of neurons. The `/how` table switches to the browser run once `public/data/bench.json` is written.
