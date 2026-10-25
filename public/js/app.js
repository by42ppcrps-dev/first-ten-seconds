// Page controller for the tool. One in-memory state; nothing is stored or uploaded except composites.
import { buildShots, detect, bracketForPick } from "./engine/detect.js";
import { rateInfo, frameAt, smpte, display, seconds, RATE_LABELS } from "./engine/timecode.js";
import { buildEDL, buildXMEML, buildFCPXML } from "./engine/export.js";
import { loadVideo, estimateFps, sample, composite, refine } from "./media/media.js";
import { look, stopMessage, LookError } from "./api.js";
import { renderTimeline } from "./timeline.js";

const $ = (id) => document.getElementById(id);
const BENCH = new URLSearchParams(location.search).has("bench");
const state = { file: null, video: null, ref: null, shots: [], thumbs: [], answer: null, source: null, fps: 30, drop: true, mode: "idle", looks: 0, neurons: 0, run: 0 };

function setStatus(text, kind = "") {
  const s = $("status");
  s.textContent = text;
  s.className = "status " + kind;
}

function readout() {
  const r = rateInfo(state.fps, state.drop);
  $("drop-toggle").hidden = !r.canDrop;
  if (state.answer === null) {
    $("readout-time").textContent = seconds(null);
    $("readout-tc").textContent = "--:--:--:--";
    $("readout-label").textContent = state.mode === "none" ? "No app found in the first 3:00" : "App on screen at";
    $("exports").hidden = true;
    return;
  }
  $("readout-time").textContent = seconds(state.answer);
  $("readout-tc").textContent = smpte(frameAt(state.answer, r), r) + "  " + r.label + " fps " + (r.drop ? "DF" : r.canDrop ? "NDF" : "");
  $("readout-label").textContent = state.source === "you" ? "App on screen at (set by you)" : "App on screen at (suggested)";
  $("exports").hidden = false;
}

function draw() {
  if (!state.video) return;
  renderTimeline($("timeline"), {
    duration: Math.min(state.video.duration, 180),
    thumbs: state.thumbs,
    shots: state.shots,
    answer: state.answer,
    pickable: state.shots.length > 0 && !["scanning", "finding", "refining"].includes(state.mode),
    onPick: pick,
  });
  readout();
}

async function pick(index) {
  if (["scanning", "finding", "refining"].includes(state.mode)) return;
  const id = state.run;
  state.mode = "refining";
  draw();
  const b = bracketForPick(state.shots, index);
  setStatus(b.answerAtZero ? "First shot picked: the app is on screen from 0:00.00." : "Finding the exact frame on your computer, between " + display(b.noT) + " and " + display(b.yesT) + ".");
  const answer = b.answerAtZero ? 0 : await refine(state.video, b.noT, b.yesT, rateInfo(state.fps));
  if (id !== state.run) return;
  state.answer = answer;
  state.source = "you";
  state.mode = "result";
  setStatus("Set by you. The exact frame was found locally with no model calls. Click another shot to change it.", "ok");
  draw();
  publish({ status: "picked" });
}

function publish(extra) {
  if (!BENCH) return;
  window.__ftsResult = { answer: state.answer, looks: state.looks, neurons: state.neurons, fps: state.fps, shots: state.shots.length, verdicts: state.verdicts || [], ...extra };
}

