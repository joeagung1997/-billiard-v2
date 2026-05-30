// billiard-v2/scripts/http-test.mjs
// ════════════════════════════════════════════════════════════════════
//  UJI INTEGRASI HTTP — isolasi & IDOR via endpoint nyata (server staging)
// ════════════════════════════════════════════════════════════════════
//
//  Melengkapi staging-test.mjs (yg menguji level db.js). Skrip ini menembak
//  ENDPOINT HTTP nyata: proteksi auth, login per-warung, isolasi baca,
//  IDOR GET→404, dan gate langganan→403. HANYA menyentuh warung uji A & B
//  (lewat slug) — TIDAK PERNAH Warpat (warung 1).
//
//  Node 18+ punya fetch bawaan → cukup butuh BASE_URL (tanpa DATABASE_URL).
//
//  ── Prasyarat: seed 2 warung uji di STAGING (sekali) ──
//    INSERT INTO warung (nama, slug, kode_prefix, status_langganan) VALUES
//      ('Uji A','test-isolasi-a','TSA','aktif'),
//      ('Uji B','test-isolasi-b','TSB','aktif') ON CONFLICT (slug) DO NOTHING;
//    INSERT INTO admin_accounts (username, pin, role, display_name, warung_id)
//      SELECT 'ownera','1234','owner','Owner A', id FROM warung WHERE slug='test-isolasi-a'
//      ON CONFLICT (warung_id, username) DO NOTHING;
//    INSERT INTO admin_accounts (username, pin, role, display_name, warung_id)
//      SELECT 'ownerb','4321','owner','Owner B', id FROM warung WHERE slug='test-isolasi-b'
//      ON CONFLICT (warung_id, username) DO NOTHING;
//
//  ── Jalankan ──
//    BASE_URL=https://staging-anda.example node scripts/http-test.mjs   (bash)
//    $env:BASE_URL="https://..."; node scripts/http-test.mjs            (PowerShell)
//  Opsi: WA_SLUG/WA_USER/WA_PIN, WB_SLUG/WB_USER/WB_PIN (default sesuai seed di atas).
//  Uji langganan: set A nonaktif (UPDATE warung SET status_langganan='nonaktif'
//    WHERE slug='test-isolasi-a') lalu jalankan dgn EXPECT_A_BLOCKED=yes.
//
//  ── Cleanup setelah selesai (hapus warung uji; JANGAN sentuh warung 1) ──
//    Jalankan scripts/staging-test.mjs (meng-cleanup warung_id IN (2,3)), atau
//    hapus manual per tabel WHERE warung_id = <id A/B>.
// ════════════════════════════════════════════════════════════════════

const BASE = (process.env.BASE_URL || "").replace(/\/$/, "");
if (!BASE) { console.error("✗ BASE_URL wajib di-set (mis. https://staging-anda.example)"); process.exit(2); }

const WA = { slug: process.env.WA_SLUG || "test-isolasi-a", user: process.env.WA_USER || "ownera", pin: process.env.WA_PIN || "1234" };
const WB = { slug: process.env.WB_SLUG || "test-isolasi-b", user: process.env.WB_USER || "ownerb", pin: process.env.WB_PIN || "4321" };

let pass = 0, fail = 0, warn = 0;
const ok   = (n) => { pass++; console.log("   ✓ " + n); };
const bad  = (n, d = "") => { fail++; console.error("   ✗ GAGAL: " + n + (d ? "  — " + d : "")); };
const warnf = (n) => { warn++; console.warn("   ! SKIP/WARN: " + n); };
const check = (n, cond, d) => (cond ? ok(n) : bad(n, d));
const hr = (t) => console.log("\n" + "─".repeat(64) + "\n  " + t + "\n" + "─".repeat(64));

