# Fleksibilitas Koreksi Bon Masuk (Full Edit & Akses Hapus Operator) Sebelum Pemrosesan Sortir

## Status
Accepted

## Konteks & Keputusan
Penerimaan uang kertas dari Khazanah Awal (Khazai) dicatat melalui dokumen fisik dan elektronik Bon Masuk yang mengikat nomor segel unik dengan rentang nomor pack (1–100) pada suatu batch. Dalam dinamika lantai produksi, operator dapat melakukan kekeliruan pencatatan nomor segel atau rentang nomor pack. 

Sistem memutuskan untuk:
1. Menyediakan endpoint pembaruan penuh (`PUT /api/bon-masuk/:id`) yang memungkinkan koreksi metadata maupun alokasi rentang nomor pack (`pack_dari` dan `pack_sampai`), dengan syarat ketat bahwa tidak ada satu pun pack dalam bon tersebut yang telah berstatus `SORTED`, `PACKED`, atau `SHIPPED`.
2. Membuka izin pembatalan (`DELETE /api/bon-masuk/:id`) dan penyuntingan bagi role `OPERATOR` di samping `SUPERVISOR` agar koreksi kesalahan serah terima dapat diselesaikan langsung oleh operator bertugas tanpa eskalasi birokratis yang menghambat alur kerja fisik.
3. Seluruh perubahan data dan pembatalan wajib dicatat ke dalam `AuditLog` dengan snapshot nilai sebelum dan sesudah perubahan.

## Konsekuensi
- Backend memperluas otorisasi route `DELETE` dan menambahkan route `PUT` pada `server/src/routes/bon-masuk.routes.js` untuk `OPERATOR` dan `SUPERVISOR`.
- Penggantian rentang pack pada operasi edit dieksekusi dalam transaksi atomik Prisma (`$transaction`): pack lama yang tidak lagi masuk rentang dikembalikan ke status `PENDING`, dan pack baru dialokasikan ke status `RECEIVED`.
- Antarmuka frontend menyediakan modal penyuntingan (*pre-filled form*) dan dialog konfirmasi pembatalan yang dapat diakses oleh operator.
