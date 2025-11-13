import { sendJson } from "../_lib/store.js";
import { extractTokenFromRequest, verifySessionToken } from "../_lib/auth.js";
import { getUsers, presentUser } from "../_lib/users.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return sendJson(res, 401, { error: "Authentication required" });
    }
    const payload = verifySessionToken(token);
    if (!payload) {
      return sendJson(res, 401, { error: "Invalid or expired token" });
    }
    const users = await getUsers();
    const user = users.find((entry) => entry.id === payload.userId);
    if (!user) {
      return sendJson(res, 401, { error: "User not found" });
    }
    return sendJson(res, 200, { user: presentUser(user) });
  } catch (error) {
    console.error("[api/auth/me] Failed to validate session", error);
    return sendJson(res, 500, { error: "Unable to validate session" });
  }
}
