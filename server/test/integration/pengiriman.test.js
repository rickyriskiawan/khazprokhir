import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';

let server;
let baseUrl;
let operatorToken;
let supervisorToken;
let auditorToken;

let testBatchId;
let testBatch50kId;
let testShiftId;
let denom100kId;
let denom50kId;

let kemas1Id;
let kemas2Id;
let kemas3Id;
let kemas4SiapId;
let kemas50kId;

async function cleanupPengirimanTestData() {
  try {
    // 1. Ambil pengiriman terkait surat jalan test
    const pengirimanList = await prisma.pengiriman.findMany({
      where: {
        nomor_surat_jalan: {
          in: ['SJ-TEST-BI-001', 'SJ-TEST-BI-002', 'SJ-TEST-BI-DUPLICATE'],
        },
      },
      select: { id: true },
    });
    const pengirimanIds = pengirimanList.map((p) => p.id);

    if (pengirimanIds.length > 0) {
      await prisma.auditLog.deleteMany({
        where: {
          module: 'pengiriman',
          record_id: { in: pengirimanIds },
        },
      });
      await prisma.pengirimanDetail.deleteMany({
        where: { pengiriman_id: { in: pengirimanIds } },
      });
      await prisma.pengiriman.deleteMany({
        where: { id: { in: pengirimanIds } },
      });
    }

    // 2. Ambil test batches
    const testBatches = await prisma.batch.findMany({
      where: {
        nomor_batch: { in: ['KIRIM-TEST-BATCH-01', 'KIRIM-TEST-BATCH-02'] },
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
        await prisma.prosesSortir.deleteMany({
          where: { id: { in: prosesIds } },
        });
      }

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
  } catch (err) {
    // ignore cleanup errors
  }
}

describe('Integration Test: Modul 5 - Pengiriman ke Bank Indonesia & Cetak Dokumen Resmi (Step 9)', () => {
  before(async () => {
    await cleanupPengirimanTestData();

    // Start server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Login users
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

    // Ambil master data denominasi & shift
    const denom100k = await prisma.denominasi.findFirst({
      where: { nilai: 100000 },
      include: { emisi: true },
    });
    const denom50k = await prisma.denominasi.findFirst({
      where: { nilai: 50000 },
      include: { emisi: true },
    });
    const shift = await prisma.shift.findFirst();

    denom100kId = denom100k.id;
    denom50kId = denom50k.id;
    testShiftId = shift.id;

    // Seed Batch 1 (100k)
    const batch1 = await prisma.batch.create({
      data: {
        nomor_batch: 'KIRIM-TEST-BATCH-01',
        tahun_anggaran: 2026,
        seri: 'KIR1',
        kepala: '1',
        emisi_id: denom100k.emisi[0].id,
        jumlah_pack: 100,
        status: 'RECEIVED',
      },
    });
    testBatchId = batch1.id;

    // Seed Bon Masuk & Pack 1-100
    const bon1 = await prisma.bonMasuk.create({
      data: {
        no_segel: 'SGL-KIRIM-01',
        tanggal_masuk: new Date('2026-09-15'),
        jam_masuk: '08:00',
        batch_id: testBatchId,
        pack_dari: 1,
        pack_sampai: 100,
        jumlah_bilyet: 4500000n,
        shift_id: testShiftId,
        operator_id: 1,
      },
    });

    const packsData = [];
    for (let i = 1; i <= 100; i++) {
      packsData.push({
        batch_id: testBatchId,
        bon_masuk_id: bon1.id,
        nomor_pack: i,
        status: 'SORTED', // siap dikemas
      });
    }
    await prisma.packDetail.createMany({ data: packsData });

    // Seed Kemas 1: Pack 1-4 -> Doos 1-9 (READY)
    const hk1 = await prisma.hasilKemas.create({
      data: {
        batch_id: testBatchId,
        shift_id: testShiftId,
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        tanggal_kemas: new Date('2026-09-15'),
        pack_dari: 1,
        pack_sampai: 4,
        total_pack: 4,
        no_doos_awal: 1,
        no_doos_akhir: 9,
        total_doos: 9,
        total_bilyet: 180000n,
        no_ba_pengemasan: '157',
        status: 'READY',
        operator_id: 1,
      },
    });
    kemas1Id = hk1.id;

    // Seed Kemas 2: Pack 5-8 -> Doos 10-18 (READY)
    const hk2 = await prisma.hasilKemas.create({
      data: {
        batch_id: testBatchId,
        shift_id: testShiftId,
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        tanggal_kemas: new Date('2026-09-15'),
        pack_dari: 5,
        pack_sampai: 8,
        total_pack: 4,
        no_doos_awal: 10,
        no_doos_akhir: 18,
        total_doos: 9,
        total_bilyet: 180000n,
        no_ba_pengemasan: '158',
        status: 'READY',
        operator_id: 1,
      },
    });
    kemas2Id = hk2.id;

    // Seed Kemas 3: Pack 9-12 -> Doos 19-27 (READY)
    const hk3 = await prisma.hasilKemas.create({
      data: {
        batch_id: testBatchId,
        shift_id: testShiftId,
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        tanggal_kemas: new Date('2026-09-15'),
        pack_dari: 9,
        pack_sampai: 12,
        total_pack: 4,
        no_doos_awal: 19,
        no_doos_akhir: 27,
        total_doos: 9,
        total_bilyet: 180000n,
        no_ba_pengemasan: '159',
        status: 'READY',
        operator_id: 1,
      },
    });
    kemas3Id = hk3.id;

    // Seed Kemas 4: Pack 13-16 -> Doos 28-36 (SIAP_KEMAS - belum siap dikirim)
    const hk4 = await prisma.hasilKemas.create({
      data: {
        batch_id: testBatchId,
        shift_id: testShiftId,
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        tanggal_kemas: new Date('2026-09-15'),
        pack_dari: 13,
        pack_sampai: 16,
        total_pack: 4,
        no_doos_awal: 28,
        no_doos_akhir: 36,
        total_doos: 9,
        total_bilyet: 180000n,
        no_ba_pengemasan: '160',
        status: 'SIAP_KEMAS',
        operator_id: 1,
      },
    });
    kemas4SiapId = hk4.id;

    // Update pack relations & status
    await prisma.packDetail.updateMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 1, lte: 4 } },
      data: { hasil_kemas_id: kemas1Id, status: 'PACKED' },
    });
    await prisma.packDetail.updateMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 5, lte: 8 } },
      data: { hasil_kemas_id: kemas2Id, status: 'PACKED' },
    });
    await prisma.packDetail.updateMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 9, lte: 12 } },
      data: { hasil_kemas_id: kemas3Id, status: 'PACKED' },
    });
    await prisma.packDetail.updateMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 13, lte: 16 } },
      data: { hasil_kemas_id: kemas4SiapId, status: 'SORTED' },
    });

    // Seed Batch 2 (50k)
    const batch2 = await prisma.batch.create({
      data: {
        nomor_batch: 'KIRIM-TEST-BATCH-02',
        tahun_anggaran: 2026,
        seri: 'KIR2',
        kepala: '2',
        emisi_id: denom50k.emisi[0].id,
        jumlah_pack: 100,
        status: 'RECEIVED',
      },
    });
    testBatch50kId = batch2.id;

    const hk5 = await prisma.hasilKemas.create({
      data: {
        batch_id: testBatch50kId,
        shift_id: testShiftId,
        denominasi_id: denom50kId,
        tahun_anggaran: 2026,
        tanggal_kemas: new Date('2026-09-15'),
        pack_dari: 1,
        pack_sampai: 4,
        total_pack: 4,
        no_doos_awal: 1,
        no_doos_akhir: 9,
        total_doos: 9,
        total_bilyet: 180000n,
        no_ba_pengemasan: '50K-01',
        status: 'READY',
        operator_id: 1,
      },
    });
    kemas50kId = hk5.id;
  });

  after(async () => {
    await cleanupPengirimanTestData();
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('GET /api/pengiriman/available-doos - Mengembalikan doos berstatus READY dan mengecualikan SIAP_KEMAS', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman/available-doos?denominasi_id=${denom100kId}&tahun_anggaran=2026`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length >= 3);

    // Pastikan doos 28-36 (SIAP_KEMAS) TIDAK muncul
    const ids = json.data.map((d) => d.id);
    assert.ok(ids.includes(kemas1Id));
    assert.ok(ids.includes(kemas2Id));
    assert.ok(ids.includes(kemas3Id));
    assert.ok(!ids.includes(kemas4SiapId));
  });

  it('POST /api/pengiriman - Menolak doos yang masih berstatus SIAP_KEMAS (HasilKemasNotReady)', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        nomor_surat_jalan: 'SJ-TEST-BI-001',
        tanggal_kirim: '2026-09-15',
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        hasil_kemas_ids: [kemas4SiapId],
        penyerah_nama: 'Budi Santoso',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'HasilKemasNotReady');
    assert.match(json.message, /masih berstatus SIAP_KEMAS/i);
  });

  it('POST /api/pengiriman - Menolak pencampuran doos beda pecahan (DenominasiMismatch)', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        nomor_surat_jalan: 'SJ-TEST-BI-001',
        tanggal_kirim: '2026-09-15',
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        hasil_kemas_ids: [kemas1Id, kemas50kId],
        penyerah_nama: 'Budi Santoso',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'DenominasiMismatch');
  });

  it('POST /api/pengiriman - Menolak pengiriman jika terdapat nomor doos yang loncat/terlewat (DoosGapDetected)', async () => {
    // Kemas 1 = Doos 1-9, Kemas 3 = Doos 19-27 (Doos 10-18 dari Kemas 2 hilang/gap)
    const res = await fetch(`${baseUrl}/api/pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        nomor_surat_jalan: 'SJ-TEST-BI-001',
        tanggal_kirim: '2026-09-15',
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        hasil_kemas_ids: [kemas1Id, kemas3Id],
        penyerah_nama: 'Budi Santoso',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'DoosGapDetected');
    assert.match(json.message, /Celah \(gap\) nomor doos terdeteksi/i);
  });

  let createdPengirimanId;

  it('POST /api/pengiriman - Berhasil mencatat pengiriman doos dan mengubah status HasilKemas & PackDetail ke SHIPPED', async () => {
    // Mengirim Kemas 1 (Doos 1-9) & Kemas 2 (Doos 10-18) -> Total 18 doos (Doos 1-18)
    const res = await fetch(`${baseUrl}/api/pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        nomor_surat_jalan: 'SJ-TEST-BI-001',
        tanggal_kirim: '2026-09-15',
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        sandi_emisi: "Y'22",
        hasil_kemas_ids: [kemas1Id, kemas2Id],
        no_ba_penyerahan: '27/B/Y/TE\'2022/43/2026',
        penyerah_nama: 'Budi Santoso',
        penyerah_jabatan: 'Kepala Seksi Khazprokhir',
        penerima_nama: 'Ahmad Fauzi',
        catatan: 'Pengiriman tahap 1 ke BI Karawang',
      }),
    });

    assert.equal(res.status, 201);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.nomor_surat_jalan, 'SJ-TEST-BI-001');
    assert.equal(json.data.no_doos_awal, 1);
    assert.equal(json.data.no_doos_akhir, 18);
    assert.equal(json.data.total_doos, 18);
    assert.equal(json.data.total_bilyet, '360000');
    assert.equal(Number(json.data.total_nominal), 36000000000);
    assert.equal(json.data.status, 'SHIPPED');
    assert.equal(json.data.details.length, 2);

    createdPengirimanId = json.data.id;

    // Verifikasi status HasilKemas di DB bertransisi menjadi SHIPPED
    const hkDb = await prisma.hasilKemas.findMany({
      where: { id: { in: [kemas1Id, kemas2Id] } },
    });
    for (const h of hkDb) {
      assert.equal(h.status, 'SHIPPED');
    }

    // Verifikasi status PackDetail di DB bertransisi menjadi SHIPPED
    const packsDb = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 1, lte: 8 } },
    });
    assert.equal(packsDb.length, 8);
    for (const p of packsDb) {
      assert.equal(p.status, 'SHIPPED');
    }
  });

  it('POST /api/pengiriman - Menolak nomor surat jalan duplikat', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        nomor_surat_jalan: 'SJ-TEST-BI-001',
        tanggal_kirim: '2026-09-15',
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        hasil_kemas_ids: [kemas3Id],
        penyerah_nama: 'Budi Santoso',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'DuplicateSuratJalan');
  });

  it('POST /api/pengiriman - Menolak doos yang sudah pernah dikirim (HasilKemasAlreadyShipped)', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        nomor_surat_jalan: 'SJ-TEST-BI-002',
        tanggal_kirim: '2026-09-15',
        denominasi_id: denom100kId,
        tahun_anggaran: 2026,
        hasil_kemas_ids: [kemas1Id], // sudah SHIPPED
        penyerah_nama: 'Budi Santoso',
      }),
    });

    assert.equal(res.status, 400);
    const json = await res.json();
    assert.equal(json.success, false);
    assert.equal(json.error, 'HasilKemasAlreadyShipped');
  });

  it('Safety Lock - Hasil kemas yang sudah SHIPPED tidak dapat diubah atau dihapus di Modul Kemas', async () => {
    // Coba hapus HasilKemas 1 via DELETE /api/kemas/:id
    const resDelete = await fetch(`${baseUrl}/api/kemas/${kemas1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(resDelete.status, 400);
    const jsonDel = await resDelete.json();
    assert.equal(jsonDel.error, 'SafetyLockError');
    assert.match(jsonDel.message, /karena doos sudah dalam status SHIPPED/i);

    // Coba update HasilKemas 1 via PUT /api/kemas/:id
    const resUpdate = await fetch(`${baseUrl}/api/kemas/${kemas1Id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ catatan: 'Coba update catatan kemas' }),
    });

    assert.equal(resUpdate.status, 400);
    const jsonUpd = await resUpdate.json();
    assert.equal(jsonUpd.error, 'SafetyLockError');
  });

  it('GET /api/pengiriman - Mengambil daftar pengiriman dengan pagination dan filter', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman?denominasi_id=${denom100kId}&tahun_anggaran=2026&search=SJ-TEST`, {
      headers: { Authorization: `Bearer ${auditorToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.ok(json.data.length >= 1);
    assert.equal(json.data[0].nomor_surat_jalan, 'SJ-TEST-BI-001');
    assert.ok(json.meta.total >= 1);
  });

  it('GET /api/pengiriman/:id - Mengambil detail pengiriman lengkap dengan rincian doos', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman/${createdPengirimanId}`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.data.id, createdPengirimanId);
    assert.equal(json.data.details.length, 2);
    assert.equal(json.data.details[0].no_doos_awal, 1);
    assert.equal(json.data.details[0].no_doos_akhir, 9);
    assert.equal(json.data.details[1].no_doos_awal, 10);
    assert.equal(json.data.details[1].no_doos_akhir, 18);
  });

  it('GET /api/pengiriman/:id/dokumen-bi - Menyajikan data terstruktur lengkap untuk Cetak Berita Acara & Surat Jalan BI', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman/${createdPengirimanId}/dokumen-bi`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);

    const doc = json.data;

    // Verifikasi Header
    assert.match(doc.header.instansi, /PERUM PERCETAKAN UANG/i);
    assert.equal(doc.header.nomor_surat_jalan, 'SJ-TEST-BI-001');
    assert.equal(doc.header.no_ba_penyerahan, '27/B/Y/TE\'2022/43/2026');
    assert.equal(doc.header.tanggal_kirim_formatted, '15 September 2026');

    // Verifikasi Spesifikasi & Terbilang
    assert.equal(doc.spesifikasi.denominasi, 'Rp 100.000');
    assert.equal(doc.spesifikasi.rentang_doos, 'Doos 1 s/d 18');
    assert.equal(doc.volume_dan_nominal.total_doos, 18);
    assert.equal(doc.volume_dan_nominal.total_doos_terbilang, 'Delapan Belas Doos');
    assert.equal(doc.volume_dan_nominal.total_bilyet, '360000');
    assert.equal(doc.volume_dan_nominal.total_bilyet_terbilang, 'Tiga Ratus Enam Puluh Ribu Bilyet');
    assert.equal(doc.volume_dan_nominal.total_nominal, 36000000000);
    assert.equal(doc.volume_dan_nominal.total_nominal_terbilang, 'Tiga Puluh Enam Miliar Rupiah');

    // Verifikasi Rincian Tabel Kemasan
    assert.equal(doc.tabel_rincian_kemasan.length, 2);
    assert.equal(doc.tabel_rincian_kemasan[0].rentang_doos, 'Doos 1-9');
    assert.equal(doc.tabel_rincian_kemasan[0].jumlah_doos, 9);
    assert.equal(doc.tabel_rincian_kemasan[1].rentang_doos, 'Doos 10-18');
    assert.equal(doc.tabel_rincian_kemasan[1].jumlah_doos, 9);

    // Verifikasi Blok Tanda Tangan
    assert.equal(doc.tanda_tangan.pihak_pertama.nama, 'Budi Santoso');
    assert.equal(doc.tanda_tangan.pihak_pertama.jabatan, 'Kepala Seksi Khazprokhir');
    assert.equal(doc.tanda_tangan.pihak_kedua.nama, 'Ahmad Fauzi');
  });

  it('PUT /api/pengiriman/:id - Memperbarui metadata pengiriman', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman/${createdPengirimanId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({
        catatan: 'Catatan diperbarui: Pengiriman dikawal ketat pihak kepolisian',
        penerima_nama: 'Ahmad Fauzi SE',
      }),
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.match(json.data.catatan, /pihak kepolisian/i);
    assert.equal(json.data.penerima_nama, 'Ahmad Fauzi SE');
  });

  it('DELETE /api/pengiriman/:id - Menolak pembatalan oleh role selain SUPERVISOR (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman/${createdPengirimanId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 403);
  });

  it('DELETE /api/pengiriman/:id - SUPERVISOR berhasil membatalkan pengiriman dan me-revert status doos ke READY & pack ke PACKED', async () => {
    const res = await fetch(`${baseUrl}/api/pengiriman/${createdPengirimanId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.success, true);
    assert.match(json.message, /berhasil dibatalkan dan seluruh status doos dikembalikan ke READY/i);

    // Verifikasi di database: pengiriman terhapus
    const pengirimanDb = await prisma.pengiriman.findUnique({
      where: { id: createdPengirimanId },
    });
    assert.equal(pengirimanDb, null);

    // Verifikasi di database: detail terhapus (cascade)
    const detailsDb = await prisma.pengirimanDetail.findMany({
      where: { pengiriman_id: createdPengirimanId },
    });
    assert.equal(detailsDb.length, 0);

    // Verifikasi di database: HasilKemas 1 & 2 kembali ke READY
    const hkReverted = await prisma.hasilKemas.findMany({
      where: { id: { in: [kemas1Id, kemas2Id] } },
    });
    assert.equal(hkReverted.length, 2);
    for (const h of hkReverted) {
      assert.equal(h.status, 'READY');
    }

    // Verifikasi di database: PackDetail 1-8 kembali ke PACKED
    const packsReverted = await prisma.packDetail.findMany({
      where: { batch_id: testBatchId, nomor_pack: { gte: 1, lte: 8 } },
    });
    assert.equal(packsReverted.length, 8);
    for (const p of packsReverted) {
      assert.equal(p.status, 'PACKED');
    }

    // Verifikasi di audit_log: tercatat action DELETE untuk module pengiriman
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        module: 'pengiriman',
        record_id: createdPengirimanId,
        action: 'DELETE',
      },
    });
    assert.ok(auditLogs.length >= 1);
  });
});
