# Khazprokhir Monitoring System - Master Development Roadmap & Issue Tracking

Dokumen ini berisi peta jalan (*master roadmap*) pengembangan aplikasi **Monitoring Produksi Uang Kertas Seksi Khazprokhir** yang dibagi menjadi langkah-langkah kecil (*bite-sized issues*). Dokumen ini dirancang sebagai panduan instruksi tingkat tinggi (*high-level instructions*) yang terstruktur untuk dikerjakan oleh programmer atau model LLM.

Setiap langkah harus disetujui oleh pengguna terlebih dahulu sebelum dieksekusi.

---

## 📋 Ringkasan Master Roadmap (Daftar Seluruh Langkah)

Agar tidak ada pengerjaan yang terlewat dari dokumen `implementation_plan.md`, alur pengerjaan dibagi menjadi 12 langkah terstruktur:

- [x] **Step 1: Inisialisasi Project, Setup Environment (Dev vs Prod), & Docker Base** *(Selesai - PR [#2](https://github.com/rickyriskiawan/khazprokhir/pull/2))*
- [x] **Step 2: Skema Database (Prisma ORM), Migrasi, & Seeding Master Data Awal** *(Selesai - PR [#4](https://github.com/rickyriskiawan/khazprokhir/pull/4))*
- [x] **Step 3: Arsitektur Backend, Core Utilities (Konversi Satuan & Aturan Bisnis), & Auth/RBAC** *(Selesai - Siap Review via PR)*
- [ ] **Step 4: API Master Data & Modul Target / Perencanaan Produksi**
- [ ] **Step 5: Modul 1 - Penerimaan Barang Masuk (Bon Masuk Khazai & Registrasi Batch/Pack)**
- [ ] **Step 6: Modul 2 - Proses Sortir & Penataan Pack (Kelipatan 4, Zero Reject, Sesi & Koreksi)**
- [ ] **Step 7: Modul 3 - Pengemasan Doos / Hasil Kemas (Rasio 4 Pack = 9 Doos, Penomoran Doos & BA Kemas)**
- [ ] **Step 8: Modul 4 - Monitoring Doos, Buku Register & Deteksi Gap Otomatis**
- [ ] **Step 9: Modul 5 - Pengiriman ke Bank Indonesia & Cetak Dokumen Resmi BI**
- [ ] **Step 10: Modul 6 & 7 - Mesin Agregasi Laporan Eksekutif 5 Tabel & Export (Excel Dinamis + PDF Resmi)**
- [ ] **Step 11: Modul 8 - Frontend UI, Dashboard Real-time, & Matriks Interaktif 100 Pack**
- [ ] **Step 12: Modul 9 - Audit Trail, Automated Testing, Verifikasi Menyeluruh, & Deployment Readiness**

---

## 🎯 CURRENT STEP: ISSUE #03
### Judul: Arsitektur Backend, Core Utilities (Konversi Satuan & Aturan Bisnis), & Auth/RBAC
- **GitHub Issue**: [#5](https://github.com/rickyriskiawan/khazprokhir/issues/5)
- **Branch**: `feat/step-3-backend-arch-utils-auth`
- **Status**: Selesai (Siap Direview via PR)

### 1. Tujuan & Ruang Lingkup
Membangun fondasi logika bisnis inti, utilitas konversi satuan hierarki fisik uang kertas, penegakan aturan bisnis operasional Khazprokhir, sistem autentikasi berbasis JWT, serta middleware otorisasi Role-Based Access Control (RBAC). Modul ini menjadi fondasi logika dan keamanan bagi seluruh modul operasional berikutnya.

### 2. Instruksi High-Level

#### A. Core Utilities Konversi Satuan (`server/src/utils/converter.js`)
Implementasikan fungsi konversi hierarki fisik uang kertas secara presisi:
- **Konstanta Dasar**:
  - `BILYET_PER_BROOD = 1000`
  - `BROOD_PER_PACK = 45`
  - `BILYET_PER_PACK = 45000` (`45 * 1000`)
  - `BROOD_PER_DOOS = 20`
  - `BILYET_PER_DOOS = 20000` (`20 * 1000`)
  - `PACK_PER_BATCH = 100`
  - `DOOS_PER_BATCH = 225`
  - `BROOD_PER_BATCH = 4500`
  - `BILYET_PER_BATCH = 4500000`
- **Fungsi Helper Konversi**:
  - `packToBrood(pack)`
  - `packToBilyet(pack)`
  - `broodToBilyet(brood)`
  - `doosToBilyet(doos)`
  - `doosToBrood(doos)`
  - `calculateDoosFromPack(pack)` (Wajib rasio 4 pack = 9 doos: `(pack / 4) * 9`)
  - `calculateNominal(bilyet, nilaiPecahan)`
  - `formatRupiah(number)`

#### B. Aturan Bisnis & Validasi (`server/src/utils/businessRules.js`)
- `isKelipatanEmpat(totalPack)`: Memastikan jumlah pack merupakan kelipatan 4 (`totalPack % 4 === 0` dan `> 0`).
- `validatePackRange(packDari, packSampai)`: Memastikan `1 <= packDari <= packSampai <= 100`.
- `validateDoosRatio(totalPack, totalDoos)`: Memverifikasi `totalDoos === (totalPack / 4) * 9`.
- `detectGaps(numbers)`: Mendeteksi nomor urut yang terlewat dalam array angka (misal untuk nomor doos dan nomor pack).

#### C. Standardized Response Format (`server/src/utils/response.js`)
Menyediakan helper respons terstandarisasi untuk Express:
- `successResponse(res, { status = 200, message, data, meta })`
- `errorResponse(res, { status = 500, message, error, details })`

#### D. Autentikasi JWT & User Controller (`server/src/controllers/auth.controller.js` & `server/src/routes/auth.routes.js`)
- Dependensi: Tambahkan `jsonwebtoken` ke `server/package.json`.
- `POST /api/auth/login`:
  - Menerima `username` dan `password`.
  - Validasi keberadaan user dan `is_active === true`.
  - Verifikasi password hash menggunakan `bcryptjs`.
  - Terbitkan token JWT yang memuat `{ id, username, role, full_name }` dengan masa berlaku (dari env `JWT_EXPIRES_IN`, default `1d`).
  - Mengembalikan respons JSON user profile (tanpa `password_hash`) beserta token.
- `GET /api/auth/me`:
  - Mengambil data profil user saat ini berdasarkan decoded JWT token.
- `POST /api/auth/logout`:
  - Response sukses client-side token invalidation.

#### E. Middleware Layer (`server/src/middleware/`)
- `auth.middleware.js`:
  - Membaca header `Authorization: Bearer <token>`.
  - Verifikasi token dengan `JWT_SECRET`.
  - Menyematkan objek `req.user` pada request context.
  - Mengembalikan 401 Unauthorized bila token tidak ada atau tidak valid/expired.
- `rbac.middleware.js`:
  - Helper fungsi `authorize(...allowedRoles)`.
  - Memeriksa apakah `req.user.role` termasuk dalam `allowedRoles`.
  - Mengembalikan 403 Forbidden bila role tidak memiliki izin.
- `audit.middleware.js` & Helper Logger:
  - Helper `createAuditLog({ userId, action, module, tableName, recordId, oldValue, newValue, ipAddress })` untuk mencatat rekam jejak aktivitas ke tabel `audit_log`.

#### F. Automated Testing (`server/test/`)
- Unit test untuk seluruh fungsi konverter dan aturan bisnis.
- Integration test untuk rute autentikasi (`POST /api/auth/login`, `GET /api/auth/me`, dan verifikasi guard RBAC).

### 3. Kriteria Penerimaan (Acceptance Criteria)
- [x] Modul utilitas konversi satuan (`server/src/utils/converter.js`) mengonversi bilyet, brood, pack, doos, dan nominal rupiah secara 100% presisi.
- [x] Aturan bisnis (`server/src/utils/businessRules.js`) memvalidasi kelipatan 4 pack, batas rentang 1-100, rasio 4 pack = 9 doos, dan deteksi gap dengan akurat.
- [x] Endpoint `POST /api/auth/login` berhasil mengautentikasi pengguna, menerbitkan JWT, dan menolak password yang salah.
- [x] Endpoint `GET /api/auth/me` mengembalikan data pengguna terautentikasi dan menolak akses tanpa token (401 Unauthorized).
- [x] Middleware RBAC (`authorize`) memblokir akses pengguna yang rolenya tidak diizinkan (403 Forbidden).
- [x] Helper audit trail berhasil mencatat log ke tabel `audit_log`.
- [x] Seluruh unit dan integration test berjalan sukses (`npm test`).

---

## 📦 Riwayat Langkah Selesai (Completed Steps)

### Step 1: Inisialisasi Struktur Project, Konfigurasi Environment (Dev vs Prod), dan Docker Setup
- **GitHub Issue**: [#1](https://github.com/rickyriskiawan/khazprokhir/issues/1) *(Closed)*
- **Pull Request**: [#2](https://github.com/rickyriskiawan/khazprokhir/pull/2) *(Merged to main)*
- **Branch**: `feat/step-1-init-project-and-env`
- **Hasil**:
  - [x] Struktur folder `client/` (React + Vite + TailwindCSS) dan `server/` (Express + Prisma) terbentuk rapi.
  - [x] Service container PostgreSQL 16 terkonfigurasi di `docker-compose.yml`.
  - [x] Healthcheck endpoint `GET /api/health` merespons status 200 OK.
  - [x] Frontend React Vite berjalan dan terhubung ke backend.
  - [x] Konfigurasi environment terpisah jelas antara development (`.env.development`) dan template production (`.env.production.example`).

### Step 2: Skema Database (Prisma ORM), Migrasi, & Seeding Master Data Awal
- **GitHub Issue**: [#3](https://github.com/rickyriskiawan/khazprokhir/issues/3) *(Closed)*
- **Pull Request**: [#4](https://github.com/rickyriskiawan/khazprokhir/pull/4) *(Merged to main)*
- **Branch**: `feat/step-2-db-schema-and-seed`
- **Hasil**:
  - [x] File `server/prisma/schema.prisma` terdefinisi lengkap mencakup 13 entitas model, relasi, enum, dan constraint.
  - [x] Migrasi database `init_khazprokhir_schema` berhasil dieksekusi ke PostgreSQL lokal tanpa error.
  - [x] Script seeding `prisma/seed.js` berhasil dijalankan dan terbukti idempoten.
  - [x] Seluruh data master (7 denominasi, 7 emisi, 3 shift, 4 user role, dan target TA 2026) terverifikasi tersimpan di database.
  - [x] Modul Prisma Client singleton di `server/src/lib/prisma.js` siap di-import oleh layer service/controller.
  - [x] Endpoint `GET /api/health` merespons status koneksi database (`database: "connected"`).
