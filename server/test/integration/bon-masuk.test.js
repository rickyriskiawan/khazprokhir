import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';

let server;
let baseUrl;
let operatorToken;
let supervisorToken;
let auditorToken;

async function cleanupTestData() {
  try {
    // Cari batch pengujian
    const testBatches = await prisma.batch.findMany({
      where: {
        nomor_batch: {
          in: [
            'TEST-BATCH-001',
            'TEST-BATCH-002',
            'TEST-BATCH-AUTO',
            'TEST-MULTI-A',
            'TEST-MULTI-B',
          ],
        },
      },
      select: { id: true },
    });

    const batchIds = testBatches.map((b) => b.id);

    if (batchIds.length > 0) {
      // Hapus audit log terkait bon masuk pada batch pengujian
      const testBons = await prisma.bonMasuk.findMany({
        where: {
          OR: [
            { batch_id: { in: batchIds } },
            { items: { some: { batch_id: { in: batchIds } } } },
          ],
        },
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
        where: {
          OR: [
            { batch_id: { in: batchIds } },
            { items: { some: { batch_id: { in: batchIds } } } },
          ],
        },
      });

      // Hapus batch
      await prisma.batch.deleteMany({
        where: { id: { in: batchIds } },
      });
    }

    // Bersihkan berdasarkan no_segel jika masih tersisa
    await prisma.bonMasuk.deleteMany({
      where: {
        no_segel: {
          in: [
            'SGL-TEST-001',
            'SGL-TEST-002',
            'SGL-TEST-003',
            'SGL-TEST-AUTO',
            'SGL-TEST-MULTI',
            'SGL-YEAR-REUSE',
          ],
        },
      },
    });
  } catch (err) {
    // Abaikan error cleanup
  }
}

