import crypto from "node:crypto";
import { sendJson } from "./store.js";

const TOKEN_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }
  return secret;
}

export function createSessionToken(userId) {
  const payload = {
    userId,
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const base = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(base).digest("base64url");
  return `${base}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token) {
    return null;
  }
  const [base, signature] = token.split(".");
  if (!base || !signature) {
    return null;
  }
  const expected = crypto.createHmac("sha256", getSecret()).update(base).digest("base64url");
  if (!timingSafeEqual(signature, expected)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(base, "base64url").toString("utf8"));
    if (!payload?.userId || typeof payload.exp !== "number") {
      return null;
    }
    if (Date.now() > payload.exp) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function extractTokenFromRequest(req) {
  const header = req.headers?.authorization || req.headers?.Authorization;
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!token || scheme.toLowerCase() !== "bearer") {
    return null;
  }
  return token;
}

export function requireAuth(res) {
  sendJson(res, 401, { error: "Authentication required" });
}

function timingSafeEqual(a, b) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(aBuf, bBuf);
}
