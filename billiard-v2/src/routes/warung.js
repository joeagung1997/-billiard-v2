// src/routes/warung.js
// ── Routes: /w/:slug — entry & login per-warung (path-based, Opsi A) ──
//
// Slug menentukan warung HANYA untuk halaman login. Setelah login sukses, token
// membawa warung_id dan app dipakai via URL biasa (/admin, /operasional);
// isolasi data digerakkan token + AsyncLocalStorage (lihat utils/tenant.js).
// Warung lama (Warpat) tetap bisa login langsung di /admin (= warung 1).

import { Router } from "express";
import { getWarungBySlug } from "../utils/db.js";
import { setRequestWarung } from "../utils/tenant.js";
import { adminLoginPage } from "../views/admin.js";
import { resultPage } from "../views/member.js";
import { doAdminLogin } from "./admin.js";

const router = Router({ mergeParams: true });

// Resolusi slug → warung + set konteks tenant utk semua /w/:slug/*.
router.use(async (req, res, next) => {
  const slug = (req.params.slug || "").toLowerCase().slice(0, 60);
  try {
    const warung = await getWarungBySlug(slug);
    if (!warung) {
      return res.status(404).send(resultPage("error", {
        judul: "Warung Tidak Ditemukan",
        pesan: `Alamat "/w/${slug}" tidak terdaftar. Periksa kembali link Anda.`,
      }));
    }
    // Gate langganan dasar (C7 akan memperluas: trial lewat, dll).
    if (warung.status_langganan === "nonaktif") {
      return res.status(403).send(resultPage("error", {
        judul: "Langganan Nonaktif",
        pesan: "Akses warung ini sedang dinonaktifkan. Silakan hubungi admin.",
      }));
    }
    setRequestWarung(req, warung.id);     // konteks tenant utk lookup akun saat login
    res.locals.warung     = warung;
    res.locals.warungBase = "/w/" + slug;
    next();
  } catch (err) {
    console.error("[WARUNG] resolve slug error:", err.message);
    res.status(500).send("Kesalahan server.");
  }
});

// GET /w/:slug → halaman login warung ini (form POST ke /w/:slug/login).
router.get("/", (req, res) => {
  res.send(adminLoginPage(!!req.query.err, res.locals.warungBase + "/login"));
});

// POST /w/:slug/login → auth scoped ke warung (konteks di-set resolver di atas).
// Sukses → token berisi warung_id → masuk /admin (URL biasa; token menentukan warung).
router.post("/login", (req, res) =>
  doAdminLogin(req, res, { errRedirect: res.locals.warungBase + "?err=1", okBase: "/admin" })
);

export default router;
