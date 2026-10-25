# First Ten Seconds

Find the first frame where your app is on screen in a demo video, then export the cut to your editor.

Live: https://fts.trylumegrid.com (placeholder, not deployed yet)

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
The browser benchmark will write `bench/results.md` (misses included) on its first run; it has not run yet. Until then, `/how` shows a run of an earlier version of this method in Python (before the blank-frame skip and answer reuse were added), labeled as such: 5 of 6 dev videos and 4 of 4 holdout videos within 1.0 s, one miss (motiontracker-v5, a big caption over the app) and one false positive on a video with no app (rcv-yt).

## Run locally
```
npm install            # or symlink node_modules from a project that has wrangler
npm test               # unit tests, no network, plus the copy check
npm run dev:off        # site with the model switched off (confirm mode only, no AI calls)
npm run dev            # real Workers AI binding; needs a Cloudflare login and spends the daily allowance
npm run bench          # with a dev server running: Chrome runs the page on every video in GT_DIR
```
The bench takes `--base <url>`, `--set dev|holdout|rcv|all`, `--only <id>` and `--dry`.

Limits: `FTS_DAILY_CAP` neurons a day for the site (default and maximum 6,000; 0 turns automatic finding off), 40 looks per visitor per day, 25 per video. Set `IP_SALT` as a secret before deploying; without it (and without `DEV=1`, which the npm dev scripts set) `/api/look` refuses to run. Answers are cached by a SHA-256 of the composite in the Budget Durable Object, so replaying a video costs no neurons.

## License
MIT. Fonts: Archivo and IBM Plex Mono, SIL Open Font License, self-hosted.
