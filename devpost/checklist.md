---
doc: checklist
status: approved
approval: "Matt's build instruction of Sun Oct 25 2026 (P2 build prompt) approves building now, with the measured CHANGES superseding the spec where they conflict."
---

# Build Checklist

Build mode: fast (non-interactive build session; the hands-on checkpoints below are Matt's to run)

## Slices

- [x] **1. The detector finds the first app frame on fake data**
  Becomes usable: The shipped detection module (2 fps grids, shot split, per-shot look, 30 fps refine) runs under `node --test` with a fake `/api/look`, and returns the same kind of answer the python reference pipeline does.
  Why now: This is the unique kernel. Everything else is a frame around it, so it goes first and gets tests before any UI.
  PRD ref: `prd.md > Finding the first app frame`
  Spec ref: `spec.md > Shot splitter`, `spec.md > Search`, `spec.md > Frame refiner` (superseded by the measured method in the build prompt, see Revisions)
  Build: `public/js/engine/grid.js`, `shots.js`, `detect.js`, `parse.js`; `test/detect.test.js`.
  Verify (mechanical): `node --test` passes: shot starts match pipe.py rules, first-shot app gives 0.0, refine picks the first frame closer to YES, an error stops auto mode instead of counting as NO.
  Learner check: Read `test/detect.test.js` and confirm the cases match the videos you know (slide trap, crossfade, app at frame 0).
  Commit: `Add detection engine with unit tests`

- [x] **2. The server answers one look, within budget**
  Becomes usable: `POST /api/look` with a 1024x288 JPEG runs Llama 4 Scout, then Mistral only for candidates, and refuses past the daily neuron cap or the per-visitor limits.
  Why now: The model call and the budget are the second risk. They are tested with a fake AI binding because today's allocation is used up.
  PRD ref: `prd.md > Daily limits`
  Spec ref: `spec.md > Look endpoint`, `spec.md > Budget (Durable Object)`
  Build: `src/worker.js`, `src/look.js`, `src/prompt.js`, `src/budget.js`, `wrangler.jsonc`, `test/look.test.js`.
  Verify (mechanical): `node --test` passes for bad input, cap refusal, 4006 mapping, mistral skipped when not a candidate; `wrangler dev` starts.
  Learner check: Start `npm run dev` and confirm the page loads at localhost:8787.
  Commit: `Add look endpoint and budget Durable Object`

- [x] **3. You can drop a video and get an answer, or pick the shot yourself**
  Becomes usable: The tool page loads a video and a screenshot, scans, shows shots on a tick-marked timeline, and either finds the app automatically or, when the model is unavailable, lets you click the first app shot and still refines locally.
  Why now: The core journey end to end. The fallback mode must work with zero model calls, which is the only mode testable today.
  PRD ref: `prd.md > The Core Journey`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Page controller`, `spec.md > Readout, strip and timeline widgets`, `spec.md > Look and Feel`
  Build: `public/index.html`, `public/css/fts.css`, `public/js/app.js`, `public/js/media/*.js`, example strip from ciph.mp4.
  Verify (mechanical): Playwright on system Chrome loads ciph.mp4 with the model switched off, sees the fallback message, clicks the shot, and reads a refined time near 12.27.
  Learner check: Drop ciph.mp4 with its screenshot and see where the marker lands.
  Commit: `Add tool page with auto and confirm modes`

- [x] **4. You can export the cut to your editor**
  Becomes usable: Buttons for Resolve and Premiere (CMX3600 EDL), Premiere (FCP7 XML), Resolve and Final Cut (FCPXML 1.9), each with a marker at the found frame and a trim starting there.
  Why now: The export is the reason the answer is useful; it needs exact timecode at the video's real rate.
  PRD ref: `prd.md > Export`
  Spec ref: `spec.md > Timecode`, `spec.md > Exports`
  Build: `public/js/engine/timecode.js`, `export.js`, `test/export.test.js`.
  Verify (mechanical): `node --test` passes golden checks for 29.97 DF and NDF, 30, 25, 24, 60.
  Learner check: Import each file in Resolve and Premiere (untested by the build).
  Commit: `Add EDL, FCP7 XML and FCPXML exports`

- [x] **5. The method, privacy and terms are published**
  Becomes usable: `/how`, `/privacy`, `/terms` with self-hosted fonts and a copy check.
  Why now: The accuracy table and every miss must be visible before anyone trusts the number.
  PRD ref: `prd.md > How it measures (/how)`, `prd.md > Privacy and terms`
  Spec ref: `spec.md > Static pages`, `spec.md > Copy check`
  Build: `public/how.html`, `privacy.html`, `terms.html`, `public/fonts/`, `scripts/check-copy.mjs`.
  Verify (mechanical): copy check passes; pages return 200 under `wrangler dev`.
  Learner check: Read /how and confirm it says what the tool can and cannot do.
  Commit: `Add how, privacy and terms pages`

- [ ] **6. The benchmark runs the shipped module on every video**
  Becomes usable: `npm run bench` drives Chrome against a configurable base URL, scores dev, holdout and RCV, and writes `bench/results.md` and `bench/results.json`.
  Why now: The published table must come from the browser module, not from python. It runs after 6 PM MDT when the allocation resets.
  PRD ref: `prd.md > Benchmark and the kill gate`
  Spec ref: `spec.md > Benchmark runner`
  Build: `bench/run.mjs`.
  Verify (mechanical): `node bench/run.mjs --dry` with the model off runs end to end and writes results files marked as a dry run.
  Learner check: After 6 PM, run `npm run bench` with `wrangler dev --remote` style AI access and read the table.
  Commit: `Add browser benchmark runner`

## Hands-on Checkpoints

- [ ] Early usable behavior explored (after slice 3; Matt, next session)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete, feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [ ] Learning activity complete
- [ ] Optional edit and transfer reflection addressed
- [ ] `devpost/app-map.html` generated from finished code, checked, and shown

Activity and evidence: not started
Route and stops: not started
Edit outcome: not started
Reflection: not started
Activity mode: not started

## Revisions

- Detection method replaced by the measured pipeline (32x18 RGB grids, 0.06 cut threshold plus a 6 s forced split, a describe-the-frame prompt answered by Llama then Mistral, 30 fps refine between last NO and first YES); the spec's fingerprint, drift split, binary search and yes/no prompt were not measured and the python reference scored better.
- Budget changed to a 6,000-neuron daily cap, 40 looks per visitor per day and 25 per video; the account is Workers Free (error 4006 confirmed), so the cap must also leave room for Can I Park Here.
- Exports gained FCP7 XML for Premiere and real drop-frame timecode, because Premiere does not read FCPXML and some videos run at 29.97.
- Truth files stay outside the repo in `/workspace/fts/gt`; only the bench reads them, after a run, to score.
