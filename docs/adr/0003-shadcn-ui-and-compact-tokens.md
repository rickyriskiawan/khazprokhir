# Adopsi Arsitektur Komponen Shadcn UI dengan Token Desain Kompak

## Status
Accepted

## Konteks & Keputusan
Aplikasi pemantauan produksi Khazprokhir membutuhkan konsistensi komponen antarmuka yang tinggi (tombol, input form, dialog modal, kartu metrik, status badge, dsb.) dengan volume data besar (matriks 100 pack, ribuan baris register doos). Sistem memutuskan mengadopsi arsitektur komponen berbasis Shadcn UI (komponen lokal di `client/src/components/ui/` yang modular dan headless) dengan tetap mempertahankan palet warna dan bayangan *Soft Elevated Minimalist* (canvas `#f1f3f7`, surface `#ffffff`/`dark:#12151c`, pitch `#0f1115`, emerald `#10b981`). Namun, tingkat kelengkungan sudut disesuaikan menjadi lebih kompak dan tegas (`rounded-xl` / `rounded-lg` alih-alih `rounded-3xl`) serta padding dirapatkan untuk menghadirkan kepadatan informasi tingkat enterprise (*dense enterprise-grade layout*).

## Konsekuensi
- Menambahkan alias `@` yang mengarah ke `client/src` pada Vite dan konfigurasi editor (`jsconfig.json`).
- Memasang dependensi utilitas pembantu `clsx`, `tailwind-merge`, dan `class-variance-authority` untuk fungsi `cn()`.
- Komponen UI bersifat transparan, dapat dikustomisasi langsung di direktori project tanpa ketergantungan library monolitik black-box.
- Ruang pandang layar di ruang kontrol operasional menjadi jauh lebih optimal karena terbebas dari ruang kosong berlebih (*negative whitespace*).

