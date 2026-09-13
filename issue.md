# Khazprokhir Monitoring System - Master Development Roadmap & Issue Tracking

Dokumen ini berisi peta jalan (*master roadmap*) pengembangan aplikasi **Monitoring Produksi Uang Kertas Seksi Khazprokhir** yang dibagi menjadi langkah-langkah kecil (*bite-sized issues*). Dokumen ini dirancang sebagai panduan instruksi tingkat tinggi (*high-level instructions*) yang terstruktur untuk dikerjakan oleh programmer atau model LLM.

Setiap langkah harus disetujui oleh pengguna terlebih dahulu sebelum dieksekusi.

---

## 📋 Ringkasan Master Roadmap (Daftar Seluruh Langkah)

Agar tidak ada pengerjaan yang terlewat dari dokumen `implementation_plan.md`, alur pengerjaan dibagi menjadi 12 langkah terstruktur:

- [x] **Step 1: Inisialisasi Project, Setup Environment (Dev vs Prod), & Docker Base** *(Selesai - PR [#2](https://github.com/rickyriskiawan/khazprokhir/pull/2))*
- [x] **Step 2: Skema Database (Prisma ORM), Migrasi, & Seeding Master Data Awal** *(Selesai - PR [#4](https://github.com/rickyriskiawan/khazprokhir/pull/4))*
- [x] **Step 3: Arsitektur Backend, Core Utilities (Konversi Satuan & Aturan Bisnis), & Auth/RBAC** *(Selesai - PR [#6](https://github.com/rickyriskiawan/khazprokhir/pull/6))*
- [ ] **Step 4: API Master Data & Modul Target / Perencanaan Produksi** *(Aktif - Issue [#7](https://github.com/rickyriskiawan/khazprokhir/issues/7))*
- [ ] **Step 5: Modul 1 - Penerimaan Barang Masuk (Bon Masuk Khazai & Registrasi Batch/Pack)**
- [ ] **Step 6: Modul 2 - Proses Sortir & Penataan Pack (Kelipatan 4, Zero Reject, Sesi & Koreksi)**
- [ ] **Step 7: Modul 3 - Pengemasan Doos / Hasil Kemas (Rasio 4 Pack = 9 Doos, Penomoran Doos & BA Kemas)**
- [ ] **Step 8: Modul 4 - Monitoring Doos, Buku Register & Deteksi Gap Otomatis**
- [ ] **Step 9: Modul 5 - Pengiriman ke Bank Indonesia & Cetak Dokumen Resmi BI**
- [ ] **Step 10: Modul 6 & 7 - Mesin Agregasi Laporan Eksekutif 5 Tabel & Export (Excel Dinamis + PDF Resmi)**
- [ ] **Step 11: Modul 8 - Frontend UI, Dashboard Real-time, & Matriks Interaktif 100 Pack**
- [ ] **Step 12: Modul 9 - Audit Trail, Automated Testing, Verifikasi Menyeluruh, & Deployment Readiness**

---

## 🎯 CURRENT STEP: ISSUE #04
### Judul: API Master Data & Modul Target / Perencanaan Produksi
- **GitHub Issue**: [#7](https://github.com/rickyriskiawan/khazprokhir/issues/7)
- **Branch Rekomendasi**: `feat/step-4-api-master-and-target`
- **Status**: Siap Dikerjakan (Menunggu Persetujuan Pengguna)

### 1. Tujuan & Ruang Lingkup
Mengimplementasikan seluruh endpoint RESTful API untuk pengelolaan **Master Data** (Denominasi, Emisi, Shift, Manajemen Akun User) serta **Modul Target dan Perencanaan Produksi** (Target Tahunan dengan kalkulasi otomatis bilyet/brood/pack, Target Bulanan dengan sisa hari kerja, Transaksi Persediaan HCTS, dan Rencana Penyerahan). Dilengkapi validasi skema input (Zod), proteksi role-based access control (RBAC), serta pencatatan audit trail otomatis.

### 2. Instruksi High-Level

#### A. Master Denominasi, Emisi, & Shift (`/api/master/`)
- `GET /api/master/denominasi`: Mengambil seluruh denominasi aktif beserta emisi terkait.
- `POST /api/master/denominasi`, `PUT /api/master/denominasi/:id`, `DELETE /api/master/denominasi/:id` (Role: `SUPERVISOR`).
- `GET /api/master/emisi`, `POST /api/master/emisi`, `PUT /api/master/emisi/:id`, `DELETE /api/master/emisi/:id` (Role: `SUPERVISOR`).
- `GET /api/master/shift`, `POST /api/master/shift`, `PUT /api/master/shift/:id` (Role: `SUPERVISOR`).

#### B. Manajemen Akun User (`/api/master/users`)
- `GET /api/master/users`: List seluruh pengguna dengan opsi filter role & status aktif (data disanitasi tanpa `password_hash`).
- `POST /api/master/users`: Pendaftaran user baru dengan password hash bcrypt (Role: `SUPERVISOR`).
- `PUT /api/master/users/:id`: Pembaruan profil, role, atau ganti password (Role: `SUPERVISOR`).
- `DELETE /api/master/users/:id`: Penonaktifan akun (`is_active: false`) untuk menjaga integritas relasi referensial (Role: `SUPERVISOR`).

#### C. Target Produksi Tahunan (`/api/target-tahunan`)
- `GET /api/target-tahunan`: Filter berdasarkan `tahun_anggaran` dan `denominasi_id`.
- `POST /api/target-tahunan`:
  - Input: `tahun_anggaran`, `denominasi_id`, `target_bilyet`, `catatan`.
  - Kalkulasi otomatis di backend:
    - `target_brood = target_bilyet / 1000`
    - `target_pack = target_brood / 45`
  - Proteksi keunikan: kombinasi `[tahun_anggaran, denominasi_id]` unik.
- `PUT /api/target-tahunan/:id` & `DELETE /api/target-tahunan/:id` (Role: `SUPERVISOR`).

#### D. Target Produksi Bulanan (`/api/target-bulanan`)
- `GET /api/target-bulanan`: Filter per `tahun_anggaran`, `bulan` (1-12), dan `denominasi_id`.
- `POST /api/target-bulanan`:
  - Input: `tahun_anggaran`, `bulan` (1-12), `denominasi_id`, `target_penyerahan_bilyet`, `target_pengemasan_bilyet`, `sisa_hari_kerja`.
  - Proteksi keunikan: kombinasi `[tahun_anggaran, bulan, denominasi_id]` unik.
- `PUT /api/target-bulanan/:id` & `DELETE /api/target-bulanan/:id` (Role: `SUPERVISOR`).

#### E. Transaksi HCTS & Rencana Penyerahan (`/api/hcts`, `/api/rencana-penyerahan`)
- `GET /api/hcts` & `POST /api/hcts`: Input dan rekap data mutasi persediaan HCTS (Hasil Cetak Tidak Sempurna) harian.
- `GET /api/rencana-penyerahan` & `POST /api/rencana-penyerahan`: Input rencana penyerahan mendatang & monitoring kekurangan kemas/terima.

#### F. Validasi Zod & Audit Trail
- Buat file validator `server/src/validators/master.validator.js` dan `server/src/validators/target.validator.js`.
- Setiap operasi mutasi (POST, PUT, DELETE) otomatis memanggil `createAuditLog` untuk mencatat riwayat ke tabel `audit_log`.

### 3. Kriteria Penerimaan (Acceptance Criteria)
- [ ] Seluruh endpoint Master Data (denominasi, emisi, shift, user) dapat diakses dengan respons JSON standar.
- [ ] Pengubahan data master (POST, PUT, DELETE) hanya dapat dilakukan oleh role `SUPERVISOR` (role `OPERATOR` ditolak 403 Forbidden).
- [ ] Pembuatan dan pembaruan akun user mengenkripsi password dengan bcrypt dan tidak mengekspos hash ke response.
- [ ] Endpoint Target Tahunan menghitung `target_brood` dan `target_pack` secara otomatis dan presisi.
- [ ] Endpoint Target Bulanan memvalidasi parameter bulan (1-12) dan sisa hari kerja.
- [ ] Endpoint Persediaan HCTS dan Rencana Penyerahan berfungsi untuk input, pembacaan, dan update data.
- [ ] Setiap aktivitas mutasi tercatat ke tabel `audit_log`.
- [ ] Seluruh automated test berjalan sukses (`npm test`).

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

### Step 3: Arsitektur Backend, Core Utilities (Konversi Satuan & Aturan Bisnis), & Auth/RBAC
- **GitHub Issue**: [#5](https://github.com/rickyriskiawan/khazprokhir/issues/5) *(Closed)*
- **Pull Request**: [#6](https://github.com/rickyriskiawan/khazprokhir/pull/6) *(Merged to main)*
- **Branch**: `feat/step-3-backend-arch-utils-auth`
- **Hasil**:
  - [x] Modul utilitas konversi satuan (`converter.js`) mengonversi bilyet, brood, pack, doos, dan nominal rupiah secara 100% presisi.
  - [x] Aturan bisnis (`businessRules.js`) memvalidasi kelipatan 4 pack, batas rentang 1-100, rasio 4 pack = 9 doos, dan deteksi gap dengan akurat.
  - [x] Endpoint `POST /api/auth/login` berhasil mengautentikasi pengguna, menerbitkan JWT, dan menolak password yang salah.
  - [x] Endpoint `GET /api/auth/me` mengembalikan data pengguna terautentikasi dan menolak akses tanpa token (401 Unauthorized).
  - [x] Middleware RBAC (`authorize`) memblokir akses pengguna yang rolenya tidak diizinkan (403 Forbidden).
  - [x] Helper audit trail berhasil mencatat log ke tabel `audit_log`.
  - [x] Seluruh unit dan integration test berjalan sukses (`npm test`).