// A new video or screenshot cancels the scan in progress: every await checks the run id.
async function run() {
  if (!state.file || !state.ref) return;
  const id = ++state.run, file = state.file, live = () => id === state.run;
  const t0 = performance.now();
  state.answer = null; state.shots = []; state.thumbs = []; state.looks = 0; state.neurons = 0; state.verdicts = [];
  state.mode = "loading"; readout();
  if (state.video) { URL.revokeObjectURL(state.video.src); state.video.remove(); }
  try {
    state.video = await loadVideo(URL.createObjectURL(file));
  } catch {
    if (!live()) return;
    state.mode = "idle";
    setStatus("This browser cannot play that file. Try an H.264 MP4 export.", "err");
    publish({ status: "cannot_play" });
    return;
  }
  if (!live()) { state.video.remove(); return; }
  const v = state.video;
  const fps = rateInfo(await estimateFps(v)).fps;
  if (!live()) return;
  state.fps = fps;
  $("fps").value = rateInfo(state.fps).label;
  $("meta").textContent = `${file.name}  ${v.videoWidth}x${v.videoHeight}  ${display(v.duration)}`;
  state.mode = "scanning";
  const { grids, thumbs } = await sample(v, { cancelled: () => !live(), onProgress: (i, n) => { if (i % 10 === 0) setStatus(`Scanning ${display(i / 2)} of ${display(n / 2)}`); } });
  if (!live()) return;
  state.thumbs = thumbs;
  state.shots = buildShots(grids);
  state.mode = "finding";
  draw();
  const videoId = crypto.randomUUID();
  const result = await detect({
    shots: state.shots,
    look: async (shot) => {
      if (!live()) throw new LookError("cancelled");
      setStatus(`Looking at shot ${shot.index + 1} of ${state.shots.length} at ${display(shot.t)}`);
      const img = await composite(v, shot.t, state.ref);
      state.looks++;
      const r = await look(img, videoId);
      if (!live()) throw new LookError("cancelled");
      state.neurons += r.neurons_used_estimate || 0;
      return r;
    },
    refine: (noT, yesT) => { const r = rateInfo(state.fps); setStatus("Finding the exact frame at " + r.label + " fps between " + display(noT) + " and " + display(yesT) + "."); return refine(v, noT, yesT, r); },
    onShot: (shot, app) => { if (!live()) return; shot.app = app; if (app === null) shot.error = true; draw(); },
  });
  if (!live()) return;
  state.verdicts = result.verdicts;
  const ms = Math.round(performance.now() - t0);
  if (result.status === "found") {
    state.answer = result.answer; state.source = "suggested"; state.mode = "result";
    setStatus(`Found in ${state.looks} looks. Wrong shot? Click the first shot that shows your app.`, "ok");
  } else if (result.status === "none") {
    state.mode = "none";
    setStatus("No shot in the first 3:00 showed the app full screen. If it is there, click its first shot.", "err");
  } else {
    state.mode = "manual";
    setStatus(stopMessage(result.error, result.resetsAt), result.error === "daily_cap" || result.error === "ai_quota" ? "busy" : "err");
  }
  draw();
  publish({ status: result.status, error: result.error || null, ms });
}

async function loadRef(file) {
  try {
    state.ref = await createImageBitmap(file);
    $("ref-name").textContent = file.name;
  } catch {
    setStatus("That screenshot could not be read. Use a PNG or JPEG.", "err");
  }
}

function download(name, text, type) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

function exportInput() {
  const r = rateInfo(state.fps, state.drop);
  return { fileName: state.file.name, rate: r, width: state.video.videoWidth, height: state.video.videoHeight, durationFrames: Math.floor(state.video.duration * r.fps), cutFrame: frameAt(state.answer, r) };
}

function init() {
  $("fps").innerHTML = RATE_LABELS.map((l) => `<option>${l}</option>`).join("");
  $("fps").value = "30";
  $("fps").addEventListener("change", (e) => { state.fps = rateInfo(Number(e.target.value)).fps; readout(); });
  $("drop").addEventListener("change", (e) => { state.drop = e.target.checked; readout(); });
  $("video-input").addEventListener("change", (e) => { state.file = e.target.files[0] || null; $("video-name").textContent = state.file ? state.file.name : "No video"; $("example").hidden = true; $("result").hidden = false; run(); });
  $("ref-input").addEventListener("change", async (e) => { if (e.target.files[0]) await loadRef(e.target.files[0]); run(); });
  const drop = $("drop-zone");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", async (e) => {
    e.preventDefault(); drop.classList.remove("over");
    for (const f of e.dataTransfer.files) {
      if (f.type.startsWith("video/")) { state.file = f; $("video-name").textContent = f.name; $("example").hidden = true; $("result").hidden = false; }
      else if (f.type.startsWith("image/")) await loadRef(f);
    }
    if (!state.ref && state.file) setStatus("Now add one screenshot of your app.");
    run();
  });
  $("x-edl").addEventListener("click", () => download(state.file.name.replace(/\.[^.]+$/, "") + "-fts.edl", buildEDL(exportInput()), "text/plain"));
  $("x-xml").addEventListener("click", () => download(state.file.name.replace(/\.[^.]+$/, "") + "-fts.xml", buildXMEML(exportInput()), "application/xml"));
  $("x-fcpxml").addEventListener("click", () => download(state.file.name.replace(/\.[^.]+$/, "") + "-fts.fcpxml", buildFCPXML(exportInput()), "application/xml"));
  // Example built from real frames of ciph.mp4 (Can I Park Here demo), 2 fps, first 20 s.
  const thumbs = Array.from({ length: 40 }, (_, i) => `/img/strip/ciph-${String(i + 1).padStart(3, "0")}.jpg`);
  renderTimeline($("example-timeline"), { duration: 20, thumbs, answer: 368 / 30 });
}

init();
