// src/middleware/auth.js
// ── Middleware: validasi session token admin ──────────────────

import { verifyToken } from "../utils/session.js";

// Cek token ?tk= dari query atau body. Set res.locals.tk, adminUser, adminRole.
export const requireAdmin = (req, res, next) => {
  const tk   = req.query.tk ?? req.body.tk ?? "";
  const user = verifyToken(tk);

  if (!user) {
    return res.redirect("/admin");
  }

  res.locals.tk        = tk;
  res.locals.adminUser = user.username;
  res.locals.adminRole = user.role;
  next();
};

// Alias — sudah tidak dipakai (finance pakai JWT cookie sendiri)
export const requireFinance = (_req, _res, next) => next();
