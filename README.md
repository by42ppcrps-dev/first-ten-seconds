# First Ten Seconds

Find the first frame where your app is on screen in a demo video, then export the cut to your editor.

Live: https://fts.trylumegrid.com

## What it does
Drop a demo video and one screenshot of your app. The page reports the time and timecode of the first frame where the app fills the screen, and exports an edit that starts the timeline there, with a marker on that frame:

- CMX3600 EDL for DaVinci Resolve and Premiere Pro
- FCP7 XML (xmeml) for Premiere Pro
- FCPXML 1.9 for DaVinci Resolve and Final Cut Pro

The video stays on your computer. Only small 1024x288 pictures (your screenshot next to one frame) go to the server.

## How it works
1. The browser takes a 32x18 color snapshot twice a second over the first 3 minutes and splits the video into shots (mean change over 0.06, or every 6 s inside a long shot).
2. For each shot in order, it sends one composite. The Worker asks Llama 4 Scout to describe the right half (how much is a software screen, is there a large headline). If most or all of it is software with no headline, Mistral Small 3.1 confirms. Errors stop the search; they never count as "not the app".
3. At the first app shot, the browser steps through every real frame (at the video's own rate) between the last "not yet" time and the first "app" time and picks the first frame closer to the app.
4. When the daily budget, a visitor limit or the Cloudflare free allowance runs out, the page switches to confirm mode: click the first shot that shows your app, and step 3 still runs locally with no model calls.

## Accuracy
Browser benchmark (`bench/results.md`, misses included), Chrome running this page on every video with hit meaning within 1.0 s of a hand-marked frame: 3 of 4 holdout videos, 5 of 6 dev videos, and no time returned for rcv-yt, a video with no app. Misses: h-taint-v1 (the second model turned down the app shot at 18.5 s, answer 26.63 against 18.33) and motiontracker-v5 (a big caption over the app reads as a headline).

Caveats: eleven videos is a small test, and the holdout is no longer unseen. An earlier browser run the same day scored 1 of 4 holdout, 4 of 6 dev and a false positive on rcv-yt; those misses were studied to find the two fixes (snapshot timing now matches the reference pipeline, and composites are resized with a bicubic filter and saved at JPEG quality 0.92 to stay close to its pictures; see `bench/PARITY.md`). The color check threshold (0.5) was chosen after seeing those results, holdout included. The Python reference pipeline scored 4 of 4 holdout, 5 of 6 dev and one false positive on rcv-yt. h-taint-v1, the one holdout video the browser misses and the Python pipeline hits, has the largest remaining picture difference from the reference (`bench/PARITY.md`, table b).

## Run locally
```
npm install            # or symlink node_modules from a project that has wrangler
npm test               # unit tests, no network, plus the copy check
npm run dev:off        # site with the model switched off (confirm mode only, no AI calls)
npm run dev            # real Workers AI binding (AI_DISABLED=0); needs a Cloudflare login and spends the daily allowance
npm run bench          # with a dev server running: Chrome runs the page on every video in GT_DIR
```
The bench takes `--base <url>`, `--set dev|holdout|rcv|all`, `--only <id>` and `--dry`. A scored run stops without writing anything if the server answers `model_off`.

Deploying: `wrangler.jsonc` ships with `AI_DISABLED=1`, so a plain `npm run deploy` puts the site in pick-it-yourself mode with no model calls. Switching automatic finding on is step 2 of `bench/BUDGET-PLAN.md`.

Limits: `FTS_DAILY_CAP` neurons a day for the site (default and maximum 6,000; 0 turns automatic finding off), 40 model looks per visitor per day (cached answers have their own limit of 400 and cost nothing), 25 per video. Shots whose colors share less than half with the screenshot are answered "not the app" in the browser with no model call. Set `IP_SALT` as a secret before deploying; without it (and without `DEV=1`, which the npm dev scripts set) `/api/look` refuses to run. Answers are cached by a SHA-256 of the composite in the Budget Durable Object, so replaying a video costs no neurons.

## Planning docs
Built with the Devpost Learn AI Basics skill pack (`.agents/skills/`, `skills-lock.json`). The planning documents it produced are in `devpost/`: [scope.md](devpost/scope.md), [prd.md](devpost/prd.md), [spec.md](devpost/spec.md), plus [checklist.md](devpost/checklist.md) and [decision-log.md](devpost/decision-log.md).

## License
MIT. Fonts: Archivo and IBM Plex Mono, SIL Open Font License, self-hosted.
