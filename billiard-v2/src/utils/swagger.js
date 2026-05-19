// src/utils/swagger.js
// ── OpenAPI 3.0 Spec — Billiard Member System ─────────────────

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Billiard Member System API",
    description: `
## REST API untuk sistem member billiard Warpat Jombang

### Cara Autentikasi
1. Panggil \`POST /api/v1/auth\` dengan \`role\` dan \`pin\` yang sesuai
2. Salin \`token\` dari response
3. Klik tombol **Authorize** 🔒 di atas, masukkan token (**tanpa** kata "Bearer")
4. Semua request selanjutnya akan otomatis menyertakan header JWT

### Role & Akses
| Role | PIN Env | Akses |
|------|---------|-------|
| \`admin\` | \`ADMIN_PIN\` | Members, Dashboard, Logs |
| \`finance\` | \`FINANCE_PIN\` | Transaksi, Kategori |

### Check-in Member
Endpoint \`POST /api/v1/checkin\` **tidak** memerlukan JWT — cukup sertakan \`kasirPin\`.
    `,
    version: "1.0.0",
    contact: {
      name: "Warpat Jombang",
      url: "https://warpatjombang.com",
    },
  },
  servers: [
    { url: "/api/v1", description: "Server aktif" },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Token JWT dari endpoint POST /auth",
      },
    },
    schemas: {
      // ── Shared ───────────────────────────────────────────────
      Error: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "Deskripsi error" },
        },
      },
      // ── Member ───────────────────────────────────────────────
      Member: {
        type: "object",
        properties: {
          kode:                { type: "string",  example: "JMB-001" },
          nama:                { type: "string",  example: "Budi Santoso" },
          telepon:             { type: "string",  example: "0812-3456-7890" },
          totalMain:           { type: "integer", example: 7 },
          totalPoint:          { type: "integer", example: 23, description: "Lifetime check-in count (1 point per scan, gak reset)" },
          totalGratis:         { type: "integer", example: 2 },
          status:              { type: "string",  enum: ["-", "BONUS", "GRATIS"], example: "-" },
          aktif:               { type: "boolean", example: true },
          sudahScanHariIni:    { type: "boolean", example: false },
          tanggalDaftar:       { type: "string",  format: "date-time", example: "2026-05-01T07:00:00.000Z" },
          tanggalScanTerakhir: { type: "string",  format: "date-time", nullable: true, example: "2026-05-15T13:00:00.000Z" },
          bonusEarnedAt:       { type: "string",  format: "date-time", nullable: true, example: null },
        },
      },
      MemberInput: {
        type: "object",
        required: ["nama"],
        properties: {
          nama:    { type: "string", example: "Budi Santoso" },
          telepon: { type: "string", example: "081234567890" },
        },
      },
      // ── Transaksi ────────────────────────────────────────────
      Transaksi: {
        type: "object",
        properties: {
          id:         { type: "string",  example: "1716000000000-abc12" },
          tanggal:    { type: "string",  format: "date", example: "2026-05-17" },
          jam:        { type: "string",  example: "14:30" },
          jenis:      { type: "string",  enum: ["pemasukan", "pengeluaran"], example: "pemasukan" },
          waktu:      { type: "string",  enum: ["siang", "malam"], example: "siang" },
          kategori:   { type: "string",  example: "Sewa Meja" },
          keterangan: { type: "string",  example: "Meja 3 - 2 jam" },
          jumlah:     { type: "integer", example: 50000 },
          voidedAt:   { type: "string",  format: "date-time", nullable: true, description: "Timestamp jika transaksi sudah dibatalkan (soft void)" },
          voidReason: { type: "string",  example: "", description: "Alasan pembatalan, kosong jika belum dibatalkan" },
        },
      },
      TransaksiInput: {
        type: "object",
        required: ["jenis", "tanggal", "kategori", "jumlah"],
        properties: {
          jenis:      { type: "string", enum: ["pemasukan", "pengeluaran"], example: "pemasukan" },
          tanggal:    { type: "string", format: "date", example: "2026-05-17" },
          jam:        { type: "string", example: "14:30" },
          waktu:      { type: "string", enum: ["siang", "malam"], example: "siang" },
          kategori:   { type: "string", example: "Sewa Meja" },
          keterangan: { type: "string", example: "Meja 3 - 2 jam", maxLength: 200 },
          jumlah:     { type: "integer", minimum: 1, example: 50000 },
        },
      },
      // ── Kategori ─────────────────────────────────────────────
      Kategori: {
        type: "object",
        properties: {
          id:    { type: "integer", example: 1 },
          nama:  { type: "string",  example: "Sewa Meja" },
          jenis: { type: "string",  enum: ["pemasukan", "pengeluaran"], example: "pemasukan" },
        },
      },
      // ── Auth ─────────────────────────────────────────────────
      AuthInput: {
        type: "object",
        required: ["role", "pin"],
        properties: {
          role: { type: "string", enum: ["admin", "finance"], example: "admin" },
          pin:  { type: "string", example: "1234" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          success:   { type: "boolean", example: true },
          token:     { type: "string",  example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." },
          role:      { type: "string",  example: "admin" },
          expiresIn: { type: "string",  example: "24h" },
        },
      },
      // ── Checkin ──────────────────────────────────────────────
      CheckinInput: {
        type: "object",
        required: ["kode", "kasirPin"],
        properties: {
          kode:     { type: "string", example: "JMB-001" },
          kasirPin: { type: "string", example: "5678" },
        },
      },
      CheckinResult: {
        type: "object",
        properties: {
          success:    { type: "boolean" },
          result:     { type: "string", enum: ["sukses", "sudahScan", "gratis", "error"] },
          nama:       { type: "string" },
          totalMain:  { type: "integer" },
          status:     { type: "string" },
          expired:    { type: "boolean" },
          message:    { type: "string" },
        },
      },
      // ── Dashboard ────────────────────────────────────────────
      Dashboard: {
        type: "object",
        properties: {
          totalMember:  { type: "integer", example: 42 },
          memberAktif:  { type: "integer", example: 28 },
          memberBonus:  { type: "integer", example: 3 },
          scanHariIni:  { type: "integer", example: 5 },
          memberBaru:   { type: "integer", example: 2, description: "Daftar bulan ini" },
          totalPemasukan:   { type: "integer", example: 5000000 },
          totalPengeluaran: { type: "integer", example: 1500000 },
          saldo:            { type: "integer", example: 3500000 },
        },
      },
      // ── Log ──────────────────────────────────────────────────
      Log: {
        type: "object",
        properties: {
          ts:     { type: "string", format: "date-time" },
          kode:   { type: "string", example: "JMB-001" },
          nama:   { type: "string", example: "Budi Santoso" },
          aksi:   { type: "string", example: "SCAN" },
          detail: { type: "string", example: "Kunjungan ke-7" },
        },
      },
    },
  },

  paths: {
    // ── Auth ─────────────────────────────────────────────────────
    "/auth": {
      post: {
        tags: ["Auth"],
        summary: "Login & dapatkan JWT token",
        description: "Kirim role (`admin` atau `finance`) dan PIN yang sesuai. Token berlaku 24 jam.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/AuthInput" } } },
        },
        responses: {
          200: { description: "Login berhasil", content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } } },
          401: { description: "PIN salah", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Members ──────────────────────────────────────────────────
    "/members": {
      get: {
        tags: ["Members"],
        summary: "Daftar semua member",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "q",      in: "query", schema: { type: "string"  }, description: "Cari nama / kode / telepon" },
          { name: "status", in: "query", schema: { type: "string", enum: ["aktif", "nonaktif", "bonus"] }, description: "Filter status" },
          { name: "bulan",  in: "query", schema: { type: "string", example: "2026-05" }, description: "Filter bulan bergabung (YYYY-MM)" },
        ],
        responses: {
          200: {
            description: "Daftar member",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    total:   { type: "integer" },
                    data:    { type: "array", items: { $ref: "#/components/schemas/Member" } },
                  },
                },
              },
            },
          },
          401: { description: "Token tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Members"],
        summary: "Tambah member baru",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MemberInput" } } },
        },
        responses: {
          201: { description: "Member berhasil dibuat", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Member" } } } } } },
          400: { description: "Data tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          401: { description: "Token tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/members/{kode}": {
      get: {
        tags: ["Members"],
        summary: "Detail satu member",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "kode", in: "path", required: true, schema: { type: "string" }, example: "JMB-001" }],
        responses: {
          200: { description: "Data member", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Member" } } } } } },
          404: { description: "Member tidak ditemukan", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      put: {
        tags: ["Members"],
        summary: "Update data member (nama / telepon)",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "kode", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/MemberInput" } } },
        },
        responses: {
          200: { description: "Member berhasil diupdate", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Member" } } } } } },
          400: { description: "Data tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Member tidak ditemukan", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      delete: {
        tags: ["Members"],
        summary: "Hapus member",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "kode", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Member berhasil dihapus", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" } } } } } },
          404: { description: "Member tidak ditemukan", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/members/{kode}/klaim": {
      post: {
        tags: ["Members"],
        summary: "Klaim bonus member",
        description: "Gunakan saat member dengan status BONUS ingin mengklaim sesi gratis. Progress kembali ke 0.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "kode", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          200: { description: "Bonus berhasil diklaim", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, totalGratis: { type: "integer" } } } } } },
          400: { description: "Status member bukan BONUS/GRATIS", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Member tidak ditemukan", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Checkin ──────────────────────────────────────────────────
    "/checkin": {
      post: {
        tags: ["Check-in"],
        summary: "Proses check-in member (tidak perlu JWT)",
        description: "Verifikasi PIN kasir lalu catat kunjungan. Tidak memerlukan token JWT — cukup gunakan PIN kasir.",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/CheckinInput" } } },
        },
        responses: {
          200: { description: "Hasil check-in", content: { "application/json": { schema: { $ref: "#/components/schemas/CheckinResult" } } } },
          401: { description: "PIN kasir salah", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Member tidak ditemukan", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Transaksi ────────────────────────────────────────────────
    "/transaksi": {
      get: {
        tags: ["Keuangan"],
        summary: "Daftar transaksi",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "jenis",  in: "query", schema: { type: "string", enum: ["pemasukan", "pengeluaran"] }, description: "Filter jenis" },
          { name: "bulan",  in: "query", schema: { type: "string", example: "2026-05" }, description: "Filter bulan (YYYY-MM)" },
          { name: "limit",  in: "query", schema: { type: "integer", default: 100 }, description: "Maks baris" },
        ],
        responses: {
          200: {
            description: "Daftar transaksi",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success:         { type: "boolean" },
                    total:           { type: "integer" },
                    totalPemasukan:  { type: "integer" },
                    totalPengeluaran:{ type: "integer" },
                    saldo:           { type: "integer" },
                    data:            { type: "array", items: { $ref: "#/components/schemas/Transaksi" } },
                  },
                },
              },
            },
          },
          401: { description: "Token tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          403: { description: "Bukan role finance", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
      post: {
        tags: ["Keuangan"],
        summary: "Tambah transaksi baru",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { $ref: "#/components/schemas/TransaksiInput" } } },
        },
        responses: {
          201: { description: "Transaksi berhasil ditambah", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Transaksi" } } } } } },
          400: { description: "Data tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/transaksi/{id}/void": {
      post: {
        tags: ["Keuangan"],
        summary: "Batalkan (soft void) transaksi",
        description: "Transaksi tidak boleh di-edit atau di-hard-delete. Untuk koreksi, void transaksi yang salah lalu POST /transaksi baru. Voided transaksi tetap tersimpan untuk audit trail tapi dikecualikan dari stats keuangan.",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["reason"],
                properties: {
                  reason: { type: "string", maxLength: 200, example: "Salah input nominal" },
                },
              },
            },
          },
        },
        responses: {
          200: { description: "Transaksi berhasil dibatalkan", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" }, reason: { type: "string" } } } } } },
          400: { description: "Reason tidak diisi", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          404: { description: "Transaksi tidak ditemukan", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          409: { description: "Transaksi sudah dibatalkan sebelumnya", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Kategori ─────────────────────────────────────────────────
    "/kategori": {
      get: {
        tags: ["Keuangan"],
        summary: "Daftar kategori transaksi",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "jenis", in: "query", schema: { type: "string", enum: ["pemasukan", "pengeluaran"] }, description: "Filter jenis" },
        ],
        responses: {
          200: { description: "Daftar kategori", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { type: "array", items: { $ref: "#/components/schemas/Kategori" } } } } } } },
        },
      },
      post: {
        tags: ["Keuangan"],
        summary: "Tambah kategori",
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["nama", "jenis"],
                properties: {
                  nama:  { type: "string", example: "Parkir" },
                  jenis: { type: "string", enum: ["pemasukan", "pengeluaran"], example: "pemasukan" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Kategori berhasil ditambah", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" } } } } } },
          400: { description: "Data tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    "/kategori/{id}": {
      delete: {
        tags: ["Keuangan"],
        summary: "Hapus kategori",
        security: [{ BearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Kategori berhasil dihapus", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, message: { type: "string" } } } } } },
        },
      },
    },

    // ── Dashboard ────────────────────────────────────────────────
    "/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Statistik ringkas dashboard",
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Data statistik", content: { "application/json": { schema: { type: "object", properties: { success: { type: "boolean" }, data: { $ref: "#/components/schemas/Dashboard" } } } } } },
          401: { description: "Token tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },

    // ── Logs ─────────────────────────────────────────────────────
    "/logs": {
      get: {
        tags: ["Dashboard"],
        summary: "Log kunjungan member",
        security: [{ BearerAuth: [] }],
        parameters: [
          { name: "limit",  in: "query", schema: { type: "integer", default: 50, maximum: 500 }, description: "Maks baris" },
          { name: "kode",   in: "query", schema: { type: "string"  }, description: "Filter per kode member" },
          { name: "aksi",   in: "query", schema: { type: "string", enum: ["SCAN", "BONUS_EARNED", "BONUS_KLAIM", "RESET_QR"] }, description: "Filter aksi" },
        ],
        responses: {
          200: {
            description: "Daftar log",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    total:   { type: "integer" },
                    data:    { type: "array", items: { $ref: "#/components/schemas/Log" } },
                  },
                },
              },
            },
          },
          401: { description: "Token tidak valid", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
        },
      },
    },
  },

  tags: [
    { name: "Auth",      description: "Login & manajemen token JWT" },
    { name: "Members",   description: "CRUD data member & klaim bonus" },
    { name: "Check-in",  description: "Proses scan QR & check-in member" },
    { name: "Keuangan",  description: "Transaksi pemasukan/pengeluaran & kategori" },
    { name: "Dashboard", description: "Statistik & log kunjungan" },
  ],
};
