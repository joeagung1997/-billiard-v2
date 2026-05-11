// src/routes/qr.js
// ── Routes: /admin/qr/* ───────────────────────────────────────

import { Router } from "express";
import { requireAdmin } from "../middleware/auth.js";
import { readDB, findMember } from "../utils/db.js";
import { qrBuffer, brandedQrCard, buildScanUrl } from "../utils/qr.js";

const router = Router();

// ── GET /admin/qr-img/:kode — inline PNG thumbnail ───────────
router.get("/qr-img/:kode", requireAdmin, async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);
  if (!member) return res.status(404).end();

  try {
    const buf = await qrBuffer(buildScanUrl(req, kode), 200);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.send(buf);
  } catch {
    res.status(500).end();
  }
});

// ── GET /admin/qr-card/:kode — branded SVG card preview ──────
router.get("/qr-card/:kode", requireAdmin, async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);
  if (!member) return res.status(404).end();

  try {
    const scanUrl   = buildScanUrl(req, kode);
    const { svg }   = await brandedQrCard({ text: scanUrl, nama: member.nama, kode });
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=60");
    res.send(svg);
  } catch (err) {
    res.status(500).send(`Gagal generate QR card: ${err.message}`);
  }
});

// ── GET /admin/qr/:kode — download PNG ───────────────────────
router.get("/qr/:kode", requireAdmin, async (req, res) => {
  const kode = req.params.kode.toUpperCase();
  const { members } = readDB();
  const member = findMember(members, kode);
  if (!member) return res.status(404).send("Member tidak ditemukan");

  try {
    const buf = await qrBuffer(buildScanUrl(req, kode), 400);
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="QR-${kode}.png"`);
    res.send(buf);
  } catch (err) {
    res.status(500).send(`Gagal generate QR: ${err.message}`);
  }
});

export default router;
