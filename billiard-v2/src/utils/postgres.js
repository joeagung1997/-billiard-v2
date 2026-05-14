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
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on("error", (err) => {
  console.error("[PG] Unexpected pool error:", err.message);
});

/**
 * Jalankan query PostgreSQL.
 * @param {string} text  — SQL query dengan placeholder $1, $2, ...
 * @param {any[]}  params — Array nilai parameter
 */
export const query = (text, params) => pool.query(text, params);
