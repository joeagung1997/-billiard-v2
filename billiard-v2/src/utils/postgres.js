// src/utils/postgres.js
// ── Koneksi PostgreSQL via pg Pool ────────────────────────────

import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("[PG] DATABASE_URL belum di-set! Koneksi PostgreSQL akan gagal.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
  max:             10,
  // idle 30s→5mnt: jeda sepi antar-pelanggan (umumnya <5mnt) tak lagi menutup
  // koneksi, jadi klik menu berikutnya tak bayar biaya reconnect+TLS ke Postgres
  // (di produksi terasa sbg "jeda lama" pindah menu setelah app sebentar nganggur).
  idleTimeoutMillis: 300000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,            // TCP keepalive — jaga socket hidup & deteksi koneksi mati
});

pool.on("error", (err) => {
  console.error("[PG] Unexpected pool error:", err.message);
});

// Keepalive ping: jaga ≥1 koneksi tetap HANGAT supaya request pertama setelah idle
// langsung jalan tanpa biaya membuat koneksi baru. Interval 4mnt < idleTimeoutMillis
// 5mnt → koneksi yang sama bertahan (tidak keburu ditutup). SELECT 1 sangat ringan;
// .catch supaya blip DB tak jadi unhandledRejection. .unref() supaya timer ini tak
// menahan proses tetap hidup (mis. saat skrip/test selesai).
const _pgKeepWarm = setInterval(() => {
  pool.query("SELECT 1").catch((e) => console.warn("[PG] keepalive ping gagal:", e.message));
}, 4 * 60 * 1000);
_pgKeepWarm.unref?.();

/**
 * Jalankan query PostgreSQL.
 * @param {string} text  — SQL query dengan placeholder $1, $2, ...
 * @param {any[]}  params — Array nilai parameter
 */
export const query = (text, params) => pool.query(text, params);
