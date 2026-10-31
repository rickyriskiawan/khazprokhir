# Target Produksi Multi-Emisi per Tahun Anggaran dan Pembulatan Ke Atas (Ceiling) Doos

## Status
Accepted

## Konteks & Keputusan
Pada rancangan awal, model `TargetTahunan` hanya mengizinkan satu target per pecahan untuk setiap `Tahun Anggaran` (`@@unique([tahun_anggaran, denominasi_id])`), diinput satu pecahan per permintaan API, dan tidak mencatat relasi terhadap `Tahun Emisi` maupun hasil konversi `Doos`. Dalam operasional nyata Seksi Khazprokhir:

1. **Multi-Emisi dalam Satu Tahun Anggaran & Sinkronisasi Master Emisi**:
   Dalam satu `Tahun Anggaran` (misal `TA 2026`), kuota produksi dapat mencakup lebih dari satu `Tahun Emisi` (misal `TE 2022` dan `TE 2026`). Oleh karena itu, keunikan `Target Produksi` ditetapkan pada kombinasi `(tahun_anggaran, tahun_emisi, denominasi_id)` dan berelasi langsung ke record `Emisi` (`emisi_id`). Saat pengguna memasukkan `Tahun Emisi` baru pada formulir Target Produksi, sistem secara otomatis memastikan/membuat data Master `Emisi` (`TE <tahun>` dengan sandi `Y'<2-digit>` s/d `S'<2-digit>`) untuk ketujuh pecahan agar langsung konsisten saat dipakai di modul Batch dan Laporan.
2. **Input Kolektif 7 Pecahan Sekaligus & Acuan Induk**:
   Pembuatan maupun pembaruan Target Produksi dilakukan secara kolektif dalam satu transaksi atomik untuk pasangan `(Tahun Anggaran, Tahun Emisi)` yang mencakup ketujuh pecahan (`Y` s/d `S`) dalam satuan **Bilyet** (pecahan tanpa kuota bernilai `0`, minimal satu pecahan `> 0`). Pasangan `(Tahun Anggaran, Tahun Emisi)` pada Target Produksi ini menjadi acuan induk (*parent reference*) bagi target turunan lainnya, serta dilindungi *safety lock* agar tidak dapat dihapus apabila sudah terdapat `Batch` produksi pada kombinasi Tahun Anggaran dan Tahun Emisi tersebut.
3. **Pembulatan Ke Atas (*Ceiling*) Konversi Bilyet ke Doos untuk Sisa ("Buntut") Bilyet**:
   Angka `Target Produksi` dalam satuan Bilyet tidak selalu habis dibagi `20.000` (kapasitas standar `1 Doos = 20.000 Bilyet`), misalnya `900.000.500 Bilyet`. Karena sisa bilyet ("buntut") yang menggantung tetap harus dimasukkan ke dalam 1 fisik Doos tersendiri dan tidak dapat digabung lintas pecahan, maka jumlah target Doos per pecahan wajib dihitung dengan pembulatan ke atas:
   `target_doos = ceil(target_bilyet / 20.000)` (contoh: `900.000.500 Bilyet` = `45.001 Doos`).
   Akumulasi **Total Doos** pada tingkat Tahun Emisi maupun Tahun Anggaran dihitung dari penjumlahan `target_doos` masing-masing pecahan.

## Konsekuensi
- Skema `TargetTahunan` diperbarui dengan kolom `tahun_emisi Int`, `emisi_id Int`, dan `target_doos Int`, serta constraint unik komposit `@@unique([tahun_anggaran, tahun_emisi, denominasi_id])`.
- Endpoint `/api/target-tahunan` mendukung pembuatan, pembaruan, dan penghapusan berbasis grup `(tahun_anggaran, tahun_emisi)` untuk 7 pecahan sekaligus.
- Antarmuka `/target-produksi` mengelompokkan data berdasarkan **Tahun Anggaran** (kartu tingkat pertama) dan **Tahun Emisi** (sub-panel tingkat kedua) dengan tabel ringkas 3 kolom: `Pecahan` (sandi emisi seperti `Y'22`), `Target (Bilyet)`, dan `Target (Doos)`.
