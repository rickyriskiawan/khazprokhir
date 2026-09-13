# Khazprokhir Monitoring System - Master Development Roadmap & Issue Tracking

Dokumen ini berisi peta jalan (master roadmap) pengembangan aplikasi **Monitoring Produksi Uang Kertas Seksi Khazprokhir** yang dibagi menjadi langkah-langkah kecil (*bite-sized issues*). Dokumen ini dirancang sebagai panduan instruksi tingkat tinggi (*high-level instructions*) yang terstruktur untuk dikerjakan oleh programmer atau model LLM.

Setiap langkah harus disetujui oleh pengguna terlebih dahulu sebelum dieksekusi.

---

## 🗺️ Ringkasan Master Roadmap (Daftar Seluruh Langkah)

Agar tidak ada pengerjaan yang terlewat dari dokumen implementation_plan.md, alur pengerjaan dibagi menjadi 12 langkah terstruktur:

- [ ] **Step 1: Inisialisasi Project, Setup Environment (Dev vs Prod), & Docker Base** *(Sedang Aktif)*
- [ ] **Step 2: Skema Database (Prisma ORM), Migrasi, & Seeding Master Data Awal**
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

## 🎯 CURRENT STEP: ISSUE #01
### Judul: Inisialisasi Struktur Project, Konfigurasi Environment (Dev vs Prod), dan Docker Setup
**GitHub Issue Link**: [#1](https://github.com/rickyriskiawan/khazprokhir/issues/1)

### 1. Tujuan & Ruang Lingkup
Menginisialisasi fondasi dasar repository project dengan membagi dua komponen utama (client/ untuk frontend React+Vite dan server/ untuk backend Node.js+Express), menyusun manajemen variabel lingkungan terpisah (*development* vs *production*), serta menyediakan containerisasi Docker untuk database PostgreSQL.

### 2. Instruksi High-Level

#### A. Struktur Direktori
Buat struktur folder terstandarisasi:
- client/: Aplikasi web berbasis React + Vite + TailwindCSS.
- server/: REST API berbasis Node.js + Express + Prisma ORM.
- Root configuration: File orchestration Docker, script helper, dan dokumentasi.

#### B. Pembedaan Lingkungan (Development vs Production)
Pastikan pemisahan konfigurasi environment dirancang jelas:

| Aspek | Development Environment | Production Environment |
| :--- | :--- | :--- |
| **Database** | PostgreSQL via local Docker Compose (localhost:5432) dengan kredensial dev. | PostgreSQL production instance / Cloud SQL / container dedicated dengan connection pooling & volume aman. |
| **Konfigurasi Env** | Menggunakan file .env.development (termasuk mock JWT secret, log debug, port lokal). | Menggunakan file .env.production (kredensial ketat, JWT secret panjang & acak, HTTPS/SSL mode). |
| **CORS Policy** | Membuka akses untuk http://localhost:5173 (Vite dev server). | Membatasi ketat hanya domain resmi aplikasi produksi. |
| **Logging & Error** | Menampilkan error stack trace lengkap di console untuk kemudahan debugging. | Structured JSON log, error message aman/sanitized (tanpa membocorkan struktur internal), audit recording. |
| **Frontend Serving** | Vite Dev Server dengan Hot Module Replacement (HMR). | Production build (dist/) yang di-minify dan disajikan via reverse proxy Nginx atau Express static. |
| **Eksekusi Backend** | Berjalan dengan watch mode (misal 
odemon atau --watch). | Berjalan via process manager (PM2 / containerized entrypoint) dengan auto-restart. |

#### C. Inisialisasi Server & Client
1. **Server (server/)**:
   - Inisialisasi package.json dengan konfigurasi ES Modules atau CommonJS.
   - Install dependencies utama: express, cors, dotenv, zod, @prisma/client.
   - Install dev dependencies: prisma, 
odemon (atau equivalen).
   - Buat template .env.example, .env.development, dan template panduan .env.production.
2. **Client (client/)**:
   - Inisialisasi project React + Vite.
   - Setup konfigurasi dasar TailwindCSS dan struktur folder standar (src/components, src/pages, src/services, src/utils).
   - Buat template konfigurasi .env.development (VITE_API_URL=http://localhost:5000/api) dan .env.production.
3. **Docker Compose (docker-compose.yml)**:
   - Setup service container PostgreSQL versi 16+ untuk kebutuhan development database lokal.
   - Konfigurasi port mapping, environment variable database default, dan persistent storage volume untuk data lokal.

### 3. Kriteria Penerimaan (Acceptance Criteria)
1. Struktur folder client/ dan server/ terbentuk rapi tanpa file duplikat.
2. Perintah docker compose up -d (atau Docker service) berhasil menjalankan container PostgreSQL untuk database lokal development.
3. Server dapat dijalankan dalam mode development dan merespons health check endpoint (misal GET /api/health mengembalikan status OK).
4. Client Vite dapat dijalankan dalam mode development dan menampilkan halaman dasar tanpa error.
5. Konfigurasi file environment terpisah secara eksplisit antara .env.development dan petunjuk .env.production.

---

## 📋 Catatan Persetujuan Pengguna (User Sign-off)
- **Status Step 1**: Menunggu Persetujuan Pengguna (Pending User Approval).
- Pengerjaan kode untuk Step 1 hanya akan dimulai setelah pengguna memberikan instruksi persetujuan.
