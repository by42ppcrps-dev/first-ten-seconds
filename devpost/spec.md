---
doc: spec
status: approved
approval: "approved by Matt in chat, Sat Oct 24 2026 11:56 PM MT ('Go with both: tighten Can I Park Here and build First Ten Seconds')"
---

> **What Matt approved here, and what he didn't see.** Matt approved the platform: Cloudflare Workers plus Workers AI on his LumeGrid account, $0, a trylumegrid.com subdomain, the video staying in the browser with only small sampled frames sent to the model, EDL/FCPXML export, and the frozen benchmark with its kill gate. The technical facts below (Worker config, models, the 10,000-neuron free allowance, the proposed pipeline, the 2 fps sampling, the composite format) come from the planning brief written the same night. Matt did not review them. Every design detail in this spec beyond the platform is therefore an **Assumption (Matt to confirm)**, including the refinements made in this run, the limits, the file layout and the design tokens. Items still to be checked against real behavior are listed under `Verify Early in the Build`.

# First Ten Seconds: Technical Spec

## How This Works, In Plain Language
There are two pieces.

**The page in your browser does almost all the work.** It plays your video in a hidden video player and takes a small snapshot twice a second, for the first 3 minutes. For each snapshot it computes a **fingerprint**: a tiny 16 by 9 grid of brightness values plus a count of which colors appear. Two frames that look alike have close fingerprints; a hard cut makes the fingerprint jump. Using those jumps, the page splits the video into **shots**.

**A small server program on Cloudflare (a Worker) answers one question.** For each shot, in time order, the page builds one small picture: your app screenshot on the left, a frame from that shot on the right. It sends that picture to the Worker. The Worker asks a vision model on Cloudflare (Workers AI): "Is the right-hand image showing this app as the main subject?" The model answers yes or no with a short reason. The first "yes" shot is where the app appears.

Then the page narrows it down to the exact frame by itself, with no more model calls. It steps frame by frame between the last "no" snapshot and the first "yes" snapshot, and picks the first frame that looks more like the "yes" frame than the "no" frame. That handles crossfades: the answer is the first frame where the app is the stronger layer.

The video file itself never leaves your computer. Only those small side-by-side pictures (about 1024 by 288 pixels) go to the Worker, and the Worker doesn't save them.

Cloudflare gives a free daily allowance of AI usage, measured in "neurons" (10,000 a day). The Worker counts what it spends and stops before the allowance runs out, so the project never gets a bill. The counter lives in a **Durable Object**, Cloudflare's name for a tiny always-available program with its own small storage, which is used here as a shared tally.

Why this shape: the browser can see every frame for free, but it can't tell a slide with a screenshot of your app from your app. The model can tell them apart, but each question costs part of the free allowance. So the cheap local work narrows the video down to a handful of shots, the model answers only those, and the cheap local work finds the exact frame.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.

```
 your computer (browser)                                     Cloudflare
 ┌──────────────────────────────────────────────┐          ┌──────────────────────────────┐
 │ video file ──> <video> (object URL, local)   │          │ Worker  POST /api/look       │
 │    │                                         │          │   check image                │
 │    ├─ scan: 2 snapshots/s, first 3:00        │          │   Budget (Durable Object):   │
 │    │    fingerprint each, thumbnail for strip│          │     daily neuron cap,        │
 │    ├─ split into shots (cuts + slow drift)   │  1 small │     per-visitor share        │
 │    ├─ for each shot, in order:               │  JPEG    │   Workers AI vision model    │
 │    │    composite = screenshot | frame  ─────┼─────────>│     Llama 4 Scout, fallback  │
 │    │    <──── {app_on_screen, reason} ───────┼──────────│     Mistral Small 3.1        │
 │    ├─ first YES: narrow to a snapshot pair   │          │   returns yes/no + reason    │
 │    ├─ refine to the exact frame (local)      │          │   stores nothing             │
 │    └─ readout, strip, timeline, marker,      │          └──────────────────────────────┘
 │       EDL / FCPXML / cut list (local files)  │
 └──────────────────────────────────────────────┘
```

