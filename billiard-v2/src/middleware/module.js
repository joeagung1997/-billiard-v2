// src/middleware/module.js
// ── Guard: modul OPSIONAL harus aktif untuk warung ini ──────────────
//
// Modul INTI (keuangan/member/kategori/stok/supplier) TIDAK butuh guard ini.
// Dipasang SETELAH auth + subscriptionGate — yang sudah mengisi currentModules()
// dari baris warung (lihat middleware/subscription.js isWarungActive). Kalau
// modul mati: tolak di server (403), bukan sekadar disembunyikan dari sidebar.
// Jadi warung tanpa modul tsb tak bisa akses URL-nya walau diketik manual.

import { currentModules } from "../utils/tenant.js";
import { resultPage } from "../views/member.js";

export function requireModule(name) {
  return (req, res, next) => {
    if (currentModules().includes(name)) return next();
    return res.status(403).send(resultPage("error", {
      judul: "Modul Tidak Aktif",
      pesan: "Fitur ini tidak diaktifkan untuk warung Anda. Hubungi admin platform.",
    }));
  };
}
