# Khazanah Produk Akhir (Khazprokhir)

Sistem pemantauan dan pengendalian alur produksi uang kertas Rupiah mulai dari penerimaan hasil cetak tak sempurna/sempurna dari Khazanah Awal, proses sortir kelipatan 4 pack, pengemasan 9 doos, hingga pengiriman resmi ke Bank Indonesia.

## Satuan Fisik Produksi

**Bilyet**:
Satuan dasar terkecil uang kertas berupa satu lembar fisik uang Rupiah resmi.
_Avoid_: Lembar, keping, helai, lembaran

**Brood**:
Ikatan resmi uang kertas yang berisi tepat 1.000 bilyet dari denominasi dan emisi yang sama.
_Avoid_: Ikat, gepok, bendel

**Pack**:
Bundel kemasan menengah yang berisi tepat 45 brood (setara 45.000 bilyet).
_Avoid_: Bal, dus pack, paket

**Doos**:
Unit kemasan boks karton fisik standar Bank Indonesia yang berisi tepat 20 brood (setara 20.000 bilyet).
_Avoid_: Kardus, box, karton, peti

## Entitas & Alur Distribusi

**Khazanah Awal (Khazai)**:
Unit kerja hulu yang menyerahkan uang kertas hasil cetak (HCS/HCST) kepada Khazprokhir melalui Bon Masuk.
_Avoid_: Gudang cetak, seksi awal, supplier

**Khazanah Produk Akhir (Khazprokhir)**:
Unit kerja hilir yang bertanggung jawab menyortir, mengemas ke dalam doos, mengadministrasikan buku register, dan menyerahkan uang layak edar ke Bank Indonesia.
_Avoid_: Gudang akhir, gudang pengiriman, ekspedisi

**Bank Indonesia (BI)**:
Otoritas moneter dan pihak penerima akhir uang kertas Rupiah yang dikirim oleh Peruri via Khazprokhir.
_Avoid_: Klien, customer, pembeli, bank sentral

**Batch**:
Kelompok produksi uang kertas sebesar 100 pack (4.500.000 bilyet) yang terikat pada satu kombinasi tahun anggaran, denominasi, seri, dan nomor kepala.
_Avoid_: Lot, gelombang, kelompok produksi

## Dokumen & Registrasi Fisik

**Bon Masuk**:
Dokumen serah terima resmi penerimaan fisik uang kertas dari Khazai ke Khazprokhir yang diamankan dengan nomor segel fisik unik.
_Avoid_: Surat jalan masuk, delivery order, faktur penerimaan

**Segel**:
Nomor pengaman fisik sekali pakai yang mengunci wadah uang kertas saat dipindahkan dari Khazai ke Khazprokhir.
_Avoid_: Kunci, lak, seal barcode

**Hasil Kemas**:
Transaksi pencatatan hasil pengemasan pack yang telah disortir ke dalam rentang nomor doos fisik (dengan rasio 4 pack = 9 doos).
_Avoid_: Packaging order, packing list, kemasan

**Berita Acara Kemas (BA Kemas)**:
Dokumen formal bukti pengemasan fisik yang ditandatangani oleh petugas shift dan penanggung jawab Khazprokhir.
_Avoid_: Surat kemas, sertifikat packing

**Buku Register Doos**:
Buku besar pencatatan urutan nomor doos fisik per denominasi dan tahun anggaran untuk menjamin tidak ada nomor doos yang loncat atau ganda.
_Avoid_: Logbook doos, kartu stok doos

**Surat Jalan BI & BAST**:
Dokumen serah terima resmi pengiriman doos uang kertas dari Khazprokhir kepada perwakilan Bank Indonesia yang memuat jumlah bilyet dan nominal terbilang.
_Avoid_: Faktur pengiriman, shipping invoice

## Status Siklus Hidup

**PENDING**:
Status awal pack sebelum diverifikasi dan diterima fisiknya oleh Khazprokhir.
_Avoid_: Menunggu, draft

**RECEIVED**:
Status pack yang telah diverifikasi fisik dan nomor segelnya melalui pencatatan Bon Masuk.
_Avoid_: Diterima, masuk gudang

**SORTED**:
Status pack yang telah selesai melalui proses pemeriksaan fisik dan pengurutan kelipatan 4 pack tanpa reject.
_Avoid_: Lolos sortir, diperiksa

**SIAP_KEMAS**:
Status antrian hasil kemas yang nomor pack-nya telah dibooking oleh suatu shift tetapi belum selesai direalisasikan secara fisik ke dalam doos.
_Avoid_: WIP kemas, antrian kemas, booking

**READY**:
Status doos kemasan fisik yang telah selesai dirakit, disegel, dan siap untuk dikirim ke Bank Indonesia.
_Avoid_: Siap kirim, packed doos, selesai

**PACKED**:
Status pack individual yang telah terikat dan tertutup di dalam salah satu nomor doos.
_Avoid_: Terbungkus, terkunci

**SHIPPED**:
Status doos atau pack yang telah resmi diserahterimakan ke Bank Indonesia melalui dokumen pengiriman valid.
_Avoid_: Terkirim, keluar, terdistribusi

**GAP**:
Anomali terputusnya urutan nomor doos fisik pada denominasi dan tahun anggaran yang sama (nomor doos loncat atau hilang).
_Avoid_: Celah, missing, skip, rusak

