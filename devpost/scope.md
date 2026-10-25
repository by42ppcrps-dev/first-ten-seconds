---
doc: scope
status: approved
approval: "approved by Matt in chat, Sat Oct 24 2026 11:56 PM MT ('Go with both: tighten Can I Park Here and build First Ten Seconds')"
---

> **Source and approval.** Matt was not live for this planning run. This scope is distilled from his chat with his ops agent on Oct 24 (see `learner-profile.md`). He approved the plan summarized in that chat. Lines marked **Assumption (Matt to confirm)** were not in what he saw.

# First Ten Seconds

You drop in your hackathon demo video, and it tells you the exact second your app first appears on screen, so you can cut straight to it.

## The Unique Kernel
A stopwatch for the one moment judges say they wait for: the first frame where your real, working app is the main thing on screen. Not a title card, not a slide that has a small screenshot of your app on it. You give it 1 to 3 screenshots of your app so it knows what "your app" looks like, and it hands back an edit point your video editor can open.

It is a stopwatch, not a judge. It does not score your video or predict anything.

## Who It's For
A hackathon maker with a finished demo video, about to submit. Someone like Matt: several of his past videos open on title cards, slides or B-roll for 9 to 16 seconds before the app.

Today they scrub through by eye, or never notice. Meanwhile judges like Joe Holmes and Darlyze Calixte ("Will It Ship", Oct 22 2026) are going through "thousands of these" and want to see the app "right now."

## The Core Loop
1. Drop in the demo video and 1 to 3 screenshots of the app.
2. Watch a frame strip fill red until the first frame where the app is on screen.
3. Read the big answer: "App on screen at 0:XX".
4. If it's wrong, drag the marker. It suggests, you confirm.
5. Export the cut point (EDL or FCPXML) and trim the head in DaVinci Resolve or Premiere.

**Assumption (Matt to confirm):** people come back after each re-cut to check the new version.

## Inspiration & Identity
- The edit bay and the stopwatch: a film-editor identity. Timecode, a frame strip, a timeline, a marker.
- Matt's bar, in his words: "Make sure it's not AI slop." No generic purple gradients, glassmorphism, emoji bullets, "Unlock/Supercharge/Seamless" copy or template hero sections. A distinct, intentional identity with real typography, a tight grid, plain specific copy, and real frames from real videos.
- "No cheating or hallucinating." Nothing faked anywhere.
- Copy: plain language, no em dashes.
- Reference: the judges' live review, https://youtu.be/Xh8Ie_VuA_0.

## Why This Matters to the Learner
Matt makes the demo videos for his own hackathon entries, and he has seen the cost first-hand: judges marked down a well-edited video because the app showed up at 1:15. His own openings run 9 to 16 seconds before the app. His rule for his demo videos now: the app is on screen within 5 seconds. He also runs a video editing business, so a tool that ends in an editor's edit point fits his work.

## What "Working" Looks Like
Drop in the Can I Park Here demo video with two screenshots of the app. The strip fills red through the title and the street-sign photos, and the readout says "App on screen at 0:12.3" (the hand-marked answer is 12.27 s, a crossfade). Export the EDL, open it in an editor, and the trimmed timeline starts on the app.

The "oh, that's cool" beat: the Fault Rehearsal video shows a small screenshot of the app inside its title card from 5 s. The tool has to wait for the real app at 9.3 s, and that is the test it is built to pass.

The honesty beat: true answers for 6 of Matt's real videos were hand-marked and frozen before any code ran (`gt/ground-truth.json`). Every result gets published, misses included. Kill gate: at least 5 of 6 within 1 second, or the product ships labeled "suggests, you confirm" and says so.

## The POC Boundary
In:
- Drop a video; it stays in the browser. Only small sampled frames go to the model.
- 1 to 3 reference screenshots.
- Frame strip filling red until the first app frame, and the big readout.
- Editor-style timeline with timecode and a draggable marker.
- Export the cut point as EDL or FCPXML.
- Privacy and terms pages.
- The frozen benchmark with every result published, and the kill gate.
- $0: Cloudflare Workers plus Workers AI free allowance on Matt's LumeGrid account, at a trylumegrid.com subdomain. Open source on GitHub.

**Assumption (Matt to confirm):** it checks the first 3 minutes of a video, and the tested browser is desktop Chrome.

## Later
**Assumption (Matt to confirm):** none of these were discussed. They are candidates only.
- Other moments worth a stopwatch, such as the first time the product's name is spoken.
- Paste a YouTube link instead of dropping a file.
- Tested support for Safari, Firefox and phones.

## Explicitly Cut
- **Scoring, judging or predicting winners.** Matt: pitch it as a stopwatch, not an AI judge.
- **Uploading the video to a server.** Matt: the video file never leaves the browser.
- **Paid models or services.** Matt's budget is $0.
- **Accounts, login, tracking.** **Assumption (Matt to confirm):** not in his plan, and the privacy promise is simpler without them.
- **Trimming or re-encoding the video in the browser.** **Assumption (Matt to confirm):** the user already has an editor; an edit point is enough and avoids a slow, lossy re-encode.
