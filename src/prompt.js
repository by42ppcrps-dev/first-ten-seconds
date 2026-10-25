// Fixed server-side prompt. The model describes the right frame; it does not judge.
// Same text as the measured probe prompt (work/probe/prompt3.txt).
export const PROMPT = `Two images side by side. LEFT is a reference screenshot of a software app. Describe only the RIGHT image.
Fields:
- "ui_share": how much of the RIGHT image is a software screen (windows, buttons, panels, lists, code, maps, charts inside an app): "all" (90%+), "most" (60-90%), "part" (under 60%), or "none".
- "headline": true if the RIGHT image has a large headline or title (letters taller than about 5% of image height) that is not part of the software screen.
- "photo": true if most of the RIGHT image is a photo or video of the real world.
JSON only: {"ui_share": "...", "headline": true|false, "photo": true|false}
`;

export const LLAMA = "@cf/meta/llama-4-scout-17b-16e-instruct";
export const MISTRAL = "@cf/mistralai/mistral-small-3.1-24b-instruct";

export function buildInput(dataUrl) {
  return {
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    temperature: 0,
    max_tokens: 120,
  };
}
