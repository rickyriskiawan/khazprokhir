/*
  Warnings:

  - Added the required column `penyortir_1` to the `proses_sortir` table without a default value. This is not possible if the table is not empty.
  - Added the required column `penyortir_2` to the `proses_sortir` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "proses_sortir" ADD COLUMN     "penyortir_1" TEXT NOT NULL,
ADD COLUMN     "penyortir_2" TEXT NOT NULL;
