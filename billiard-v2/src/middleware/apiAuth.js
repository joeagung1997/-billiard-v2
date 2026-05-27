// src/middleware/apiAuth.js
// ── Middleware: JWT auth untuk REST API ───────────────────────

import jwt from "jsonwebtoken";
import { CONFIG } from "../config.js";

/**
 * Buat JWT token
 * @param {{ role: string }} payload
 * @returns {string}
 */
export const signToken = (payload) =>
  jwt.sign({ ...payload, boot: CONFIG.DEPLOY_ID }, CONFIG.JWT_SECRET, { expiresIn: CONFIG.JWT_EXPIRES });

/**
 * Middleware: validasi Bearer JWT
 * @param {string[]} roles - role yang diizinkan: 'admin' | 'finance'
 */
export const requireApiAuth = (roles = ["admin"]) =>
  (req, res, next) => {
    const auth = req.headers.authorization ?? "";

    if (!auth.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Token tidak ditemukan. Sertakan header: Authorization: Bearer <token>",
      });
    }

    const token = auth.slice(7);
    try {
      const payload = jwt.verify(token, CONFIG.JWT_SECRET);
      if (payload.boot !== CONFIG.DEPLOY_ID) {
        return res.status(401).json({
          success: false,
          message: "Token sudah tidak berlaku (server di-update). Silakan login ulang.",
        });
      }
      if (!roles.includes(payload.role)) {
        return res.status(403).json({
          success: false,
          message: `Akses ditolak. Role '${payload.role}' tidak memiliki izin ini.`,
        });
      }
      req.apiUser = payload;
      next();
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: err.name === "TokenExpiredError"
          ? "Token sudah expired. Silakan login ulang."
          : "Token tidak valid.",
      });
    }
  };
