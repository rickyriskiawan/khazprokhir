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
      // 1. Ambil kemas terkait
      const kemasList = await prisma.hasilKemas.findMany({
        where: { batch_id: { in: batchIds } },
        select: { id: true },
      });
      const kemasIds = kemasList.map((k) => k.id);

      if (kemasIds.length > 0) {
        // Hapus kemas pack details
        await prisma.kemasPackDetail.deleteMany({
          where: { hasil_kemas_id: { in: kemasIds } },
        });

        // Hapus audit log kemas
        await prisma.auditLog.deleteMany({
          where: {
            module: 'kemas',
            record_id: { in: kemasIds },
          },
        });

        // Hapus hasil kemas
        await prisma.hasilKemas.deleteMany({
          where: { id: { in: kemasIds } },
        });
      }

      // 2. Ambil proses sortir terkait
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
          where: {
            module: 'sortir',
            record_id: { in: prosesIds },
          },
        });

        await prisma.prosesSortir.deleteMany({
          where: { id: { in: prosesIds } },
        });
      }

      // 3. Ambil bon masuk terkait
      const testBons = await prisma.bonMasuk.findMany({
        where: { batch_id: { in: batchIds } },
        select: { id: true },
      });
      const bonIds = testBons.map((b) => b.id);

      await prisma.auditLog.deleteMany({
        where: {
          module: 'bon_masuk',
          record_id: { in: [...batchIds, ...bonIds] },
        },
      });

      // 4. Hapus pack details
      await prisma.packDetail.deleteMany({
        where: { batch_id: { in: batchIds } },
      });

      // 5. Hapus bon masuk
      await prisma.bonMasuk.deleteMany({
        where: { batch_id: { in: batchIds } },
      });

      // 6. Hapus batches
      await prisma.batch.deleteMany({
        where: { id: { in: batchIds } },
      });
    }

    // Bersihkan bon segel sisa jika ada
    await prisma.bonMasuk.deleteMany({
      where: {
        no_segel: { in: ['SGL-KEMAS-TEST-01'] },
      },
    });
  } catch (err) {
    // Abaikan error cleanup
  }
}

