import crypto from "node:crypto";
import { list, put } from "@vercel/blob";
import { readState, writeState } from "./store.js";

const USERS_STORAGE_KEY = "internship-tracker/users.json";
const BLOB_FETCH_OPTIONS = {
  access: "public",
  addRandomSuffix: false,
  contentType: "application/json",
};

const DEFAULT_USERS = [
  {
    username: "lmatador",
    firstName: "Lmatador",
    lastName: "",
    personId: "lmatador",
    password: "Lmatador",
  },
  {
    username: "delorche",
    firstName: "De",
    lastName: "Lorche",
    personId: "de-lorche",
    password: "De Lorche",
  },
  {
    username: "delmundo",
    firstName: "Del",
    lastName: "Mundo",
    personId: "del-mundo",
    password: "Del Mundo",
  },
];

export async function getUsers() {
  const blob = await getCurrentUsersBlob();
  if (!blob) {
    const defaults = createDefaultUsers();
    await putUsers(defaults);
    await ensureStateHasPeople(defaults);
    return defaults;
  }
  const payload = await fetchBlobJSON(blob);
  const users = normalizeUsers(payload);
  return users;
}

export async function saveUsers(users) {
  await putUsers(users);
}

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  if (!stored || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const testHash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
}

export function presentUser(user) {
  const displayName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.username;
  return {
    id: user.id,
    username: user.username,
    personId: user.personId,
    firstName: user.firstName,
    lastName: user.lastName,
    displayName,
    createdAt: user.createdAt,
  };
}

export function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

async function ensureStateHasPeople(users) {
  const state = await readState();
  let dirty = false;
  users.forEach((user) => {
    if (!state[user.personId]) {
      state[user.personId] = { count: 0, applications: [] };
      dirty = true;
    }
  });
  if (dirty) {
    await writeState(state);
  }
}

function createDefaultUsers() {
  return DEFAULT_USERS.map((user) => ({
    id: user.personId,
    username: user.username,
    personId: user.personId,
    firstName: user.firstName,
    lastName: user.lastName,
    passwordHash: hashPassword(user.password),
    createdAt: new Date().toISOString(),
  }));
}

function normalizeUsers(payload) {
  if (!Array.isArray(payload)) {
    return createDefaultUsers();
  }
  return payload
    .filter((user) => user && user.username && user.personId && user.passwordHash)
    .map((user) => ({
      ...user,
      id: user.id ?? user.personId,
      createdAt: user.createdAt ?? new Date().toISOString(),
    }));
}

async function putUsers(users) {
  await put(USERS_STORAGE_KEY, JSON.stringify(users), BLOB_FETCH_OPTIONS);
}

async function getCurrentUsersBlob() {
  const { blobs = [] } = await list({ prefix: USERS_STORAGE_KEY, limit: 1 });
  return blobs.find((blob) => blob.pathname === USERS_STORAGE_KEY) ?? null;
}

async function fetchBlobJSON(blob) {
  const blobUrl = blob.downloadUrl ?? blob.url;
  const headers = {};
  if (!blob.downloadUrl && process.env.BLOB_READ_WRITE_TOKEN) {
    headers.Authorization = `Bearer ${process.env.BLOB_READ_WRITE_TOKEN}`;
  }
  const response = await fetch(blobUrl, { cache: "no-store", headers });
  if (!response.ok) {
    throw new Error(`Unable to download users blob (${response.status})`);
  }
  return response.json();
}