1. The maker drops a video. `media/video.js` makes a local object URL and loads it into a hidden `<video>`; nothing is uploaded. It reads duration and size and estimates the frame rate (`prd.md > Loading a video`).
2. They add 1 to 3 screenshots. `engine/fingerprint.js` fingerprints each one (`prd.md > Reference screenshots`).
3. `media/sampler.js` seeks to 0.0, 0.5, 1.0 s and so on up to 180 s. It saves a thumbnail and a fingerprint at each step and pushes them into the strip as they arrive (`prd.md > Scanning the video`).
4. `engine/segments.js` groups the snapshots into shots. With no screenshots, the page asks the maker to click a frame; that frame becomes the reference.
5. `engine/search.js` walks the shots in time order. For each shot, `media/composite.js` draws the best-matching screenshot next to the shot's middle frame, and `api.js` POSTs it to `/api/look`. The strip's red fill advances after each answer (`prd.md > Finding the first app frame`, `prd.md > The frame strip`).
6. The Worker (`src/worker.js` then `src/look.js`) checks the image and reserves budget in `src/budget.js`. It calls the model with the fixed question from `src/prompt.js`, checks the JSON, and settles the real cost. It returns `{ app_on_screen, reason, model }` or a plain error code.
7. At the first YES shot, `engine/search.js` binary-searches the snapshots between the previous NO and that shot (a few more looks) to get the last NO snapshot and first YES snapshot, 0.5 s apart.
8. `media/refine.js` steps through the roughly 15 frames between them, fingerprints each, and picks the first frame that is closer to YES than to NO and isn't near-black. No network calls.
9. `ui/readout.js`, `ui/strip.js` and `ui/timeline.js` show the answer and place the marker. Dragging the marker updates everything (`prd.md > The readout`, `prd.md > Timeline and marker`).
10. `engine/export.js` writes the EDL, FCPXML or cut list from the marker's frame and timecode, and the browser downloads it (`prd.md > Export`).

## Stack
**Assumption (Matt to confirm)** for each choice below except Cloudflare Workers and Workers AI, which Matt approved.

- **Cloudflare Workers with static assets** (approved by Matt). One Worker serves `public/` and one API route. Same shape as Can I Park Here, but new code. Docs: https://developers.cloudflare.com/workers/static-assets/
- **Workers AI** (approved by Matt), through the `AI` binding. Primary model `@cf/meta/llama-4-scout-17b-16e-instruct`, fallback `@cf/mistralai/mistral-small-3.1-24b-instruct` (both confirmed available in a probe). Calls use `messages` with an `image_url` data URL and `response_format: json_schema`, the same call pattern Can I Park Here's `src/read-signs.js` uses with these two models. Docs: https://developers.cloudflare.com/workers-ai/ , models: https://developers.cloudflare.com/workers-ai/models/
- **Durable Objects (SQLite-backed)** for the daily budget counter. Why: the count must be exact and shared across all Cloudflare locations. Workers KV is eventually consistent, and its free write limit would itself be a cap. The built-in Rate Limiting binding only counts per 10 or 60 seconds, per location. Tradeoff: one more Cloudflare feature to learn, but no extra account or key. Docs: https://developers.cloudflare.com/durable-objects/
- **Plain JavaScript ES modules, HTML and CSS. No framework, no bundler, no build step.** Why: one screen with a few custom widgets (strip, timeline, marker). A framework adds setup without helping the kernel. It also keeps the code readable to someone reviewing an agent's work.
- **Browser APIs:** `<video>`, `requestVideoFrameCallback` (to confirm which frame is actually shown after a seek), `<canvas>` 2D, `canvas.toBlob('image/jpeg')`. Docs: https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement/requestVideoFrameCallback
- **Wrangler 4** (CLI for local dev and deploy). Docs: https://developers.cloudflare.com/workers/wrangler/
- **Node 22 `node:test`** for unit tests of the pure modules, with no test framework. Docs: https://nodejs.org/api/test.html
- **Playwright 1.64 driving the system Google Chrome** (`channel: "chrome"`, `/usr/bin/google-chrome` is on the box) for the benchmark. Why the system Chrome: Playwright's bundled headless shell (`chromium_headless_shell-1248` on the box) is an open-source build and probably can't decode H.264, which 5 of the 6 videos use. Docs: https://playwright.dev/docs/browsers

## Where It Runs and How Someone Tries It
- **Local:** `npm install`, then `npx wrangler login` once, then `npm run dev` (`wrangler dev`), and open http://localhost:8787. The AI binding always calls the real Workers AI, even locally, so local runs spend the same daily allowance and need Matt's Cloudflare login. The Durable Object runs locally. Put a local `IP_SALT` in `.dev.vars` (gitignored).
- **Tests:** `npm test` (no network).
- **Benchmark:** with `npm run dev` running, `npm run bench` (see `Benchmark Runner`). Needs the videos at `GT_DIR` (default `../gt`).
- **Deploy (optional; Matt runs it, never this agent unasked):** `npx wrangler secret put IP_SALT`, then `npm run deploy`, then attach the custom domain `fts.trylumegrid.com` in the Cloudflare dashboard under Workers > Settings > Domains. **Assumption (Matt to confirm):** the subdomain name.
- **Submission:** a public GitHub repo (account `by42ppcrps-dev`) and a short demo video. Matt's rule: the app is on screen within 5 seconds. Suggested recording: open the deployed site, drop in `ciph.mp4` with its two screenshots, show the strip filling red and the readout landing at 0:12.3, drag the marker one frame, export the EDL and open it in Resolve. End on `/how` with the full table, misses included.

## Look and Feel
Carries forward `prd.md > Look and Feel` and `scope.md > Inspiration & Identity`. The tokens are starting values. **Assumption (Matt to confirm):** specific hex values and fonts.

