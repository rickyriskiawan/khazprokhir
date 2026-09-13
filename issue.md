# Khazprokhir Monitoring System - Master Development Roadmap & Issue Tracking

Dokumen ini berisi peta jalan (*master roadmap*) pengembangan aplikasi **Monitoring Produksi Uang Kertas Seksi Khazprokhir** yang dibagi menjadi langkah-langkah kecil (*bite-sized issues*). Dokumen ini dirancang sebagai panduan instruksi tingkat tinggi (*high-level instructions*) yang terstruktur untuk dikerjakan oleh programmer atau model LLM.

Setiap langkah harus disetujui oleh pengguna terlebih dahulu sebelum dieksekusi.

---

## 📋 Ringkasan Master Roadmap (Daftar Seluruh Langkah)

Agar tidak ada pengerjaan yang terlewat dari dokumen `implementation_plan.md`, alur pengerjaan dibagi menjadi 12 langkah terstruktur:

- [x] **Step 1: Inisialisasi Project, Setup Environment (Dev vs Prod), & Docker Base** *(Selesai - PR [#2](https://github.com/rickyriskiawan/khazprokhir/pull/2))*
- [x] **Step 2: Skema Database (Prisma ORM), Migrasi, & Seeding Master Data Awal** *(Selesai - PR [#4](https://github.com/rickyriskiawan/khazprokhir/pull/4))*
- [x] **Step 3: Arsitektur Backend, Core Utilities (Konversi Satuan & Aturan Bisnis), & Auth/RBAC** *(Selesai - PR [#6](https://github.com/rickyriskiawan/khazprokhir/pull/6))*
- [x] **Step 4: API Master Data & Modul Target / Perencanaan Produksi** *(Selesai - PR [#8](https://github.com/rickyriskiawan/khazprokhir/pull/8))*
- [ ] **Step 5: Modul 1 - Penerimaan Barang Masuk (Bon Masuk Khazai & Registrasi Batch/Pack)** *(Aktif / Siap Dikerjakan)*
- [ ] **Step 6: Modul 2 - Proses Sortir & Penataan Pack (Kelipatan 4, Zero Reject, Sesi & Koreksi)**
- [ ] **Step 7: Modul 3 - Pengemasan Doos / Hasil Kemas (Rasio 4 Pack = 9 Doos, Penomoran Doos & BA Kemas)**
- [ ] **Step 8: Modul 4 - Monitoring Doos, Buku Register & Deteksi Gap Otomatis**
- [ ] **Step 9: Modul 5 - Pengiriman ke Bank Indonesia & Cetak Dokumen Resmi BI**
- [ ] **Step 10: Modul 6 & 7 - Mesin Agregasi Laporan Eksekutif 5 Tabel & Export (Excel Dinamis + PDF Resmi)**
- [ ] **Step 11: Modul 8 - Frontend UI, Dashboard Real-time, & Matriks Interaktif 100 Pack**
- [ ] **Step 12: Modul 9 - Audit Trail, Automated Testing, Verifikasi Menyeluruh, & Deployment Readiness**

---

## 🎯 CURRENT STEP: ISSUE #05
### Judul: Modul 1 - Penerimaan Barang Masuk (Bon Masuk Khazai & Registrasi Batch/Pack)
- **GitHub Issue**: *(Akan dibuat saat pengerjaan dimulai)*
- **Branch Rekomendasi**: `feat/step-5-bon-masuk-and-batch`
- **Status**: Siap Dikerjakan (Menunggu Persetujuan Pengguna)

### 1. Tujuan & Ruang Lingkup
Mengimplementasikan seluruh endpoint RESTful API untuk **Modul Barang Masuk (Input Bon dari Khazai)**. Menangani pencatatan bon masuk fisik berdasar nomor segel (`no_segel`) unik, pembuatan atau pengaitan entitas `batch` (nomor order, seri, kepala, denominasi, emisi), auto-generasi dan pembaharuan status 100 record `pack_detail` menjadi `RECEIVED`, kalkulasi volume lembar bilyet, validasi range nomor pack (1–100) tanpa overlap, serta ringkasan penerimaan harian.

### 2. Instruksi High-Level

#### A. Pengelolaan Batch (`/api/batches`)
- `GET /api/batches`: Mengambil daftar batch dengan filter `tahun_anggaran`, `nomor_batch`, `emisi_id`, `status`. Mengembalikan relasi emisi, denominasi, rekap jumlah pack yang telah diterima vs total (100 pack).
- `GET /api/batches/:id`: Mengambil detail batch lengkap dengan status individual 100 pack (1 s/d 100).
- `POST /api/batches`: Registrasi batch baru secara eksplisit (opsional jika dibuat via bon masuk). Validasi keunikan kombinasi `[nomor_batch, tahun_anggaran]`.

#### B. Penerimaan Bon Masuk (`/api/bon-masuk`)
- `GET /api/bon-masuk`: List bon masuk dengan opsi filter & pagination (`tahun_anggaran`, `no_segel`, `tanggal_masuk`, `batch_id`, `shift_id`).
- `GET /api/bon-masuk/:id`: Detail bon masuk beserta rentang pack dan daftar pack terkait.
- `POST /api/bon-masuk`:
  - Input: `tahun_anggaran`, `no_segel`, `tanggal_masuk`, `jam_masuk`, `nomor_batch`, `seri`, `kepala`, `emisi_id`, `pack_dari`, `pack_sampai`, `jenis_mesin_sortir`, `kategori_penerimaan` (`MASINAL` | `PARSIAL`), `shift_id`, `catatan`.
  - **Logika Bisnis & Integritas Data**:
    1. Periksa apakah batch (`nomor_batch` + `tahun_anggaran`) sudah ada. Jika belum ada, buat batch baru dengan metadata seri, kepala, dan emisi. Jika sudah ada, kunci metadata dari batch existing.
    2. Validasi rentang pack: `1 <= pack_dari <= pack_sampai <= 100`.
    3. Validasi tumpang tindih (*overlap*): Pastikan tidak ada nomor pack dalam rentang tersebut yang sudah berstatus `RECEIVED` atau lebih tinggi pada batch yang sama.
    4. Auto-kalkulasi bilyet: `jumlah_bilyet = (pack_sampai - pack_dari + 1) * 45 * 1000`.
    5. Buat data `bon_masuk` dengan `operator_id = req.user.id`.
    6. Buat / update record `pack_detail` untuk nomor pack dalam rentang tersebut dengan `status: RECEIVED` dan relasi ke `bon_masuk_id`.
- `DELETE /api/bon-masuk/:id`: Pembatalan bon masuk (Role: `SUPERVISOR`). Mengembalikan status pack terkait ke `PENDING` atau menghapusnya jika belum diproses lebih lanjut, serta mencatat audit log.
- `GET /api/bon-masuk/summary/today`: Ringkasan data penerimaan hari ini (total bon masuk, total bilyet, rekap per denominasi).

#### C. Validasi Zod & RBAC
- Buat file validator `server/src/validators/bon-masuk.validator.js`.
- Endpoint `POST /api/bon-masuk` dapat diakses oleh role `OPERATOR` dan `SUPERVISOR`.
- Endpoint `DELETE /api/bon-masuk/:id` dibatasi hanya untuk role `SUPERVISOR`.
- Setiap mutasi data wajib memanggil `createAuditLog({ module: 'bon_masuk', ... })`.

### 3. Kriteria Penerimaan (Acceptance Criteria)
- [ ] Endpoint `POST /api/bon-masuk` berhasil mencatat penerimaan bon fisik dari Khazai dengan nomor segel unik (`no_segel`).
- [ ] Validasi keunikan batch per tahun anggaran (`nomor_batch + tahun_anggaran`). Jika batch belum ada dibuat otomatis; jika sudah ada, metadata seri/kepala/emisi terkunci dari batch existing.
- [ ] Auto-kalkulasi volume lembar bilyet: `jumlah_bilyet = (pack_sampai - pack_dari + 1) * 45.000`.
- [ ] Meng-generate / memperbarui status record `pack_detail` menjadi `RECEIVED` sesuai range tanpa overlap nomor pack dalam 1 batch.
- [ ] Validasi rentang nomor pack berada dalam batas 1 s/d 100 (`pack_dari <= pack_sampai`).
- [ ] Role `OPERATOR` dan `SUPERVISOR` dapat menginput bon masuk.
- [ ] Pembatalan bon masuk hanya dapat dilakukan oleh role `SUPERVISOR` dan me-revert status pack terkait.
- [ ] Seluruh mutasi data tercatat di tabel `audit_log`.
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

### Step 4: API Master Data & Modul Target / Perencanaan Produksi
- **GitHub Issue**: [#7](https://github.com/rickyriskiawan/khazprokhir/issues/7) *(Closed)*
- **Pull Request**: [#8](https://github.com/rickyriskiawan/khazprokhir/pull/8) *(Merged / Pending Merge to main)*
- **Branch**: `feat/step-4-api-master-and-target`
- **Hasil**:
  - [x] Seluruh endpoint Master Data (denominasi dengan kode huruf S s/d Y, emisi, shift, user) dapat diakses dengan respons JSON standar.
  - [x] Pengubahan data master (POST, PUT, DELETE) hanya dapat dilakukan oleh role `SUPERVISOR` (role `OPERATOR` ditolak 403 Forbidden).
  - [x] Pembuatan dan pembaruan akun user mengenkripsi password dengan bcrypt dan tidak mengekspos hash ke response.
  - [x] Endpoint Target Tahunan menghitung `target_brood` dan `target_pack` secara otomatis dan presisi.
  - [x] Endpoint Target Bulanan memvalidasi parameter bulan (1-12) dan sisa hari kerja.
  - [x] Endpoint Persediaan HCTS dan Rencana Penyerahan berfungsi untuk input, pembacaan, dan update data.
  - [x] Setiap aktivitas mutasi tercatat ke tabel `audit_log`.
  - [x] Master denominasi disesuaikan dengan kode huruf resmi: 1000 = S, 2000 = T, 5000 = U, 10000 = V, 20000 = W, 50000 = X, 100000 = Y.
  - [x] Seluruh 59 automated test berjalan sukses (`npm test`).
