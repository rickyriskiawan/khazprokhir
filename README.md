# Khazprokhir - Sistem Monitoring Produksi Uang Kertas

Aplikasi monitoring alur produksi uang kertas Seksi Khazanah Produk Akhir (Khazprokhir) mulai dari penerimaan barang masuk (HCS dari Khazai), proses pengurutan/sortir kelipatan 4 pack, pengemasan ke dalam doos (4 pack = 9 doos), monitoring buku register fisik doos & deteksi gap, pengiriman ke Bank Indonesia, hingga penyusunan Laporan Persediaan dan Produksi resmi 5 tabel.

---

## ??? Struktur Direktori

```
khazprokhir/
??? client/                     # Frontend App (React 19 + Vite + TailwindCSS)
?   ??? src/
?   ?   ??? components/         # Reusable UI components
?   ?   ??? pages/              # Halaman / Views aplikasi
?   ?   ??? services/           # HTTP Client & API integration
?   ?   ??? App.jsx             # Root layout & health status check
?   ?   ??? main.jsx
?   ??? .env.development        # Environment konfigurasi development lokal
?   ??? .env.production.example # Template panduan environment produksi
?   ??? package.json
?
??? server/                     # Backend API (Node.js + Express 5 + Prisma ORM)
?   ??? src/
?   ?   ??? controllers/        # Request handlers
?   ?   ??? routes/             # Route definitions
?   ?   ??? middleware/         # Auth, RBAC, audit logger, CORS
?   ?   ??? services/           # Core business logic
?   ?   ??? utils/              # Conversion & helper functions
?   ?   ??? validators/         # Input schemas (Zod)
?   ?   ??? app.js              # Express app setup
?   ?   ??? index.js            # Server entry point
?   ??? .env.development        # Environment konfigurasi development lokal
?   ??? .env.production.example # Template panduan environment produksi
?   ??? package.json
?
??? docker-compose.yml          # Container PostgreSQL lokal untuk development
??? implementation_plan.md      # Rencana teknis lengkap & spesifikasi sistem
??? issue.md                    # Tracker roadmap 12 langkah pengerjaan
??? README.md
```

---

## ?? Pembedaan Lingkungan (Development vs Production)

| Aspek | Development Environment | Production Environment |
| :--- | :--- | :--- |
| **Database** | PostgreSQL lokal via Docker (`docker compose up -d`) atau service lokal (`localhost:5432`). | PostgreSQL Production instance dengan persistent storage, backup otomatis, dan connection pooling (PgBouncer). |
| **Variabel Env** | Menggunakan `.env.development` (port lokal, mock JWT secret, logging verbose). | Menggunakan `.env.production` (kredensial ketat, JWT secret acak min 64 char, SSL enabled). |
| **CORS Policy** | Membuka origin Vite dev (`http://localhost:5173`). | Domain resmi whitelist (`https://khazprokhir.peruri.co.id`). |
| **Logging & Error** | Full stack trace di console untuk kemudahan debugging. | Structured JSON logging, error response sanitized tanpa membocorkan internal server error. |
| **Frontend Serving** | Vite Dev Server dengan Hot Module Replacement (HMR). | Production bundle (`client/dist`) di-minify dan disajikan via Nginx / CDN. |
| **Process Manager** | Mode watch (`nodemon` atau `node --watch`). | Process manager (`PM2` / Docker container) dengan auto-restart dan load balancing. |

---

## ?? Panduan Menjalankan (Development)

### 1. Database
Anda dapat menggunakan container Docker PostgreSQL:
```bash
docker compose up -d
```
*Atau menggunakan service PostgreSQL lokal yang sudah terinstall di WSL (port 5432, database `khazprokhir_dev`).*

### 2. Backend Server
```bash
cd server
npm install
npm run dev
```
Backend API akan berjalan di `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`).

### 3. Frontend Client
```bash
cd client
npm install
npm run dev
```
Frontend web akan berjalan di `http://localhost:5173`.
