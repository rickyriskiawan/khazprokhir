import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  SATUAN,
  packToBrood,
  packToBilyet,
  broodToBilyet,
  bilyetToBrood,
  doosToBilyet,
  doosToBrood,
  calculateDoosFromPack,
  calculatePackFromDoos,
  calculateNominal,
  formatRupiah,
  formatNumber,
  formatIndonesianDate,
  terbilang,
} from '../../src/utils/converter.js';

import {
  isKelipatanEmpat,
  validatePackRange,
  validateDoosRatio,
  validateDoosRange,
  detectGaps,
  isConsecutive,
  checkSortirSafetyLock,
  checkKemasSafetyLock,
  formatDoosRanges,
  validatePengirimanDoos,
} from '../../src/utils/businessRules.js';

describe('Unit Test: Konversi Satuan Uang Kertas', () => {
  it('1 pack harus sama dengan 45 brood', () => {
    assert.equal(packToBrood(1), 45);
    assert.equal(packToBrood(4), 180);
    assert.equal(packToBrood(100), 4500);
  });

  it('1 pack harus sama dengan 45.000 bilyet', () => {
    assert.equal(packToBilyet(1), 45_000);
    assert.equal(packToBilyet(4), 180_000);
    assert.equal(packToBilyet(100), 4_500_000);
    assert.equal(packToBilyet(1n), 45_000n);
    assert.equal(packToBilyet(4, true), 180_000n);
  });

  it('1 brood harus sama dengan 1.000 bilyet', () => {
    assert.equal(broodToBilyet(1), 1_000);
    assert.equal(broodToBilyet(45), 45_000);
    assert.equal(broodToBilyet(1n), 1_000n);
    assert.equal(bilyetToBrood(45_000), 45);
  });

  it('1 doos harus sama dengan 20 brood dan 20.000 bilyet', () => {
    assert.equal(doosToBrood(1), 20);
    assert.equal(doosToBrood(9), 180);
    assert.equal(doosToBilyet(1), 20_000);
    assert.equal(doosToBilyet(9), 180_000);
    assert.equal(doosToBilyet(9n), 180_000n);
  });

  it('4 pack harus tepat menghasilkan 9 doos (rasio 4:9)', () => {
    assert.equal(calculateDoosFromPack(4), 9);
    assert.equal(calculateDoosFromPack(8), 18);
    assert.equal(calculateDoosFromPack(12), 27);
    assert.equal(calculateDoosFromPack(100), 225);
  });

  it('calculateDoosFromPack harus melempar error jika bukan kelipatan 4', () => {
    assert.throws(() => calculateDoosFromPack(1), /harus merupakan kelipatan 4/);
    assert.throws(() => calculateDoosFromPack(2), /harus merupakan kelipatan 4/);
    assert.throws(() => calculateDoosFromPack(3), /harus merupakan kelipatan 4/);
    assert.throws(() => calculateDoosFromPack(5), /harus merupakan kelipatan 4/);
    assert.throws(() => calculateDoosFromPack(0), /harus lebih besar dari 0/);
  });

  it('9 doos harus tepat terkonversi ke 4 pack', () => {
    assert.equal(calculatePackFromDoos(9), 4);
    assert.equal(calculatePackFromDoos(18), 8);
    assert.equal(calculatePackFromDoos(225), 100);
  });

  it('calculatePackFromDoos harus melempar error jika bukan kelipatan 9', () => {
    assert.throws(() => calculatePackFromDoos(8), /harus merupakan kelipatan 9/);
    assert.throws(() => calculatePackFromDoos(10), /harus merupakan kelipatan 9/);
  });

  it('kalkulasi nominal rupiah harus akurat', () => {
    assert.equal(calculateNominal(45_000, 100_000), 4_500_000_000);
    assert.equal(calculateNominal(45_000n, 100_000), 4_500_000_000n);
    assert.equal(calculateNominal(180_000, 50_000), 9_000_000_000);
  });

  it('formatting rupiah dan angka harus benar', () => {
    assert.match(formatRupiah(100_000_000), /Rp\s*100\.000\.000/);
    assert.match(formatNumber(100_000_000), /100\.000\.000/);
  });
});

