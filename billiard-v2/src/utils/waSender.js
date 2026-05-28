// src/utils/waSender.js
// ── Sender WhatsApp via Fonnte (https://fonnte.com) ────────────
// Provider gateway WA paling populer di Indonesia. Setup di .env.example.
// Kalau FONNTE_TOKEN kosong, semua send call return graceful skip
// (in-app notif tetap jalan, WA cuma di-log warn).

import { CONFIG } from "../config.js";

const FONNTE_API = "https://api.fonnte.com/send";

// Normalize nomor: 08xx → 628xx. Strip non-digit. Fonnte butuh format
// internasional tanpa "+" (mis. 6281519210552, bukan +62 815...).
export function normalizePhone(raw) {
  if (!raw) return "";
  let n = String(raw).replace(/\D/g, "");
  if (n.startsWith("0"))      n = "62" + n.slice(1);
  else if (n.startsWith("8")) n = "62" + n;
  // Kalau sudah "62...", biarkan
  return n;
}

/**
 * Kirim pesan WA via Fonnte.
 *
 * @param {string} target  Nomor tujuan (08.. atau 62..)
 * @param {string} message Isi pesan (support markdown Fonnte: *bold*, _italic_)
 * @returns {Promise<{ok:boolean, skipped?:boolean, error?:string, data?:object}>}
 */
export async function sendWa(target, message) {
  const token = CONFIG.FONNTE_TOKEN;
  if (!token) {
    console.warn("[waSender] FONNTE_TOKEN belum di-set → skip send WA.");
    return { ok: false, skipped: true };
  }
  const phone = normalizePhone(target);
  if (!phone) return { ok: false, error: "Nomor tujuan invalid" };
  if (!message || !message.trim()) return { ok: false, error: "Pesan kosong" };

  try {
    const form = new URLSearchParams();
    form.set("target",  phone);
    form.set("message", message);
    // countryCode default 62 di Fonnte; eksplisit utk safety.
    form.set("countryCode", "62");

    const res = await fetch(FONNTE_API, {
      method: "POST",
      headers: {
        "Authorization": token,
        "Content-Type":  "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await res.json().catch(() => ({}));
    // Fonnte response: { detail: "...", id: [...], process: "pending", status: true, target: [...] }
    // Atau error: { reason: "...", status: false }
    if (res.ok && data && data.status === true) {
      return { ok: true, data };
    }
    return { ok: false, error: (data && data.reason) || `HTTP ${res.status}`, data };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
