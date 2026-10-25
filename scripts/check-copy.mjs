// Fails on em dashes, emoji, or banned marketing words in shipped files and docs.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
const roots = ["public", "src", "README.md", "bench/run.mjs", "bench/BUDGET-PLAN.md", "bench/REPLAY.md", "bench/replay.py"];
const bad = [/—/, /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u, /\b(unlock|supercharge|seamless|effortless|revolutioni[sz]e)\b/i];
let fail = 0;
function walk(p) {
  let st; try { st = statSync(p); } catch { return; }
  if (st.isDirectory()) return readdirSync(p).forEach((f) => walk(join(p, f)));
  if (!/\.(html|js|mjs|css|md|json|py)$/.test(p)) return;
  readFileSync(p, "utf8").split("\n").forEach((line, i) => bad.forEach((re) => { if (re.test(line)) { console.log(`${p}:${i + 1}: ${re}`); fail = 1; } }));
}
roots.forEach(walk);
if (fail) process.exit(1);
console.log("copy check ok");
