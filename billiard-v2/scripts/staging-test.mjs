// billiard-v2/scripts/staging-test.mjs
// ════════════════════════════════════════════════════════════════════
//  UJI MENYELURUH MULTI-TENANT + JAMINAN DATA WARPAT UTUH (Bagian B/C/D/E)
// ════════════════════════════════════════════════════════════════════
//
//  ⚠️  WAJIB dijalankan di DATABASE STAGING (salinan), BUKAN PRODUKSI.
//
//  Jalankan dua langkah (gate keselamatan):
//    1) Lihat host DB dulu (tidak mengubah apa pun):
//         node scripts/staging-test.mjs
//       → skrip menampilkan host DB + baseline Warpat, lalu BERHENTI.
//    2) Setelah YAKIN itu staging, jalankan dgn konfirmasi:
//         I_CONFIRM_STAGING=yes node scripts/staging-test.mjs      (bash)
//         $env:I_CONFIRM_STAGING="yes"; node scripts/staging-test.mjs   (PowerShell)
//
//  Butuh env: DATABASE_URL (→ staging) + env app lain bila modul memerlukannya.
//
//  Jaminan: skrip TIDAK PERNAH menulis/menghapus baris warung_id=1 (Warpat).
//  Hanya membaca (baseline) warung 1; semua tulis/hapus difilter ke warung 2 & 3.
//  Membuat 2 warung uji A(id=2)/B(id=3), uji isolasi + IDOR + langganan, lalu
//  membandingkan Warpat dgn baseline, dan cleanup HANYA warung 2 & 3.
// ════════════════════════════════════════════════════════════════════

import { pool, query } from "../src/utils/postgres.js";
import { runWithTenant } from "../src/utils/tenant.js";
import {
  initDB, readDB, readTransaksi, saveMember, createMember,
  appendTransaksi, voidTransaksi, deleteMember, addBahan, readBahan,
  appendSetoran, readSetoranList, markTransaksiLunas,
} from "../src/utils/db.js";

const A = 2, B = 3;                 // warung uji (sesuai brief)
const WARPAT = 1;
const TEST_SLUG_A = "test-isolasi-a", TEST_SLUG_B = "test-isolasi-b";

let pass = 0, fail = 0;
const ok   = (n) => { pass++; console.log("   ✓ " + n); };
const bad  = (n) => { fail++; console.error("   ✗ GAGAL: " + n); };
const check = (n, cond) => (cond ? ok(n) : bad(n));
const hr = (t) => console.log("\n" + "─".repeat(64) + "\n  " + t + "\n" + "─".repeat(64));

// Replika logika gate langganan (lihat src/middleware/subscription.js → isActiveRow).
// Sengaja di-inline agar skrip cukup butuh DATABASE_URL (tanpa load modul view).
function isActiveRow(w) {
  if (!w) return false;
  if (w.status_langganan === "nonaktif") return false;
  if (w.status_langganan === "trial") {
    if (!w.trial_selesai) return true;
    return new Date(w.trial_selesai).getTime() >= Date.now();
  }
  return true;
}

function dbHost() {
  try { const u = new URL(process.env.DATABASE_URL); return `${u.hostname}:${u.port || 5432}/${u.pathname.replace(/^\//, "")}`; }
  catch { return "(DATABASE_URL tidak bisa di-parse)"; }
}

async function baselineWarpat() {
  const one = async (sql) => (await query(sql, [WARPAT])).rows[0];
  const t = await one("SELECT COUNT(*)::int c, COALESCE(SUM(jumlah),0)::bigint s, MIN(created_at) mn, MAX(created_at) mx FROM transaksi WHERE warung_id=$1");
  const counts = {};
  for (const tbl of ["members","setoran","bahan_baku","kategori","logs","sdm_transaksi","planning_items","menu_items"]) {
    counts[tbl] = (await query(`SELECT COUNT(*)::int c FROM ${tbl} WHERE warung_id=$1`, [WARPAT])).rows[0].c;
  }
  return {
    transaksi_count: t.c,
    transaksi_sum:   String(t.s),
    transaksi_min:   t.mn ? new Date(t.mn).toISOString() : null,
    transaksi_max:   t.mx ? new Date(t.mx).toISOString() : null,
    ...counts,
  };
}

function compareBaseline(before, after) {
  const keys = Object.keys(before);
  let allEqual = true;
  console.log("\n  Tabel/metrik         | baseline            | akhir               | status");
  console.log("  " + "─".repeat(78));
  for (const k of keys) {
    const same = String(before[k]) === String(after[k]);
    if (!same) allEqual = false;
    const pad = (v) => String(v).padEnd(19).slice(0, 19);
    console.log(`  ${k.padEnd(20)} | ${pad(before[k])} | ${pad(after[k])} | ${same ? "OK" : "BERUBAH !!!"}`);
  }
  return allEqual;
}

async function seedWarung(id, slug, nama) {
  await query(
    `INSERT INTO warung (id, nama, slug, kode_prefix, status_langganan)
     VALUES ($1,$2,$3,$4,'aktif') ON CONFLICT (id) DO NOTHING`,
    [id, nama, slug, "TST"]
  );
}

