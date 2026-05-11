// src/utils/session.js
// ── Session token — enkripsi PIN admin di URL ─────────────────

import { randomBytes } from "crypto";

const sessions = new Map();
const SESSION_TTL = 4 * 60 * 60 * 1000; // 4 jam

export const createToken = (pin) => {
  const token = randomBytes(24).toString("hex");
  sessions.set(token, { pin, exp: Date.now() + SESSION_TTL });
  return token;
};

export const verifyToken = (token) => {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.exp) {
    sessions.delete(token);
    return null;
  }
  return session.pin;
};

// Bersihkan session expired tiap 30 menit
setInterval(() => {
  for (const [key, val] of sessions) {
    if (Date.now() > val.exp) sessions.delete(key);
  }
}, 30 * 60 * 1000);
