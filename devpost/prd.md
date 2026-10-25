---
doc: prd
status: approved
approval: "approved by Matt in chat, Sat Oct 24 2026 11:56 PM MT ('Go with both: tighten Can I Park Here and build First Ten Seconds')"
---

> **What Matt saw and what he didn't.** Matt approved the plan in `scope.md`, which covers the drop-in video, 1 to 3 reference screenshots, the red frame strip, the big readout, the editor-style timeline, EDL/FCPXML export, "suggests, you confirm", the privacy rules, privacy and terms pages, the frozen benchmark with its kill gate, and $0 hosting. The detailed behavior below (exact copy, states, limits, keyboard, layout) was written in this planning run without him. Every line he did not see is marked **Assumption (Matt to confirm)**, or sits under a heading that says so.

# First Ten Seconds: Product Requirements

A stopwatch for hackathon makers: drop in your demo video and it tells you the exact second your app first appears on screen, then gives you the cut point for your editor.
Source: `scope.md > The Unique Kernel`, `scope.md > Who It's For`.

## The Core Journey
Source: `scope.md > The Core Loop`.

1. A maker opens the site and lands on the tool itself. There is no marketing page first.
2. They drop in their demo video (or choose a file). The video plays only in their browser.
3. They add 1 to 3 screenshots of their app. If they have none, they can click a frame in the strip that shows their app instead.
4. The tool scans the first 3 minutes and builds a frame strip. **Assumption (Matt to confirm):** 3 minutes.
5. It checks the video shot by shot, in time order. The strip fills red up to the first frame where the app is the main subject.
6. The big readout says "App on screen at 0:12.3", with the editor timecode at the video's frame rate under it.
7. The marker on the timeline sits at that frame. If it's wrong, they drag it, and the readout follows the marker. It suggests, you confirm.
8. They export an EDL or FCPXML, or copy a one-line cut list, and trim the head in DaVinci Resolve or Premiere.
9. Success: the trimmed timeline starts on the app.

## Screens and Layout
Matt approved the tool, a privacy page and a terms page. **Assumption (Matt to confirm):** the `/how` page, and the URL names.

- **`/` The tool.** One screen that changes state: empty, scanning, finding, result. Top bar: wordmark left, links to How it measures, Privacy, Terms on the right. Below that, from top to bottom: video preview with the reference screenshots beside it, then the big readout, then the frame strip, then the timeline with the marker, then the export row.
- **`/how` How it measures.** A plain explanation of the method, the benchmark table with every hit and miss, and the limits.
- **`/privacy`** What leaves the browser and what doesn't.
- **`/terms`** Plain terms of use.

No accounts, no login screens. **Assumption (Matt to confirm):** desktop-first. On a narrow screen everything stacks in one column and still works, but desktop Chrome is the tested browser.

## Look and Feel
Source: `scope.md > Inspiration & Identity`. Matt's direction is a film-editor and stopwatch identity that is "not AI slop," with real typography, a tight grid, plain specific copy, and real frames from real videos. The specifics below turn that into something buildable. **Assumption (Matt to confirm):** the specific colors, fonts and layout details were proposed in the planning brief and were not shown to Matt.

- **Palette:** the edit bay at night. A near-black neutral background (not purple, not blue-black), off-white text, hairline gray rules. One signal red means "not yet." One clean green, with white, means "app on screen." Nothing else gets color.
- **Type:** monospaced numerals for every timecode and time. A real grotesk or a characterful serif for headlines, self-hosted or from the system stack, so the core tool never depends on a font CDN.
- **Structure:** tight 8 px grid, hairline rules, ruler tick marks on the timeline, square corners. Dense like an editor's interface, not airy like a landing page.
- **Imagery:** only real frames from Matt's real demo videos (for `/how` and any example). No stock art, no illustrations, no fake UI.
- **Avoid:** decorative gradients, glassmorphism, emoji bullets, a template hero with three feature cards, and the words Unlock, Supercharge, Seamless, Effortless, Revolutionize.
- **Copy:** plain, specific, no em dashes. The tool states facts ("App on screen at 0:12.3"). It never praises, scores or predicts.

