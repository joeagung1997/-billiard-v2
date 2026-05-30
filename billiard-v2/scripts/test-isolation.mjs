// billiard-v2/scripts/test-isolation.mjs
// ── Uji isolasi data multi-tenant (C8) ───────────────────────────
//
// Jalankan:  node billiard-v2/scripts/test-isolation.mjs
// Syarat:    env DATABASE_URL ter-set (sama dgn yg dipakai app).
//
// Membuat 2 warung UJI ber-id tinggi (999001/999002) — TIDAK menyentuh data
// Warpat (warung 1) — lalu membuktikan warung A tidak bisa melihat/mengubah
// data warung B, termasuk lewat ID langsung (anti-IDOR). Cleanup otomatis di
// akhir (hapus hanya baris milik 2 warung uji).
//
// Memakai runWithTenant() — mekanisme async-context yang SAMA dengan yang
// dipakai middleware auth di produksi (setRequestWarung) — jadi ini menguji
// jalur isolasi yang nyata, bukan sekadar lewat parameter.

import { query } from "../src/utils/postgres.js";
import { runWithTenant } from "../src/utils/tenant.js";
import {
  initDB, readDB, readTransaksi, saveMember, createMember,
  appendTransaksi, voidTransaksi, deleteMember,
} from "../src/utils/db.js";

const A = 999001, B = 999002;
const KODE_A = "TESTA01", KODE_B = "TESTB01";

let pass = 0, fail = 0;
const check = (name, ok) => {
  if (ok) { pass++; console.log("  ✓", name); }
  else    { fail++; console.error("  ✗ GAGAL:", name); }
};

async function seedWarung(id, slug) {
  await query(
    `INSERT INTO warung (id, nama, slug, status_langganan)
     VALUES ($1, $2, $3, 'aktif') ON CONFLICT (id) DO NOTHING`,
    [id, "Uji " + slug, slug]
  );
}

async function cleanup() {
  for (const id of [A, B]) {
    await query("DELETE FROM transaksi WHERE warung_id = $1", [id]);
    await query("DELETE FROM logs       WHERE warung_id = $1", [id]);
    await query("DELETE FROM members    WHERE warung_id = $1", [id]);
    await query("DELETE FROM warung     WHERE id = $1", [id]);
  }
}

async function main() {
  await initDB();
  await cleanup(); // bersihkan sisa run sebelumnya (kalau ada)
  await seedWarung(A, "uji-a");
  await seedWarung(B, "uji-b");

  // ── Seed data tiap warung via konteks tenant masing-masing ──
  let trxAid, trxBid;
  await runWithTenant(A, async () => {
    await saveMember(createMember(KODE_A, "Member A", ""));
    trxAid = "trxA-" + Date.now();
    await appendTransaksi({ id: trxAid, tanggal: "2026-01-01", jenis: "pemasukan", kategori: "Sewa Meja", jumlah: 10000 });
  });
  await runWithTenant(B, async () => {
    await saveMember(createMember(KODE_B, "Member B", ""));
    trxBid = "trxB-" + Date.now();
    await appendTransaksi({ id: trxBid, tanggal: "2026-01-01", jenis: "pemasukan", kategori: "Sewa Meja", jumlah: 20000 });
  });

  console.log("\n[1] Isolasi SELECT (list)");
  const aData = await runWithTenant(A, () => readDB());
  const bData = await runWithTenant(B, () => readDB());
  check("A hanya melihat member A", aData.members.length === 1 && aData.members[0].kode === KODE_A);
  check("B hanya melihat member B", bData.members.length === 1 && bData.members[0].kode === KODE_B);
  const aTrx = await runWithTenant(A, () => readTransaksi());
  check("A hanya melihat transaksi A", aTrx.length === 1 && aTrx[0].id === trxAid);

  console.log("\n[2] Anti-IDOR: A mengakses ID milik B secara langsung");
  const voided = await runWithTenant(A, () => voidTransaksi(trxBid, "serangan lintas-warung"));
  check("A TIDAK bisa void transaksi B (by-id) → false", voided === false);
  const bTrxAfter = await runWithTenant(B, () => readTransaksi());
  check("Transaksi B tetap utuh (tidak ter-void)", bTrxAfter.length === 1 && !bTrxAfter[0].voidedAt);

  console.log("\n[3] Anti-IDOR: A menghapus member B secara langsung");
  await runWithTenant(A, () => deleteMember(KODE_B));
  const bDataAfter = await runWithTenant(B, () => readDB());
  check("A TIDAK bisa hapus member B", bDataAfter.members.length === 1);

  await cleanup();
  console.log(`\n${"=".repeat(40)}\nHasil: ${pass} lulus, ${fail} gagal.\n${"=".repeat(40)}`);
  process.exit(fail ? 1 : 0);
}

main().catch(async (e) => {
  console.error("Error saat uji:", e.message);
  try { await cleanup(); } catch {}
  process.exit(1);
});