- **Color tokens** (CSS custom properties in `public/css/fts.css`):
  - `--bg #0e0f10` near-black neutral. `--panel #16181a`. `--rule #2a2d30` hairlines. `--text #e9e7e3` off-white. `--dim #8b9095` secondary text.
  - `--not-yet #ff453a` signal red, used only for "before the app": the strip fill, the "not yet" verdict ticks, and the pre-answer readout dashes.
  - `--on-screen #3ddc84` clean green, used only for the marker, the answer frame and "app" verdict ticks. White is used for the readout numerals.
  - Check every text use against the background for at least 4.5:1 contrast. Red and green fills always come with words.
- **Type:** timecodes and all numbers in a monospace with tabular figures. Recommended: IBM Plex Mono, self-hosted woff2 (OFL), falling back to `ui-monospace, "SF Mono", Menlo, Consolas, monospace`. Headlines and UI in a grotesk. Recommended: Archivo (variable, OFL; the narrow widths suit an edit-bay label style), self-hosted, falling back to `system-ui, -apple-system, "Segoe UI", sans-serif`. Fonts live in `public/fonts/` and nothing loads from a CDN. The readout is the largest thing on the page, around 96 px, in mono.
- **Grid and lines:** 8 px spacing unit, 1 px hairline rules, 0 border radius, no shadows, no blur, no gradients. The timeline ruler has major ticks every second and minor ticks every 5 frames when zoomed. Labels are small caps or uppercase mono at 11 to 12 px with letter spacing.
- **Layout:** desktop-first, centered column up to 1280 px. Tool order as in `prd.md > Screens and Layout`. Below 900 px everything stacks.
- **Imagery:** only real frames exported from Matt's videos in `gt/videos` (for `/how`), saved as `public/img/*.jpg`. The empty state shows no fake example.
- **Copy:** plain, specific, sentence case, no em dashes, none of Unlock, Supercharge, Seamless, Effortless, Revolutionize. A check script (`scripts/check-copy.mjs`) fails the build on any of those words, on em dashes in `public/`, or on emoji in `public/`.
- **Motion:** the strip fill advancing shot by shot, and nothing else. No decorative animation. Respect `prefers-reduced-motion`.

## Components

### Worker router
`src/worker.js`. Static files in `public/` are served before the Worker runs. The Worker handles only `POST /api/look`; any other path returns 404. `/how`, `/privacy` and `/terms` map to `how.html`, `privacy.html` and `terms.html` through static-assets HTML handling. Sets `cache-control: no-store` on API responses. Exports the `Budget` Durable Object class.
PRD ref: `prd.md > Screens and Layout`.

### Look endpoint
`src/look.js`. Request: `POST /api/look`, JSON `{ "image": "data:image/jpeg;base64,..." }`.
1. Refuse anything that isn't POST (405), has a body over 256 KB (413), isn't a JPEG data URL (400 `not_an_image`), or isn't 1024 px wide when its JPEG header is read (400 `wrong_size`). The question is fixed server-side and callers can't send a prompt, so the endpoint is useless as a general free vision API.
2. Refuse if the `Origin` header isn't the site's own origin, or localhost in dev (403). This is a speed bump, not security.
3. Hash the visitor IP (`CF-Connecting-IP`) as SHA-256(IP + UTC date + `IP_SALT`), truncated. Ask `Budget` to reserve one look.
4. Call the primary model with a 20 s timeout. On error, timeout or invalid JSON, call the fallback model once.
5. Validate `{ app_on_screen: boolean, reason: string }` and cut `reason` to 120 characters. Settle the real neuron cost with `Budget`.
6. Respond `{ app_on_screen, reason, model, ms }`, or `{ error }` with 429 (`daily_cap`, `visitor_cap`) or 502 (`model_failed`).
Never logs or stores the image. Worker observability stays off, as in Can I Park Here.
PRD ref: `prd.md > Finding the first app frame`, `prd.md > Daily limits`, `prd.md > Privacy and terms`.

### The question (prompt)
`src/prompt.js`. A system prompt and a JSON schema. The wording carries the ground-truth definition, so the tool and the benchmark judge by the same rule:
- "The image has two halves. LEFT: a screenshot of a software app. RIGHT: one frame from that app's demo video. Answer true only if the RIGHT half's main subject is that same app's working interface, filling most of the frame. A cursor, zoom, small caption or headline over a clearly visible app is still true. Answer false for title cards, slides, logos, photos or B-roll, diagrams, black or nearly black frames, a big title over a dimmed or blurred app, and a slide or title card that contains a smaller screenshot of the app. Judge the main subject of the frame."
- Schema: `{ app_on_screen: boolean, reason: string (max 120 chars) }`. `temperature: 0`, `max_tokens: 120`.
- A probe tonight used a one-word YES/NO version of this question on the same 1024x288 composites. If JSON output proves unreliable for either model, fall back to that format and record the change in `Decisions and Open Issues`.
PRD ref: `prd.md > Finding the first app frame`.

