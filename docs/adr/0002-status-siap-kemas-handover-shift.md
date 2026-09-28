# Siklus Pengemasan Dua Fase (SIAP_KEMAS ke READY) untuk Handover Antar-Shift

## Status
Accepted

## Konteks & Keputusan
Operasional Khazprokhir berjalan dalam 3 shift berkelanjutan di mana persiapan nomor pack dan perakitan fisik doos sering kali melintasi pergantian jam kerja (handover). Sistem memutuskan membagi siklus hidup `HasilKemas` menjadi dua fase: status awal `SIAP_KEMAS` (yang mengunci alokasi nomor pack agar tidak direbut sesi lain tetapi status fisik pack tetap `SORTED`), dan endpoint konfirmasi fisik (`POST /api/kemas/:id/complete`) yang mengubah status menjadi `READY` serta status pack menjadi `PACKED`. Keputusan ini diambil untuk mencegah perebutan (*race condition*) nomor pack antar-meja kemas sekaligus menjamin keadilan atribusi output KPI fisik antara shift yang menyiapkan antrian dan shift yang mengeksekusi pengemasan.

## Konsekuensi
- Modul kemas memiliki dua filter tampilan: "Antrian WIP Siap Kemas" dan "Stok Doos Selesai (READY)".
- Metrik dashboard ringkasan harian memisahkan secara eksplisit antara `antrian_wip` dan `output_selesai`.
- Operator shift kedua dapat mengambil alih dan menyelesaikan hasil kemas yang telah dibooking oleh shift pertama dengan validasi pencatatan shift eksekutor aktual.

