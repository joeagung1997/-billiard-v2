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

  res.locals.tk  = tk;
  res.locals.pin = pin;
  next();
};

export const requireFinance = (req, res, next) => {
  const ftk = req.query.ftk ?? req.body.ftk ?? "";
  const pin = verifyToken(ftk);

  if (!pin || pin !== CONFIG.FINANCE_PIN) {
    return res.redirect("/keuangan");
  }

  res.locals.ftk = ftk;
  next();
};
