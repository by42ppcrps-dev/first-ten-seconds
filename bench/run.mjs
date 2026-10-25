// Browser benchmark: drives the shipped page in system Chrome on every video, then scores.
// Usage: node bench/run.mjs [--base http://localhost:8787] [--set dev|holdout|rcv|all] [--only id] [--dry] [--max-neurons 4000]
//   Order is holdout, then dev, then rcv (see bench/BUDGET-PLAN.md). Once the estimated neurons for the batch
//   would pass --max-neurons, every further /api/look is answered locally with daily_cap and never reaches the model.
//   GT_DIR (default /workspace/fts/gt) holds videos/, refs/ and the truth files.
//   Truth files are read only after all runs finish, to score.
//   --dry: for a server started with AI_DISABLED=1. Checks the pipeline end to end and writes bench/out/ only.
import { readFileSync, writeFileSync, mkdirSync, appendFileSync, existsSync, readdirSync } from "node:fs";
import { execSync } from "node:child_process";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt("base", process.env.FTS_BASE || "http://localhost:8787");
const SET = opt("set", "all");
const ONLY = opt("only", null);
const DRY = args.includes("--dry");
const GT = process.env.GT_DIR || "/workspace/fts/gt";
const CHROME = process.env.CHROME || "/usr/bin/google-chrome";
const MAX_NEURONS = Number(opt("max-neurons", "4000"));
const LOOK_WORST = 160; // src/budget-core.js RESERVE: both models, both retried
let batchNeurons = 0, stopped = false;

const VIDEOS = [
  ...["h-boardclerk-v04", "h-motiontracker-v3", "h-taint-v1", "h-faultrehearsal-v1"].map((id) => ({ id, set: "holdout", ref: `${id}__ref1.png` })),
  ...["ciph", "faultrehearsal-v4", "graphhacks-yt", "motiontracker-v1", "boardclerk-v06", "motiontracker-v5"].map((id) => ({ id, set: "dev", ref: `${id}__ref1.png` })),
  { id: "rcv-yt", set: "rcv", ref: "boardclerk-v06__ref1.png" },
].filter((v) => (SET === "all" || v.set === SET) && (!ONLY || v.id === ONLY));

async function loadPlaywright() {
  try { return await import("playwright-core"); } catch {}
  const roots = [process.env.PLAYWRIGHT_CORE, ...(existsSync("/var/tmp/sand-playwright-runtime") ? readdirSync("/var/tmp/sand-playwright-runtime").map((d) => `/var/tmp/sand-playwright-runtime/${d}/node_modules/playwright-core`) : [])].filter(Boolean);
  for (const r of roots) { try { return await import(join(r, "index.mjs")); } catch {} }
  throw new Error("playwright-core not found: npm install, or set PLAYWRIGHT_CORE");
}

async function runOne(browser, v) {
  const page = await browser.newPage();
  let calls = 0, neurons = 0, errors = 0, cached = 0, held = 0;
  // Hard stop for the batch: answer locally instead of spending past the limit.
  await page.route("**/api/look", (route) => {
    if (!DRY && batchNeurons + LOOK_WORST > MAX_NEURONS) {
      stopped = true; held++;
      return route.fulfill({ status: 429, contentType: "application/json", body: JSON.stringify({ error: "daily_cap", resets_at: null }) });
    }
    return route.continue();
  });
  page.on("response", async (res) => {
    if (!res.url().endsWith("/api/look")) return;
    try {
      const b = await res.json();
      const n = b.neurons_used_estimate || 0;
      neurons += n; batchNeurons += n;
      if (b.cached) cached++;
      if (res.ok()) { if (!b.cached) calls += 1 + (b.mistral ? 1 : 0); } else errors++;
    } catch { errors++; }
  });
  const t0 = Date.now();
  await page.goto(`${BASE}/?bench=1`);
  await page.setInputFiles("#video-input", join(GT, "videos", `${v.id}.mp4`));
  await page.setInputFiles("#ref-input", join(GT, "refs", v.ref));
  await page.waitForFunction(() => window.__ftsResult, null, { timeout: 10 * 60 * 1000, polling: 500 });
  const r = await page.evaluate(() => window.__ftsResult);
  let picked = null;
  if (DRY && r.status === "error") {
    // Confirm mode check: click the first shot sampled at or after --pick-t seconds, to exercise the local refine.
    const pickT = Number(opt("pick-t", "0"));
    const shot = (await page.$$("button.shot")).length ? await page.evaluateHandle((pt) => [...document.querySelectorAll("button.shot")].find((b) => Number(b.dataset.t) >= pt) || document.querySelector("button.shot"), pickT) : null;
    if (shot) { await page.evaluate(() => { window.__ftsResult = null; }); await shot.click(); await page.waitForFunction(() => window.__ftsResult, null, { timeout: 120000 }); picked = await page.evaluate(() => window.__ftsResult); }
  }
  await page.close();
  return { id: v.id, set: v.set, ref: v.ref, status: r.status, error: r.error, answer: r.status === "found" ? r.answer : null, looks: r.looks, calls, neurons: Math.round(neurons * 10) / 10, http_errors: errors, shots: r.shots, ms: Date.now() - t0, verdicts: r.verdicts, picked, cached, held_by_hard_stop: held, skipped: (r.verdicts || []).filter((x) => x.skipped).length };
}