// fetch tanpa follow redirect; balikan status, location, set-cookie, body.
async function req(path, { method = "GET", cookie = "", body = null } = {}) {
  const headers = {};
  if (cookie) headers.cookie = cookie;
  if (body)   headers["content-type"] = "application/x-www-form-urlencoded";
  const res = await fetch(BASE + path, { method, headers, body, redirect: "manual" });
  let setCookie = [];
  try { setCookie = res.headers.getSetCookie ? res.headers.getSetCookie() : (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")] : []); } catch {}
  const text = res.status >= 200 && res.status < 400 ? await res.text().catch(() => "") : "";
  return { status: res.status, location: res.headers.get("location") || "", setCookie, text };
}

function parseFrt(setCookie) {
  for (const c of setCookie) { const m = /(?:^|;|\s)_frt=([^;]+)/.exec(c); if (m && m[1]) return decodeURIComponent(m[1]); }
  return "";
}
function parseTk(location) { const m = /[?&]tk=([^&]+)/.exec(location || ""); return m ? m[1] : ""; }

// Login via /w/:slug/login → { frt cookie, tk session }.
async function login(w) {
  const r = await req(`/w/${w.slug}/login`, {
    method: "POST",
    body: `username=${encodeURIComponent(w.user)}&pin=${encodeURIComponent(w.pin)}`,
  });
  const frt = parseFrt(r.setCookie);
  const tk  = parseTk(r.location);
  return { status: r.status, location: r.location, frt, tk, cookie: frt ? `_frt=${encodeURIComponent(frt)}` : "" };
}

// Buat member via GET /admin/tambah → parse kode dari scanUrl (?id=KODE) di body.
async function createMember(sess, nama) {
  const r = await req(`/admin/tambah?tk=${sess.tk}&nama=${encodeURIComponent(nama)}&tlp=08123456789`, { cookie: sess.cookie });
  let kode = "";
  const m1 = /[?&]id=([A-Z0-9-]{5,})/i.exec(r.text);
  const m2 = /\b([A-Z]{2,4}-\d{4}-[A-Z0-9]{2,3})\b/.exec(r.text);
  kode = (m1 && m1[1]) || (m2 && m2[1]) || "";
  return kode.toUpperCase();
}

async function main() {
  console.log("\n  BASE_URL: " + BASE);
  console.log("  Warung A: /w/" + WA.slug + " (" + WA.user + ")   Warung B: /w/" + WB.slug + " (" + WB.user + ")");

  hr("0. Proteksi auth (tanpa login)");
  const opNoAuth = await req("/operasional");
  check("GET /operasional tanpa login → redirect (3xx)", opNoAuth.status >= 300 && opNoAuth.status < 400, "status=" + opNoAuth.status);
  const slugBad = await req("/w/slug-ngawur-xyz");
  check("GET /w/<slug-tak-dikenal> → 404", slugBad.status === 404, "status=" + slugBad.status);

  hr("1. Login per-warung");
  const a = await login(WA);
  const b = await login(WB);
  check("login A → 3xx + cookie _frt + tk", a.status >= 300 && a.status < 400 && !!a.frt && !!a.tk, `status=${a.status} frt=${!!a.frt} tk=${!!a.tk}`);
  check("login B → 3xx + cookie _frt + tk", b.status >= 300 && b.status < 400 && !!b.frt && !!b.tk, `status=${b.status} frt=${!!b.frt} tk=${!!b.tk}`);
  if (!a.tk || !b.tk) { bad("login gagal — cek seed warung/akun & BASE_URL. Setop."); return finish(); }

  hr("2. Buat member uji di tiap warung + isolasi baca");
  const kodeA = await createMember(a, "TEST_HTTP_A");
  const kodeB = await createMember(b, "TEST_HTTP_B");
  if (!kodeA || !kodeB) { warnf("gagal parse kode member dari respons (HTML berubah?) — lewati cek isolasi-baca & IDOR-GET"); }
  else {
    console.log("   (kode A=" + kodeA + ", kode B=" + kodeB + ")");
    const aMembers = await req(`/admin/members?tk=${a.tk}`, { cookie: a.cookie });
    check("halaman members A memuat kode A", aMembers.text.includes(kodeA));
    check("halaman members A TIDAK memuat kode B (isolasi)", !aMembers.text.includes(kodeB));

    hr("3. Anti-IDOR — A mengakses member milik B by-id");
    const idor = await req(`/admin/qr-view/${kodeB}?tk=${a.tk}`, { cookie: a.cookie });
    check("GET /admin/qr-view/<kodeB> sbg A → 404", idor.status === 404, "status=" + idor.status);
    const idorImg = await req(`/admin/qr-img/${kodeB}?tk=${a.tk}`, { cookie: a.cookie });
    check("GET /admin/qr-img/<kodeB> sbg A → 404", idorImg.status === 404, "status=" + idorImg.status);
    // kontrol positif: member sendiri tetap bisa diakses
    const own = await req(`/admin/qr-view/${kodeA}?tk=${a.tk}`, { cookie: a.cookie });
    check("kontrol: GET /admin/qr-view/<kodeA> sbg A → 200", own.status === 200, "status=" + own.status);
  }

  hr("4. Gate langganan");
  if (process.env.EXPECT_A_BLOCKED === "yes") {
    const blocked = await req(`/admin?tk=${a.tk}`, { cookie: a.cookie });
    check("A nonaktif → GET /admin → 403 (rapi, bukan crash)", blocked.status === 403, "status=" + blocked.status);
    const opBlocked = await req("/operasional", { cookie: a.cookie });
    check("A nonaktif → GET /operasional → 403", opBlocked.status === 403, "status=" + opBlocked.status);
  } else {
    warnf("Lewati uji langganan. Untuk menguji: set warung A 'nonaktif' di DB lalu jalankan ulang dgn EXPECT_A_BLOCKED=yes.");
  }

  finish();
}

function finish() {
  hr(`HASIL HTTP: ${pass} lulus, ${fail} gagal, ${warn} skip/warn`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("\n  ERROR:", e.message); process.exit(1); });
