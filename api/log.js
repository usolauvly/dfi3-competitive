import { MAX_RECENT_ENTRIES, readState, writeState, sendJson, parseJsonBody } from "./_lib/store.js";
import { extractTokenFromRequest, verifySessionToken } from "./_lib/auth.js";
import { getUsers } from "./_lib/users.js";
import { buildPeoplePayload } from "./_lib/people.js";

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.statusCode = 204;
    return res.end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method Not Allowed" });
  }

  try {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return sendJson(res, 401, { error: "Authentication required" });
    }
    const session = verifySessionToken(token);
    if (!session) {
      return sendJson(res, 401, { error: "Invalid or expired token" });
    }

    const [users, state] = await Promise.all([getUsers(), readState()]);
    const user = users.find((entry) => entry.id === session.userId);
    if (!user) {
      return sendJson(res, 401, { error: "User not found" });
    }

    const { company, country } = normalizeBody(await parseJsonBody(req));
    if (!company || !country) {
      return sendJson(res, 400, { error: "Company and country are required" });
    }

    if (!state[user.personId]) {
      state[user.personId] = { count: 0, applications: [] };
    }
    const entry = {
      company,
      country,
      timestamp: new Date().toISOString(),
    };

    const personRecord = state[user.personId];
    personRecord.count += 1;
    personRecord.applications.unshift(entry);
    personRecord.applications = personRecord.applications.slice(0, MAX_RECENT_ENTRIES);

    const nextState = await writeState(state);
    const payload = buildPeoplePayload(nextState, users);
    return sendJson(res, 200, payload);
  } catch (error) {
    console.error("[api/log] Failed to record application", error);
    return sendJson(res, 500, { error: "Unable to save application right now" });
  }
}

function normalizeBody(body = {}) {
  return {
    company: typeof body.company === "string" ? body.company.trim() : "",
    country: typeof body.country === "string" ? body.country.trim() : "",
  };
}
