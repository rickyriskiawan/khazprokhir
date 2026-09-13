import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';

let server;
let baseUrl;
let operatorToken;
let supervisorToken;

async function cleanupTestData() {
  try {
    // Cari batch pengujian
    const testBatches = await prisma.batch.findMany({
      where: {
        nomor_batch: { in: ['TEST-BATCH-001', 'TEST-BATCH-002', 'TEST-BATCH-AUTO'] },
      },
      select: { id: true },
    });

    const batchIds = testBatches.map((b) => b.id);

    if (batchIds.length > 0) {
      // Hapus audit log terkait bon masuk pada batch pengujian
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

    // Bersihkan berdasarkan no_segel jika masih tersisa
    await prisma.bonMasuk.deleteMany({
      where: {
        no_segel: { in: ['SGL-TEST-001', 'SGL-TEST-002', 'SGL-TEST-003', 'SGL-TEST-AUTO'] },
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
  // 3. PEMBATALAN BON MASUK & REVERT STATUS PACK
  // ===========================================================================
  it('DELETE /api/bon-masuk/:id - Menolak role OPERATOR (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk/${testBon1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 403);
  });

  it('DELETE /api/bon-masuk/:id - Mengizinkan SUPERVISOR membatalkan bon & mengembalikan status pack ke PENDING', async () => {
    const res = await fetch(`${baseUrl}/api/bon-masuk/${testBon1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);

    // Verifikasi di database: bon masuk terhapus
    const deletedBon = await prisma.bonMasuk.findUnique({ where: { id: testBon1Id } });
    assert.equal(deletedBon, null);

    // Verifikasi pack 1-50 telah kembali menjadi PENDING
    const revertedCount = await prisma.packDetail.count({
      where: { batch_id: testBatch1Id, nomor_pack: { gte: 1, lte: 50 }, status: 'PENDING' },
    });
    assert.equal(revertedCount, 50);
  });

  // ===========================================================================
  // 4. VERIFIKASI AUDIT LOG
  // ===========================================================================
  it('AuditLog - Memastikan aktivitas bon masuk tercatat ke tabel audit_log', async () => {
    const logs = await prisma.auditLog.findMany({
      where: { module: 'bon_masuk' },
      orderBy: { id: 'desc' },
      take: 5,
    });

    assert.ok(logs.length > 0, 'Audit log untuk modul bon_masuk harus tercatat');
    const actions = logs.map((l) => l.action);
    assert.ok(actions.includes('CREATE'));
    assert.ok(actions.includes('DELETE'));
  });
});