describe('Integration Test: Modul 1 - Penerimaan Barang Masuk Khazai (Step 5)', () => {
  before(async () => {
    await cleanupTestData();

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Login sebagai operator
    const opLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'khazprokhir123' }),
    });
    const opData = await opLogin.json();
    operatorToken = opData.data.token;

    // Login sebagai supervisor
    const spvLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'supervisor', password: 'khazprokhir123' }),
    });
    const spvData = await spvLogin.json();
    supervisorToken = spvData.data.token;

    // Login sebagai auditor
    const audLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'auditor', password: 'khazprokhir123' }),
    });
    const audData = await audLogin.json();
    auditorToken = audData.data.token;
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupTestData();
    await prisma.$disconnect();
  });

  // ===========================================================================
  // 1. PENGELOLAAN BATCH (/api/batches)
  // ===========================================================================
  let testBatch1Id;

  it('POST /api/batches - Membuat batch baru lengkap dengan 100 pack (status: PENDING)', async () => {
    const res = await fetch(`${baseUrl}/api/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        nomor_batch: 'TEST-BATCH-001',
        tahun_anggaran: 2026,
        seri: 'AA-BA',
        kepala: '0',
        emisi_id: 1, // TE 2022 Pecahan Y
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.nomor_batch, 'TEST-BATCH-001');
    assert.equal(body.data.jumlah_pack, 100);
    testBatch1Id = body.data.id;

    // Verifikasi di database bahwa 100 record pack_detail benar-benar terbentuk
    const packCount = await prisma.packDetail.count({
      where: { batch_id: testBatch1Id, status: 'PENDING' },
    });
    assert.equal(packCount, 100);
  });

  it('POST /api/batches - Menolak duplikasi nomor batch pada tahun anggaran yang sama (409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/api/batches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        nomor_batch: 'TEST-BATCH-001',
        tahun_anggaran: 2026,
        seri: 'AA-BA',
        kepala: '0',
        emisi_id: 1,
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.success, false);
    assert.match(body.message, /sudah terdaftar/i);
  });

  it('GET /api/batches/:id - Menampilkan detail batch beserta ringkasan dan status 100 pack', async () => {
    const res = await fetch(`${baseUrl}/api/batches/${testBatch1Id}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, testBatch1Id);
    assert.equal(body.data.packs.length, 100);
    assert.equal(body.data.summary.total_pack, 100);
    assert.equal(body.data.summary.received_pack, 0);
  });

  // ===========================================================================
  // 2. PENERIMAAN BON MASUK KHAZAI (/api/bon-masuk)
  // ===========================================================================
  let testBon1Id;

  it('POST /api/bon-masuk - Menerima bon masuk parsial (Pack 1 s/d 50) dengan kalkulasi volume bilyet', async () => {
    // Pack 1 s/d 50 = 50 pack = 50 x 45 x 1.000 = 2.250.000 bilyet
    const res = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-TEST-001',
        tanggal_masuk: '2026-09-15',
        jam_masuk: '08:30',
        nomor_batch: 'TEST-BATCH-001',
        pack_dari: 1,
        pack_sampai: 50,
        jenis_mesin_sortir: 'BPS M7',
        kategori_penerimaan: 'PARSIAL',
        shift_id: 1,
        catatan: 'Penerimaan tahap 1 dari Khazai',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.no_segel, 'SGL-TEST-001');
    assert.equal(body.data.jumlah_bilyet, '2250000');
    assert.equal(body.data.pack_dari, 1);
    assert.equal(body.data.pack_sampai, 50);
    testBon1Id = body.data.id;

    // Verifikasi pack 1-50 berubah status menjadi RECEIVED
    const receivedCount = await prisma.packDetail.count({
      where: { batch_id: testBatch1Id, status: 'RECEIVED', bon_masuk_id: testBon1Id },
    });
    assert.equal(receivedCount, 50);

    // Verifikasi pack 51-100 tetap PENDING
    const pendingCount = await prisma.packDetail.count({
      where: { batch_id: testBatch1Id, status: 'PENDING' },
    });
    assert.equal(pendingCount, 50);
  });

  it('POST /api/bon-masuk - Menolak nomor pack tumpang tindih / overlap (400 Bad Request)', async () => {
    // Pack 20 s/d 60 tumpang tindih dengan pack 1 s/d 50 yang sudah berstatus RECEIVED
    const res = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-TEST-002',
        tanggal_masuk: '2026-09-15',
        jam_masuk: '10:00',
        nomor_batch: 'TEST-BATCH-001',
        pack_dari: 20,
        pack_sampai: 60,
        shift_id: 1,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'PackOverlapError');
    assert.match(body.message, /sudah pernah diterima sebelumnya/i);
  });

  it('POST /api/bon-masuk - Menolak jika rentang pack tidak valid (pack_dari > pack_sampai)', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-TEST-INVALID',
        tanggal_masuk: '2026-09-15',
        jam_masuk: '10:00',
        nomor_batch: 'TEST-BATCH-001',
        pack_dari: 70,
        pack_sampai: 60, // Lebih kecil dari pack_dari
        shift_id: 1,
      }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.error, 'ValidationError');
  });

  it('POST /api/bon-masuk - Menolak nomor segel duplikat (409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-TEST-001', // Sudah digunakan di bon pertama
        tanggal_masuk: '2026-09-15',
        jam_masuk: '11:00',
        nomor_batch: 'TEST-BATCH-001',
        pack_dari: 51,
        pack_sampai: 100,
        shift_id: 1,
      }),
    });

    assert.equal(res.status, 409);
    const body = await res.json();
    assert.equal(body.error, 'Conflict');
  });

  it('POST /api/bon-masuk - Otomatis mendaftarkan batch baru jika batch belum pernah ada', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-TEST-AUTO',
        tanggal_masuk: '2026-09-15',
        jam_masuk: '13:00',
        nomor_batch: 'TEST-BATCH-AUTO',
        seri: 'BB-CC',
        kepala: '1',
        emisi_id: 1,
        pack_dari: 1,
        pack_sampai: 100, // Sekaligus 100 pack
        kategori_penerimaan: 'MASINAL',
        shift_id: 2,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.batch.nomor_batch, 'TEST-BATCH-AUTO');
    assert.equal(body.data.batch.seri, 'BB-CC');
    assert.equal(body.data.jumlah_bilyet, '4500000'); // 100 pack = 4.500.000 bilyet
  });

  it('GET /api/bon-masuk - Mengambil list bon masuk dengan filter dan pagination', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk?tahun_anggaran=2026&page=1&limit=10`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 2);
    assert.ok(body.meta.total >= 2);
    assert.equal(body.meta.page, 1);
  });

  it('GET /api/bon-masuk/:id - Mengambil detail lengkap bon masuk dan daftar pack', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk/${testBon1Id}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.id, testBon1Id);
    assert.equal(body.data.no_segel, 'SGL-TEST-001');
    assert.equal(body.data.packs.length, 50);
  });

  it('GET /api/bon-masuk/summary/today - Mengambil ringkasan rekapitulasi penerimaan harian', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk/summary/today?tanggal=2026-09-15`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.tanggal, '2026-09-15');
    assert.ok(body.data.total_bon >= 2);
    assert.ok(Number(body.data.total_bilyet) >= 6750000); // 2.250.000 + 4.500.000
    assert.ok(body.data.breakdown_per_denominasi.length > 0);
  });

  // ===========================================================================
  // 3. PEMBARUAN / FULL EDIT BON MASUK (PUT /api/bon-masuk/:id)
  // ===========================================================================
  it('PUT /api/bon-masuk/:id - Menolak jika rentang pack tidak valid (pack_dari > pack_sampai)', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk/${testBon1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ pack_dari: 70, pack_sampai: 50 }),
    });

    assert.equal(res.status, 400);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it('PUT /api/bon-masuk/:id - Berhasil mengedit bon masuk (metadata & perluasan pack 1-50 ke 1-60)', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk/${testBon1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        pack_dari: 1,
        pack_sampai: 60,
        catatan: 'Catatan diperbarui oleh operator',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.pack_sampai, 60);
    assert.equal(body.data.catatan, 'Catatan diperbarui oleh operator');
    assert.equal(body.data.jumlah_bilyet, '2700000'); // 60 * 45.000

    // Verifikasi pack 1 s/d 60 berstatus RECEIVED
    const receivedCount = await prisma.packDetail.count({
      where: {
        batch_id: testBatch1Id,
        nomor_pack: { gte: 1, lte: 60 },
        status: 'RECEIVED',
        bon_masuk_id: testBon1Id,
      },
    });
    assert.equal(receivedCount, 60);
  });

  it('PUT /api/bon-masuk/:id - Menolak jika nomor pack bertabrakan dengan bon masuk lain', async () => {
    // Coba edit bon 1 agar mencakup pack yang sudah ada di bon lain jika ada overlap
    // Daftarkan bon lain dulu di batch 1: pack 71-80
    const resOverlapCreate = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-TEST-OVERLAP-1',
        tanggal_masuk: '2026-09-15',
        jam_masuk: '11:00',
        nomor_batch: 'TEST-BATCH-001',
        pack_dari: 71,
        pack_sampai: 80,
        shift_id: 1,
      }),
    });
    assert.equal(resOverlapCreate.status, 201);
    const overlapData = await resOverlapCreate.json();
    const overlapBonId = overlapData.data.id;

    // Sekarang edit bon 1 agar pack_sampai = 75 (bertabrakan dengan 71-80)
    const resEditConflict = await fetch(`${baseUrl}/api/bon-masuk/${testBon1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        pack_sampai: 75,
      }),
    });

    assert.equal(resEditConflict.status, 400);
    const conflictBody = await resEditConflict.json();
    assert.equal(conflictBody.error, 'PackOverlapError');

    // Hapus overlap bon
    await prisma.packDetail.updateMany({
      where: { bon_masuk_id: overlapBonId },
      data: { status: 'PENDING', bon_masuk_id: null },
    });
    await prisma.bonMasuk.delete({ where: { id: overlapBonId } });
  });

  // ===========================================================================
  // 4. PEMBATALAN BON MASUK & REVERT STATUS PACK
  // ===========================================================================
  it('DELETE /api/bon-masuk/:id - Menolak role AUDITOR (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk/${testBon1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${auditorToken}` },
    });

    assert.equal(res.status, 403);
  });

  it('DELETE /api/bon-masuk/:id - Mengizinkan OPERATOR membatalkan bon & mengembalikan status pack ke PENDING', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk/${testBon1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verifikasi di database: bon masuk terhapus
    const deletedBon = await prisma.bonMasuk.findUnique({ where: { id: testBon1Id } });
    assert.equal(deletedBon, null);

    // Verifikasi pack 1-60 telah kembali menjadi PENDING
    const revertedCount = await prisma.packDetail.count({
      where: { batch_id: testBatch1Id, nomor_pack: { gte: 1, lte: 60 }, status: 'PENDING' },
    });
    assert.equal(revertedCount, 60);
  });

  // ===========================================================================
  // 5. VERIFIKASI AUDIT LOG
  // ===========================================================================
  it('AuditLog - Memastikan aktivitas bon masuk tercatat ke tabel audit_log', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { module: 'bon_masuk' },
      orderBy: { id: 'desc' },
      take: 10,
    });

    assert.ok(logs.length > 0, 'Audit log untuk modul bon_masuk harus tercatat');
    const actions = logs.map((l) => l.action);
    assert.ok(actions.includes('CREATE'));
    assert.ok(actions.includes('UPDATE'));
    assert.ok(actions.includes('DELETE'));
  });

  // ===========================================================================
  // 6. MULTI-BATCH, SEGEL BERBASIS TAHUN ANGGARAN & SAFETY LOCKING (ADR 0005)
  // ===========================================================================
  describe('Penerimaan Multi-Batch per Segel, Pack Acak, & Granular Safety Locking', () => {
    let multiBatchAId;
    let multiBatchBId;
    let multiBonId;

    it('POST /api/bon-masuk - Berhasil menerima 1 segel fisik berisi 2 batch dengan daftar pack acak', async () => {
      // Setup batch A & B
      const resBatchA = await fetch(`${baseUrl}/api/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          nomor_batch: 'TEST-MULTI-A',
          tahun_anggaran: 2026,
          seri: 'MA-BA',
          kepala: '0',
          emisi_id: 1,
        }),
      });
      const dataA = await resBatchA.json();
      multiBatchAId = dataA.data.id;

      const resBatchB = await fetch(`${baseUrl}/api/batches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${supervisorToken}` },
        body: JSON.stringify({
          nomor_batch: 'TEST-MULTI-B',
          tahun_anggaran: 2026,
          seri: 'MB-BB',
          kepala: '1',
          emisi_id: 2,
        }),
      });
      const dataB = await resBatchB.json();
      multiBatchBId = dataB.data.id;

      // Submit 1 bon masuk dengan 2 batch & non-contiguous pack syntax
      const res = await fetch(`${baseUrl}/api/bon-masuk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
        body: JSON.stringify({
          tahun_anggaran: 2026,
          no_segel: 'SGL-TEST-MULTI',
          tanggal_masuk: '2026-09-15',
          jam_masuk: '08:30',
          shift_id: 1,
          kategori_penerimaan: 'MASINAL',
          jenis_mesin_sortir: 'BPS M7',
          petugas_khazai: 'Budi Santoso',
          petugas_khazprokhir: 'Ahmad Dahlan',
          catatan: 'Multi batch dalam 1 wadah segel',
          items: [
            {
              batch_id: multiBatchAId,
              nomor_pack_list: '1-10, 13, 16, 20, 22', // 14 pack
            },
            {
              batch_id: multiBatchBId,
              nomor_pack_list: '1-5, 8-10', // 8 pack
            },
          ],
        }),
      });

      assert.equal(res.status, 201);
      const body = await res.json();
      assert.equal(body.success, true);
      multiBonId = body.data.id;

      // Verifikasi akumulasi total pack (14 + 8 = 22 pack)
      assert.equal(body.data.total_pack, 22);
      assert.equal(body.data.jumlah_bilyet, '990000'); // 22 * 45000 = 990.000 bilyet
      assert.equal(body.data.items.length, 2);

      // Verifikasi status pack di database
      const countReceivedA = await prisma.packDetail.count({
        where: {
          batch_id: multiBatchAId,
          nomor_pack: { in: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 13, 16, 20, 22] },
          status: 'RECEIVED',
          bon_masuk_id: multiBonId,
        },
      });
      assert.equal(countReceivedA, 14);

      const countReceivedB = await prisma.packDetail.count({
        where: {
          batch_id: multiBatchBId,
          nomor_pack: { in: [1, 2, 3, 4, 5, 8, 9, 10] },
          status: 'RECEIVED',
          bon_masuk_id: multiBonId,
        },
      });
      assert.equal(countReceivedB, 8);
    });

    it('Tahun Anggaran Scoped Seal - Mengizinkan nomor segel sama pada tahun anggaran berbeda tapi menolak jika tahun sama', async () => {
      // 1. Buat bon dengan segel SGL-YEAR-REUSE di tahun 2026
      const res1 = await fetch(`${baseUrl}/api/bon-masuk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
        body: JSON.stringify({
          tahun_anggaran: 2026,
          no_segel: 'SGL-YEAR-REUSE',
          tanggal_masuk: '2026-09-15',
          jam_masuk: '08:30',
          shift_id: 1,
          items: [{ batch_id: multiBatchAId, nomor_pack_list: '31-35' }],
        }),
      });
      assert.equal(res1.status, 201);
      const bon1 = await res1.json();

      // 2. Coba buat lagi segel SGL-YEAR-REUSE di tahun 2026 -> Harus 409 Conflict
      const resConflict = await fetch(`${baseUrl}/api/bon-masuk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
        body: JSON.stringify({
          tahun_anggaran: 2026,
          no_segel: 'SGL-YEAR-REUSE',
          tanggal_masuk: '2026-09-15',
          jam_masuk: '09:00',
          shift_id: 1,
          items: [{ batch_id: multiBatchAId, nomor_pack_list: '36-40' }],
        }),
      });
      assert.equal(resConflict.status, 409);

      // 3. Buat segel SGL-YEAR-REUSE di tahun anggaran 2027 -> Harus 201 Created (Boleh digunakan lagi!)
      const res2 = await fetch(`${baseUrl}/api/bon-masuk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
        body: JSON.stringify({
          tahun_anggaran: 2027,
          no_segel: 'SGL-YEAR-REUSE',
          tanggal_masuk: '2027-01-10',
          jam_masuk: '08:30',
          shift_id: 1,
          items: [{ batch_id: multiBatchAId, nomor_pack_list: '41-45' }],
        }),
      });
      assert.equal(res2.status, 201);
      const bon2 = await res2.json();

      // Cleanup
      await prisma.packDetail.updateMany({
        where: { bon_masuk_id: { in: [bon1.data.id, bon2.data.id] } },
        data: { status: 'PENDING', bon_masuk_id: null },
      });
      await prisma.bonMasuk.deleteMany({
        where: { id: { in: [bon1.data.id, bon2.data.id] } },
      });
    });

    it('Granular Safety Locking - Jika Batch A sudah SORTED, Batch A tidak boleh diubah/dihapus, tetapi Batch B tetap boleh diedit/dihapus', async () => {
      // 1. Simulasikan pack #1 pada Batch A telah disortir
      await prisma.packDetail.update({
        where: {
          batch_id_nomor_pack: {
            batch_id: multiBatchAId,
            nomor_pack: 1,
          },
        },
        data: { status: 'SORTED' },
      });

      // 2. Coba hapus Batch A dari bon masuk (hanya kirim Batch B) -> Ditolak 400 CannotEditProcessedBatch
      const resDeleteLockedBatch = await fetch(`${baseUrl}/api/bon-masuk/${multiBonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
        body: JSON.stringify({
          items: [
            { batch_id: multiBatchBId, nomor_pack_list: '1-5, 8-10' },
          ],
        }),
      });
      assert.equal(resDeleteLockedBatch.status, 400);
      const errLocked = await resDeleteLockedBatch.json();
      assert.equal(errLocked.error, 'CannotEditProcessedBatch');

      // 3. Coba hapus total bon masuk (DELETE) -> Ditolak 400 CannotCancelProcessedBon
      const resDeleteWhole = await fetch(`${baseUrl}/api/bon-masuk/${multiBonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${operatorToken}` },
      });
      assert.equal(resDeleteWhole.status, 400);

      // 4. Edit Batch B (misal ganti pack 1-5, 8-10 menjadi 1-5 saja) sementara Batch A tetap -> Berhasil 200!
      const resEditBatchB = await fetch(`${baseUrl}/api/bon-masuk/${multiBonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${operatorToken}` },
        body: JSON.stringify({
          items: [
            { batch_id: multiBatchAId, nomor_pack_list: '1-10, 13, 16, 20, 22' },
            { batch_id: multiBatchBId, nomor_pack_list: '1-5' }, // Pack 8-10 dibatalkan
          ],
        }),
      });
      assert.equal(resEditBatchB.status, 200);
      const editBData = await resEditBatchB.json();
      assert.equal(editBData.data.total_pack, 19); // 14 + 5 = 19 pack

      // Verifikasi pack 8,9,10 pada Batch B telah kembali ke PENDING
      const countRevertedB = await prisma.packDetail.count({
        where: {
          batch_id: multiBatchBId,
          nomor_pack: { in: [8, 9, 10] },
          status: 'PENDING',
          bon_masuk_id: null,
        },
      });
      assert.equal(countRevertedB, 3);

      // 5. Kembalikan status pack #1 Batch A ke RECEIVED, lalu batalkan seluruh bon masuk
      await prisma.packDetail.update({
        where: {
          batch_id_nomor_pack: {
            batch_id: multiBatchAId,
            nomor_pack: 1,
          },
        },
        data: { status: 'RECEIVED' },
      });

      const resDeleteFinal = await fetch(`${baseUrl}/api/bon-masuk/${multiBonId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${operatorToken}` },
      });
      assert.equal(resDeleteFinal.status, 200);

      // Pastikan seluruh pack dari kedua batch kembali ke PENDING
      const countAllPending = await prisma.packDetail.count({
        where: {
          batch_id: { in: [multiBatchAId, multiBatchBId] },
          status: 'PENDING',
        },
      });
      assert.equal(countAllPending, 200);
    });
  });
});