describe('Integration Test: Modul 3 - Pengemasan Doos / Hasil Kemas (Step 7)', () => {
  before(async () => {
    await cleanupKemasTestData();

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Login operator
    const opRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'khazprokhir123' }),
    });
    const opData = await opRes.json();
    operatorToken = opData.data.token;

    // Login supervisor
    const spvRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'supervisor', password: 'khazprokhir123' }),
    });
    const spvData = await spvRes.json();
    supervisorToken = spvData.data.token;

    // Ambil shift yang aktif
    const shifts = await prisma.shift.findMany({ where: { is_active: true } });
    testShiftId = shifts[0].id;
    testShift2Id = shifts.length > 1 ? shifts[1].id : shifts[0].id;

    // 1. Siapkan Bon Masuk untuk batch KEMAS-TEST-BATCH-01 (Pack 1 s/d 40 RECEIVED)
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
        emisi_id: 1, // Pecahan 100.000 Y
        pack_dari: 1,
        pack_sampai: 40,
        shift_id: testShiftId,
      }),
    });

    const bonJson = await bonRes.json();
    assert.strictEqual(bonJson.success, true, 'Persiapan bon masuk harus berhasil');
    testBatchId = bonJson.data.batch_id;

    // 2. Siapkan Sesi Sortir untuk Pack 1 s/d 20 (sehingga Pack 1..20 berstatus SORTED)
    const sortirRes = await fetch(`${baseUrl}/api/sortir`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_sortir: '2026-09-15',
        pack_dari: 1,
        pack_sampai: 20,
        penyortir_1: 'Budi Santoso',
        penyortir_2: 'Citra Dewi',
      }),
    });

    const sortirJson = await sortirRes.json();
    assert.strictEqual(sortirJson.success, true, 'Persiapan sesi sortir harus berhasil');
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupKemasTestData();
  });

  it('GET /api/kemas/available-packs/:batchId - Menampilkan daftar pack berstatus SORTED yang siap dikemas', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/available-packs/${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_available, 20);
    assert.strictEqual(json.data.available_pack_numbers.length, 20);
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

  it('POST /api/kemas - Menolak pengemasan jika total pack BUKAN kelipatan 4', async () => {
    // Pack 1 s/d 5 = 5 pack (bukan kelipatan 4)
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        pack_dari: 1,
        pack_sampai: 5,
        no_doos_awal: 1,
        no_ba_pengemasan: 'BA-KEMAS-001',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'ValidationError');
    assert.match(JSON.stringify(json.details), /kelipatan 4/i);
  });

  it('POST /api/kemas - Menolak pengemasan jika ada pack yang BELUM berstatus SORTED', async () => {
    // Pack 21 s/d 24 berstatus RECEIVED (belum disortir)
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        pack_dari: 21,
        pack_sampai: 24,
        no_doos_awal: 1,
        no_ba_pengemasan: 'BA-KEMAS-001',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'InvalidPackStatus');
    assert.match(json.message, /belum berstatus SORTED/i);
  });

  it('POST /api/kemas - Berhasil mencatat booking pengemasan doos default SIAP_KEMAS (Rasio 4 Pack = 9 Doos: 8 Pack = 18 Doos)', async () => {
    // Pack 1 s/d 8 = 8 pack -> menghasilkan 18 doos (Doos 1 s/d 18)
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        pack_dari: 1,
        pack_sampai: 8,
        no_doos_awal: 1,
        no_ba_pengemasan: 'BA-KEMAS-1001',
        catatan: 'Pengemasan doos batch 01 gelombang 1 (SIAP_KEMAS)',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_pack, 8);
    assert.strictEqual(json.data.total_doos, 18); // (8 / 4) * 9 = 18
    assert.strictEqual(json.data.no_doos_awal, 1);
    assert.strictEqual(json.data.no_doos_akhir, 18);
    assert.strictEqual(json.data.total_bilyet, '360000'); // 8 * 45.000 = 360.000
    assert.strictEqual(json.data.status, 'SIAP_KEMAS');
    assert.strictEqual(json.data.no_ba_pengemasan, 'BA-KEMAS-1001');

    createdKemasId = json.data.id;

    // Verifikasi pembaruan status PackDetail di database: tetap SORTED karena SIAP_KEMAS, tapi hasil_kemas_id & no_doos_range terisi
    const bookedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id: testBatchId,
        nomor_pack: { gte: 1, lte: 8 },
      },
    });

    assert.strictEqual(bookedPacks.length, 8);
    for (const pack of bookedPacks) {
      assert.strictEqual(pack.status, 'SORTED');
      assert.strictEqual(pack.hasil_kemas_id, createdKemasId);
      assert.strictEqual(pack.no_doos_range, 'Doos 1-18');
    }

    // Pack 9..20 harus tetap berstatus SORTED dan hasil_kemas_id null
    const sortedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id: testBatchId,
        nomor_pack: { gte: 9, lte: 20 },
      },
    });
    for (const pack of sortedPacks) {
      assert.strictEqual(pack.status, 'SORTED');
      assert.strictEqual(pack.hasil_kemas_id, null);
      assert.strictEqual(pack.no_doos_range, null);
    }

    // Verifikasi relasi di kemas_pack_detail
    const kemasDetails = await prisma.kemasPackDetail.findMany({
      where: { hasil_kemas_id: createdKemasId },
    });
    assert.strictEqual(kemasDetails.length, 8);

    // Verifikasi audit log
    const audit = await prisma.auditLog.findFirst({
      where: {
        module: 'kemas',
        action: 'CREATE',
        record_id: createdKemasId,
      },
    });
    assert.ok(audit, 'Audit log CREATE kemas harus tercatat');
  });

  it('GET /api/kemas/available-packs/:batchId - Mengecualikan pack yang sudah dibooking SIAP_KEMAS', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/available-packs/${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_available, 12);
    assert.strictEqual(json.data.available_pack_numbers.length, 12);
    assert.strictEqual(json.data.available_pack_numbers[0], 9);
    assert.strictEqual(json.data.available_pack_numbers[11], 20);
  });

  it('POST /api/kemas - Menolak booking jika pack sudah dibooking oleh hasil kemas lain (PackAlreadyBooked)', async () => {
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        pack_dari: 1,
        pack_sampai: 4,
        no_doos_awal: 19,
        no_ba_pengemasan: 'BA-KEMAS-DUPLIKAT',
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

    // Verifikasi pack 1..8 sekarang berstatus PACKED
    const packedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id: testBatchId,
        nomor_pack: { gte: 1, lte: 8 },
      },
    });
    assert.strictEqual(packedPacks.length, 8);
    for (const pack of packedPacks) {
      assert.strictEqual(pack.status, 'PACKED');
    }

    // Verifikasi audit log UPDATE (penyelesaian fisik antar-shift)
    const audit = await prisma.auditLog.findFirst({
      where: {
        module: 'kemas',
        action: 'UPDATE',
        record_id: createdKemasId,
      },
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
    // Pack 9 s/d 12 (4 pack = 9 doos).
    // Jika operator salah input no_doos_awal = 10, maka rentang 10..18 bertabrakan dengan doos 1..18
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        pack_dari: 9,
        pack_sampai: 12,
        no_doos_awal: 10,
        no_ba_pengemasan: 'BA-KEMAS-1002',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'DoosOverlap');
    assert.match(json.message, /bertabrakan dengan hasil kemas/i);
  });

  it('POST /api/kemas - Berhasil mencatat kemasan kedua langsung dengan status READY (Doos 19 s/d 27)', async () => {
    // Pack 9 s/d 12 = 4 pack -> menghasilkan 9 doos (Doos 19 s/d 27)
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        pack_dari: 9,
        pack_sampai: 12,
        no_doos_awal: 19,
        no_ba_pengemasan: 'BA-KEMAS-1002',
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
    assert.strictEqual(json.data.total_bilyet, '180000'); // 4 * 45.000 = 180.000
    assert.strictEqual(json.data.status, 'READY');

    secondKemasId = json.data.id;

    // Verifikasi pack 9..12 langsung PACKED
    const packedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id: testBatchId,
        nomor_pack: { gte: 9, lte: 12 },
      },
    });
    assert.strictEqual(packedPacks.length, 4);
    for (const pack of packedPacks) {
      assert.strictEqual(pack.status, 'PACKED');
    }
  });

  it('GET /api/kemas - Mengambil daftar hasil kemas dengan pagination & filter', async () => {
    const res = await fetch(`${baseUrl}/api/kemas?batch_id=${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.length >= 2);
    assert.strictEqual(json.meta.total >= 2, true);
  });

  it('GET /api/kemas/:id - Mengambil detail lengkap hasil kemas beserta pack di dalamnya', async () => {
    const res = await fetch(`${baseUrl}/api/kemas/${createdKemasId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, createdKemasId);
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

  it('PUT /api/kemas/:id - Memperbarui metadata hasil kemas doos', async () => {
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

    // Verifikasi audit log UPDATE
    const audit = await prisma.auditLog.findFirst({
      where: {
        module: 'kemas',
        action: 'UPDATE',
        record_id: createdKemasId,
      },
    });
    assert.ok(audit, 'Audit log UPDATE kemas harus tercatat');
  });

  it('Safety Lock: Menolak pembaruan atau pembatalan jika kemasan sudah berstatus SHIPPED', async () => {
    // Set status secondKemasId menjadi SHIPPED
    await prisma.hasilKemas.update({
      where: { id: secondKemasId },
      data: { status: 'SHIPPED' },
    });

    // Coba PUT update
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

    // Coba DELETE pembatalan
    const delRes = await fetch(`${baseUrl}/api/kemas/${secondKemasId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    const delJson = await delRes.json();
    assert.strictEqual(delRes.status, 400);
    assert.strictEqual(delJson.error, 'SafetyLockError');
    assert.match(delJson.message, /terkunci/i);

    // Kembalikan status ke READY untuk kebutuhan uji coba selanjutnya
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

    // Verifikasi database: record HasilKemas dan KemasPackDetail sudah terhapus
    const kemasCheck = await prisma.hasilKemas.findUnique({
      where: { id: createdKemasId },
    });
    assert.strictEqual(kemasCheck, null);

    const kemasDetailsCheck = await prisma.kemasPackDetail.findMany({
      where: { hasil_kemas_id: createdKemasId },
    });
    assert.strictEqual(kemasDetailsCheck.length, 0);

    // Verifikasi Pack 1 s/d 8 kembali ke status SORTED, hasil_kemas_id = null, no_doos_range = null
    const revertedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id: testBatchId,
        nomor_pack: { gte: 1, lte: 8 },
      },
    });
    assert.strictEqual(revertedPacks.length, 8);
    for (const pack of revertedPacks) {
      assert.strictEqual(pack.status, 'SORTED');
      assert.strictEqual(pack.hasil_kemas_id, null);
      assert.strictEqual(pack.no_doos_range, null);
    }

    // Verifikasi audit log DELETE
    const audit = await prisma.auditLog.findFirst({
      where: {
        module: 'kemas',
        action: 'DELETE',
        record_id: createdKemasId,
      },
    });
    assert.ok(audit, 'Audit log DELETE kemas harus tercatat');
  });

  it('Pack yang telah di-rollback dapat dikemas ulang tanpa error', async () => {
    // Pack 1 s/d 4 (4 pack = 9 doos) dapat dikemas kembali
    const res = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        pack_dari: 1,
        pack_sampai: 4,
        no_doos_awal: 1,
        no_ba_pengemasan: 'BA-KEMAS-1003',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_pack, 4);
    assert.strictEqual(json.data.total_doos, 9);
    assert.strictEqual(json.data.no_doos_awal, 1);
    assert.strictEqual(json.data.no_doos_akhir, 9);
    assert.strictEqual(json.data.status, 'SIAP_KEMAS');
  });

  it('DELETE /api/kemas/:id - SUPERVISOR berhasil membatalkan booking SIAP_KEMAS dan mengembalikan pack ke status SORTED murni', async () => {
    const lastKemas = await prisma.hasilKemas.findFirst({
      where: { no_ba_pengemasan: 'BA-KEMAS-1003' },
    });
    assert.ok(lastKemas);
    assert.strictEqual(lastKemas.status, 'SIAP_KEMAS');

    const res = await fetch(`${baseUrl}/api/kemas/${lastKemas.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.reverted_status, 'SORTED');

    // Verifikasi pack 1 s/d 4 kembali bersih (hasil_kemas_id null, no_doos_range null)
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
