# Penegakan Rasio 4 Pack = 9 Doos dan Kebijakan Zero Reject

## Status
Accepted

## Konteks & Keputusan
Di Seksi Khazanah Produk Akhir (Khazprokhir), uang kertas yang diterima dari Khazanah Awal berada dalam satuan pack (45.000 bilyet), sedangkan standar kotak penyimpanan dan pengiriman resmi Bank Indonesia menggunakan satuan doos (20.000 bilyet). Sistem memutuskan untuk mewajibkan proses sortir dan pengemasan dalam kelipatan ketat 4 pack yang menghasilkan tepat 9 doos (180.000 bilyet) dengan kebijakan Zero Reject (100% bilyet tersortir wajib dikemas tanpa ada sisa bilyet lepas). Keputusan ini diambil karena KPK (kelipatan persekutuan terkecil) matematis antara 45.000 dan 20.000 adalah 180.000 bilyet, sehingga memproses selain kelipatan 4 pack akan meninggalkan pecahan bilyet di luar kemasan fisik standar BI.

## Konsekuensi
- Validasi form frontend dan API backend menolak mutasi sortir dan kemas jika `total_pack % 4 !== 0`.
- Visualisasi matriks pack 10x10 dilengkapi indikator kelipatan 4 pack untuk memandu operator.
- Tidak ada mekanisme pencatatan reject atau afdruk parsial di level Khazprokhir (jika terjadi kerusakan batch fisik ekstrem, seluruh bon atau batch ditangani secara administratif via supervisor).

