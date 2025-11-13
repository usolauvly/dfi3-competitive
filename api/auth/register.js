import { parseJsonBody, sendJson, readState, writeState } from "../_lib/store.js";
import { getUsers, saveUsers, hashPassword, slugify, presentUser } from "../_lib/users.js";
import { createSessionToken } from "../_lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const { firstName, lastName, username, password } = await parseJsonBody(req);
    if (!firstName || !lastName || !username || !password) {
      return sendJson(res, 400, { error: "All fields are required" });
    }

    const users = await getUsers();
    const normalizedUsername = String(username).trim();
    const normalizedPersonId = slugify(normalizedUsername);

    if (!normalizedPersonId) {
      return sendJson(res, 400, { error: "Username must contain letters or numbers" });
    }

    if (users.some((user) => user.username.toLowerCase() === normalizedUsername.toLowerCase())) {
      return sendJson(res, 409, { error: "Username already exists" });
    }

    if (users.some((user) => user.personId === normalizedPersonId)) {
      return sendJson(res, 409, { error: "Choose a different username" });
    }

    const newUser = {
      id: normalizedPersonId,
      username: normalizedUsername,
      personId: normalizedPersonId,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      passwordHash: hashPassword(String(password)),
      createdAt: new Date().toISOString(),
    };

    const nextUsers = [...users, newUser];
    await saveUsers(nextUsers);

    await ensureStatePerson(normalizedPersonId);

    const token = createSessionToken(newUser.id);
    return sendJson(res, 201, {
      token,
      user: presentUser(newUser),
    });
  } catch (error) {
    console.error("[api/auth/register] Failed to register", error);
    if (error.message?.includes("AUTH_SECRET")) {
      return sendJson(res, 500, { error: "Server is missing AUTH_SECRET" });
    }
    return sendJson(res, 500, { error: "Unable to register right now" });
  }
}

async function ensureStatePerson(personId) {
  const state = await readState();
  if (!state[personId]) {
    state[personId] = { count: 0, applications: [] };
    await writeState(state);
  }
}