## Features and Behavior

### Loading a video
- As a maker, I want to drop my demo video in and have it stay on my machine, so I can check a cut without uploading it anywhere.
  - [ ] Dropping a video file on the drop zone, or choosing one with the file button, loads it into a preview within a few seconds.
  - [ ] The file name, length and frame rate appear under the preview.
  - [ ] The browser's network panel shows no request carrying the video file, at any point.
  - [ ] A file the browser can't play shows the "can't play" message from `States and Boundaries`, and the page stays usable.

### Reference screenshots
Matt approved 1 to 3 screenshots so that slides containing a screenshot of the app are not mistaken for the app.
- [ ] The maker can add 1, 2 or 3 images (PNG, JPEG or WebP). They show as small thumbnails beside the preview, each with a remove control.
- [ ] A fourth image is refused with "Up to 3 screenshots."
- [ ] With no screenshots, the strip is clickable after the scan and the page says "Click a frame that shows your app." The clicked frame becomes the reference and is marked in the strip. (This fallback was in the planning brief, not Matt's chat: **Assumption (Matt to confirm)**.)

### Scanning the video
**Assumption (Matt to confirm):** this whole section, apart from the frame strip itself.
- [ ] After a video loads, the tool samples it twice per second across the first 3 minutes (or the whole video if shorter) and shows progress as "Scanning 0:42 of 3:00".
- [ ] Scanning happens entirely in the browser. No network requests are made during it.
- [ ] When scanning finishes, the frame strip shows the sampled frames in order.

### Finding the first app frame
This is the kernel. Source: `scope.md > The Unique Kernel`.
- [ ] The tool checks the video shot by shot, in time order, and stops at the first shot where the app is the main subject of the frame.
- [ ] Title cards, slides, logos, B-roll photos, black frames, and slides containing a small screenshot of the app count as "not the app."
- [ ] A big title sitting over a dimmed app counts as "not the app." A small headline over a clearly visible app counts as the app.
- [ ] In a crossfade, the answer is the first frame where the app is the dominant layer.
- [ ] The answer is to a single frame (1/30 s for a 30 fps video).
- [ ] Each checked shot shows its verdict and a one-line reason when hovered or focused in the strip, so the maker can see why. **Assumption (Matt to confirm).**
- [ ] On the 6 frozen benchmark videos, the result is published whatever it is (see `Benchmark and the kill gate`).

### The readout
- [ ] Before a result, the readout shows dashes in the timecode style: "App on screen at -:--.-".
- [ ] With a result it shows "App on screen at 0:12.3" in large monospaced type, and the editor timecode below it: "00:00:12:08 at 30 fps".
- [ ] A label next to it says "Suggested" until the maker moves the marker, then "Set by you." **Assumption (Matt to confirm).**
- [ ] When the app is there from the first frame, the readout says "App on screen at 0:00.0" and adds "Your app is on screen from the first frame."
- [ ] Red and green are never the only signal. The words always say the state too.

### The frame strip
- [ ] The strip runs left to right across the scanned window. Every frame before the answer is filled or tinted signal red; the answer frame and everything after it are not.
- [ ] The red fill grows as shots are checked, so the maker watches it advance.
- [ ] Clicking a frame in the strip moves the video preview to that time.

### Timeline and marker
"Suggests, you confirm": Matt approved a draggable marker.
- [ ] Below the strip, an editor-style timeline shows a ruler with tick marks and timecode labels, and the shots as blocks.
- [ ] A marker sits at the suggested frame. The maker can drag it. It snaps to whole frames, and the video preview shows the frame under it while dragging.
- [ ] Left and right arrow keys move the marker one frame; Shift with an arrow moves it one second. **Assumption (Matt to confirm).**
- [ ] The readout and the red fill always follow the marker, never the original suggestion.
- [ ] A "Back to suggestion" control returns the marker to the model's frame. **Assumption (Matt to confirm).**

### Export
Matt approved exporting the cut point to DaVinci Resolve or Premiere as EDL or FCPXML. **Assumption (Matt to confirm):** the copyable cut list line, and the import details below.
- [ ] "Download EDL" saves a CMX3600 `.edl` file with one edit: the video from the marker to the end, so importing it trims the head.
- [ ] "Download FCPXML" saves an FCPXML 1.9 file with the same single edit.
- [ ] "Copy cut list" copies one plain line, for example: `ciph.mp4  trim head to 00:00:12:08 (12.27 s at 30 fps)`.
- [ ] Exports always use the marker's current position.
- [ ] Opening the EDL in DaVinci Resolve gives a timeline whose first frame is the marked frame, once the source clip is linked. Same check for Premiere with the EDL, and for Resolve with the FCPXML.

### Daily limits
Matt approved $0. **Assumption (Matt to confirm):** how the limits feel to the maker.
- [ ] The free model allowance is shared by everyone and capped per day, and each visitor has a daily share.
- [ ] When a limit is reached, the page says so in plain words (see `States and Boundaries`). The strip, the timeline, the manual marker and the exports all keep working.

### How it measures (`/how`)
**Assumption (Matt to confirm):** this page as a separate page. Its contents are Matt's honesty rules.
- [ ] Explains in plain language what the tool looks at, what it sends to the model, and how it picks the frame.
- [ ] Shows the benchmark table for the 6 frozen videos: video, true answer, tool answer, difference, hit or miss. Misses are shown in the same table as hits, not hidden or footnoted.
- [ ] States the kill gate result plainly.
- [ ] Lists the limits: first 3 minutes only, desktop Chrome tested, very short shots can be skipped, the model can be wrong, the daily budget.
- [ ] Uses real frames from Matt's videos to show one worked example.

### Privacy and terms
Matt approved terms and privacy pages and the rule that the video never leaves the browser.
- [ ] `/privacy` says exactly what leaves the browser (small images that pair one of your screenshots with one frame) and where it goes (the AI model on Cloudflare). It says that nothing is stored or logged by the app, and that there are no cookies, accounts or analytics. It also discloses any rate-limit counter.
- [ ] `/terms` says the tool is free, offered as-is, can be wrong, and is open source under a named license.

### Benchmark and the kill gate
Matt approved this rule: true answers for 6 of his past videos were hand-marked and frozen before any code ran (`gt/ground-truth.json`, frozen 2026-10-25 00:04 MT). Every result is published, misses included. Kill gate: at least 5 of 6 within 1 second, or the product ships labeled "suggests, you confirm" and says so.
- [ ] A benchmark run produces a table with every video's true answer, tool answer, difference and hit or miss, and the run's date.
- [ ] A hit means the tool's answer is within 1.0 s of the true answer.
- [ ] If fewer than 5 of 6 hit, the tool's main screen shows "Suggests, you confirm" prominently next to the readout, and `/how` says the gate was not met.
- [ ] **Assumption (Matt to confirm):** A 4-video holdout set was also frozen at 00:11 MT (`gt/holdout-truth.json`), to be run once at the end and published next to the 6. The kill gate stays on the 6 Matt approved.

## States and Boundaries
Exact copy is an **Assumption (Matt to confirm)**.

- **First use / empty.** The drop zone is the main thing on the page: "Drop your demo video here, or choose a file." Next to it: "Add 1 to 3 screenshots of your app." One line explains the tool: "Finds the second your app first appears in your demo video. A stopwatch, not a judge."
- **Scanning.** Progress line "Scanning 0:42 of 3:00". The strip fills in as frames arrive.
- **Finding.** "Checking shot 4 of 11". The red fill advances shot by shot.
- **Result.** The readout, the red strip, the marker, and the export row become active.
- **App from the first frame.** "App on screen at 0:00.0. Your app is on screen from the first frame."
- **No app found.** "No app found in the first 3:00." Below it: "If your app is there, drag the marker to it." Export works from the marker.
- **No screenshots given.** After the scan: "Click a frame that shows your app." Finding waits until they do or add a screenshot.
- **Video can't be played.** "This browser can't play this file. Try exporting it as an H.264 MP4." The drop zone resets.
- **Not a video, or too long to scan.** Not a video: "That file isn't a video." Longer than 3 minutes: the first 3 minutes are scanned and the page says so.
- **Daily budget used up.** "Today's free model budget is used up. It resets at 00:00 UTC. You can still mark the cut by hand." Manual marker and export still work.
- **This visitor's share used up.** "You've used today's share of checks. It resets at 00:00 UTC. You can still mark the cut by hand."
- **Model unavailable or slow.** After one automatic retry: "The model didn't answer. Try again, or mark the cut by hand." with a Try again button.
- **What persists.** Nothing. Closing or reloading the page clears the video, the screenshots and the result. **Assumption (Matt to confirm).**

## Product Decisions
From Matt (relayed from his chat, approved Sat Oct 24 2026, 11:56 PM MT):
- A stopwatch, not an AI judge. It does not score videos or predict winners. Why: the judges' complaint was about time to the app, and a score would be a claim the tool can't back up.
- The answer is the first frame where the app itself is the main subject. Reference screenshots (1 to 3) exist so slides with a screenshot of the app don't count.
- Output for editors: a timeline with timecode, plus EDL or FCPXML export for DaVinci Resolve or Premiere. Why: the point is to cut, not to know.
- "Suggests, you confirm": the maker can drag the marker. Why: the model can be wrong, and the maker is the editor.
- The video never leaves the browser; only small sampled frames go to the model. Terms and privacy pages.
- Honesty: frozen true answers before code, every result published, a 5-of-6-within-1-second kill gate.
- $0 on Cloudflare Workers and Workers AI, at a trylumegrid.com subdomain, open source on GitHub.
- Quality bar: "not AI slop", nothing faked, plain copy, no em dashes.

Assumptions in this PRD (Matt to confirm): the 3-minute window, the `/how` page, the click-a-frame fallback, the cut list line, keyboard nudging, "Back to suggestion", per-shot reasons, desktop-first, all exact copy, nothing persisting, and publishing the holdout set.

## What We're Building
- The tool at `/`, with every behavior under `Features and Behavior` from loading through export.
- `/how`, `/privacy`, `/terms`.
- The daily limits that keep it at $0.
- The benchmark run on the 6 frozen videos, its published table, and the kill-gate behavior.

## Deferred From the POC
- **Saving results or history.** Would need storage or accounts. Out to keep the privacy promise simple.
- **Videos longer than 3 minutes past the 3-minute mark.** A demo video that hides the app past 3:00 has a bigger problem than this tool solves.
- **Tested support for Safari, Firefox and phones.** Frame-accurate seeking differs across browsers; one tested browser is enough for the proof.
- **More reference sources** (a URL to the live app, a screen recording as the reference). Screenshots are enough to prove the idea.

## Possible Later Enhancements
- Find other moments: first spoken mention of the product, first time a result appears.
- Paste a YouTube or Devpost link.
- A batch mode for organizers checking many entries. It would still be a stopwatch, not a ranking.

## Non-Goals
- **Scoring, ranking or predicting.** Matt's rule. It's a stopwatch.
- **Editing or re-encoding the video.** The maker's editor does the cut; we hand it the edit point.
- **Uploading or storing videos.** Matt's privacy rule.
- **Accounts, login, analytics, tracking.** Not needed for a single-visit tool.
- **Paid models or services.** $0.
- **Judging the rest of the video** (pacing, audio, story). Out of the kernel and would drift toward an AI judge.

## Open Questions
- **Name and URL:** "First Ten Seconds" at `fts.trylumegrid.com`? The subdomain name is an assumption. Can wait until deploy.
- **3-minute window:** OK? Blocks `4-spec` only lightly; the spec uses 3:00 as a constant.
- **Holdout set:** publish the 4 holdout results next to the 6, run once at the end? Can wait until the benchmark step.
- **Exact copy and the `/how` page:** OK as drafted? Can be adjusted during build.
- **Roll Call Vision** (the video with no app, kept as a "should find nothing" check): no screenshots of an app exist for it, so how should it be run? Can wait.
