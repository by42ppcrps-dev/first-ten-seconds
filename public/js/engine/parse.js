// Robust parse of the model's JSON. Mistral wraps it in ```json fences;
// Llama sometimes returns "false" as a string.
const SHARES = ["all", "most", "part", "none"];

export function parseDescription(response) {
  let r = response;
  if (r && typeof r === "object" && !Array.isArray(r) && typeof r.response !== "undefined") r = r.response;
  if (typeof r === "string") {
    const a = r.indexOf("{"), b = r.lastIndexOf("}");
    if (a < 0 || b <= a) return null;
    try { r = JSON.parse(r.slice(a, b + 1)); } catch { return null; }
  }
  if (!r || typeof r !== "object") return null;
  const share = typeof r.ui_share === "string" ? r.ui_share.trim().toLowerCase() : null;
  return {
    ui_share: SHARES.includes(share) ? share : null,
    headline: truthy(r.headline),
    photo: truthy(r.photo),
  };
}

function truthy(v) {
  return v === true || v === "true" || v === "True";
}

export function isCandidate(llama) {
  return !!llama && (llama.ui_share === "all" || llama.ui_share === "most") && !llama.headline;
}

export function isApp(llama, mistral) {
  return isCandidate(llama) && !!mistral && mistral.ui_share !== null && mistral.ui_share !== "none";
}
