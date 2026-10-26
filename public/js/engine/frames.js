// Which real frame to show for a grid sample or a shot time, matching ffmpeg (the reference pipeline).

// ffmpeg fps=F keeps, for output sample i, the last input frame whose time is below (i + 0.5) / F.
// rate is { num, den } (the video's own frame rate). Returns that frame's index.
export function gridFrame(i, fps, rate) {
  const x = ((i + 0.5) * rate.num) / (fps * rate.den);
  return Math.max(0, Math.ceil(x - 1e-9) - 1);
}

// ffmpeg -ss t (accurate seek) shows the first frame whose start time is at or after t.
export function frameAtOrAfter(t, rate) {
  return Math.max(0, Math.ceil((t * rate.num) / rate.den - 1e-6));
}

// Seeking to the middle of a frame shows exactly that frame.
export function frameMid(index, rate) {
  return ((index + 0.5) * rate.den) / rate.num;
}
