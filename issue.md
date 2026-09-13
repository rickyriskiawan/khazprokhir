# Khazprokhir Monitoring System - Master Development Roadmap & Issue Tracking

Dokumen ini berisi peta jalan (*master roadmap*) pengembangan aplikasi **Monitoring Produksi Uang Kertas Seksi Khazprokhir** yang dibagi menjadi langkah-langkah kecil (*bite-sized issues*). Dokumen ini dirancang sebagai panduan instruksi tingkat tinggi (*high-level instructions*) yang terstruktur untuk dikerjakan oleh programmer atau model LLM.

Setiap langkah harus disetujui oleh pengguna terlebih dahulu sebelum dieksekusi.

---

## 📋 Ringkasan Master Roadmap (Daftar Seluruh Langkah)

Agar tidak ada pengerjaan yang terlewat dari dokumen `implementation_plan.md`, alur pengerjaan dibagi menjadi 12 langkah terstruktur:

- [x] **Step 1: Inisialisasi Project, Setup Environment (Dev vs Prod), & Docker Base** *(Selesai - PR [#2](https://github.com/rickyriskiawan/khazprokhir/pull/2))*
- [ ] **Step 2: Skema Database (Prisma ORM), Migrasi, & Seeding Master Data Awal** *(Aktif - Issue [#3](https://github.com/rickyriskiawan/khazprokhir/issues/3))*
- [ ] **Step 3: Arsitektur Backend, Core Utilities (Konversi Satuan & Aturan Bisnis), & Auth/RBAC**
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

## 🎯 CURRENT STEP: ISSUE #02
### Judul: Skema Database (Prisma ORM), Migrasi, & Seeding Master Data Awal
- **GitHub Issue**: [#3](https://github.com/rickyriskiawan/khazprokhir/issues/3)
- **Branch Rekomendasi**: `feat/step-2-db-schema-and-seed`
- **Status**: Siap Dikerjakan (Menunggu Persetujuan Pengguna)

### 1. Tujuan & Ruang Lingkup
Mengimplementasikan skema database relasional secara komprehensif menggunakan **Prisma ORM** pada backend Node.js (`server/`) sesuai ERD dan aturan bisnis Khazprokhir. Meliputi pembuatan model entitas lengkap, relasi referensial, penegakan constraint integritas data (unique constraint, check range, status enum), eksekusi migrasi awal ke PostgreSQL lokal, penyediaan singleton instance Prisma Client, serta pembuatan skrip seeding master data awal (denominasi rupiah TE 2022 S'22-Y'22, master shift, akun pengguna awal dengan hash bcrypt, dan target awal TA 2026).

### 2. Instruksi High-Level

#### A. Pembuatan Skema Prisma (`server/prisma/schema.prisma`)
Definisikan datasource (`postgresql`) dan generator (`prisma-client-js`), serta seluruh entitas model:
1. **Enums**:
   - `Role`: `OPERATOR`, `SUPERVISOR`, `MANAGEMENT`, `AUDITOR`
   - `KategoriPenerimaan`: `MASINAL`, `PARSIAL`
   - `StatusPack`: `PENDING`, `RECEIVED`, `SORTED`, `PACKED`, `SHIPPED`
   - `StatusSortir`: `IN_PROGRESS`, `COMPLETED`
   - `StatusKemas`: `READY`, `SHIPPED`
   - `StatusPengiriman`: `DRAFT`, `APPROVED`, `SHIPPED`
   - `AuditAction`: `CREATE`, `UPDATE`, `DELETE`
2. **Model Master & Autentikasi**:
   - `User`: `id`, `username` (unique), `password_hash`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`.
   - `Denominasi`: `id`, `nama`, `nilai` (int), `is_active`.
   - `Emisi`: `id`, `kode_emisi`, `sandi`, `tahun`, `denominasi_id` (FK), `is_active`.
   - `Shift`: `id`, `nama`, `jam_mulai`, `jam_selesai`, `is_active`.
3. **Model Perencanaan & Target**:
   - `TargetTahunan`: `id`, `tahun_anggaran`, `denominasi_id` (FK), `target_bilyet` (BigInt), `target_brood` (BigInt), `target_pack` (Int), `catatan`, timestamps.
   - `TargetBulanan`: `id`, `tahun_anggaran`, `bulan` (1-12), `denominasi_id` (FK), `target_penyerahan_bilyet` (BigInt), `target_pengemasan_bilyet` (BigInt), `sisa_hari_kerja` (Int), timestamps.
4. **Model Alur Operasional Produksi**:
   - `Batch`: `id`, `nomor_batch`, `tahun_anggaran`, `seri`, `kepala`, `emisi_id` (FK), `jumlah_pack` (default 100), `status`, timestamps. Unique constraint: `@@unique([nomor_batch, tahun_anggaran])`.
   - `BonMasuk`: `id`, `no_segel` (unique), `batch_id` (FK), `tanggal_masuk`, `jam_masuk`, `pack_dari`, `pack_sampai`, `jumlah_bilyet` (BigInt), `jenis_mesin_sortir`, `kategori_penerimaan`, `shift_id` (FK), `operator_id` (FK), `catatan`, timestamps.
   - `PackDetail`: `id`, `batch_id` (FK), `bon_masuk_id` (FK, nullable), `nomor_pack` (1-100), `jumlah_brood` (default 45), `jumlah_bilyet` (BigInt, default 45000), `hasil_kemas_id` (FK, nullable), `no_doos_range` (nullable), `status`, timestamps. Unique constraint: `@@unique([batch_id, nomor_pack])`.
   - `ProsesSortir` & `SortirPackDetail`: Relasi penataan/pengurutan pack kelipatan 4 tanpa reject.
   - `HasilKemas` & `KemasPackDetail`: Relasi kardus kemas doos (4 pack = 9 doos). Scoping nomor doos per pecahan dan tahun anggaran.
   - `Pengiriman` & `PengirimanDetail`: Rekap pengiriman ke Bank Indonesia, `nomor_surat_jalan` (unique), `no_ba_penyerahan`, total doos, total bilyet, total nominal rupiah.
5. **Model Laporan Tambahan & Audit**:
   - `TransaksiHcts`: Persediaan & mutasi HCTS (Hasil Cetak Tidak Sempurna) harian.
   - `RencanaPenyerahan`: Rencana serah mendatang, kekurangan kemas & terima.
   - `AuditLog`: Log append-only aktivitas transaksi sistem.

#### B. Instance Prisma Client (`server/src/lib/prisma.js`)
- Buat modul pembungkus Prisma Client singleton dengan handling graceful logging pada mode development dan pemutusan koneksi otomatis saat proses berhenti.

#### C. Migrasi Database PostgreSQL
- Pastikan container database PostgreSQL berjalan (`docker compose up -d`).
- Jalankan migrasi Prisma awal:
  ```bash
  npx prisma migrate dev --name init_khazprokhir_schema
  ```

#### D. Skrip Seeding Master Data (`server/prisma/seed.js`)
Buat script seeding yang bersifat idempoten (menggunakan `upsert`):
1. **Master Denominasi & Emisi (TE 2022)**:
   - Rp100.000 (Sandi: `Y'22`, Nilai: 100000)
   - Rp50.000 (Sandi: `X'22`, Nilai: 50000)
   - Rp20.000 (Sandi: `W'22`, Nilai: 20000)
   - Rp10.000 (Sandi: `V'22`, Nilai: 10000)
   - Rp5.000 (Sandi: `U'22`, Nilai: 5000)
   - Rp2.000 (Sandi: `T'22`, Nilai: 2000)
   - Rp1.000 (Sandi: `S'22`, Nilai: 1000)
2. **Master Shift**:
   - Shift 1 (06:00 - 14:00)
   - Shift 2 (14:00 - 22:00)
   - Shift 3 (22:00 - 06:00)
3. **Akun Pengguna Default**:
   - `operator` / Password hash bcrypt (Role: `OPERATOR`, Nama: Operator Khazprokhir)
   - `supervisor` / Password hash bcrypt (Role: `SUPERVISOR`, Nama: M. Rulli Maulana / Kepala Seksi)
   - `manajemen` / Password hash bcrypt (Role: `MANAGEMENT`, Nama: Pimpinan Departemen)
   - `auditor` / Password hash bcrypt (Role: `AUDITOR`, Nama: Tim Kepatuhan / Auditor)
4. **Data Awal Target TA 2026**:
   - Default target tahunan dan target bulanan sebagai basis verifikasi modul laporan.

#### E. Konfigurasi `package.json`
- Tambahkan konfigurasi `"prisma": { "seed": "node prisma/seed.js" }` di `server/package.json`.
- Tambahkan shortcut scripts:
  - `"db:migrate": "prisma migrate dev"`
  - `"db:seed": "prisma db seed"`
  - `"db:studio": "prisma studio"`

### 3. Kriteria Penerimaan (Acceptance Criteria)
- [ ] File `server/prisma/schema.prisma` terdefinisi lengkap mencakup seluruh entitas, relasi, enum, dan constraint.
- [ ] Migrasi database `init_khazprokhir_schema` berhasil dieksekusi ke PostgreSQL lokal tanpa error.
- [ ] Script seeding `prisma/seed.js` berhasil dijalankan (`npm run db:seed` atau `npx prisma db seed`) dan bersifat idempoten.
- [ ] Seluruh data master (7 denominasi, 7 emisi, 3 shift, 4 user role, dan sample target) terverifikasi tersimpan di database.
- [ ] Modul Prisma Client singleton di `server/src/lib/prisma.js` siap di-import oleh layer service/controller.

---

## 📦 Riwayat Langkah Selesai (Completed Steps)

### Step 1: Inisialisasi Struktur Project, Konfigurasi Environment (Dev vs Prod), dan Docker Setup
- **GitHub Issue**: [#1](https://github.com/rickyriskiawan/khazprokhir/issues/1) *(Closed)*
- **Pull Request**: [#2](https://github.com/rickyriskiawan/khazprokhir/pull/2) *(Pending Review)*
- **Branch**: `feat/step-1-init-project-and-env`
- **Hasil**:
  - [x] Struktur folder `client/` (React + Vite + TailwindCSS) dan `server/` (Express + Prisma) terbentuk rapi.
  - [x] Service container PostgreSQL 16 terkonfigurasi di `docker-compose.yml`.
  - [x] Healthcheck endpoint `GET /api/health` merespons status 200 OK.
  - [x] Frontend React Vite berjalan dan terhubung ke backend.
  - [x] Konfigurasi environment terpisah jelas antara development (`.env.development`) dan template production (`.env.production.example`).
