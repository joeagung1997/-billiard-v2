// src/middleware/auth.js
// ── Middleware: validasi session token admin ──────────────────

import { verifyToken } from "../utils/session.js";
import { CONFIG } from "../config.js";

export const requireAdmin = (req, res, next) => {
  const tk  = req.query.tk ?? req.body.tk ?? "";
  const pin = verifyToken(tk);

  if (!pin || pin !== CONFIG.ADMIN_PIN) {
    return res.redirect("/admin");
  }

  // Attach token ke res.locals supaya views bisa pakai
  res.locals.tk  = tk;
  res.locals.pin = pin;
  next();
};
