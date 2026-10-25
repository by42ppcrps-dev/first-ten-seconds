// Tick-marked timeline: ruler, frame strip, shot blocks, red fill before the app, green marker.
import { display } from "./engine/timecode.js";

const PPS = 64; // pixels per second

export function renderTimeline(root, { duration, thumbs = [], shots = [], answer = null, pickable = false, onPick = null, scanned = null }) {
  const width = Math.max(1, Math.ceil(duration * PPS));
  root.innerHTML = "";
  const track = el("div", "tl-track");
  track.style.width = width + "px";

  const ruler = el("div", "tl-ruler");
  for (let s = 0; s <= Math.floor(duration * 2); s++) {
    const t = s / 2, major = s % 2 === 0;
    const tick = el("div", major ? "tick major" : "tick");
    tick.style.left = t * PPS + "px";
    ruler.appendChild(tick);
    if (major && t % 2 === 0) {
      const lab = el("span", "tick-label", display(t).replace(/\.\d+$/, ""));
      lab.style.left = t * PPS + "px";
      ruler.appendChild(lab);
    }
  }
  track.appendChild(ruler);

  const strip = el("div", "tl-strip");
  thumbs.forEach((src, i) => {
    const img = el("img");
    img.src = src; img.alt = ""; img.loading = "lazy";
    img.style.left = (i / 2) * PPS + "px";
    strip.appendChild(img);
  });
  if (answer !== null) {
    const fill = el("div", "tl-fill");
    fill.style.width = answer * PPS + "px";
    strip.appendChild(fill);
  } else if (scanned !== null) {
    const fill = el("div", "tl-fill pending");
    fill.style.width = scanned * PPS + "px";
    strip.appendChild(fill);
  }
  track.appendChild(strip);

  if (shots.length) {
    const row = el("div", "tl-shots");
    shots.forEach((s) => {
      const b = el(pickable ? "button" : "div", "shot " + (s.app === true ? "is-app" : s.app === false ? "not-yet" : s.error ? "is-error" : ""));
      b.style.left = s.start * PPS + "px";
      b.style.width = Math.max(8, (s.end - s.start) * PPS - 1) + "px";
      b.dataset.shot = s.index;
      b.dataset.t = s.t;
      const thumb = thumbs[Math.min(thumbs.length - 1, Math.round(s.t * 2))];
      if (thumb && (s.end - s.start) * PPS >= 40) { const im = el("img"); im.src = thumb; im.alt = ""; b.appendChild(im); }
      b.appendChild(el("span", "shot-t", display(s.start)));
      if (pickable) {
        b.type = "button";
        b.title = "Shot " + (s.index + 1) + " from " + display(s.start) + ". Click if this is the first shot that shows your app.";
        b.addEventListener("click", () => onPick && onPick(s.index));
      }
      row.appendChild(b);
    });
    track.appendChild(row);
  }

  if (answer !== null) {
    const m = el("div", "tl-marker");
    m.style.left = answer * PPS + "px";
    m.appendChild(el("span", "marker-label", display(answer)));
    track.appendChild(m);
  }
  root.appendChild(track);
  if (answer !== null) root.scrollLeft = Math.max(0, answer * PPS - root.clientWidth / 2);
}

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
