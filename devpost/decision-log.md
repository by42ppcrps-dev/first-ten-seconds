# Decision Log

How First Ten Seconds got decided, in order. Each entry is a real decision, with who made it. Matt's decisions come from his chat on Oct 24 2026, as recorded for this project. Planning-run proposals Matt has not confirmed yet are not listed as decisions; they are collected in `spec.md > Decisions and Open Issues`. Times are Mountain Time.

| Date | Decision | Why | Who |
|---|---|---|---|
| Thu Oct 22 2026 | Treat "time to the app" in a demo video as a real problem worth a tool. | In the Devpost live review "Will It Ship" (https://youtu.be/Xh8Ie_VuA_0), judges Joe Holmes and Darlyze Calixte marked down a well-edited video because the product appeared at 1:15: "Way too long... I have thousands of these to go through." "Show us the app right now." Matt's own past videos open 9 to 16 s before the app. | Matt |
| Sat Oct 24 2026, 11:56 PM | "Go with both: tighten Can I Park Here and build First Ten Seconds." | Two entries for the same hackathon: fix the first, and turn the lesson into a tool. | Matt |
| Sat Oct 24 2026, 11:56 PM | Pitch it as a stopwatch, not an AI judge. No scores, no predictions. | The judges' complaint was about one measurable thing. A score would be a claim the tool can't back up. | Matt |
| Sat Oct 24 2026, 11:56 PM | The user uploads 1 to 3 screenshots of their app as the reference. | So a slide or title card that contains a screenshot of the app isn't mistaken for the app. | Matt |
| Sat Oct 24 2026, 11:56 PM | Output for editors: timeline with timecode, EDL or FCPXML export for DaVinci Resolve or Premiere. | The point is to cut straight to the app, not just to know the number. | Matt |
| Sat Oct 24 2026, 11:56 PM | "Suggests, you confirm": the marker is draggable. | The model can be wrong; the maker is the editor. | Matt |
| Sat Oct 24 2026, 11:56 PM | The video file never leaves the browser; only small sampled frames go to the model. Terms and privacy pages. | Makers shouldn't have to upload unreleased work to check a cut. | Matt |
| Sat Oct 24 2026, 11:56 PM | Freeze hand-marked true answers for 6 past videos before any code runs; publish every result, misses included. Kill gate: at least 5 of 6 within 1 s, or ship labeled "suggests, you confirm" and say so. | "No cheating or hallucinating." The tool's accuracy is decided by evidence fixed in advance, not by the builder. | Matt |
| Sat Oct 24 2026, 11:56 PM | $0: Cloudflare Workers plus the Workers AI free allowance on the LumeGrid account, at a trylumegrid.com subdomain; open source on GitHub. | Budget is $0, and the same platform already runs Can I Park Here. | Matt |
| Sat Oct 24 2026 | Quality bar: "not AI slop", a film-editor / stopwatch identity, real frames from real videos, plain copy, no em dashes. | Matt's standing rule for everything he ships. | Matt |
| Sun Oct 25 2026, 00:04 | Ground truth frozen: `gt/ground-truth.json` (6 videos, 1 excluded as "should find nothing"), hashed in `gt/FROZEN.sha256`. | Carries out Matt's honesty rule before any First Ten Seconds code existed. | Build team (marking), per Matt's rule |
| Sun Oct 25 2026, 00:11 | A 4-video holdout set frozen (`gt/holdout-truth.json`), to be run once at the end; tuning uses only the 6 dev videos. | Shows whether the tool works on videos it was not tuned on. Publishing it is still for Matt to confirm. | Build team |
| Sun Oct 25 2026 | Planning docs (`scope.md`, `prd.md`, `spec.md`) written from Matt's relayed answers instead of a live interview, with every unseen detail labeled "Assumption (Matt to confirm)". | Matt did not sit through the interview live; his answers already existed in his chat. Labeling keeps the docs from putting words in his mouth. | Build team |
