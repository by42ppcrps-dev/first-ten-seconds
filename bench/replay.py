# Offline replay of logged Python verdicts through the browser's skip and reuse rules. No model calls.
# Usage: python3 -I bench/replay.py VIDEO_DIR RUN_JSON... > bench/REPLAY.md
# Rebuilds 2 fps 32x18 grids with ffmpeg the way work/bench/pipe.py does, splits shots like shots.js,
# applies isNearBlack / isNearUniform / REUSE_DIFF from grid.js and detect.js, and looks up each asked
# shot's verdict in the logs. Reads only videos and run logs, never truth files.
import json, subprocess, sys
import numpy as np

GW, GH, FPS, CUT, MAX_SHOT_S, REUSE_DIFF, CAP_S = 32, 18, 2, 0.06, 6, 0.02, 180


def grids(path):
    b = subprocess.run(["ffmpeg", "-v", "error", "-t", str(CAP_S), "-i", path, "-vf", f"fps={FPS},scale={GW}:{GH}:flags=area",
                        "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(b, np.uint8).reshape(-1, GH, GW, 3).astype(np.float32) / 255


def mad(a, b):
    return float(np.abs(a - b).mean())


def bounds(g):
    starts, forced = [0], [False]
    for i in range(1, len(g)):
        if mad(g[i], g[i - 1]) > CUT: starts.append(i); forced.append(False)
        elif (i - starts[-1]) / FPS >= MAX_SHOT_S: starts.append(i); forced.append(True)
    return starts, forced


def shots(g):
    starts, forced = bounds(g)
    out = []
    for k, s in enumerate(starts):
        end = starts[k + 1] if k + 1 < len(starts) else len(g)
        t = round(s / FPS + (0.5 if end - s >= 2 else 0), 2)
        gi = min(len(g) - 1, round(t * FPS))
        x = g[gi]
        black = x.mean() < 0.04 and x.max() < 0.12
        out.append({"k": k, "t": t, "start": s / FPS, "end": end / FPS, "forced": forced[k], "black": bool(black), "uniform": bool(not black and x.max() - x.min() < 0.1), "grid": x})
    return out


# reuse_forced=True is the P3 rule (reuse on any shot); False is the current rule (real cuts only).
def replay(sh, logged, reuse_forced):
    judged, rows = [], []
    for s in sh:
        same = None
        if reuse_forced or not s["forced"]:
            same = next((j for j in judged if mad(j["grid"], s["grid"]) < REUSE_DIFF), None)
        if s["black"] or s["uniform"]:
            rows.append((s, "skip " + ("black" if s["black"] else "uniform"), False)); app = False
        elif same:
            rows.append((s, f"reuse shot {same['k'] + 1} ({mad(same['grid'], s['grid']):.4f})", same["app"])); app = same["app"]
        else:
            # The logged look for this shot is the one sampled inside it. Python cut its last shot at its scan
            # length, so its sample time there can be 0.5 s earlier than the 3:00 scan's (rcv-yt 59.5 vs 60.0).
            hit = [t for t in logged if s["start"] <= t < s["end"]]
            if not hit:
                rows.append((s, "ask, NOT IN LOG (would need a model call)", None)); return rows, "beyond_log"
            app = logged[hit[0]] is True
            judged.append({"grid": s["grid"], "app": app, "k": s["k"]})
            rows.append((s, "ask" if hit[0] == s["t"] else f"ask (logged at {hit[0]:.2f})", logged[hit[0]]))
        if app: return rows, "found"
    return rows, "none"


def main():
    vdir, runs = sys.argv[1], sys.argv[2:]
    logs = {}
    for r in runs:
        for vid, v in json.load(open(r)).items():
            # A run whose every look errored (motiontracker-v5 in the second dev run) says nothing about YES shots.
            if any(x[1] is not None for x in v["log"]): logs.setdefault(vid, []).append((r.split("/")[-1], v))
    print("# Offline replay of the skip and reuse rules\n")
    print("No model calls. Grids rebuilt from the videos with ffmpeg (2 fps, 32x18, area scale, first 3:00), the way")
    print("`pipe.py` builds them. Each shot the new rules would still send to the model gets the verdict logged by the")
    print("Python run at the same sample time. Truth files were not read.\n")
    print("Rules replayed: black or near-uniform sample frame skips the model (counts as NO); a shot whose grid is within")
    print("0.02 mean difference of an already judged shot reuses that verdict, but only if the shot began on a real cut")
    print("(a forced 6 s split is always asked).\n")
    bad, summary = [], []
    for vid in sorted(logs):
        sh = shots(grids(f"{vdir}/{vid}.mp4"))
        for run, v in logs[vid]:
            logged = {x[0]: x[1] for x in v["log"]}
            yes_t = [t for t, x in logged.items() if x is True]
            rows, status = replay(sh, logged, reuse_forced=False)
            old_rows, old_status = replay(sh, logged, reuse_forced=True)
            inside = lambda s, t: s["start"] <= t < s["end"]
            got = rows[-1][0]["t"] if status == "found" else None
            ok = (yes_t == [] and status != "beyond_log") or (yes_t != [] and status == "found" and inside(rows[-1][0], yes_t[0]))
            old_ok = (yes_t == [] and old_status != "beyond_log") or (yes_t != [] and old_status == "found" and inside(old_rows[-1][0], yes_t[0]))
            asked = sum(1 for r in rows if r[1].startswith("ask"))
            skipped = sum(1 for r in rows if r[1].startswith("skip"))
            reused = sum(1 for r in rows if r[1].startswith("reuse"))
            summary.append((vid, run, len(v["log"]), asked, skipped, reused, yes_t[0] if yes_t else None, got, ok, old_ok))
            if not ok: bad.append((vid, run))
            print(f"## {vid} ({run})\n")
            print("| Shot | Sample t | Starts on | Rule | Logged verdict |\n|---|---|---|---|---|")
            for s, what, verdict in rows:
                print(f"| {s['k'] + 1} | {s['t']:.2f} | {'6 s split' if s['forced'] else 'cut' if s['k'] else 'start'} | {what} | {'' if not what.startswith('ask') or 'NOT IN LOG' in what else 'YES' if verdict is True else 'NO' if verdict is False else 'error'} |")
            print()
    print("## Summary\n")
    print("| Video | Run | Python looks | Asked now | Skipped | Reused | Logged YES at | New rules stop at | YES kept | YES kept with P3 rule |\n|---|---|---|---|---|---|---|---|---|---|")
    for vid, run, n, a, sk, ru, y, got, ok, old_ok in summary:
        f = lambda x: "none" if x is None else f"{x:.2f}"
        print(f"| {vid} | {run} | {n} | {a} | {sk} | {ru} | {f(y)} | {f(got)} | {'yes' if ok else 'NO'} | {'yes' if old_ok else 'NO'} |")
    print()
    print("Result: " + ("no YES shot is skipped or reused." if not bad else "YES shot lost in: " + ", ".join(f"{v} ({r})" for v, r in bad)))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
