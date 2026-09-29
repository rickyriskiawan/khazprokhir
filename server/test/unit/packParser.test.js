import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parsePackRange, formatPackNumbers } from '../../src/utils/packParser.js';

describe('Unit Test: Pack Range Parser (Daftar Pack Acak & Multi-Range)', () => {
  it('berhasil mem-parsing kombinasi rentang dan nomor pack tunggal (contoh: 1-10, 13, 16, 20, 22)', () => {
    const input = '1-10, 13, 16, 20, 22';
    const result = parsePackRange(input);

    assert.equal(result.isValid, true);
    assert.deepEqual(result.numbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 16, 20, 22]);
    assert.equal(result.totalPack, 14);
    assert.equal(result.packDari, 1);
    assert.equal(result.packSampai, 22);
    assert.equal(result.jumlahBilyet, 630000n); // 14 * 45.000
    assert.equal(result.canonicalList, '1-10, 13, 16, 20, 22');
  });

  it('berhasil mem-parsing nomor tunggal', () => {
    const result = parsePackRange('5');
    assert.equal(result.isValid, true);
    assert.deepEqual(result.numbers, [5]);
    assert.equal(result.totalPack, 1);
    assert.equal(result.packDari, 5);
    assert.equal(result.packSampai, 5);
    assert.equal(result.jumlahBilyet, 45000n);
    assert.equal(result.canonicalList, '5');
  });

  it('berhasil mem-parsing rentang kontigu standar (1-50)', () => {
    const result = parsePackRange('1-50');
    assert.equal(result.isValid, true);
    assert.equal(result.totalPack, 50);
    assert.equal(result.numbers.length, 50);
    assert.equal(result.numbers[0], 1);
    assert.equal(result.numbers[49], 50);
    assert.equal(result.packDari, 1);
    assert.equal(result.packSampai, 50);
    assert.equal(result.jumlahBilyet, 2250000n); // 50 * 45.000
  });

  it('berhasil merapikan dan mengurutkan nomor pack yang tidak berurutan dan memiliki spasi acak', () => {
    const result = parsePackRange(' 20 , 1 - 3 , 5 ');
    assert.equal(result.isValid, true);
    assert.deepEqual(result.numbers, [1, 2, 3, 5, 20]);
    assert.equal(result.packDari, 1);
    assert.equal(result.packSampai, 20);
    assert.equal(result.totalPack, 5);
    assert.equal(result.canonicalList, '1-3, 5, 20');
  });

  it('menolak input kosong atau hanya whitespace', () => {
    assert.throws(
      () => parsePackRange(''),
      { message: /Format nomor pack tidak boleh kosong/ }
    );
    assert.throws(
      () => parsePackRange('   '),
      { message: /Format nomor pack tidak boleh kosong/ }
    );
    assert.throws(
      () => parsePackRange(null),
      { message: /Format nomor pack tidak boleh kosong/ }
    );
  });

  it('menolak nomor pack di luar batas 1 s/d 100', () => {
    assert.throws(
      () => parsePackRange('0, 1-5'),
      { message: /harus berada dalam batas 1 sampai 100/ }
    );
    assert.throws(
      () => parsePackRange('1-101'),
      { message: /harus berada dalam batas 1 sampai 100/ }
    );
  });

  it('menolak rentang terbalik (min > max)', () => {
    assert.throws(
      () => parsePackRange('10-5'),
      { message: /Rentang nomor pack tidak valid/ }
    );
  });

  it('menolak nomor pack duplikat', () => {
    assert.throws(
      () => parsePackRange('1-5, 3'),
      { message: /Nomor pack #3 duplikat/ }
    );
    assert.throws(
      () => parsePackRange('7, 7'),
      { message: /Nomor pack #7 duplikat/ }
    );
  });

  it('menolak karakter non-numerik atau format malformed', () => {
    assert.throws(
      () => parsePackRange('1-5, abc'),
      { message: /Format segmen nomor pack tidak valid/ }
    );
    assert.throws(
      () => parsePackRange('1--5'),
      { message: /Format segmen nomor pack tidak valid/ }
    );
    assert.throws(
      () => parsePackRange('1-2-3'),
      { message: /Format segmen nomor pack tidak valid/ }
    );
  });

  describe('formatPackNumbers helper', () => {
    it('mengubah array nomor acak terurut menjadi string ringkas kanonikal', () => {
      const numbers = [1, 2, 3, 4, 5, 13, 16, 20, 21, 22];
      assert.equal(formatPackNumbers(numbers), '1-5, 13, 16, 20-22');
    });

    it('mengubah array kosong menjadi string kosong', () => {
      assert.equal(formatPackNumbers([]), '');
    });
  });
});