function truthMap() {
  const out = {};
  const dev = JSON.parse(readFileSync(join(GT, "ground-truth.json"), "utf8"));
  const hold = JSON.parse(readFileSync(join(GT, "holdout-truth.json"), "utf8"));
  for (const x of [...dev.videos, ...hold.videos]) out[x.id] = { truth: x.first_app_s, lenient: x.lenient_s ?? null };
  for (const x of dev.excluded || []) out[x.id] = { truth: null, lenient: null };
  return out;
}

const pad = (s, n) => String(s).padEnd(n);

async function main() {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  const rows = [];
  for (const v of VIDEOS) {
    process.stdout.write(`${v.id} ... `);
    try { rows.push(await runOne(browser, v)); } catch (e) { rows.push({ id: v.id, set: v.set, status: "bench_error", error: String(e.message).slice(0, 200), answer: null }); }
    const last = rows[rows.length - 1];
    if (!DRY && last.error === "model_off") { console.error("\nThe server has the model switched off (model_off). Nothing scored or written. Start it with `npm run dev`, or use --dry."); await browser.close(); process.exit(3); }
    console.log(last.status, last.answer, last.error || "", last.picked ? `picked=${last.picked.answer}` : "", `looks=${last.looks ?? ""} calls=${last.calls ?? ""} neurons~${last.neurons ?? ""} cached=${last.cached ?? ""} skipped=${last.skipped ?? ""} batch~${Math.round(batchNeurons)}${stopped ? " HARD STOP" : ""}`);
  }
  await browser.close();

  const commit = (() => { try { return execSync("git rev-parse --short HEAD", { cwd: HERE }).toString().trim(); } catch { return "unknown"; } })();
  if (DRY) {
    mkdirSync(join(HERE, "out"), { recursive: true });
    writeFileSync(join(HERE, "out", "dry.json"), JSON.stringify({ base: BASE, commit, rows }, null, 1));
    console.log("dry run written to bench/out/dry.json (not scored)");
    return;
  }

  let frozen = "";
  try { frozen = execSync("sha256sum -c --ignore-missing FROZEN.sha256", { cwd: GT }).toString().trim(); } catch (e) { console.error("FROZEN check failed, refusing to score\n" + (e.stdout || "")); process.exit(2); }
  const truth = truthMap();
  for (const r of rows) {
    const t = truth[r.id] || { truth: null };
    r.truth = t.truth;
    if (t.truth === null) { r.hit = r.answer === null; r.error_s = null; r.note = r.answer === null ? "" : "false positive: no app in this video"; }
    else { r.error_s = r.answer === null ? null : Math.round((r.answer - t.truth) * 100) / 100; r.hit = r.error_s !== null && Math.abs(r.error_s) <= 1.0; r.note = r.answer === null ? (r.error ? "no answer: " + r.error : "no app found") : ""; }
  }
  const date = new Date().toISOString();
  writeFileSync(join(HERE, "results.json"), JSON.stringify({ date, commit, base: BASE, frozen, rows }, null, 1));
  const lines = [`\n## Run ${date} (commit ${commit})`, "", `Models: @cf/meta/llama-4-scout-17b-16e-instruct, then @cf/mistralai/mistral-small-3.1-24b-instruct for candidates. Cut 0.06, forced split 6 s, refine at the video frame rate. Hard stop ${MAX_NEURONS} neurons; batch total ~${Math.round(batchNeurons)}${stopped ? " (hard stop reached)" : ""}.`, "", "```", frozen, "```", "", "| video | set | answer s | truth s | error s | hit (1.0 s) | calls | neurons | cached | skipped |", "|---|---|---|---|---|---|---|---|---|---|"];
  for (const r of rows) lines.push(`| ${r.id} | ${r.set} | ${r.answer ?? "none"} | ${r.truth ?? "none"} | ${r.error_s ?? ""} | ${r.hit ? "hit" : "MISS"}${r.note ? " (" + r.note + ")" : ""} | ${r.calls ?? ""} | ${r.neurons ?? ""} | ${r.cached ?? ""} | ${r.skipped ?? ""} |`);
  for (const s of ["dev", "holdout", "rcv"]) { const g = rows.filter((r) => r.set === s); if (g.length) lines.push(`\n${s}: ${g.filter((r) => r.hit).length} of ${g.length} hit`); }
  if (!existsSync(join(HERE, "results.md"))) writeFileSync(join(HERE, "results.md"), "# Benchmark results\n\nEvery browser run is appended. Misses are kept.\n");
  appendFileSync(join(HERE, "results.md"), lines.join("\n") + "\n");
  mkdirSync(join(HERE, "..", "public", "data"), { recursive: true });
  writeFileSync(join(HERE, "..", "public", "data", "bench.json"), JSON.stringify({ date: date.slice(0, 10), commit, rows: rows.map(({ id, set, answer, truth, hit, note }) => ({ id, set, answer, truth, hit, note })) }, null, 1));
  console.log(rows.map((r) => `${pad(r.id, 22)} ${pad(r.answer ?? "none", 7)} truth ${pad(r.truth ?? "none", 6)} ${r.hit ? "hit" : "MISS"}`).join("\n"));
}

main().catch((e) => { console.error(e); process.exit(1); });
