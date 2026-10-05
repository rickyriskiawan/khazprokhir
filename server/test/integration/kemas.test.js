import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';

let server;
let baseUrl;
let operatorToken;
let supervisorToken;
let testBatchId;
let testShiftId;
let testShift2Id;
let createdKemasId;
let secondKemasId;

// Sesi sortir yang disiapkan pada before()
let sesiAId; // Pack 1 s/d 8  -> 18 doos
let sesiBId; // Pack 9 s/d 12 -> 9 doos
let sesiCId; // Pack 13 s/d 20 (dibiarkan untuk uji ketersediaan)
let sesiNonKelipatanId; // Sesi buatan langsung (5 pack) untuk uji kelipatan 4
let sesiBelumSelesaiId; // Sesi yang statusnya bukan COMPLETED

async function cleanupKemasTestData() {
  try {
    const testBatches = await prisma.batch.findMany({
      where: {
        nomor_batch: { in: ['KEMAS-TEST-BATCH-01', 'KEMAS-TEST-BATCH-02'] },
      },
      select: { id: true },
    });

    const batchIds = testBatches.map((b) => b.id);

    if (batchIds.length > 0) {
      const kemasList = await prisma.hasilKemas.findMany({
        where: { batch_id: { in: batchIds } },
        select: { id: true },
      });
      const kemasIds = kemasList.map((k) => k.id);

      if (kemasIds.length > 0) {
        await prisma.kemasPackDetail.deleteMany({
          where: { hasil_kemas_id: { in: kemasIds } },
        });

        await prisma.auditLog.deleteMany({
          where: { module: 'kemas', record_id: { in: kemasIds } },
        });

        await prisma.hasilKemas.deleteMany({
          where: { id: { in: kemasIds } },
        });
      }

      const prosesList = await prisma.prosesSortir.findMany({
        where: { batch_id: { in: batchIds } },
        select: { id: true },
      });
      const prosesIds = prosesList.map((p) => p.id);

      if (prosesIds.length > 0) {
        await prisma.sortirPackDetail.deleteMany({
          where: { proses_sortir_id: { in: prosesIds } },
        });

        await prisma.auditLog.deleteMany({
          where: { module: 'sortir', record_id: { in: prosesIds } },
        });

        await prisma.prosesSortir.deleteMany({
          where: { id: { in: prosesIds } },
        });
      }

      const testBons = await prisma.bonMasuk.findMany({
        where: { batch_id: { in: batchIds } },
        select: { id: true },
      });
      const bonIds = testBons.map((b) => b.id);

      await prisma.auditLog.deleteMany({
        where: { module: 'bon_masuk', record_id: { in: [...batchIds, ...bonIds] } },
      });

      await prisma.packDetail.deleteMany({
        where: { batch_id: { in: batchIds } },
      });

      await prisma.bonMasuk.deleteMany({
        where: { batch_id: { in: batchIds } },
      });

      await prisma.batch.deleteMany({
        where: { id: { in: batchIds } },
      });
    }

    await prisma.bonMasuk.deleteMany({
      where: { no_segel: { in: ['SGL-KEMAS-TEST-01'] } },
    });
  } catch {
    // Abaikan error cleanup
  }
}

