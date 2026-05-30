// src/middleware/auth.js
// ── Middleware: validasi session token admin ──────────────────

import jwt from "jsonwebtoken";
import { verifyToken, createToken } from "../utils/session.js";
import { setRequestWarung } from "../utils/tenant.js";
import { CONFIG } from "../config.js";

// Helper: baca cookie _frt (JWT finance role) dari header. Return payload
// atau null kalau cookie tidak ada / invalid / expired / DEPLOY_ID mismatch
// (token dari deploy sebelumnya → force re-login setelah update).
export function readFrtCookie(req) {
  const raw = req.headers.cookie || "";
  const entry = raw.split(";").map((s) => s.trim()).find((s) => s.startsWith("_frt="));
  if (!entry) return null;
  try {
    const payload = jwt.verify(decodeURIComponent(entry.slice(5)), CONFIG.JWT_SECRET);
    if (payload.boot !== CONFIG.DEPLOY_ID) return null;
    return payload;
  } catch { return null; }
}

// Cek token ?tk= dari query/body. Kalau invalid, fallback ke cookie _frt
// (owner/karyawan yang sudah login di /admin atau /operasional) — auto-issue
// session token baru lalu redirect ke URL yg sama dengan ?tk=... supaya
// navigasi sidebar berikutnya tetap konsisten. Tujuannya: owner yang sudah
// login tidak perlu input PIN lagi tiap masuk menu /admin/*.
export const requireAdmin = (req, res, next) => {
  const tk   = req.query.tk ?? req.body.tk ?? "";
  const user = verifyToken(tk);

  if (!user) {
    const frt = readFrtCookie(req);
    if (frt?.role && frt?.username) {
      const newTk = createToken({
        username:    frt.username,
        role:        frt.role,
        displayName: frt.displayName || frt.username,
        warungId:    frt.warungId || 1,
      });
      const u = new URL(req.originalUrl, "http://x");
      u.searchParams.set("tk", newTk);
      return res.redirect(u.pathname + u.search);
    }
    return res.redirect("/admin");
  }

  res.locals.tk           = tk;
  res.locals.adminUser    = user.username;
  res.locals.adminRole    = user.role;
  res.locals.adminDisplay = user.displayName || "";
  setRequestWarung(req, user.warungId);   // isi async-context tenant dari klaim token
  res.locals.warungId     = req.warungId;
  next();
};

// Alias — sudah tidak dipakai (finance pakai JWT cookie sendiri)
export const requireFinance = (_req, _res, next) => next();
