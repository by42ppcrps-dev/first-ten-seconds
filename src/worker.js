import { handleLook } from "./look.js";
export { Budget } from "./budget.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/look") return handleLook(request, env);
    return env.ASSETS.fetch(request);
  },
};