describe('Integration Test: Modul 3 - Pengemasan Doos / Hasil Kemas (Step 7)', () => {
  before(async () => {
    await cleanupKemasTestData();

    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    const opRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'khazprokhir123' }),
    });
    const opData = await opRes.json();
    operatorToken = opData.data.token;

    const spvRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'supervisor', password: 'khazprokhir123' }),
    });
    const spvData = await spvRes.json();
    supervisorToken = spvData.data.token;

    const shifts = await prisma.shift.findMany({ where: { is_active: true } });
    testShiftId = shifts[0].id;
    testShift2Id = shifts.length > 1 ? shifts[1].id : shifts[0].id;

    // 1. Bon masuk: Pack 1 s/d 40 RECEIVED
    const bonRes = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-KEMAS-TEST-01',
        tanggal_masuk: '2026-09-15',
        jam_masuk: '08:00',
        nomor_batch: 'KEMAS-TEST-BATCH-01',
        seri: 'AC-CA',
        kepala: '2',
        emisi_id: 1,
        pack_dari: 1,
        pack_sampai: 40,
        shift_id: testShiftId,
      }),
    });

    const bonJson = await bonRes.json();
    assert.strictEqual(bonJson.success, true, 'Persiapan bon masuk harus berhasil');
    testBatchId = bonJson.data.batch_id;

    const buatSesi = async (dari, sampai, penyortir) => {
      const res = await fetch(`${baseUrl}/api/sortir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({
          batch_id: testBatchId,
          shift_id: testShiftId,
          tanggal_sortir: '2026-09-15',
          pack_dari: dari,
          pack_sampai: sampai,
          penyortir_1: penyortir,
        }),
      });
      const json = await res.json();
      assert.strictEqual(json.success, true, `Persiapan sesi sortir pack ${dari}-${sampai} harus berhasil`);
      return json.data.id;
    };

    // 2. Sesi sortir: A = 1-8, B = 9-12, C = 13-20
    sesiAId = await buatSesi(1, 8, 'Budi Santoso');
    sesiBId = await buatSesi(9, 12, 'Citra Dewi');
    sesiCId = await buatSesi(13, 20, 'Dedi Kurniawan');

    // 3. Sesi buatan langsung: 5 pack (bukan kelipatan 4) untuk menguji validasi kelipatan
    const packForOdd = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { in: [21, 22, 23, 24, 25] } },
    });
    const operatorUser = await prisma.user.findFirst({ where: { username: 'operator' } });
    const sesiOdd = await prisma.prosesSortir.create({
      data: {
        batch_id: testBatchId,
        pack_dari: 21,
        pack_sampai: 25,
        total_pack: 5,
        shift_id: testShiftId,
        operator_id: operatorUser.id,
        tanggal_sortir: new Date('2026-09-15T00:00:00.000Z'),
        total_brood: 225,
        total_bilyet: 225000n,
        status: 'COMPLETED',
        penyortir_1: 'Uji Non Kelipatan',
        sortir_pack_details: {
          create: packForOdd.map((p) => ({ pack_detail_id: p.id })),
        },
      },
    });
    sesiNonKelipatanId = sesiOdd.id;

    // 4. Sesi yang belum COMPLETED
    const sesiBelum = await prisma.prosesSortir.create({
      data: {
        batch_id: testBatchId,
        pack_dari: 26,
        pack_sampai: 29,
        total_pack: 4,
        shift_id: testShiftId,
        operator_id: operatorUser.id,
        tanggal_sortir: new Date('2026-09-15T00:00:00.000Z'),
        total_brood: 180,
        total_bilyet: 180000n,
        status: 'IN_PROGRESS',
        penyortir_1: 'Uji Belum Selesai',
      },
    });
    sesiBelumSelesaiId = sesiBelum.id;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupKemasTestData();
  });

  it('GET /api/kemas/sesi-siap-kemas - Menampilkan sesi sortir COMPLETED yang seluruh pack-nya siap dikemas', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/sesi-siap-kemas`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);

    const ids = json.data.map((s) => s.id);
    assert.ok(ids.includes(sesiAId), 'Sesi A harus muncul');
    assert.ok(ids.includes(sesiBId), 'Sesi B harus muncul');
    assert.ok(!ids.includes(sesiBelumSelesaiId), 'Sesi non-COMPLETED tidak boleh muncul');

    const sesiA = json.data.find((s) => s.id === sesiAId);
    assert.strictEqual(sesiA.total_pack, 8);
    assert.strictEqual(sesiA.total_doos, 18); // (8/4)*9
    assert.strictEqual(sesiA.is_fully_available, true);
    assert.deepStrictEqual(sesiA.pack_numbers, [1, 2, 3, 4, 5, 6, 7, 8]);
    assert.strictEqual(sesiA.batch.nomor_batch, 'KEMAS-TEST-BATCH-01');
    assert.strictEqual(sesiA.batch.seri, 'AC-CA');
    assert.ok(sesiA.packs[0].bon_masuk, 'Detail pack harus menyertakan bon masuk (untuk tooltip grid)');
  });

  it('GET /api/kemas/sesi-siap-kemas - Filter pencarian nomor batch dan seri', async () => {
    const byBatch = await fetch(`${baseUrl}/api/kemas/sesi-siap-kemas?search=KEMAS-TEST`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const byBatchJson = await byBatch.json();
    assert.ok(byBatchJson.data.length >= 3, 'Pencarian nomor batch harus menemukan sesi');

    const bySeri = await fetch(`${baseUrl}/api/kemas/sesi-siap-kemas?search=AC-CA`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const bySeriJson = await bySeri.json();
    assert.ok(bySeriJson.data.length >= 3, 'Pencarian seri harus menemukan sesi');

    const noMatch = await fetch(`${baseUrl}/api/kemas/sesi-siap-kemas?search=ZZZZ-TIDAK-ADA`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const noMatchJson = await noMatch.json();
    assert.strictEqual(noMatchJson.data.length, 0);
  });

  it('GET /api/kemas/available-packs/:batchId - Menampilkan daftar pack berstatus SORTED yang siap dikemas', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/available-packs/${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_available, 20);
    assert.strictEqual(json.data.available_pack_numbers[0], 1);
    assert.strictEqual(json.data.available_pack_numbers[19], 20);
  });

  it('GET /api/kemas/next-doos-number - Mengembalikan rekomendasi nomor doos awal = 1 saat belum ada kemasan', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/next-doos-number?batch_id=${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.last_no_doos, 0);
    assert.strictEqual(json.data.next_no_doos_awal, 1);
  });

  it('POST /api/kemas - Menolak pengemasan jika sesi sortir tidak ditemukan', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: 999999,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 1,
        no_doos_akhir: 9,
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 404);
    assert.strictEqual(json.success, false);
    assert.match(json.message, /sesi sortir/i);
  });

  it('POST /api/kemas - Menolak pengemasan jika sesi sortir belum COMPLETED', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiBelumSelesaiId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 1,
        no_doos_akhir: 9,
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'InvalidSessionStatus');
  });

  it('POST /api/kemas - Menolak pengemasan jika total pack sesi BUKAN kelipatan 4', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiNonKelipatanId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 1,
        no_doos_akhir: 9,
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'InvalidPackQuantity');
    assert.match(json.message, /kelipatan 4/i);
  });

  it('POST /api/kemas - Menolak nomor doos akhir yang tidak sesuai rasio 4 Pack = 9 Doos', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiAId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 1,
        no_doos_akhir: 10, // seharusnya 18 untuk 8 pack
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'InvalidDoosRange');
    assert.match(json.message, /rasio 4 Pack = 9 Doos/i);
  });

  it('POST /api/kemas - Menolak pengemasan jika ada pack yang BELUM berstatus SORTED', async () => {
    const pack1 = await prisma.packDetail.findFirst({
      where: { batch_id: testBatchId, nomor_pack: 1 },
    });
    await prisma.packDetail.update({ where: { id: pack1.id }, data: { status: 'PACKED' } });

    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiAId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 1,
        no_doos_akhir: 18,
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'InvalidPackStatus');
    assert.match(json.message, /belum berstatus SORTED/i);

    await prisma.packDetail.update({ where: { id: pack1.id }, data: { status: 'SORTED' } });
  });

  it('POST /api/kemas - Berhasil mencatat booking pengemasan doos default SIAP_KEMAS (Rasio 4 Pack = 9 Doos: 8 Pack = 18 Doos)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiAId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 1,
        no_doos_akhir: 18,
        catatan: 'Pengemasan doos gelombang 1 (SIAP_KEMAS)',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.proses_sortir_id, sesiAId);
    assert.strictEqual(json.data.total_pack, 8);
    assert.strictEqual(json.data.total_doos, 18); // (8 / 4) * 9 = 18
    assert.strictEqual(json.data.no_doos_awal, 1);
    assert.strictEqual(json.data.no_doos_akhir, 18);
    assert.strictEqual(json.data.total_bilyet, '360000'); // 8 * 45.000
    assert.strictEqual(json.data.status, 'SIAP_KEMAS');
    assert.strictEqual(json.data.no_ba_pengemasan, null); // ditunda sampai modul pengiriman BI

    createdKemasId = json.data.id;

    const bookedPacks = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 1, lte: 8 } },
    });
    assert.strictEqual(bookedPacks.length, 8);
    for (const pack of bookedPacks) {
      assert.strictEqual(pack.status, 'SORTED');
      assert.strictEqual(pack.hasil_kemas_id, createdKemasId);
      assert.strictEqual(pack.no_doos_range, 'Doos 1-18');
    }

    const sortedPacks = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 9, lte: 20 } },
    });
    for (const pack of sortedPacks) {
      assert.strictEqual(pack.status, 'SORTED');
      assert.strictEqual(pack.hasil_kemas_id, null);
      assert.strictEqual(pack.no_doos_range, null);
    }

    const kemasDetails = await prisma.kemasPackDetail.findMany({
      where: { hasil_kemas_id: createdKemasId },
    });
    assert.strictEqual(kemasDetails.length, 8);

    const audit = await prisma.auditLog.findFirst({
      where: { module: 'kemas', action: 'CREATE', record_id: createdKemasId },
    });
    assert.ok(audit, 'Audit log CREATE kemas harus tercatat');
  });

  it('GET /api/kemas/sesi-siap-kemas - Mengecualikan sesi yang pack-nya sudah dibooking', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/sesi-siap-kemas`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    const ids = json.data.map((s) => s.id);
    assert.ok(!ids.includes(sesiAId), 'Sesi A sudah dibooking, tidak boleh muncul lagi');
    assert.ok(ids.includes(sesiBId), 'Sesi B masih siap dikemas');
  });

  it('GET /api/kemas/available-packs/:batchId - Mengecualikan pack yang sudah dibooking SIAP_KEMAS', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/available-packs/${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.data.total_available, 12);
    assert.strictEqual(json.data.available_pack_numbers[0], 9);
    assert.strictEqual(json.data.available_pack_numbers[11], 20);
  });

  it('POST /api/kemas - Menolak booking jika pack sesi sudah dibooking oleh hasil kemas lain (PackAlreadyBooked)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiAId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 19,
        no_doos_akhir: 27,
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'PackAlreadyBooked');
  });

  it('POST /api/kemas/:id/complete - Berhasil menyelesaikan realisasi fisik pengemasan antar-shift (Shift 2)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/${createdKemasId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        shift_id: testShift2Id,
        tanggal_kemas: '2026-09-15',
        catatan: 'Diselesaikan fisiknya pada Shift 2',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'READY');
    assert.strictEqual(json.data.shift_id, testShift2Id);
    assert.strictEqual(json.data.catatan, 'Diselesaikan fisiknya pada Shift 2');

    const packedPacks = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 1, lte: 8 } },
    });
    for (const pack of packedPacks) {
      assert.strictEqual(pack.status, 'PACKED');
    }

    const audit = await prisma.auditLog.findFirst({
      where: { module: 'kemas', action: 'UPDATE', record_id: createdKemasId },
    });
    assert.ok(audit, 'Audit log UPDATE kemas harus tercatat');
    assert.strictEqual(audit.new_value.status, 'READY');
  });

  it('POST /api/kemas/:id/complete - Menolak penyelesaian jika status sudah READY (bukan SIAP_KEMAS)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/${createdKemasId}/complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        shift_id: testShift2Id,
        tanggal_kemas: '2026-09-15',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'InvalidStatusError');
  });

  it('GET /api/kemas/next-doos-number - Menghitung nomor doos berikutnya secara presisi setelah ada doos tercatat', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/next-doos-number?batch_id=${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.last_no_doos, 18);
    assert.strictEqual(json.data.next_no_doos_awal, 19);
  });

  it('POST /api/kemas - Menolak nomor doos yang bertabrakan / overlap dengan doos yang sudah ada', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiBId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 10,
        no_doos_akhir: 18,
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'DoosOverlap');
    assert.match(json.message, /bertabrakan dengan hasil kemas/i);
  });

  it('POST /api/kemas - Berhasil mencatat kemasan kedua langsung dengan status READY (Doos 19 s/d 27)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiBId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 19,
        no_doos_akhir: 27,
        status: 'READY',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_pack, 4);
    assert.strictEqual(json.data.total_doos, 9);
    assert.strictEqual(json.data.no_doos_awal, 19);
    assert.strictEqual(json.data.no_doos_akhir, 27);
    assert.strictEqual(json.data.total_bilyet, '180000');
    assert.strictEqual(json.data.status, 'READY');

    secondKemasId = json.data.id;

    const packedPacks = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 9, lte: 12 } },
    });
    assert.strictEqual(packedPacks.length, 4);
    for (const pack of packedPacks) {
      assert.strictEqual(pack.status, 'PACKED');
    }
  });

  it('GET /api/kemas - Mengambil daftar hasil kemas dengan pagination, filter batch, rentang tanggal dan pencarian seri', async () => {
    const res = await fetch(
      `${baseUrl}/api/kemas?batch_id=${testBatchId}&tanggal_dari=2026-09-15&tanggal_sampai=2026-09-15&search=AC-CA`,
      { headers: { Authorization: `Bearer ${operatorToken}` } }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.length >= 2);
    assert.ok(json.meta.total >= 2);

    const row = json.data[0];
    assert.ok(row.batch.nomor_batch, 'Baris harus menyertakan batch');
    assert.ok(row.batch.seri, 'Baris harus menyertakan seri batch');
    assert.ok(row.operator.full_name, 'Baris harus menyertakan nama penginput');
    assert.ok(row.no_doos_awal >= 1 && row.no_doos_akhir >= row.no_doos_awal);

    const empty = await fetch(`${baseUrl}/api/kemas?batch_id=${testBatchId}&tanggal_dari=2030-01-01`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const emptyJson = await empty.json();
    assert.strictEqual(emptyJson.meta.total, 0);
  });

  it('GET /api/kemas/summary - Ringkasan KPI mengikuti filter (siap kemas vs hasil kemas)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/summary?search=AC-CA`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.siap_kemas);
    assert.ok(json.data.hasil_kemas);
    assert.ok(json.data.total_semua);
    assert.ok(json.data.hasil_kemas.total_kemas >= 2);
    assert.ok(json.data.hasil_kemas.total_doos >= 27);
    assert.ok(json.data.total_semua.total_pack >= 12);
  });

  it('GET /api/kemas/:id - Mengambil detail lengkap hasil kemas beserta pack di dalamnya', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/${createdKemasId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, createdKemasId);
    assert.strictEqual(json.data.proses_sortir_id, sesiAId);
    assert.strictEqual(json.data.total_doos, 18);
    assert.strictEqual(json.data.kemas_pack_details.length, 8);
    assert.strictEqual(json.data.kemas_pack_details[0].pack_detail.nomor_pack, 1);
  });

  it('GET /api/kemas/summary/today - Mengambil ringkasan harian pengemasan doos', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/summary/today?tanggal=2026-09-15`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.total_kemas >= 2);
    assert.ok(json.data.total_pack >= 12);
    assert.ok(json.data.total_doos >= 27);
    assert.ok(json.data.rincian_denominasi.length >= 1);
    assert.ok(json.data.output_selesai);
    assert.ok(json.data.output_selesai.total_kemas >= 2);
    assert.ok(json.data.antrian_wip);
  });

  it('PUT /api/kemas/:id - Memperbarui metadata hasil kemas doos (termasuk nomor BA yang ditunda)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/${createdKemasId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        no_ba_pengemasan: 'BA-KEMAS-1001-REV',
        catatan: 'Catatan diperbarui oleh operator',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.no_ba_pengemasan, 'BA-KEMAS-1001-REV');
    assert.strictEqual(json.data.catatan, 'Catatan diperbarui oleh operator');

    const audit = await prisma.auditLog.findFirst({
      where: { module: 'kemas', action: 'UPDATE', record_id: createdKemasId },
    });
    assert.ok(audit, 'Audit log UPDATE kemas harus tercatat');
  });

  it('Safety Lock: Menolak pembaruan atau pembatalan jika kemasan sudah berstatus SHIPPED', async () => {
    await prisma.hasilKemas.update({
      where: { id: secondKemasId },
      data: { status: 'SHIPPED' },
    });

    const putRes = await fetch(`${baseUrl}/api/kemas/${secondKemasId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ catatan: 'Mencoba update kemasan shipped' }),
    });
    const putJson = await putRes.json();
    assert.strictEqual(putRes.status, 400);
    assert.strictEqual(putJson.error, 'SafetyLockError');
    assert.match(putJson.message, /terkunci/i);

    const delRes = await fetch(`${baseUrl}/api/kemas/${secondKemasId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    const delJson = await delRes.json();
    assert.strictEqual(delRes.status, 400);
    assert.strictEqual(delJson.error, 'SafetyLockError');
    assert.match(delJson.message, /terkunci/i);

    await prisma.hasilKemas.update({
      where: { id: secondKemasId },
      data: { status: 'READY' },
    });
  });

  it('DELETE /api/kemas/:id - Menolak pembatalan oleh OPERATOR (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/${createdKemasId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.strictEqual(res.status, 403);
  });

  it('DELETE /api/kemas/:id - SUPERVISOR berhasil membatalkan kemasan dan me-revert status pack kembali ke SORTED', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/${createdKemasId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.reverted_status, 'SORTED');

    const kemasCheck = await prisma.hasilKemas.findUnique({ where: { id: createdKemasId } });
    assert.strictEqual(kemasCheck, null);

    const kemasDetailsCheck = await prisma.kemasPackDetail.findMany({
      where: { hasil_kemas_id: createdKemasId },
    });
    assert.strictEqual(kemasDetailsCheck.length, 0);

    const revertedPacks = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 1, lte: 8 } },
    });
    assert.strictEqual(revertedPacks.length, 8);
    for (const pack of revertedPacks) {
      assert.strictEqual(pack.status, 'SORTED');
      assert.strictEqual(pack.hasil_kemas_id, null);
      assert.strictEqual(pack.no_doos_range, null);
    }

    const audit = await prisma.auditLog.findFirst({
      where: { module: 'kemas', action: 'DELETE', record_id: createdKemasId },
    });
    assert.ok(audit, 'Audit log DELETE kemas harus tercatat');
  });

  it('Sesi sortir yang telah di-rollback kembali muncul sebagai siap kemas dan dapat dikemas ulang', async () => {
    const sesiRes = await fetch(`${baseUrl}/api/kemas/sesi-siap-kemas`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const sesiJson = await sesiRes.json();
    assert.ok(
      sesiJson.data.map((s) => s.id).includes(sesiAId),
      'Sesi A harus kembali tersedia setelah rollback'
    );

    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        proses_sortir_id: sesiAId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        no_doos_awal: 1,
        no_doos_akhir: 18,
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_pack, 8);
    assert.strictEqual(json.data.total_doos, 18);
    assert.strictEqual(json.data.no_doos_awal, 1);
    assert.strictEqual(json.data.no_doos_akhir, 18);
    assert.strictEqual(json.data.status, 'SIAP_KEMAS');
  });

  it('DELETE /api/kemas/:id - SUPERVISOR berhasil membatalkan booking SIAP_KEMAS dan mengembalikan pack ke status SORTED murni', async () => {
    const lastKemas = await prisma.hasilKemas.findFirst({
      where: { proses_sortir_id: sesiAId, status: 'SIAP_KEMAS' },
      orderBy: { id: 'desc' },
    });
    assert.ok(lastKemas);

    const res = await fetch(`${baseUrl}/api/kemas/${lastKemas.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.reverted_status, 'SORTED');

    const packs = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { in: [1, 2, 3, 4] } },
    });
    assert.strictEqual(packs.length, 4);
    for (const pack of packs) {
      assert.strictEqual(pack.status, 'SORTED');
      assert.strictEqual(pack.hasil_kemas_id, null);
      assert.strictEqual(pack.no_doos_range, null);
    }
  });
});
