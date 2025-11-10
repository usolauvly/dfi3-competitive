import { readState, sendJson } from "./_lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const state = await readState();
    return sendJson(res, 200, state);
  } catch (error) {
    console.error("[api/state] Failed to read state", error);
    return sendJson(res, 500, { error: "Unable to read tracker state" });
  }
}
