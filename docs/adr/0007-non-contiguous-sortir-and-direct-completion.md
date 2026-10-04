# Pemilihan Quad Pack Non-Kontigu dan Alur Langsung Selesai (Direct Completion) pada Modul Sortir

## Status
Accepted

## Konteks & Keputusan
Dalam alur kerja Seksi Khazprokhir, proses sortir (Modul 2) memverifikasi pack uang kertas hasil cetak yang telah diterima (`RECEIVED`) menjadi pack siap kemas (`SORTED`). Pada implementasi awal backend, model `ProsesSortir` mengasumsikan satu rentang linier kontigu tunggal (`pack_dari` s/d `pack_sampai`) serta menerapkan alur bertahap dengan status antara (`IN_PROGRESS` menuju `COMPLETED`).

Berdasarkan kesepakatan dan klarifikasi kebutuhan operasional lantai pabrik:
1. **Pemilihan Quad Pack Non-Kontigu (Sortir Acak Kelipatan 4)**:
   Penyortir di lantai kerja tidak selalu menyortir pack secara berurutan dalam satu rentang linier kontigu. Operator kerap menyortir beberapa kelompok quad pack yang terpisah (misalnya Quad 1: pack 1–4, dilanjutkan Quad 4–5: pack 13–20, total 12 pack). Sistem tidak membatasi sortir pada satu rentang `pack_dari` s/d `pack_sampai`. Pemilihan pack dilakukan secara visual berbasis klik atomik kelompok kelipatan 4 pada komponen `PackMatrixGrid` 10x10, dan daftar nomor pack disimpan dalam atribut `nomor_pack_list` (contoh: `"1,2,3,4,13,14,15,16,17,18,19,20"`), dengan tetap menyediakan fallback `pack_dari` & `pack_sampai` (min & max) untuk kompatibilitas data lama.
2. **Alur Langsung Selesai (Direct Completion / No IN_PROGRESS Overhead)**:
   Sesuai prinsip *Zero Reject* (seluruh bilyet dan pack 100% utuh tanpa pengurangan), pencatatan sortir dilakukan sesaat setelah petugas selesai memeriksa dan menata fisik pack. Oleh karena itu, status antara `IN_PROGRESS` ditiadakan dari formulir operasional UI. Setiap kali formulir sesi sortir disimpan, sesi langsung berstatus final `COMPLETED` (`completed_at = now()`), dan seluruh pack yang dipilih seketika bertransisi dari status `RECEIVED` ke `SORTED` (langsung siap untuk dikemas di Modul 3).
3. **Penyederhanaan Formulir Operasional (Pure Grid Selection & No Meja Field)**:
   - Pemilihan nomor pack murni melalui klik petak matriks 10x10 interaktif (`PackMatrixGrid`), meniadakan input teks manual rentang pack di modal formulir sortir untuk mencegah kesalahan ketik manual.
   - Tidak ada field terpisah untuk meja sortir atau nomor mesin sortir. Field `catatan` disediakan sebagai textarea teks bebas opsional jika terdapat catatan operasional khusus.
   - Formulir mencatat Petugas Penyortir 1 (wajib) & Petugas Penyortir 2 (opsional), shift kerja, tanggal sesi, serta kalkulator live Zero Reject (total pack, total brood = pack × 45, total bilyet = pack × 45.000).
4. **Safety Locking & RBAC Pembatalan Sesi**:
   - Pembatalan sesi sortir yang sudah selesai hanya dapat dilakukan oleh role `SUPERVISOR` atau `ADMIN`.
   - Pembatalan sesi akan mengembalikan status pack dari `SORTED` kembali menjadi `RECEIVED`.
   - Jika terdapat salah satu pack dalam sesi tersebut yang sudah berstatus `PACKED` (telah diproses dalam pengemasan doos di Modul 3), maka tombol pembatalan dinonaktifkan (*disabled*) dengan tooltip penjelasan untuk menjaga integritas data hulu-hilir.

## Konsekuensi
- Skema model `ProsesSortir` di Prisma diperkaya dengan kolom `nomor_pack_list String?` (nullable untuk backward compatibility).
- Endpoint backend `POST /api/sortir` diperbarui untuk menerima array `selected_packs: number[]` atau string `nomor_pack_list`, langsung menyimpan status sebagai `COMPLETED`, dan memperbarui pack terpilih ke status `SORTED`.
- Antarmuka form sortir menjadi ringkas dan cepat tanpa beban status `IN_PROGRESS` yang berpotensi menimbulkan sesi menggantung.
- Tampilan tabel riwayat sortir menggunakan format rentang kompak gabungan yang rapi (contoh: `Pack 01–04, 13–20` dengan badge total pack).
