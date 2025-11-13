import { put, list } from "@vercel/blob";

const STORAGE_KEY = "internship-tracker/state.json";
const BLOB_OPTIONS = {
  access: "public",
  addRandomSuffix: false,
  contentType: "application/json",
};
export const PEOPLE = ["lmatador", "de-lorche", "del-mundo"];
export const MAX_RECENT_ENTRIES = 30;

export function createDefaultState() {
  return PEOPLE.reduce((acc, personId) => {
    acc[personId] = { count: 0, applications: [] };
    return acc;
  }, {});
}

export function normalizeState(raw = {}) {
  const normalized = {};

  const assign = (personId, payload = {}) => {
    const applications = Array.isArray(payload.applications) ? payload.applications : [];
    normalized[personId] = {
      count:
        typeof payload.count === "number"
          ? payload.count
          : Math.max(applications.length, normalized[personId]?.count ?? 0),
      applications: applications
        .filter((entry) => entry && entry.company && entry.country)
        .slice(0, MAX_RECENT_ENTRIES)
        .map((entry) => ({
          company: String(entry.company).trim(),
          country: String(entry.country).trim(),
          timestamp: entry.timestamp ?? new Date().toISOString(),
        })),
    };
  };

  PEOPLE.forEach((personId) => {
    if (raw[personId]) {
      assign(personId, raw[personId]);
    } else if (!normalized[personId]) {
      normalized[personId] = { count: 0, applications: [] };
    }
  });

  Object.entries(raw).forEach(([personId, payload]) => {
    if (!payload) return;
    assign(personId, payload);
  });

  return normalized;
}

export async function readState() {
  try {
    const blob = await getCurrentBlob();
    if (!blob) {
      return createDefaultState();
    }
    const blobUrl = blob.downloadUrl ?? blob.url;
    if (!blobUrl) {
      throw new Error("State blob missing accessible URL");
    }
    const headers = {};
    if (!blob.downloadUrl && process.env.BLOB_READ_WRITE_TOKEN) {
      headers.Authorization = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
    }
    const response = await fetch(blobUrl, { cache: "no-store", headers });
    if (!response.ok) {
      throw new Error(`Unable to download blob (${response.status})`);
    }
    const payload = await response.json();
    return normalizeState(payload);
  } catch (error) {
    console.warn("Falling back to empty state due to blob read failure", error);
    return createDefaultState();
  }
}

export async function writeState(nextState) {
  const normalized = normalizeState(nextState);
  await put(STORAGE_KEY, JSON.stringify(normalized), BLOB_OPTIONS);
  return normalized;
}

async function getCurrentBlob() {
  const { blobs = [] } = await list({ prefix: STORAGE_KEY, limit: 1 });
  return blobs.find((blob) => blob.pathname === STORAGE_KEY) ?? null;
}

export function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

export function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1e6) {
        req.connection.destroy();
        reject(new Error("Payload too large"));
      }
    });
    req.on("end", () => {
      if (!data) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(data));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
