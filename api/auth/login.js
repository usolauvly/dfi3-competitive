import { getUsers, verifyPassword, presentUser } from "../_lib/users.js";
import { createSessionToken } from "../_lib/auth.js";
import { parseJsonBody, sendJson } from "../_lib/store.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const { username, password } = await parseJsonBody(req);
    if (!username || !password) {
      return sendJson(res, 400, { error: "Username and password are required" });
    }

    const users = await getUsers();
    const user = users.find((entry) => entry.username.toLowerCase() === String(username).toLowerCase());
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return sendJson(res, 401, { error: "Invalid username or password" });
    }

    const token = createSessionToken(user.id);
    return sendJson(res, 200, {
      token,
      user: presentUser(user),
    });
  } catch (error) {
    console.error("[api/auth/login] Failed to login", error);
    if (error.message?.includes("AUTH_SECRET")) {
      return sendJson(res, 500, { error: "Server is missing AUTH_SECRET" });
    }
    return sendJson(res, 500, { error: "Unable to login right now" });
  }
}
