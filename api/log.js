import {
  PEOPLE,
  MAX_RECENT_ENTRIES,
  readState,
  writeState,
  sendJson,
  parseJsonBody,
} from "./_lib/store.js";

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
    const body = await parseJsonBody(req);
    const { personId, company, country } = normalizeBody(body);

    if (!PEOPLE.includes(personId)) {
      return sendJson(res, 400, { error: "Unknown person" });
    }
    if (!company || !country) {
      return sendJson(res, 400, { error: "Company and country are required" });
    }

    const state = await readState();
    const entry = {
      company,
      country,
      timestamp: new Date().toISOString(),
    };

    const personRecord = state[personId];
    personRecord.count += 1;
    personRecord.applications.unshift(entry);
    personRecord.applications = personRecord.applications.slice(0, MAX_RECENT_ENTRIES);

    const nextState = await writeState(state);
    return sendJson(res, 200, nextState);
  } catch (error) {
    console.error("[api/log] Failed to record application", error);
    return sendJson(res, 500, { error: "Unable to save application right now" });
  }
}

function normalizeBody(body = {}) {
  return {
    personId: typeof body.personId === "string" ? body.personId.trim() : "",
    company: typeof body.company === "string" ? body.company.trim() : "",
    country: typeof body.country === "string" ? body.country.trim() : "",
  };
}
