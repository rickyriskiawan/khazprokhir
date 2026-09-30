# Penerimaan Bon Masuk Multi-Batch, Segel Berbasis Tahun Anggaran, dan Alokasi Pack Acak

## Status
Accepted

## Konteks & Keputusan
Dalam operasional fisik Khazanah Awal (Khazai) ke Khazprokhir, serah terima uang kertas memiliki fleksibilitas dan kondisi nyata sebagai berikut:
1. **Multi-Batch dalam Satu Wadah Bersegel**: Satu nomor segel fisik (`no_segel`) pada wadah/kantong pengiriman dapat memuat lebih dari satu batch produksi, bahkan dapat terdiri dari denominasi/pecahan uang kertas yang berbeda.
2. **Nomor Segel Berbasis Tahun Anggaran**: Nomor segel fisik dapat digunakan kembali pada siklus tahun anggaran yang berbeda. Oleh karena itu, constraint keunikan segel di database diubah menjadi komposit: `@@unique([no_segel, tahun_anggaran])`.
3. **Pencatatan Nomor Pack Acak (Non-Contiguous Multi-Range)**: Penerimaan pack uang kertas tidak selalu berurutan penuh (misal hanya pack tertentu: `1-10, 13, 16, 20, 22`). Sistem mengimplementasikan parser string rentang acak yang memvalidasi batas (1–100), memastikan ketiadaan duplikasi, dan mengalokasikan pack secara atomik ke tabel `PackDetail`.
4. **Safety Locking Granular Tingkat Item Batch**:
   - Jika suatu dokumen Bon Masuk memuat Batch A dan Batch B: apabila Batch A telah mulai diproses sortir (ada pack berstatus `SORTED`, `PACKED`, atau `SHIPPED`), Batch A terkunci dan tidak dapat diubah/dihapus.
   - Namun, Batch B yang seluruh pack-nya masih berstatus `RECEIVED` tetap diizinkan untuk disunting (koreksi nomor pack) atau dihapus dari dokumen Bon Masuk tersebut.
   - Pembatalan seluruh dokumen Bon Masuk (`DELETE /api/bon-masuk/:id`) hanya diizinkan jika seluruh item batch di dalamnya belum masuk tahap sortir.
5. **Smart Batch Combobox**: Pencarian batch mendukung pencarian fleksibel melalui `nomor_batch` maupun kombinasi `seri + kepala` (contoh: `AA-BA0` atau `AA-BA 0`). Apabila batch belum terdaftar, sistem secara cerdas mengekstrak digit angka terakhir sebagai `kepala` dan karakter huruf sebelumnya sebagai `seri`, lalu mengisikannya secara otomatis (*pre-filled*) ke form registrasi batch baru.
6. **Struktur Model Data Prisma**:
   - Model `BonMasuk` berperan sebagai Header dokumen (menyimpan `no_bon`, `no_segel`, `tahun_anggaran`, `tanggal_masuk`, `jam_masuk`, `shift_id`, `kategori_penerimaan`, `jenis_mesin_sortir`, `petugas_khazai`, `petugas_khazprokhir`, `catatan`).
   - Model baru `BonMasukItem` menyimpan rincian per batch (`id`, `bon_masuk_id`, `batch_id`, `nomor_pack_list`, `pack_dari`, `pack_sampai`, `total_pack`, `jumlah_bilyet`) dengan constraint `@@unique([bon_masuk_id, batch_id])`.
   - Model `PackDetail` tetap mempertahankan relasi langsung dengan `bon_masuk_id` dan `batch_id` sehingga menjamin kompatibilitas 100% dengan modul hilir (Sortir dan Kemas).

## Konsekuensi
- Skema database di `server/prisma/schema.prisma` diperbarui dengan model `BonMasukItem` dan migrasi dijalankan.
- Utilitas parser string pack dibuat di backend (`server/src/utils/packParser.js`) dan frontend (`client/src/utils/packParser.js`) dengan pengetesan unit komprehensif.
- Controller `server/src/controllers/bon-masuk.controller.js` dan validator `bon-masuk.validator.js` disesuaikan untuk menerima payload daftar batch (`items: [...]`) dan menerapkan safety lock per item batch.
- Form modal `BonMasukFormModal.jsx` direfaktor menjadi form dinamis berulang (*repeater*) dengan kalkulator instan per baris batch dan agregasi total wadah segel.
- Tampilan tabel `BonMasukPage.jsx` dan modal detail `BonMasukDetailModal.jsx` disesuaikan untuk menyajikan visualisasi multi-batch dan progress bar keterisian 100 pack per batch.