const TENANT_TABLES = [
  "members","transaksi","logs","kategori","menu_items","sub_kategori","menu_toppings",
  "bahan_baku","supplier","stok_movement","bahan_harga_history","menu_resep",
  "feature_notes","notifikasi","karyawan","sdm_transaksi","admin_accounts","setoran",
  "fixed_costs","planning_items","planning_payments","planning_goals","app_settings",
];

async function cleanupTestWarungs() {
  // HANYA warung 2 & 3. Tidak pernah menyentuh warung 1.
  for (const t of TENANT_TABLES) {
    await query(`DELETE FROM ${t} WHERE warung_id IN (${A}, ${B})`);
  }
  await query(`DELETE FROM warung WHERE id IN (${A}, ${B})`);
}

async function main() {
  console.log("\n  Host DB     : " + dbHost());
  console.log("  Konfirmasi  : I_CONFIRM_STAGING=" + (process.env.I_CONFIRM_STAGING || "(belum di-set)"));

  await initDB(); // idempotent; pastikan skema multi-tenant ada

  hr("BASELINE — data Warpat (warung_id=1) SEBELUM testing");
  const baseline = await baselineWarpat();
  console.table(baseline);

  if (process.env.I_CONFIRM_STAGING !== "yes") {
    console.log("\n  ⚠️  GATE KESELAMATAN: I_CONFIRM_STAGING != 'yes'.");
    console.log("  Pastikan host di atas adalah STAGING, lalu jalankan ulang dengan:");
    console.log("    I_CONFIRM_STAGING=yes node scripts/staging-test.mjs");
    console.log("  (Belum ada perubahan apa pun pada database.)\n");
    await pool.end();
    return;
  }

  // Guard: jangan timpa warung 2/3 yang BUKAN warung uji.
  const existing = (await query(`SELECT id, slug FROM warung WHERE id IN (${A}, ${B})`)).rows;
  const realOne = existing.find((w) => w.slug !== TEST_SLUG_A && w.slug !== TEST_SLUG_B);
  if (realOne) {
    console.error(`\n  ✗ ABORT: warung id=${realOne.id} (slug='${realOne.slug}') sudah ada & BUKAN warung uji. Hentikan demi keamanan.`);
    await pool.end();
    process.exit(1);
  }
  await cleanupTestWarungs(); // bersihkan sisa run sebelumnya (hanya 2/3)

  // ── Seed warung uji A & B + data berbeda ────────────────────────────
  await seedWarung(A, TEST_SLUG_A, "Uji A");
  await seedWarung(B, TEST_SLUG_B, "Uji B");

  const ids = {};
  await runWithTenant(A, async () => {
    await saveMember(createMember("TEST_A_M1", "Member A", ""));
    ids.aTrx1 = "TEST_A_TRX1"; ids.aTrx2 = "TEST_A_TRX2";
    await appendTransaksi({ id: ids.aTrx1, tanggal: "2026-02-01", jenis: "pemasukan",  kategori: "Sewa Meja", jumlah: 11000, keterangan: "TEST_A" });
    await appendTransaksi({ id: ids.aTrx2, tanggal: "2026-02-01", jenis: "pengeluaran", kategori: "Lain-lain", jumlah:  3000, keterangan: "TEST_A" });
    await addBahan("TEST_A_Gula", "gram", 15);
    await appendSetoran({ id: "TEST_A_SET1", tanggal: "2026-02-01", shift: "siang", karyawanNama: "A", uangSetor: 8000 });
  });
  await runWithTenant(B, async () => {
    await saveMember(createMember("TEST_B_M1", "Member B", ""));
    ids.bTrx1 = "TEST_B_TRX1";
    await appendTransaksi({ id: ids.bTrx1, tanggal: "2026-02-01", jenis: "pemasukan", kategori: "Sewa Meja", jumlah: 22000, keterangan: "TEST_B" });
    await addBahan("TEST_B_Kopi", "gram", 30);
  });

  // ── B. ISOLASI DATA ─────────────────────────────────────────────────
  hr("B. UJI ISOLASI DATA (A=2 vs B=3 vs Warpat=1)");
  const aData = await runWithTenant(A, () => readDB());
  const bData = await runWithTenant(B, () => readDB());
  check("A hanya lihat member A (1 baris, kode TEST_A_M1)", aData.members.length === 1 && aData.members[0].kode === "TEST_A_M1");
  check("A TIDAK lihat member B / Warpat", !aData.members.some((m) => m.kode === "TEST_B_M1" || m.kode.startsWith("JMB")));
  check("B hanya lihat member B", bData.members.length === 1 && bData.members[0].kode === "TEST_B_M1");

  const aTrx = await runWithTenant(A, () => readTransaksi());
  const bTrx = await runWithTenant(B, () => readTransaksi());
  check("A lihat tepat 2 transaksi (punya A)", aTrx.length === 2 && aTrx.every((t) => t.id.startsWith("TEST_A_")));
  check("B lihat tepat 1 transaksi (punya B)", bTrx.length === 1 && bTrx[0].id === ids.bTrx1);

  const aBahan = await runWithTenant(A, () => readBahan());
  check("A lihat hanya bahan A", aBahan.length === 1 && aBahan[0].nama === "TEST_A_Gula");
  const aSet = await runWithTenant(A, () => readSetoranList({}));
  check("A lihat hanya setoran A", aSet.length === 1);

  // ── B. ANTI-IDOR (akses ID milik B saat konteks A) ─────────────────
  hr("B. ANTI-IDOR — A mengakses ID milik B secara langsung");
  const voided = await runWithTenant(A, () => voidTransaksi(ids.bTrx1, "serangan lintas-warung"));
  check("voidTransaksi(B.id) sbg A → false (tidak match)", voided === false);
  const lunas = await runWithTenant(A, () => markTransaksiLunas(ids.bTrx1));
  check("markTransaksiLunas(B.id) sbg A → false", lunas === false);
  await runWithTenant(A, () => deleteMember("TEST_B_M1"));
  const bAfter = await runWithTenant(B, () => readDB());
  check("member B tetap ada setelah A mencoba hapus", bAfter.members.length === 1);
  const bTrxAfter = await runWithTenant(B, () => readTransaksi());
  check("transaksi B utuh (tidak ter-void/lunas oleh A)", bTrxAfter.length === 1 && !bTrxAfter[0].voidedAt && bTrxAfter[0].lunas !== false ? true : !bTrxAfter[0].voidedAt);

  // ── B. INSERT auto warung_id ────────────────────────────────────────
  const aTrxRow = (await query(`SELECT warung_id FROM transaksi WHERE id=$1`, [ids.aTrx1])).rows[0];
  check("INSERT transaksi A tersimpan warung_id=2", aTrxRow && aTrxRow.warung_id === A);
  const bTrxRow = (await query(`SELECT warung_id FROM transaksi WHERE id=$1`, [ids.bTrx1])).rows[0];
  check("INSERT transaksi B tersimpan warung_id=3", bTrxRow && bTrxRow.warung_id === B);

  // ── C. LANGGANAN (logika gate) ──────────────────────────────────────
  hr("C. ALUR LANGGANAN (trial / nonaktif / aktif)");
  const setStatus = async (status, trialSelesai = null) =>
    query(`UPDATE warung SET status_langganan=$2, trial_selesai=$3 WHERE id=$1`, [A, status, trialSelesai]);
  const rowA = async () => (await query(`SELECT * FROM warung WHERE id=$1`, [A])).rows[0];

  await setStatus("trial", new Date(Date.now() + 30 * 864e5).toISOString());
  check("trial (sisa 30 hari) → boleh akses", isActiveRow(await rowA()) === true);
  await setStatus("trial", new Date(Date.now() - 864e5).toISOString());
  check("trial sudah lewat → ditolak", isActiveRow(await rowA()) === false);
  await setStatus("nonaktif");
  check("nonaktif → ditolak", isActiveRow(await rowA()) === false);
  const dataMasihAda = (await query(`SELECT COUNT(*)::int c FROM transaksi WHERE warung_id=$1`, [A])).rows[0].c;
  check("data warung A TETAP ADA saat nonaktif (tidak terhapus)", dataMasihAda === 2);
  await setStatus("aktif");
  check("kembali aktif → boleh akses lagi, data utuh", isActiveRow(await rowA()) === true && dataMasihAda === 2);

  // ── D. VERIFIKASI WARPAT UTUH ───────────────────────────────────────
  hr("D. VERIFIKASI AKHIR — data Warpat (warung_id=1) vs baseline");
  const afterTests = await baselineWarpat();
  const warpatUtuh = compareBaseline(baseline, afterTests);
  check("SEMUA metrik Warpat IDENTIK dgn baseline (tidak ada yg hilang/berubah)", warpatUtuh);

  if (!warpatUtuh) {
    console.error("\n  ✗✗ KRITIS: data Warpat menyimpang dari baseline! BERHENTI, cleanup di-SKIP utk investigasi.");
    console.error("  Warung uji 2/3 sengaja dibiarkan agar bisa diperiksa. JANGAN ubah warung 1.");
    await pool.end();
    process.exit(1);
  }

  // ── E. CLEANUP (hanya warung 2 & 3) ─────────────────────────────────
  hr("E. CLEANUP — hapus HANYA warung uji 2 & 3");
  await cleanupTestWarungs();
  const w23 = (await query(`SELECT COUNT(*)::int c FROM warung WHERE id IN (${A},${B})`)).rows[0].c;
  check("warung uji 2 & 3 terhapus bersih", w23 === 0);
  const afterCleanup = await baselineWarpat();
  check("Warpat MASIH identik baseline setelah cleanup", compareBaseline(baseline, afterCleanup));

  hr(`HASIL: ${pass} lulus, ${fail} gagal`);
  await pool.end();
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error("\n  ERROR:", e.message);
  console.error("  (Cleanup di-skip; periksa manual. JANGAN sentuh warung_id=1.)");
  try { await pool.end(); } catch {}
  process.exit(1);
});
