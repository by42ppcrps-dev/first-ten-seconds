// Offline parity run: the page on every bench video with /api/look answered locally (always NO, no model).
// Saves each composite and the run summary. Usage: BASE=http://127.0.0.1:8797 PW=<playwright-core index.mjs> node bench/parity.mjs <out dir> [ids...]
import { writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
const pw = await import(process.env.PW);
const GT = process.env.GT || "/workspace/fts/gt", BASE = process.env.BASE || "http://127.0.0.1:8797";
const [outDir, ...given] = process.argv.slice(2);
const ids = given.length ? given : [...readdirSync(join(GT, "refs")).filter((f) => f.endsWith("__ref1.png")).map((f) => f.slice(0, -10)), "rcv-yt"];
const browser = await pw.chromium.launch({ executablePath: process.env.CHROME || "/usr/bin/google-chrome", headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
for (const id of ids) {
  const ref = id === "rcv-yt" ? "boardclerk-v06__ref1.png" : id + "__ref1.png";
  const out = join(outDir, id); mkdirSync(out, { recursive: true });
  const page = await browser.newPage(); let k = 0; const log = [];
  await page.route("**/api/look", async (route) => {
    const b = JSON.parse(route.request().postData()); const buf = Buffer.from(b.image.slice(23), "base64");
    const f = `c${String(k++).padStart(2, "0")}.jpg`; writeFileSync(join(out, f), buf); log.push(f);
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ app: false, llama: { ui_share: "none", headline: false, photo: false }, mistral: null, cached: true, neurons_used_estimate: 0 }) });
  });
  await page.goto(`${BASE}/?bench=1`);
  await page.setInputFiles("#video-input", join(GT, "videos", `${id}.mp4`));
  await page.setInputFiles("#ref-input", join(GT, "refs", ref));
  await page.waitForFunction(() => window.__ftsResult, null, { timeout: 900000, polling: 500 });
  const r = await page.evaluate(() => window.__ftsResult);
  writeFileSync(join(out, "result.json"), JSON.stringify({ r, log }, null, 1));
  const ms = r.compositeMs || [];
  console.log(id, r.status, r.shots, "composite ms median", ms.slice().sort((a, b) => a - b)[ms.length >> 1], "max", Math.max(...ms));
  await page.close();
}
await browser.close();