describe('Unit Test: Aturan Bisnis & Validasi', () => {
  it('isKelipatanEmpat harus mengidentifikasi kelipatan 4 dengan benar', () => {
    assert.equal(isKelipatanEmpat(4), true);
    assert.equal(isKelipatanEmpat(8), true);
    assert.equal(isKelipatanEmpat(12), true);
    assert.equal(isKelipatanEmpat(100), true);

    assert.equal(isKelipatanEmpat(0), false);
    assert.equal(isKelipatanEmpat(1), false);
    assert.equal(isKelipatanEmpat(2), false);
    assert.equal(isKelipatanEmpat(3), false);
    assert.equal(isKelipatanEmpat(5), false);
    assert.equal(isKelipatanEmpat(-4), false);
    assert.equal(isKelipatanEmpat(4.5), false);
  });

  it('validatePackRange harus memvalidasi nomor pack dalam batas 1-100', () => {
    const resValid = validatePackRange(1, 50);
    assert.equal(resValid.valid, true);
    assert.equal(resValid.totalPack, 50);

    const resSingle = validatePackRange(25, 25);
    assert.equal(resSingle.valid, true);
    assert.equal(resSingle.totalPack, 1);

    const resOver = validatePackRange(1, 101);
    assert.equal(resOver.valid, false);

    const resNegative = validatePackRange(0, 50);
    assert.equal(resNegative.valid, false);

    const resInverted = validatePackRange(50, 10);
    assert.equal(resInverted.valid, false);
  });

  it('validateDoosRatio harus memvalidasi konsistensi 4 pack = 9 doos', () => {
    assert.equal(validateDoosRatio(4, 9).valid, true);
    assert.equal(validateDoosRatio(8, 18).valid, true);
    assert.equal(validateDoosRatio(100, 225).valid, true);

    assert.equal(validateDoosRatio(4, 8).valid, false);
    assert.equal(validateDoosRatio(5, 9).valid, false);
  });

  it('validateDoosRange harus mencocokkan rentang nomor doos awal & akhir', () => {
    assert.equal(validateDoosRange(1, 9, 9).valid, true);
    assert.equal(validateDoosRange(10, 18, 9).valid, true);
    assert.equal(validateDoosRange(45251, 47250, 2000).valid, true);

    assert.equal(validateDoosRange(1, 10, 9).valid, false);
    assert.equal(validateDoosRange(10, 5, 5).valid, false);
  });

  it('detectGaps harus mendeteksi celah nomor dengan benar', () => {
    assert.deepEqual(detectGaps([1, 2, 3, 4, 5]), []);
    assert.deepEqual(detectGaps([1, 2, 4, 5]), [3]);
    assert.deepEqual(detectGaps([1, 2, 4, 5, 8]), [3, 6, 7]);
    assert.deepEqual(detectGaps([10, 12, 14]), [11, 13]);
  });

  it('isConsecutive harus memeriksa nomor berurutan tanpa jeda', () => {
    assert.equal(isConsecutive([1, 2, 3, 4]), true);
    assert.equal(isConsecutive([4, 2, 1, 3]), true); // urutan acak tetap berurutan nilainya
    assert.equal(isConsecutive([1, 3, 4]), false);
    assert.equal(isConsecutive([1, 2, 2, 3]), false); // duplikat bukan consecutive murni
  });

  it('checkSortirSafetyLock harus mendeteksi status terkunci dengan benar', () => {
    // Sesi normal tanpa kemas dan status SORTED -> Tidak terkunci
    const normalSession = {
      hasil_kemas: [],
      sortir_pack_details: [
        { pack_detail: { status: 'SORTED' } },
        { pack_detail: { status: 'SORTED' } },
      ],
    };
    assert.equal(checkSortirSafetyLock(normalSession).isLocked, false);

    // Sesi dengan relasi hasil_kemas -> Terkunci
    const packedKemasSession = {
      hasil_kemas: [{ id: 1 }],
      sortir_pack_details: [{ pack_detail: { status: 'SORTED' } }],
    };
    const kemasLock = checkSortirSafetyLock(packedKemasSession, 'dibatalkan');
    assert.equal(kemasLock.isLocked, true);
    assert.match(kemasLock.message, /hasil kemas doos/i);

    // Sesi dengan salah satu pack status PACKED -> Terkunci
    const packedStatusSession = {
      hasil_kemas: [],
      sortir_pack_details: [
        { pack_detail: { status: 'SORTED' } },
        { pack_detail: { status: 'PACKED' } },
      ],
    };
    const packLock = checkSortirSafetyLock(packedStatusSession, 'diperbarui');
    assert.equal(packLock.isLocked, true);
    assert.match(packLock.message, /PACKED atau SHIPPED/i);

    // Sesi dengan salah satu pack status SHIPPED -> Terkunci
    const shippedStatusSession = {
      hasil_kemas: [],
      sortir_pack_details: [
        { pack_detail: { status: 'SHIPPED' } },
      ],
    };
    assert.equal(checkSortirSafetyLock(shippedStatusSession).isLocked, true);
  });

  it('checkKemasSafetyLock harus mendeteksi status terkunci dengan benar', () => {
    // Hasil kemas status READY tanpa pengiriman dan pack PACKED -> Tidak terkunci
    const readyKemas = {
      status: 'READY',
      pengiriman_details: [],
      kemas_pack_details: [
        { pack_detail: { status: 'PACKED' } },
        { pack_detail: { status: 'PACKED' } },
      ],
    };
    assert.equal(checkKemasSafetyLock(readyKemas).isLocked, false);

    // Hasil kemas dengan status SHIPPED -> Terkunci
    const shippedKemas = {
      status: 'SHIPPED',
      pengiriman_details: [],
      kemas_pack_details: [{ pack_detail: { status: 'PACKED' } }],
    };
    const shippedLock = checkKemasSafetyLock(shippedKemas, 'dibatalkan');
    assert.equal(shippedLock.isLocked, true);
    assert.match(shippedLock.message, /SHIPPED/i);

    // Hasil kemas dengan relasi pengiriman_details -> Terkunci
    const sentKemas = {
      status: 'READY',
      pengiriman_details: [{ id: 1 }],
      kemas_pack_details: [{ pack_detail: { status: 'PACKED' } }],
    };
    const sentLock = checkKemasSafetyLock(sentKemas, 'diperbarui');
    assert.equal(sentLock.isLocked, true);
    assert.match(sentLock.message, /pengiriman ke Bank Indonesia/i);

    // Hasil kemas dengan salah satu pack status SHIPPED -> Terkunci
    const packShippedKemas = {
      status: 'READY',
      pengiriman_details: [],
      kemas_pack_details: [
        { pack_detail: { status: 'PACKED' } },
        { pack_detail: { status: 'SHIPPED' } },
      ],
    };
    assert.equal(checkKemasSafetyLock(packShippedKemas).isLocked, true);
  });

  it('formatDoosRanges harus mengelompokkan nomor berurutan menjadi string rentang yang rapi', () => {
    assert.deepEqual(formatDoosRanges([]), []);
    assert.deepEqual(formatDoosRanges([1]), ['Doos 1']);
    assert.deepEqual(formatDoosRanges([1, 2, 3]), ['Doos 1-3']);
    assert.deepEqual(formatDoosRanges([1, 2, 3, 5, 7, 8, 9]), ['Doos 1-3', 'Doos 5', 'Doos 7-9']);
    assert.deepEqual(formatDoosRanges([19, 20, 21, 22, 23, 24, 25, 26, 27]), ['Doos 19-27']);
    assert.deepEqual(formatDoosRanges([10, 11, 12, 15, 20, 21]), ['Doos 10-12', 'Doos 15', 'Doos 20-21']);
    // Menghilangkan duplikat dan mengurutkan
    assert.deepEqual(formatDoosRanges([3, 1, 2, 2]), ['Doos 1-3']);
  });

  it('terbilang harus mengonversi angka ke kata-kata bahasa Indonesia dengan benar', () => {
    assert.equal(terbilang(0), 'Nol');
    assert.equal(terbilang(1), 'Satu');
    assert.equal(terbilang(10), 'Sepuluh');
    assert.equal(terbilang(11), 'Sebelas');
    assert.equal(terbilang(15), 'Lima Belas');
    assert.equal(terbilang(20), 'Dua Puluh');
    assert.equal(terbilang(25), 'Dua Puluh Lima');
    assert.equal(terbilang(100), 'Seratus');
    assert.equal(terbilang(105), 'Seratus Lima');
    assert.equal(terbilang(112), 'Seratus Dua Belas');
    assert.equal(terbilang(200), 'Dua Ratus');
    assert.equal(terbilang(1000), 'Seribu');
    assert.equal(terbilang(1050), 'Seribu Lima Puluh');
    assert.equal(terbilang(2000), 'Dua Ribu');
    assert.equal(terbilang(100_000), 'Seratus Ribu');
    assert.equal(terbilang(1_000_000), 'Satu Juta');
    assert.equal(terbilang(20_000_000_000), 'Dua Puluh Miliar');
    assert.equal(terbilang(4_000_000_000_000n), 'Empat Triliun');
    assert.equal(terbilang(40_000_000_000_000n), 'Empat Puluh Triliun');
  });

  it('formatIndonesianDate harus memformat tanggal dengan benar', () => {
    assert.equal(formatIndonesianDate('2026-09-15'), '15 September 2026');
    assert.equal(formatIndonesianDate('2026-01-01'), '1 Januari 2026');
    assert.equal(formatIndonesianDate('2026-12-31'), '31 Desember 2026');
    assert.equal(formatIndonesianDate(''), '-');
    assert.equal(formatIndonesianDate(null), '-');
  });

  it('validatePengirimanDoos harus memvalidasi keseragaman, kontinuitas tanpa gap, dan status READY', () => {
    // 1. Kosong
    const resEmpty = validatePengirimanDoos([], 1, 2026);
    assert.equal(resEmpty.valid, false);
    assert.equal(resEmpty.error, 'EmptyHasilKemasList');

    // 2. Denominasi mismatch
    const resDenom = validatePengirimanDoos([
      { id: 1, denominasi_id: 1, tahun_anggaran: 2026, status: 'READY', no_doos_awal: 1, no_doos_akhir: 9, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000 },
      { id: 2, denominasi_id: 2, tahun_anggaran: 2026, status: 'READY', no_doos_awal: 10, no_doos_akhir: 18, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000 },
    ], 1, 2026);
    assert.equal(resDenom.valid, false);
    assert.equal(resDenom.error, 'DenominasiMismatch');

    // 3. Status bukan READY (misal SIAP_KEMAS)
    const resNotReady = validatePengirimanDoos([
      { id: 1, denominasi_id: 1, tahun_anggaran: 2026, status: 'SIAP_KEMAS', no_doos_awal: 1, no_doos_akhir: 9, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000 },
    ], 1, 2026);
    assert.equal(resNotReady.valid, false);
    assert.equal(resNotReady.error, 'HasilKemasNotReady');

    // 4. Status sudah SHIPPED
    const resAlreadyShipped = validatePengirimanDoos([
      { id: 1, denominasi_id: 1, tahun_anggaran: 2026, status: 'SHIPPED', no_doos_awal: 1, no_doos_akhir: 9, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000 },
    ], 1, 2026);
    assert.equal(resAlreadyShipped.valid, false);
    assert.equal(resAlreadyShipped.error, 'HasilKemasAlreadyShipped');

    // 5. Gap nomor doos terdeteksi
    const resGap = validatePengirimanDoos([
      { id: 1, denominasi_id: 1, tahun_anggaran: 2026, status: 'READY', no_doos_awal: 1, no_doos_akhir: 9, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000, no_ba_pengemasan: 'BA-01' },
      { id: 2, denominasi_id: 1, tahun_anggaran: 2026, status: 'READY', no_doos_awal: 19, no_doos_akhir: 27, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000, no_ba_pengemasan: 'BA-02' },
    ], 1, 2026);
    assert.equal(resGap.valid, false);
    assert.equal(resGap.error, 'DoosGapDetected');
    assert.match(resGap.message, /Celah \(gap\) nomor doos terdeteksi/);

    // 6. Overlap nomor doos terdeteksi
    const resOverlap = validatePengirimanDoos([
      { id: 1, denominasi_id: 1, tahun_anggaran: 2026, status: 'READY', no_doos_awal: 1, no_doos_akhir: 9, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000 },
      { id: 2, denominasi_id: 1, tahun_anggaran: 2026, status: 'READY', no_doos_awal: 5, no_doos_akhir: 13, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000 },
    ], 1, 2026);
    assert.equal(resOverlap.valid, false);
    assert.equal(resOverlap.error, 'DoosOverlapDetected');

    // 7. Sukses valid & berurutan (Doos 1-9 dan Doos 10-18)
    const resValid = validatePengirimanDoos([
      { id: 2, denominasi_id: 1, tahun_anggaran: 2026, status: 'READY', no_doos_awal: 10, no_doos_akhir: 18, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000, no_ba_pengemasan: 'BA-02' },
      { id: 1, denominasi_id: 1, tahun_anggaran: 2026, status: 'READY', no_doos_awal: 1, no_doos_akhir: 9, total_doos: 9, total_bilyet: 180000n, total_nominal: 18000000000, no_ba_pengemasan: 'BA-01' },
    ], 1, 2026);
    assert.equal(resValid.valid, true);
    assert.equal(resValid.minDoos, 1);
    assert.equal(resValid.maxDoos, 18);
    assert.equal(resValid.totalDoos, 18);
    assert.equal(resValid.totalBilyet, 360000n);
    assert.equal(resValid.totalNominal, 36000000000);
    assert.equal(resValid.baRekap, 'BA-01, BA-02');
  });
});


