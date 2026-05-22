// src/utils/session.js
// ── Session token — in-memory session store untuk admin ───────

import { randomBytes } from "crypto";

const sessions = new Map();
const SESSION_TTL = 4 * 60 * 60 * 1000; // 4 jam

// Buat token baru. Simpan { username, role } di in-memory store.
export const createToken = ({ username, role }) => {
  const token = randomBytes(24).toString("hex");
  sessions.set(token, { username, role, exp: Date.now() + SESSION_TTL });
  return token;
};

// Verifikasi token. Return { username, role } jika valid, null jika tidak.
export const verifyToken = (token) => {
  if (!token) return null;
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() > session.exp) {
    sessions.delete(token);
    return null;
  }
  return { username: session.username, role: session.role };
};

// Bersihkan session expired tiap 30 menit
setInterval(() => {
  for (const [key, val] of sessions) {
    if (Date.now() > val.exp) sessions.delete(key);
  }
}, 30 * 60 * 1000);
