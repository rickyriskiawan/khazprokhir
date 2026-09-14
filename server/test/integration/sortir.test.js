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

async function cleanupSortirTestData() {
  try {
    const testBatches = await prisma.batch.findMany({
      where: {
        nomor_batch: { in: ['SORTIR-TEST-BATCH-01', 'SORTIR-TEST-BATCH-02'] },
      },
      select: { id: true },
    });

    const batchIds = testBatches.map((b) => b.id);

    if (batchIds.length > 0) {
      // Ambil proses sortir terkait
      const prosesList = await prisma.prosesSortir.findMany({
        where: { batch_id: { in: batchIds } },
        select: { id: true },
      });
      const prosesIds = prosesList.map((p) => p.id);

      // Hapus sortir pack details
      if (prosesIds.length > 0) {
        await prisma.sortirPackDetail.deleteMany({
          where: { proses_sortir_id: { in: prosesIds } },
        });

        // Hapus audit log
        await prisma.auditLog.deleteMany({
          where: {
            module: 'sortir',
            record_id: { in: prosesIds },
          },
        });

        // Hapus proses sortir
        await prisma.prosesSortir.deleteMany({
          where: { id: { in: prosesIds } },
        });
      }

      // Hapus audit log bon masuk
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

      // Hapus pack detail
      await prisma.packDetail.deleteMany({
        where: { batch_id: { in: batchIds } },
      });

      // Hapus bon masuk
      await prisma.bonMasuk.deleteMany({
        where: { batch_id: { in: batchIds } },
      });

      // Hapus batch
      await prisma.batch.deleteMany({
        where: { id: { in: batchIds } },
      });
    }

    // Bersihkan bon segel jika tersisa
    await prisma.bonMasuk.deleteMany({
      where: {
        no_segel: { in: ['SGL-SORTIR-TEST-01'] },
      },
    });
  } catch (err) {
    // Abaikan error cleanup
  }
}

