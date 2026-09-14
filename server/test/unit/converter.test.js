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
} from '../../src/utils/converter.js';

import {
  isKelipatanEmpat,
  validatePackRange,
  validateDoosRatio,
  validateDoosRange,
  detectGaps,
  isConsecutive,
  checkSortirSafetyLock,
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
});
