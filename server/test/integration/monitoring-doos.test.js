import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';

let server;
let baseUrl;
let operatorToken;
let supervisorToken;
let auditorToken;
let managementToken;

let testBatchId;
let testShiftId;
let denom100kId;
let denomEmptyId;

async function cleanupMonitoringTestData() {
  try {
    const testBatches = await prisma.batch.findMany({
      where: {
        nomor_batch: { in: ['MON-TEST-BATCH-01', 'MON-TEST-BATCH-02'] },
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
        await prisma.kemasPackDetail.deleteMany({
          where: { hasil_kemas_id: { in: kemasIds } },
        });

        await prisma.auditLog.deleteMany({
          where: {
            module: 'kemas',
            record_id: { in: kemasIds },
          },
        });

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
        no_segel: { in: ['SGL-MON-TEST-01'] },
      },
    });
  } catch (err) {
    // Abaikan error cleanup
  }
}

describe('Integration Test: Modul 4 - Monitoring Doos, Buku Register & Deteksi Gap (Step 8)', () => {
  before(async () => {
    await cleanupMonitoringTestData();

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Login seluruh role
    const loginUser = async (username) => {
      const res = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: 'khazprokhir123' }),
      });
      const json = await res.json();
      return json.data.token;
    };

    operatorToken = await loginUser('operator');
    supervisorToken = await loginUser('supervisor');
    auditorToken = await loginUser('auditor');
    managementToken = await loginUser('manajemen');

    // Ambil shift aktif
    const shift = await prisma.shift.findFirst({ where: { is_active: true } });
    testShiftId = shift.id;

    // Ambil denominasi 100k
    const denom100k = await prisma.denominasi.findFirst({ where: { nilai: 100000 } });
    denom100kId = denom100k.id;

    // Ambil denominasi lain yang belum ada data kemasan untuk testing clean gap-check
    const denomOther = await prisma.denominasi.findFirst({ where: { nilai: 50000 } });
    denomEmptyId = denomOther.id;

    // Siapkan Bon Masuk untuk batch MON-TEST-BATCH-01 (Pack 1 s/d 40 RECEIVED)
    const bonRes = await fetch(`${baseUrl}/api/bon-masuk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        no_segel: 'SGL-MON-TEST-01',
        tanggal_masuk: '2026-09-15',
        jam_masuk: '08:00',
        nomor_batch: 'MON-TEST-BATCH-01',
        seri: 'BB-CC',
        kepala: '3',
        emisi_id: 1, // Pecahan 100.000 Y
        pack_dari: 1,
        pack_sampai: 40,
        shift_id: testShiftId,
      }),
    });
    const bonJson = await bonRes.json();
    assert.strictEqual(bonJson.success, true);
    testBatchId = bonJson.data.batch_id;

    // Siapkan sesi sortir untuk Pack 1 s/d 28 (agar berstatus SORTED)
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
        pack_sampai: 28,
        penyortir_1: 'Ahmad Fauzi',
        penyortir_2: 'Siti Rahma',
      }),
    });
    const sortirJson = await sortirRes.json();
    assert.strictEqual(sortirJson.success, true);

    // 1. Buat Hasil Kemas 1: Pack 1..8 (8 pack = 18 doos: Doos 1 s/d 18), status READY
    const kemas1 = await fetch(`${baseUrl}/api/kemas`, {
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
        no_ba_pengemasan: 'BA-MON-1001',
        status: 'READY',
      }),
    });
    const kemas1Json = await kemas1.json();
    assert.strictEqual(kemas1Json.success, true);

    // 2. Buat Hasil Kemas 2: Pack 9..12 (4 pack = 9 doos: Doos 19 s/d 27), status SIAP_KEMAS (default)
    const kemas2 = await fetch(`${baseUrl}/api/kemas`, {
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
        no_ba_pengemasan: 'BA-MON-1002',
        status: 'SIAP_KEMAS',
      }),
    });
    const kemas2Json = await kemas2.json();
    assert.strictEqual(kemas2Json.success, true);

    // 3. Buat Hasil Kemas 3: Pack 13..20 (8 pack = 18 doos: Doos 37 s/d 54), status READY
    // CATATAN: Doos 28 s/d 36 SENGAJA DILEWATI (GAP) untuk menguji deteksi loncat nomor doos!
    const kemas3 = await fetch(`${baseUrl}/api/kemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        batch_id: testBatchId,
        shift_id: testShiftId,
        tanggal_kemas: '2026-09-15',
        pack_dari: 13,
        pack_sampai: 20,
        no_doos_awal: 37,
        no_ba_pengemasan: 'BA-MON-1003',
        status: 'READY',
      }),
    });
    const kemas3Json = await kemas3.json();
    assert.strictEqual(kemas3Json.success, true);
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await cleanupMonitoringTestData();
  });

  // ===========================================================================
  // 1. Uji Coba Buku Register Doos (GET /api/monitoring-doos/register)
  // ===========================================================================

  it('GET /api/monitoring-doos/register - Mengambil buku register doos mode "range" (default)', async () => {
    const res = await fetch(
      `${baseUrl}/api/monitoring-doos/register?denominasi_id=${denom100kId}&tahun_anggaran=2026`,
      { headers: { Authorization: `Bearer ${operatorToken}` } }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.length >= 3);
    assert.ok(json.meta.total >= 3);

    // Periksa atribut item register
    const item1 = json.data.find((k) => k.no_ba_pengemasan === 'BA-MON-1001');
    assert.ok(item1);
    assert.strictEqual(item1.nomor_doos_range, 'Doos 1-18');
    assert.strictEqual(item1.no_doos_awal, 1);
    assert.strictEqual(item1.no_doos_akhir, 18);
    assert.strictEqual(item1.total_doos, 18);
    assert.strictEqual(item1.total_pack, 8);
    assert.strictEqual(item1.status, 'READY');
    assert.match(item1.nominal_rupiah, /Rp/);

    const item2 = json.data.find((k) => k.no_ba_pengemasan === 'BA-MON-1002');
    assert.ok(item2);
    assert.strictEqual(item2.nomor_doos_range, 'Doos 19-27');
    assert.strictEqual(item2.status, 'SIAP_KEMAS');

    const item3 = json.data.find((k) => k.no_ba_pengemasan === 'BA-MON-1003');
    assert.ok(item3);
    assert.strictEqual(item3.nomor_doos_range, 'Doos 37-54');
    assert.strictEqual(item3.status, 'READY');
  });

  it('GET /api/monitoring-doos/register - Memfilter berdasarkan status kemasan (SIAP_KEMAS)', async () => {
    const res = await fetch(
      `${baseUrl}/api/monitoring-doos/register?denominasi_id=${denom100kId}&status=SIAP_KEMAS`,
      { headers: { Authorization: `Bearer ${operatorToken}` } }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.ok(json.data.length >= 1);
    for (const item of json.data) {
      assert.strictEqual(item.status, 'SIAP_KEMAS');
    }
  });

  it('GET /api/monitoring-doos/register - Memfilter berdasarkan pencarian no_ba_pengemasan', async () => {
    const res = await fetch(
      `${baseUrl}/api/monitoring-doos/register?search=BA-MON-1002`,
      { headers: { Authorization: `Bearer ${operatorToken}` } }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.length, 1);
    assert.strictEqual(json.data[0].no_ba_pengemasan, 'BA-MON-1002');
  });

  it('GET /api/monitoring-doos/register - Mengambil buku register doos mode "individual" (satuan per doos)', async () => {
    const res = await fetch(
      `${baseUrl}/api/monitoring-doos/register?denominasi_id=${denom100kId}&tahun_anggaran=2026&view=individual&limit=50`,
      { headers: { Authorization: `Bearer ${operatorToken}` } }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    // 18 doos (kemas 1) + 9 doos (kemas 2) + 18 doos (kemas 3) = 45 doos individual
    assert.ok(json.meta.total >= 45);

    // Periksa doos nomor 1
    const doos1 = json.data.find((d) => d.nomor_doos === 1);
    assert.ok(doos1);
    assert.strictEqual(doos1.status, 'READY');
    assert.strictEqual(doos1.no_ba_pengemasan, 'BA-MON-1001');

    // Periksa doos nomor 19
    const doos19 = json.data.find((d) => d.nomor_doos === 19);
    assert.ok(doos19);
    assert.strictEqual(doos19.status, 'SIAP_KEMAS');
    assert.strictEqual(doos19.no_ba_pengemasan, 'BA-MON-1002');

    // Periksa doos nomor 37
    const doos37 = json.data.find((d) => d.nomor_doos === 37);
    assert.ok(doos37);
    assert.strictEqual(doos37.status, 'READY');
    assert.strictEqual(doos37.no_ba_pengemasan, 'BA-MON-1003');

    // Periksa bahwa doos 28 s/d 36 TIDAK ADA dalam daftar karena merupakan gap!
    const doos28 = json.data.find((d) => d.nomor_doos === 28);
    assert.strictEqual(doos28, undefined);
  });

  // ===========================================================================
  // 2. Uji Coba Deteksi Gap Nomor Doos (GET /api/monitoring-doos/gap-check)
  // ===========================================================================

  it('GET /api/monitoring-doos/gap-check - Menolak request tanpa parameter wajib denominasi_id', async () => {
    const res = await fetch(`${baseUrl}/api/monitoring-doos/gap-check`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 400);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'ValidationError');
  });

  it('GET /api/monitoring-doos/gap-check - Menolak jika denominasi_id tidak ditemukan (404)', async () => {
    const res = await fetch(`${baseUrl}/api/monitoring-doos/gap-check?denominasi_id=99999`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    const json = await res.json();

    assert.strictEqual(res.status, 404);
    assert.strictEqual(json.success, false);
    assert.strictEqual(json.error, 'NotFound');
  });

  it('GET /api/monitoring-doos/gap-check - Berhasil mendeteksi gap nomor doos (Doos 28 s/d 36 yang terlewat)', async () => {
    const res = await fetch(
      `${baseUrl}/api/monitoring-doos/gap-check?denominasi_id=${denom100kId}&tahun_anggaran=2026`,
      { headers: { Authorization: `Bearer ${operatorToken}` } }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.is_intact, false);
    assert.strictEqual(json.data.min_doos, 1);
    assert.strictEqual(json.data.max_doos, 54);
    assert.strictEqual(json.data.total_expected, 54);
    assert.strictEqual(json.data.total_actual, 45);
    assert.strictEqual(json.data.total_gaps, 9);

    // Gaps harus berisi [28, 29, 30, 31, 32, 33, 34, 35, 36]
    assert.deepEqual(json.data.gaps, [28, 29, 30, 31, 32, 33, 34, 35, 36]);
    assert.deepEqual(json.data.gap_ranges, ['Doos 28-36']);
    assert.strictEqual(json.data.overlaps.length, 0);
  });

  it('GET /api/monitoring-doos/gap-check - Mengembalikan status intact pada denominasi yang belum memiliki kemasan', async () => {
    const res = await fetch(
      `${baseUrl}/api/monitoring-doos/gap-check?denominasi_id=${denomEmptyId}&tahun_anggaran=2026`,
      { headers: { Authorization: `Bearer ${operatorToken}` } }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.is_intact, true);
    assert.strictEqual(json.data.min_doos, 0);
    assert.strictEqual(json.data.max_doos, 0);
    assert.strictEqual(json.data.total_gaps, 0);
    assert.deepEqual(json.data.gaps, []);
    assert.deepEqual(json.data.gap_ranges, []);
  });

  // ===========================================================================
  // 3. Uji Coba Ringkasan Statistik Persediaan (GET /api/monitoring-doos/summary)
  // ===========================================================================

  it('GET /api/monitoring-doos/summary - Mengambil ringkasan persediaan doos dan pemisahan antrian WIP vs siap kirim', async () => {
    const res = await fetch(
      `${baseUrl}/api/monitoring-doos/summary?denominasi_id=${denom100kId}&tahun_anggaran=2026`,
      { headers: { Authorization: `Bearer ${operatorToken}` } }
    );
    const json = await res.json();

    assert.strictEqual(res.status, 200);
    assert.strictEqual(json.success, true);

    // Total keseluruhan
    assert.strictEqual(json.data.total_kemas, 3);
    assert.strictEqual(json.data.total_doos, 45); // 18 + 9 + 18
    assert.strictEqual(json.data.total_pack, 20); // 8 + 4 + 8
    assert.strictEqual(json.data.total_bilyet, '900000'); // 20 * 45.000 = 900.000 bilyet
    assert.strictEqual(json.data.total_nominal_angka, '90000000000'); // 900.000 * 100.000 = 90.000.000.000

    // Antrian WIP (SIAP_KEMAS): Kemas 2 (4 pack = 9 doos)
    assert.strictEqual(json.data.antrian_wip.total_kemas, 1);
    assert.strictEqual(json.data.antrian_wip.total_doos, 9);
    assert.strictEqual(json.data.antrian_wip.total_pack, 4);
    assert.strictEqual(json.data.antrian_wip.total_bilyet, '180000');

    // Siap Kirim (READY): Kemas 1 + Kemas 3 (16 pack = 36 doos)
    assert.strictEqual(json.data.siap_kirim.total_kemas, 2);
    assert.strictEqual(json.data.siap_kirim.total_doos, 36);
    assert.strictEqual(json.data.siap_kirim.total_pack, 16);
    assert.strictEqual(json.data.siap_kirim.total_bilyet, '720000');

    // Terkirim (SHIPPED): 0 doos
    assert.strictEqual(json.data.terkirim.total_kemas, 0);
    assert.strictEqual(json.data.terkirim.total_doos, 0);

    // Rincian denominasi
    assert.ok(json.data.rincian_denominasi.length >= 1);
    const denom100kItem = json.data.rincian_denominasi.find((d) => d.denominasi_id === denom100kId);
    assert.ok(denom100kItem);
    assert.strictEqual(denom100kItem.min_no_doos, 1);
    assert.strictEqual(denom100kItem.max_no_doos, 54);
    assert.strictEqual(denom100kItem.total_doos, 45);
  });

  // ===========================================================================
  // 4. Uji Coba RBAC & Keamanan Endpoint
  // ===========================================================================

  it('RBAC: Menolak akses tanpa token autentikasi (401 Unauthorized)', async () => {
    const res = await fetch(`${baseUrl}/api/monitoring-doos/register`);
    assert.strictEqual(res.status, 401);

    const resGap = await fetch(`${baseUrl}/api/monitoring-doos/gap-check?denominasi_id=${denom100kId}`);
    assert.strictEqual(resGap.status, 401);

    const resSum = await fetch(`${baseUrl}/api/monitoring-doos/summary`);
    assert.strictEqual(resSum.status, 401);
  });

  it('RBAC: Dapat diakses dengan sukses oleh role SUPERVISOR (200)', async () => {
    const res = await fetch(`${baseUrl}/api/monitoring-doos/summary`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.strictEqual(res.status, 200);
  });

  it('RBAC: Dapat diakses dengan sukses oleh role AUDITOR (200)', async () => {
    const res = await fetch(`${baseUrl}/api/monitoring-doos/summary`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });
    assert.strictEqual(res.status, 200);
  });

  it('RBAC: Dapat diakses dengan sukses oleh role MANAGEMENT (200)', async () => {
    const res = await fetch(`${baseUrl}/api/monitoring-doos/summary`, {
      headers: { Authorization: `Bearer ${managementToken}` },
    });
    assert.strictEqual(res.status, 200);
  });
});
