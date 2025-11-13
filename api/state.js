import { readState, sendJson } from "./_lib/store.js";
import { getUsers } from "./_lib/users.js";
import { buildPeoplePayload } from "./_lib/people.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const [state, users] = await Promise.all([readState(), getUsers()]);
    const { people, teamTotal } = buildPeoplePayload(state, users);
    return sendJson(res, 200, { people, teamTotal });
  } catch (error) {
    console.error("[api/state] Failed to read state", error);
    return sendJson(res, 500, { error: "Unable to read tracker state" });
  }
}
