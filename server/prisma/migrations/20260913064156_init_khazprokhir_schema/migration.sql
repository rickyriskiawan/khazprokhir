-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OPERATOR', 'SUPERVISOR', 'MANAGEMENT', 'AUDITOR');

-- CreateEnum
CREATE TYPE "KategoriPenerimaan" AS ENUM ('MASINAL', 'PARSIAL');

-- CreateEnum
CREATE TYPE "StatusPack" AS ENUM ('PENDING', 'RECEIVED', 'SORTED', 'PACKED', 'SHIPPED');

-- CreateEnum
CREATE TYPE "StatusSortir" AS ENUM ('IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "StatusKemas" AS ENUM ('READY', 'SHIPPED');

-- CreateEnum
CREATE TYPE "StatusPengiriman" AS ENUM ('DRAFT', 'APPROVED', 'SHIPPED');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'OPERATOR',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "denominasi" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "nilai" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "denominasi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emisi" (
    "id" SERIAL NOT NULL,
    "kode_emisi" TEXT NOT NULL,
    "sandi" TEXT NOT NULL,
    "tahun" TEXT NOT NULL,
    "denominasi_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "emisi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift" (
    "id" SERIAL NOT NULL,
    "nama" TEXT NOT NULL,
    "jam_mulai" TEXT NOT NULL,
    "jam_selesai" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_tahunan" (
    "id" SERIAL NOT NULL,
    "tahun_anggaran" INTEGER NOT NULL,
    "denominasi_id" INTEGER NOT NULL,
    "target_bilyet" BIGINT NOT NULL,
    "target_brood" BIGINT NOT NULL,
    "target_pack" INTEGER NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_tahunan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "target_bulanan" (
    "id" SERIAL NOT NULL,
    "tahun_anggaran" INTEGER NOT NULL,
    "bulan" INTEGER NOT NULL,
    "denominasi_id" INTEGER NOT NULL,
    "target_penyerahan_bilyet" BIGINT NOT NULL,
    "target_pengemasan_bilyet" BIGINT NOT NULL,
    "sisa_hari_kerja" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "target_bulanan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch" (
    "id" SERIAL NOT NULL,
    "nomor_batch" TEXT NOT NULL,
    "tahun_anggaran" INTEGER NOT NULL,
    "seri" TEXT NOT NULL,
    "kepala" TEXT NOT NULL,
    "emisi_id" INTEGER NOT NULL,
    "jumlah_pack" INTEGER NOT NULL DEFAULT 100,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bon_masuk" (
    "id" SERIAL NOT NULL,
    "no_segel" TEXT NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "tanggal_masuk" DATE NOT NULL,
    "jam_masuk" TEXT NOT NULL,
    "pack_dari" INTEGER NOT NULL,
    "pack_sampai" INTEGER NOT NULL,
    "jumlah_bilyet" BIGINT NOT NULL,
    "jenis_mesin_sortir" TEXT,
    "kategori_penerimaan" "KategoriPenerimaan" NOT NULL DEFAULT 'MASINAL',
    "shift_id" INTEGER NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bon_masuk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_detail" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "bon_masuk_id" INTEGER,
    "nomor_pack" INTEGER NOT NULL,
    "jumlah_brood" INTEGER NOT NULL DEFAULT 45,
    "jumlah_bilyet" BIGINT NOT NULL DEFAULT 45000,
    "hasil_kemas_id" INTEGER,
    "no_doos_range" TEXT,
    "status" "StatusPack" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pack_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proses_sortir" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "pack_dari" INTEGER NOT NULL,
    "pack_sampai" INTEGER NOT NULL,
    "total_pack" INTEGER NOT NULL,
    "shift_id" INTEGER NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "tanggal_sortir" DATE NOT NULL,
    "total_brood" INTEGER NOT NULL,
    "total_bilyet" BIGINT NOT NULL,
    "status" "StatusSortir" NOT NULL DEFAULT 'IN_PROGRESS',
    "catatan" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proses_sortir_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sortir_pack_detail" (
    "id" SERIAL NOT NULL,
    "proses_sortir_id" INTEGER NOT NULL,
    "pack_detail_id" INTEGER NOT NULL,

    CONSTRAINT "sortir_pack_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hasil_kemas" (
    "id" SERIAL NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "proses_sortir_id" INTEGER,
    "denominasi_id" INTEGER NOT NULL,
    "tahun_anggaran" INTEGER NOT NULL,
    "pack_dari" INTEGER NOT NULL,
    "pack_sampai" INTEGER NOT NULL,
    "total_pack" INTEGER NOT NULL,
    "no_doos_awal" INTEGER NOT NULL,
    "no_doos_akhir" INTEGER NOT NULL,
    "total_doos" INTEGER NOT NULL,
    "total_bilyet" BIGINT NOT NULL,
    "no_ba_pengemasan" TEXT NOT NULL,
    "shift_id" INTEGER NOT NULL,
    "operator_id" INTEGER NOT NULL,
    "tanggal_kemas" DATE NOT NULL,
    "status" "StatusKemas" NOT NULL DEFAULT 'READY',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hasil_kemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kemas_pack_detail" (
    "id" SERIAL NOT NULL,
    "hasil_kemas_id" INTEGER NOT NULL,
    "pack_detail_id" INTEGER NOT NULL,

    CONSTRAINT "kemas_pack_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengiriman" (
    "id" SERIAL NOT NULL,
    "nomor_surat_jalan" TEXT NOT NULL,
    "tanggal_kirim" DATE NOT NULL,
    "tahun_anggaran" INTEGER NOT NULL,
    "denominasi_id" INTEGER NOT NULL,
    "sandi_emisi" TEXT NOT NULL,
    "no_doos_awal" INTEGER NOT NULL,
    "no_doos_akhir" INTEGER NOT NULL,
    "total_doos" INTEGER NOT NULL,
    "total_bilyet" BIGINT NOT NULL,
    "total_nominal" DECIMAL(20,2) NOT NULL,
    "no_ba_penyerahan" TEXT,
    "no_ba_pengemasan_rekap" TEXT,
    "keterangan" TEXT NOT NULL DEFAULT 'UTAS',
    "tujuan" TEXT NOT NULL DEFAULT 'Bank Indonesia',
    "lokasi_penyerahan" TEXT NOT NULL DEFAULT 'Karawang',
    "penyerah_nama" TEXT NOT NULL,
    "penyerah_jabatan" TEXT NOT NULL DEFAULT 'Kepala Seksi',
    "penerima_nama" TEXT,
    "created_by" INTEGER NOT NULL,
    "approved_by" INTEGER,
    "status" "StatusPengiriman" NOT NULL DEFAULT 'DRAFT',
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "shipped_at" TIMESTAMP(3),

    CONSTRAINT "pengiriman_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pengiriman_detail" (
    "id" SERIAL NOT NULL,
    "pengiriman_id" INTEGER NOT NULL,
    "hasil_kemas_id" INTEGER,
    "batch_id" INTEGER,
    "no_doos_awal" INTEGER NOT NULL,
    "no_doos_akhir" INTEGER NOT NULL,
    "jumlah_kemasan_doos" INTEGER NOT NULL,
    "no_ba_penyerahan" TEXT,
    "keterangan" TEXT NOT NULL DEFAULT 'UTAS',
    "tanggal_pengemasan" DATE,
    "no_ba_pengemasan" TEXT,

    CONSTRAINT "pengiriman_detail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transaksi_hcts" (
    "id" SERIAL NOT NULL,
    "tanggal" DATE NOT NULL,
    "denominasi_id" INTEGER NOT NULL,
    "penerimaan_bilyet" BIGINT NOT NULL DEFAULT 0,
    "penyerahan_bilyet" BIGINT NOT NULL DEFAULT 0,
    "akumulasi_penyerahan_bi" BIGINT NOT NULL DEFAULT 0,
    "persediaan_hcts" BIGINT NOT NULL DEFAULT 0,
    "jumlah_ct_siap_hitung" INTEGER NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transaksi_hcts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rencana_penyerahan" (
    "id" SERIAL NOT NULL,
    "tanggal_rencana" DATE NOT NULL,
    "denominasi_id" INTEGER NOT NULL,
    "kurang_pengemasan_bilyet" BIGINT NOT NULL DEFAULT 0,
    "kurang_pengemasan_doos" INTEGER NOT NULL DEFAULT 0,
    "kurang_penerimaan_bilyet" BIGINT NOT NULL DEFAULT 0,
    "kurang_penerimaan_vell" INTEGER NOT NULL DEFAULT 0,
    "catatan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rencana_penyerahan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" "AuditAction" NOT NULL,
    "module" TEXT NOT NULL,
    "table_name" TEXT NOT NULL,
    "record_id" INTEGER,
    "old_value" JSONB,
    "new_value" JSONB,
    "ip_address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "target_tahunan_tahun_anggaran_denominasi_id_key" ON "target_tahunan"("tahun_anggaran", "denominasi_id");

-- CreateIndex
CREATE UNIQUE INDEX "target_bulanan_tahun_anggaran_bulan_denominasi_id_key" ON "target_bulanan"("tahun_anggaran", "bulan", "denominasi_id");

-- CreateIndex
CREATE UNIQUE INDEX "batch_nomor_batch_tahun_anggaran_key" ON "batch"("nomor_batch", "tahun_anggaran");

-- CreateIndex
CREATE UNIQUE INDEX "bon_masuk_no_segel_key" ON "bon_masuk"("no_segel");

-- CreateIndex
CREATE UNIQUE INDEX "pack_detail_batch_id_nomor_pack_key" ON "pack_detail"("batch_id", "nomor_pack");

-- CreateIndex
CREATE UNIQUE INDEX "sortir_pack_detail_proses_sortir_id_pack_detail_id_key" ON "sortir_pack_detail"("proses_sortir_id", "pack_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "kemas_pack_detail_hasil_kemas_id_pack_detail_id_key" ON "kemas_pack_detail"("hasil_kemas_id", "pack_detail_id");

-- CreateIndex
CREATE UNIQUE INDEX "pengiriman_nomor_surat_jalan_key" ON "pengiriman"("nomor_surat_jalan");

-- AddForeignKey
ALTER TABLE "emisi" ADD CONSTRAINT "emisi_denominasi_id_fkey" FOREIGN KEY ("denominasi_id") REFERENCES "denominasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_tahunan" ADD CONSTRAINT "target_tahunan_denominasi_id_fkey" FOREIGN KEY ("denominasi_id") REFERENCES "denominasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "target_bulanan" ADD CONSTRAINT "target_bulanan_denominasi_id_fkey" FOREIGN KEY ("denominasi_id") REFERENCES "denominasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch" ADD CONSTRAINT "batch_emisi_id_fkey" FOREIGN KEY ("emisi_id") REFERENCES "emisi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_masuk" ADD CONSTRAINT "bon_masuk_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_masuk" ADD CONSTRAINT "bon_masuk_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bon_masuk" ADD CONSTRAINT "bon_masuk_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_detail" ADD CONSTRAINT "pack_detail_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_detail" ADD CONSTRAINT "pack_detail_bon_masuk_id_fkey" FOREIGN KEY ("bon_masuk_id") REFERENCES "bon_masuk"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pack_detail" ADD CONSTRAINT "pack_detail_hasil_kemas_id_fkey" FOREIGN KEY ("hasil_kemas_id") REFERENCES "hasil_kemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_sortir" ADD CONSTRAINT "proses_sortir_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_sortir" ADD CONSTRAINT "proses_sortir_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "proses_sortir" ADD CONSTRAINT "proses_sortir_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sortir_pack_detail" ADD CONSTRAINT "sortir_pack_detail_proses_sortir_id_fkey" FOREIGN KEY ("proses_sortir_id") REFERENCES "proses_sortir"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sortir_pack_detail" ADD CONSTRAINT "sortir_pack_detail_pack_detail_id_fkey" FOREIGN KEY ("pack_detail_id") REFERENCES "pack_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_kemas" ADD CONSTRAINT "hasil_kemas_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_kemas" ADD CONSTRAINT "hasil_kemas_proses_sortir_id_fkey" FOREIGN KEY ("proses_sortir_id") REFERENCES "proses_sortir"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_kemas" ADD CONSTRAINT "hasil_kemas_denominasi_id_fkey" FOREIGN KEY ("denominasi_id") REFERENCES "denominasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_kemas" ADD CONSTRAINT "hasil_kemas_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "shift"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hasil_kemas" ADD CONSTRAINT "hasil_kemas_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kemas_pack_detail" ADD CONSTRAINT "kemas_pack_detail_hasil_kemas_id_fkey" FOREIGN KEY ("hasil_kemas_id") REFERENCES "hasil_kemas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kemas_pack_detail" ADD CONSTRAINT "kemas_pack_detail_pack_detail_id_fkey" FOREIGN KEY ("pack_detail_id") REFERENCES "pack_detail"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengiriman" ADD CONSTRAINT "pengiriman_denominasi_id_fkey" FOREIGN KEY ("denominasi_id") REFERENCES "denominasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengiriman" ADD CONSTRAINT "pengiriman_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengiriman" ADD CONSTRAINT "pengiriman_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengiriman_detail" ADD CONSTRAINT "pengiriman_detail_pengiriman_id_fkey" FOREIGN KEY ("pengiriman_id") REFERENCES "pengiriman"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengiriman_detail" ADD CONSTRAINT "pengiriman_detail_hasil_kemas_id_fkey" FOREIGN KEY ("hasil_kemas_id") REFERENCES "hasil_kemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pengiriman_detail" ADD CONSTRAINT "pengiriman_detail_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "batch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transaksi_hcts" ADD CONSTRAINT "transaksi_hcts_denominasi_id_fkey" FOREIGN KEY ("denominasi_id") REFERENCES "denominasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rencana_penyerahan" ADD CONSTRAINT "rencana_penyerahan_denominasi_id_fkey" FOREIGN KEY ("denominasi_id") REFERENCES "denominasi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