### Budget (Durable Object)
`src/budget.js`. One SQLite-backed Durable Object per UTC day (`idFromName("2026-10-25")`), so each day starts at zero and old days can be cleared.
- Table `totals(day TEXT PRIMARY KEY, neurons REAL)` and table `visitors(hash TEXT PRIMARY KEY, looks INTEGER)`.
- `reserve(hash)`: refuses with `daily_cap` if `neurons + RESERVE > DAILY_NEURON_CAP`, or `visitor_cap` if `looks >= VISITOR_LOOKS_PER_DAY`. Otherwise it adds `RESERVE` neurons and 1 look and returns ok. Durable Objects handle one request at a time, so two visitors can't both slip past the cap.
- `settle(actual)`: swaps the reservation for the measured cost (from the model's `usage` tokens and per-model neuron rates). If usage is missing, the reservation stands.
- Starting constants (**Assumption (Matt to confirm)**): `DAILY_NEURON_CAP = 8000`, 80% of the 10,000 free allowance, leaving room for estimate error. `RESERVE = 60` neurons, kept until measured in `Verify Early in the Build`. `VISITOR_LOOKS_PER_DAY = 60`, which is roughly 4 to 8 videos.
- An alarm deletes the previous day's object storage, so visitor hashes are kept for at most about a day.
PRD ref: `prd.md > Daily limits`.

### Video source
`public/js/media/video.js`. Loads the `File` into a hidden `<video muted playsinline>` through `URL.createObjectURL`. Exposes `seekToTime(t)` and `seekToFrame(i, fps)`, which seeks to `(i + 0.5) / fps` and resolves on `requestVideoFrameCallback` with the frame's actual `mediaTime`. It estimates the frame rate by playing about 0.5 s muted and taking the median gap between presented frames, then snapping to 23.976, 24, 25, 29.97, 30, 50, 59.94 or 60. The detected rate shows under the preview with a small select to change it. Also detects a file the browser can't decode (`error` event or no `loadedmetadata` within 10 s).
PRD ref: `prd.md > Loading a video`.

### Sampler
`public/js/media/sampler.js`. Seeks to every 0.5 s from 0 up to `min(duration, 180)`. At each step it draws the frame to a 160x90 canvas, keeps a small JPEG blob URL as the strip thumbnail, and computes the fingerprint. It reports progress per snapshot. It keeps no full-size frames, since 360 full frames would use hundreds of MB. Larger frames are re-grabbed by seeking when needed.
PRD ref: `prd.md > Scanning the video`.

### Fingerprint
`public/js/engine/fingerprint.js` (pure, unit-tested). Input: RGBA pixels at 160x90. Output: `{ grid: Float32Array(144) }` (16x9 mean luma, 0 to 1), `hist: Float32Array(64)` (4 levels per RGB channel, normalized), and `meanLuma` and `stdLuma`. `distance(a, b) = 0.5 * mean(|grid diff|) + 0.5 * (1 - histogram intersection)`, which runs 0 to 1. `isNearBlack(f) = meanLuma < 0.06 && stdLuma < 0.03`. References are letterboxed to 16:9 before fingerprinting so they compare fairly with frames.
PRD ref: `prd.md > Finding the first app frame`.

### Shot splitter
`public/js/engine/segments.js` (pure, unit-tested). This refines the proposed pipeline. A new shot starts at snapshot k when either:
- **cut:** `distance(k, k-1) > CUT` (start value 0.25), or
- **drift:** `distance(k, first snapshot of the current shot) > DRIFT` (start value 0.20). This catches fades, a title sliding off over the app, and dips to black, which never jump between two snapshots but change a lot over a few seconds. Without it, the Taint + Receipts opening (a big title over a dimmed app, title gone by about 16.2 s) could be one long shot judged by a single frame.
Each shot records its first and last snapshot, and its representative: the middle snapshot, which avoids transition frames at the edges.
PRD ref: `prd.md > Finding the first app frame`.

### Composite builder
`public/js/media/composite.js`. Picks the reference screenshot with the smallest fingerprint distance to the shot's representative. It draws that screenshot (letterboxed) into the left 512x288 and the frame into the right 512x288 of a 1024x288 canvas, the same format probed tonight. It encodes JPEG at quality 0.82 (about 40 to 60 KB) and returns a data URL.
PRD ref: `prd.md > Reference screenshots`, `prd.md > Privacy and terms`.

### Search
`public/js/engine/search.js` (pure, unit-tested with a fake `look()`). Given shots and an injected `look(snapshotIndex)`:
1. Walk the shots in time order. Near-black representatives count as NO without a look. Otherwise look at the representative. After every answer, emit progress so the strip fill advances.
2. Stop at the first YES shot S.
3. Bracket: if S is the first shot and its first snapshot (t = 0) is YES, the answer is 0.0 and there is nothing to refine. Otherwise binary-search with looks over the snapshots from S's first snapshot to its representative, to find the first YES snapshot Y. The last NO snapshot N is the one just before. That costs at most about log2 of the shot's length extra looks, usually 1 to 3.
4. Hard stop at `MAX_LOOKS_PER_VIDEO = 40` (**Assumption (Matt to confirm)**), then "No app found" with the manual marker.
Returns `{ status: "found" | "none" | "stopped", N, Y, verdicts[] }`. Each verdict records the shot, time, YES/NO, reason and model, for the hover reasons and the benchmark.
PRD ref: `prd.md > Finding the first app frame`, `prd.md > The frame strip`.

### Frame refiner
`public/js/media/refine.js`. Between snapshot N and snapshot Y (0.5 s, about 15 frames at 30 fps), it seeks each frame with `seekToFrame`, fingerprints it at 160x90, and returns the first frame `i` where `distance(f_i, f_Y) < distance(f_i, f_N)` and `!isNearBlack(f_i)`. If none qualifies, it returns Y's frame. This matches the ground truth's crossfade rule ("first frame where the app is the dominant layer") and puts a dip through black on the app side of the dip.
PRD ref: `prd.md > Finding the first app frame`.

### Timecode
`public/js/engine/timecode.js` (pure, unit-tested). `frameAt(t, fps) = floor(t * fps + 1e-6)`. `display(t)` gives "0:12.3" (m:ss.t). `smpte(frame, fps)` gives "00:00:12:08", non-drop-frame, counting at the rounded rate for 29.97 and 59.94, labeled "NDF". Golden check: ciph at 12.27 s and 30 fps gives frame 368, "00:00:12:08", "0:12.3".
PRD ref: `prd.md > The readout`.

### Exports
`public/js/engine/export.js` (pure, golden-file tests). All three take `{ fileName, fps, width, height, durationFrames, cutFrame }`.
- **EDL (CMX3600):** `TITLE:` line, `FCM: NON-DROP FRAME`, one event `001  AX  AA/V  C  <src in> <src out> <rec in> <rec out>`, then `* FROM CLIP NAME: <fileName>`. Source in = cut frame, source out = end of file, record in = 01:00:00:00. This assumes the file's own timecode starts at 00:00:00:00, which holds for screen recordings and most exports. `/how` says so.
- **FCPXML 1.9:** one `format` (frameDuration `1/30s` or `1001/30000s`, width, height), one `asset` with `<media-rep kind="original-media" src="file:///<fileName>">`, and one `sequence` whose `spine` holds one `asset-clip` with `offset="0s" start="<cut>/<rate>s" duration="<rest>/<rate>s"`. The browser can't know the file's folder, so the editor asks to relink on import, and `/how` says so.
- **Cut list line:** `<fileName>  trim head to <smpte> (<seconds> s at <fps> fps)`.
- Which editor reads what (to verify, see below): EDL for Premiere Pro and DaVinci Resolve; FCPXML 1.9 for DaVinci Resolve and Final Cut Pro. As far as I know, Premiere imports the older FCP 7 XML and not FCPXML. If that holds, the export row labels say "EDL (Premiere, Resolve)" and "FCPXML (Resolve, Final Cut Pro)" so nobody is promised an import that fails. Matt's approved plan said "DaVinci Resolve / Premiere (EDL or FCPXML)", and the EDL covers both.
PRD ref: `prd.md > Export`.

### API client
`public/js/api.js`. POSTs the composite. Retries once on network error or 502. Maps 429 `daily_cap` and `visitor_cap` and the final 502 to the plain messages in `prd.md > States and Boundaries`. These errors switch the page to manual mode; they never throw away the strip or the marker.
PRD ref: `prd.md > Daily limits`, `prd.md > States and Boundaries`.

### Page controller
`public/js/app.js`. Owns the one in-memory state object (see `Data Model`) and moves through `empty`, `loaded`, `scanning`, `need_reference`, `finding`, `result`, `manual`. Wires inputs, drag-and-drop, keyboard shortcuts and the kill-gate label (reads `public/data/bench.json`). With `?bench=1` in the URL it also exposes the final result on `window.__ftsResult` for the benchmark. It is the same pipeline with a read-only hook, not a separate code path.
PRD ref: `prd.md > The Core Journey`.

### Readout, strip and timeline widgets
`public/js/ui/readout.js`, `public/js/ui/strip.js`, `public/js/ui/timeline.js`. The readout handles big time, timecode, and the Suggested or Set by you label. The strip handles thumbnails, the red fill up to the marker, verdict ticks with hover and focus reasons, click to seek, and click to choose a reference. The timeline handles the ruler, shot blocks and the draggable marker (pointer events, snaps to frames, arrow keys, Shift+arrow, Back to suggestion). All three render from state, so dragging the marker updates the readout, the fill and the exports together.
PRD ref: `prd.md > The readout`, `prd.md > The frame strip`, `prd.md > Timeline and marker`.

### Static pages
`public/index.html`, `public/how.html`, `public/privacy.html`, `public/terms.html`, with shared `public/css/fts.css`. `/how` renders the benchmark table from `public/data/bench.json` with a plain HTML fallback table written by the benchmark runner, so it works without JavaScript. It also shows one worked example with real frames from `ciph.mp4` and links to `bench/results.md` on GitHub for every run.
PRD ref: `prd.md > How it measures (/how)`, `prd.md > Privacy and terms`.

### Benchmark runner
`bench/run.mjs`. Implements `prd.md > Benchmark and the kill gate`.
1. Runs `sha256sum -c --ignore-missing gt/FROZEN.sha256` first and refuses to score if any truth file changed. The check output goes into the report.
2. Launches Playwright with `channel: "chrome"`. For each of the 6 videos in `gt/ground-truth.json`, it opens `http://localhost:8787/?bench=1`, sets the file inputs to the video and its two `gt/refs/<id>__ref*.png`, and waits for `window.__ftsResult` (5-minute timeout per video).
3. Scores each: `error = tool - first_app_s`, hit if `|error| <= 1.0`. Records `lenient_s` where present as context only, never as a hit.
4. Appends a run to `bench/results.md`: date, git commit, models used, constants (`CUT`, `DRIFT` and so on), looks and estimated neurons per video, a table with every video (hit or miss), the total, and the kill-gate verdict. Earlier runs are never deleted.
5. Writes `public/data/bench.json` (latest dev run, run count, gate verdict) for `/how` and the kill-gate label.
6. `npm run bench -- --holdout` runs the 4 holdout videos once, writes them to `results.md` and `bench.json` under their own heading, and refuses to run a second time unless forced with a logged reason. **Assumption (Matt to confirm)**, see `prd.md > Benchmark and the kill gate`.
Roll Call Vision (`rcv-yt`, excluded, "should find nothing") is not run, because no app screenshots exist for it. **Open question.**
Cost: about 6 to 15 looks per video, so roughly 40 to 90 looks per dev run. That is a fraction of the daily cap, but bench runs and public visitors share it, so run the benchmark off-peak and count runs.

### Copy check
`scripts/check-copy.mjs`. Scans `public/**/*.{html,js,css}` for em dashes, emoji, and the banned words. Part of `npm test`.
PRD ref: `prd.md > Look and Feel`.

## Data Model
Nothing about a video is stored anywhere except in the open tab's memory.

- **Page state** (in `app.js`, memory only, gone on reload):
  ```
  { phase, file: {name, size, duration, width, height}, fps, fpsSource: "detected"|"chosen",
    refs: [{ name, bitmap, fp }],            // 1..3, or one picked from the strip
    samples: [{ t, thumbUrl, fp }],          // every 0.5 s, up to 360
    shots: [{ first, last, rep }],           // indexes into samples
    verdicts: [{ shot, sample, t, yes, reason, model }],
    suggestedFrame, markerFrame, markerMovedByUser, error }
  ```
  Thumbnail blob URLs are revoked when a new video loads.
- **Budget** (Durable Object storage, one object per UTC day): `totals(day, neurons)`, `visitors(hash, looks)`. No images, no raw IPs, no URLs, no user agents. Deleted the next day.
- **Benchmark results** (repo files): `bench/results.md` (append-only, every run) and `public/data/bench.json` (latest run).
- **Ground truth** (repo, read-only): `gt/ground-truth.json`, `gt/holdout-truth.json`, `gt/FROZEN.sha256`, `gt/refs/`. Videos stay out of git.

## File Structure

```
app/
├── wrangler.jsonc            # Worker "first-ten-seconds": main src/worker.js, assets ./public,
│                             #   ai binding AI, durable_objects binding BUDGET (class Budget, SQLite
│                             #   migration), observability off
├── package.json              # scripts: dev, test, bench, deploy. devDeps: wrangler, playwright
├── .dev.vars.example         # IP_SALT=... (real .dev.vars is gitignored)
├── LICENSE                   # open source; MIT like Can I Park Here (Assumption, Matt to confirm)
├── README.md                 # what it is, how to run, the benchmark result with misses
├── src/                      # runs on Cloudflare
│   ├── worker.js             # router: POST /api/look only; exports Budget
│   ├── look.js               # check image, reserve budget, call model with fallback, validate
│   ├── prompt.js             # the fixed question + JSON schema
│   └── budget.js             # Budget Durable Object: daily neuron cap, per-visitor daily share
├── public/                   # static files served as-is
│   ├── index.html            # the tool (/)
│   ├── how.html              # /how: method, full benchmark table, limits
│   ├── privacy.html
│   ├── terms.html
│   ├── css/fts.css           # tokens + layout (Look and Feel)
│   ├── fonts/                # self-hosted woff2 + OFL license files
│   ├── img/                  # real frames from Matt's videos, for /how
│   ├── data/bench.json       # written by bench/run.mjs
│   └── js/
│       ├── app.js            # page controller and state
│       ├── api.js            # POST /api/look, error mapping
│       ├── engine/           # pure logic, no DOM, unit-tested in Node
│       │   ├── fingerprint.js
│       │   ├── segments.js
│       │   ├── search.js
│       │   ├── timecode.js
│       │   └── export.js
│       ├── media/            # browser-only: <video> and <canvas>
│       │   ├── video.js
│       │   ├── sampler.js
│       │   ├── composite.js
│       │   └── refine.js
│       └── ui/
│           ├── readout.js
│           ├── strip.js
│           └── timeline.js
├── test/                     # node --test, no network
│   ├── fingerprint.test.js
│   ├── segments.test.js
│   ├── search.test.js        # fake look(): slide trap, frame-0 app, no app, 40-look stop
│   ├── timecode.test.js
│   ├── export.test.js        # golden EDL + FCPXML for ciph at frame 368
│   └── look.test.js          # Worker: bad input, budget refusals, fallback model (fake AI binding)
├── bench/
│   ├── run.mjs               # Playwright + system Chrome over gt videos
│   └── results.md            # every run, appended, hits and misses
├── scripts/
│   └── check-copy.mjs        # em dashes, emoji, banned words in public/
├── gt/                       # copied unchanged from /workspace/fts/gt (no videos)
│   ├── ground-truth.json
│   ├── holdout-truth.json
│   ├── FROZEN.sha256
│   └── refs/
└── devpost/                  # planning docs (learner-profile.md is gitignored)
```

Recommendation for `5-build`: make the first commit contain only `devpost/` (minus the profile) and the unchanged `gt/` truth files, before any code. Git history will then show the answers existed before the detector did.

## External Services and Dependencies
- **Workers AI** via `env.AI.run(model, input)`.
  - Input: `{ messages: [ {role:"system", content: PROMPT}, {role:"user", content:[{type:"text", text:"LEFT: app screenshot. RIGHT: video frame."}, {type:"image_url", image_url:{url: dataUrl}}]} ], response_format:{type:"json_schema", json_schema: SCHEMA}, temperature:0, max_tokens:120 }`.
  - Output: `{ response: <object or JSON string>, usage?: {prompt_tokens, completion_tokens} }`.
  - Auth: the `AI` binding, so there are no keys in code.
  - Cost: free up to 10,000 neurons per day. Neuron rates per model are on the pricing page and must be copied into `budget.js` at build time: https://developers.cloudflare.com/workers-ai/platform/pricing/
  - Limits: https://developers.cloudflare.com/workers-ai/platform/limits/
- **Durable Objects** (SQLite backend): binding `BUDGET`, plus a `migrations` entry with `new_sqlite_classes: ["Budget"]` in `wrangler.jsonc`. Free-plan availability and limits: https://developers.cloudflare.com/durable-objects/platform/pricing/
- **Cloudflare custom domain** `fts.trylumegrid.com` on Matt's LumeGrid zone: https://developers.cloudflare.com/workers/configuration/routing/custom-domains/
- **Wrangler secret** `IP_SALT`: https://developers.cloudflare.com/workers/configuration/secrets/
- **Playwright** (dev only): https://playwright.dev/docs/api/class-browsertype#browser-type-launch
- **Fonts** (dev-time download, then self-hosted): IBM Plex Mono https://github.com/IBM/plex , Archivo https://github.com/Omnibus-Type/Archivo . Both under the SIL Open Font License.

No other services. No analytics, no font CDN, no error tracker.

## Important Failure Modes
- **The model says YES to a slide that contains a screenshot of the app** (the Fault Rehearsal trap) → wrong early answer. Defense: the "main subject" prompt, a reference screenshot to compare against, and the benchmark catching it. The marker is draggable, and if the gate fails, "Suggests, you confirm" goes prominent.
- **Budget or model unavailable** (daily cap, visitor share, both models fail) → plain message from `prd.md > States and Boundaries`. The strip, timeline, manual marker and exports keep working.
- **The browser can't decode the file, or seeks land on the wrong frame** (HEVC in Chrome on some systems, variable frame rate like `motiontracker-v1`, AV1 like `graphhacks-yt`) → "can't play" message, and frame identity is confirmed through `requestVideoFrameCallback`. The fps select lets the maker fix a wrong guess.
- **Shots shorter than 0.5 s can fall between snapshots** → the app could be found one shot late. Bounded by the binary search and frame refine within the found shot; listed as a limit on `/how`.

## What Was Simplified and Why
**Assumption (Matt to confirm)** for each.
- **One question per shot, at the shot's middle frame**, instead of asking about every snapshot. Keeps a video to about 6 to 15 looks inside the free allowance. Asking about every snapshot would cost 360 looks per video.
- **Local fingerprint for the exact frame** instead of more model calls. The last 0.5 s is decided by "closer to YES or to NO," which is cheap, deterministic and matches the crossfade rule.
- **Stop at the first YES** instead of checking the whole video. The product only needs the first appearance.
- **Edit point only** instead of trimming the video in the browser. The maker's editor does the cut with no re-encode.
- **First 3 minutes, desktop Chrome tested.** Keeps scanning time and browser differences out of the proof.
- **Budget counter in one Durable Object per day** instead of accounts or API keys. It is exact and private, and nothing persists past a day.

## Verify Early in the Build
None of these were looked up or tested in this planning run. Each needs a check in the first build steps.
1. **Chrome decodes the benchmark files under Playwright:** H.264 (5 videos) and AV1 (`graphhacks-yt`) with `channel: "chrome"`. Also confirm the bundled headless shell does not, to justify the choice.
2. **Frame-accurate seeking:** `seekToFrame` lands on the intended frame on `ciph.mp4` around 12.13 to 12.37 s, compared against ffmpeg-extracted frames, and on the variable-rate `motiontracker-v1`.
3. **Model call shape:** Llama 4 Scout and Mistral Small 3.1 both return valid `{app_on_screen, reason}` JSON for a 1024x288 composite with `json_schema`, and both return `usage`.
4. **Neuron cost per look:** measure from `usage` and the pricing page, then set `RESERVE` and confirm `DAILY_NEURON_CAP` math.
5. **Durable Objects on Matt's plan:** SQLite-backed Durable Objects are available on his account (Free or Paid; unknown).
6. **Static assets routing:** `/how` serves `how.html` with the default HTML handling.
7. **Editor imports:** the EDL opens in DaVinci Resolve and Premiere with the head trimmed, and the FCPXML 1.9 opens in Resolve. This needs Matt's machine.

## Decisions and Open Issues

**Matt's decisions** (relayed, approved Sat Oct 24 2026, 11:56 PM MT): Cloudflare Workers plus Workers AI on the LumeGrid account at $0; trylumegrid.com subdomain; open source on GitHub (`by42ppcrps-dev`); the video never leaves the browser and only small sampled frames go to the model; EDL/FCPXML export; draggable marker; frozen benchmark, published misses, 5-of-6-within-1-second kill gate; the quality and copy bar.

**From the planning brief, not seen by Matt** (Assumption, Matt to confirm): the Worker config shape, the two models, the 10,000-neuron allowance, 2 fps sampling over 3 minutes, fingerprints for cuts and reference matching, the 1024 px composite, `{app_on_screen, reason}` JSON, frame-level refine, click-a-frame fallback, CMX3600 and FCPXML 1.9, the four pages, the design tokens, and `fts.trylumegrid.com`.

**Added in this planning run** (Assumption, Matt to confirm):
- Drift splitting in addition to cut splitting, for fades and titles over a dimmed app.
- A near-black rule: black frames are never the answer, and dark shots skip the model.
- A sample-level binary search inside the first YES shot, before the frame-level refine, because the shot's middle frame isn't its first.
- Durable Object budget with an 8,000-neuron daily cap, a 60-look visitor share, a 40-look per-video stop, and a salted, day-scoped IP hash disclosed on `/privacy`.
- A fixed server-side question with a size-checked image, so the endpoint can't be used as a free general vision API.
- Playwright on the system Chrome.
- Export labels matching what each editor can import, and the Premiere/FCPXML caveat.
- Holdout run once with its own heading; first commit holds only the truth files and planning docs.
- No framework or build step; `node:test`; a copy-check script.
- Fonts: IBM Plex Mono and Archivo, self-hosted. MIT license.

**One useful unknown.** Matt's kill gate is his own stated uncertainty: can a free vision model find the first app frame within 1 second on real videos, including a crossfade, a dip to black, a title over a dimmed app and a slide with a screenshot of the app? The agreed investigation is the frozen benchmark. The evidence is `bench/results.md`, with every run and every miss, and the gate decides how prominent "Suggests, you confirm" is.

**Open questions for Matt** (none block starting the build; the constants are easy to change):
1. Is the LumeGrid Cloudflare account on Workers Free or Paid? On Paid, AI usage past the allowance bills, so the cap is the only guard. On Free, Cloudflare also stops at the allowance.
2. Subdomain `fts.trylumegrid.com`, and the name First Ten Seconds?
3. Limits: 8,000 neurons a day, 60 looks per visitor per day, 40 per video, first 3 minutes. OK?
4. Publish the 4-video holdout next to the 6, run once at the end?
5. Can the repo include `gt/refs/` (screenshots from your videos) and frames on `/how`? The videos themselves stay out of git.
6. Roll Call Vision "should find nothing" check: skip it, or supply something to use as its reference?
7. MIT license, like Can I Park Here?
8. Fonts: IBM Plex Mono for timecode plus Archivo for headlines, or a serif you prefer?
9. Who checks the EDL/FCPXML import in Resolve and Premiere? It needs your machine.