describe('Integration Test: Modul 2 - Proses Sortir & Penataan Pack (Step 6)', () => {
  before(async () => {
    await cleanupSortirTestData();

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
    const shift = await prisma.shift.findFirst({ where: { is_active: true } });
    testShiftId = shift.id;

    // Siapkan data batch dan bon masuk:
    // Buat bon masuk pack 1 s/d 40 sehingga pack 1..40 berstatus RECEIVED
    const bonRes = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-SORTIR-TEST-01',
        tanggal_masuk: '2026-09-15',
        jam_masuk: '08:00',
        nomor_batch: 'SORTIR-TEST-BATCH-01',
        seri: 'AB-BA',
        kepala: '1',
        emisi_id: 1, // Pecahan 100.000 Y
        pack_dari: 1,
        pack_sampai: 40,
        shift_id: testShiftId,
      }),
    });

    const bonJson = await bonRes.json();
    assert.strictEqual(bonJson.success, true, 'Persiapan bon masuk harus berhasil');
    testBatchId = bonJson.data.batch_id;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupSortirTestData();
  });

  it('GET /api/sortir/available-packs/:batchId - Menampilkan daftar pack berstatus RECEIVED yang siap disortir', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/available-packs/${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_available, 40);
    assert.strictEqual(json.data.available_pack_numbers.length, 40);
    assert.strictEqual(json.data.available_pack_numbers[0], 1);
    assert.strictEqual(json.data.available_pack_numbers[39], 40);
  });

  it('POST /api/sortir - Menolak sesi sortir jika jumlah pack BUKAN kelipatan 4', async () => {
    // Pack 1 s/d 5 = 5 pack (bukan kelipatan 4)
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
        pack_dari: 1,
        pack_sampai: 5,
        penyortir_1: 'Ahmad Dahlan',
        penyortir_2: 'Siti Fatimah',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'ValidationError');
    assert.match(JSON.stringify(json.details), /kelipatan 4/i);
  });

  it('POST /api/sortir - Menolak sesi sortir jika ada pack yang belum berstatus RECEIVED (masih PENDING)', async () => {
    // Pack 37 s/d 44 = 8 pack (kelipatan 4), namun pack 41..44 belum diterima dari Khazai
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
        pack_dari: 37,
        pack_sampai: 44,
        penyortir_1: 'Ahmad Dahlan',
        penyortir_2: 'Siti Fatimah',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'InvalidPackStatus');
    assert.match(json.message, /PENDING/);
  });

  let createdSortirId;

  it('POST /api/sortir - Berhasil membuat sesi sortir kelipatan 4 (Zero Reject, 2 Penyortir, Status SORTED)', async () => {
    // Pack 1 s/d 8 = 8 pack (kelipatan 4)
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
        pack_dari: 1,
        pack_sampai: 8,
        penyortir_1: 'Ahmad Dahlan',
        penyortir_2: 'Siti Fatimah',
        catatan: 'Sortir meja 1 berjalan lancar',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_pack, 8);
    assert.strictEqual(json.data.pack_dari, 1);
    assert.strictEqual(json.data.pack_sampai, 8);
    assert.strictEqual(json.data.penyortir_1, 'Ahmad Dahlan');
    assert.strictEqual(json.data.penyortir_2, 'Siti Fatimah');
    assert.strictEqual(json.data.status, 'IN_PROGRESS');

    // Zero Reject: 8 pack * 45 = 360 brood, 360 * 1000 = 360.000 bilyet
    assert.strictEqual(json.data.total_brood, 360);
    assert.strictEqual(json.data.total_bilyet, '360000');

    createdSortirId = json.data.id;

    // Verifikasi status pack di database telah berubah menjadi SORTED
    const updatedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id: testBatchId,
        nomor_pack: { in: [1, 2, 3, 4, 5, 6, 7, 8] },
      },
    });

    assert.strictEqual(updatedPacks.length, 8);
    for (const p of updatedPacks) {
      assert.strictEqual(p.status, 'SORTED');
    }

    // Verifikasi relasi sortir_pack_detail tercatat 8 record
    const sortirDetails = await prisma.sortirPackDetail.findMany({
      where: { proses_sortir_id: createdSortirId },
    });
    assert.strictEqual(sortirDetails.length, 8);
  });

  it('POST /api/sortir - Menolak penyortiran ulang pack yang sudah berstatus SORTED', async () => {
    // Coba sortir pack 1 s/d 4 yang baru saja disortir
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
        pack_dari: 1,
        pack_sampai: 4,
        penyortir_1: 'Budi Hartono',
        penyortir_2: 'Joko Anwar',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'InvalidPackStatus');
    assert.match(json.message, /SORTED/);
  });

  it('GET /api/sortir/available-packs/:batchId - Sisa pack yang siap disortir berkurang', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/available-packs/${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    // Dari 40 pack awal, 8 pack telah disortir, tersisa 32 pack
    assert.strictEqual(json.data.total_available, 32);
    assert.strictEqual(json.data.available_pack_numbers[0], 9);
  });

  it('GET /api/sortir - Mengambil daftar sesi sortir dengan filter batch dan penyortir', async () => {
    const res = await fetch(
      `${baseUrl}/api/sortir?batch_id=${testBatchId}&penyortir=Ahmad`,
      {
        headers: { Authorization: `Bearer ${operatorToken}` },
      }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.length >= 1, true);
    assert.strictEqual(json.data[0].penyortir_1, 'Ahmad Dahlan');
  });

  it('GET /api/sortir/:id - Mengambil detail lengkap sesi sortir beserta pack detail', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/${createdSortirId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.id, createdSortirId);
    assert.strictEqual(json.data.sortir_pack_details.length, 8);
    assert.strictEqual(json.data.sortir_pack_details[0].pack_detail.nomor_pack, 1);
  });

  it('PUT /api/sortir/:id - Memperbarui metadata sesi sortir (penyortir & catatan)', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/${createdSortirId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        penyortir_2: 'Siti Nurhaliza',
        catatan: 'Catatan diperbarui oleh operator',
      }),
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.penyortir_2, 'Siti Nurhaliza');
    assert.strictEqual(json.data.catatan, 'Catatan diperbarui oleh operator');
  });

  it('POST /api/sortir/:id/complete - Menyelesaikan sesi sortir (status COMPLETED)', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/${createdSortirId}/complete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${operatorToken}`,
      },
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.status, 'COMPLETED');
    assert.notStrictEqual(json.data.completed_at, null);
  });

  it('GET /api/sortir/summary/today - Mengambil ringkasan sortir hari ini', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/summary/today?tanggal=2026-09-15`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.total_sesi >= 1, true);
    assert.strictEqual(json.data.total_pack >= 8, true);
    assert.strictEqual(json.data.total_brood >= 360, true);
  });

  it('Safety Locking - Menolak update atau delete sesi sortir jika pack telah berstatus PACKED', async () => {
    // Ubah sementara pack 1 menjadi PACKED
    await prisma.packDetail.updateMany({
      where: { batch_id: testBatchId, nomor_pack: 1 },
      data: { status: 'PACKED' },
    });

    try {
      // Coba PUT update
      const updateRes = await fetch(`${baseUrl}/api/sortir/${createdSortirId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${operatorToken}`,
        },
        body: JSON.stringify({ catatan: 'Coba ubah catatan yang terkunci' }),
      });
      const updateJson = await updateRes.json();
      assert.strictEqual(updateRes.status, 400);
      assert.strictEqual(updateJson.error, 'LockedSortirSession');
      assert.match(updateJson.message, /terkunci/i);

      // Coba DELETE
      const delRes = await fetch(`${baseUrl}/api/sortir/${createdSortirId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${supervisorToken}` },
      });
      const delJson = await delRes.json();
      assert.strictEqual(delRes.status, 400);
      assert.strictEqual(delJson.error, 'LockedSortirSession');
      assert.match(delJson.message, /terkunci/i);
    } finally {
      // Kembalikan pack 1 ke SORTED agar test delete berikutnya dapat berjalan
      await prisma.packDetail.updateMany({
        where: { batch_id: testBatchId, nomor_pack: 1 },
        data: { status: 'SORTED' },
      });
    }
  });

  it('DELETE /api/sortir/:id - Ditolak jika dilakukan oleh OPERATOR (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/${createdSortirId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    const json = await res.json();
    assert.strictEqual(res.status, 403);
    assert.strictEqual(json.success, false);
  });

  it('DELETE /api/sortir/:id - Berhasil dibatalkan oleh SUPERVISOR dan me-revert status pack ke RECEIVED', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/${createdSortirId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    const json = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.reverted_pack_count, 8);

    // Verifikasi pack 1 s/d 8 telah kembali ke status RECEIVED
    const revertedPacks = await prisma.packDetail.findMany({
      where: {
        batch_id: testBatchId,
        nomor_pack: { in: [1, 2, 3, 4, 5, 6, 7, 8] },
      },
    });

    for (const p of revertedPacks) {
      assert.strictEqual(p.status, 'RECEIVED');
    }

    // Verifikasi proses sortir sudah terhapus
    const deletedSession = await prisma.prosesSortir.findUnique({
      where: { id: createdSortirId },
    });
    assert.strictEqual(deletedSession, null);
  });

  it('GET /api/sortir/available-packs/:batchId - Pack yang dibatalkan kembali tersedia untuk disortir', async () => {
    const res = await fetch(`${baseUrl}/api/sortir/available-packs/${testBatchId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    // Kembali utuh 40 pack
    assert.strictEqual(json.data.total_available, 40);
    assert.strictEqual(json.data.available_pack_numbers[0], 1);
  });

  it('AuditLog - Memastikan mutasi sortir (CREATE, UPDATE, DELETE) tercatat di audit_log', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { module: 'sortir' },
      orderBy: { id: 'desc' },
      take: 5,
    });

    assert.strictEqual(logs.length >= 3, true);
    const actions = logs.map((l) => l.action);
    assert.strictEqual(actions.includes('CREATE'), true);
    assert.strictEqual(actions.includes('UPDATE'), true);
    assert.strictEqual(actions.includes('DELETE'), true);
  });
});
