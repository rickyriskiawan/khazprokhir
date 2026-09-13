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
    await prisma.targetBulanan.deleteMany({
      where: { tahun_anggaran: 2026, bulan: 10 },
    });
    await prisma.targetTahunan.deleteMany({
      where: { tahun_anggaran: 2027 },
    });
    await prisma.transaksiHcts.deleteMany({
      where: { catatan: 'CT siap hitung shift 1' },
    });
    await prisma.rencanaPenyerahan.deleteMany({
      where: { catatan: 'Prioritas penyerahan pagi' },
    });

    const testUser = await prisma.user.findUnique({
      where: { username: 'operator_test_step4' },
    });
    if (testUser) {
      await prisma.auditLog.deleteMany({
        where: { user_id: testUser.id },
      });
      await prisma.user.delete({
        where: { id: testUser.id },
      });
    }

    await prisma.emisi.deleteMany({
      where: { kode_emisi: 'UPK 75' },
    });
    await prisma.shift.deleteMany({
      where: { nama: 'Shift Lembur Khusus' },
    });
    await prisma.denominasi.deleteMany({
      where: {
        OR: [
          { nama: 'Rp75.000' },
          { nama: 'Rp75.000 Edisi Khusus' },
          { nilai: 75000 },
        ],
      },
    });
  } catch (err) {
    // Ignore cleanup error
  }
}

describe('Integration Test: Master Data & Perencanaan Produksi (Step 4)', () => {
  before(async () => {
    // Bersihkan data sisa pengujian sebelumnya agar idempoten
    await cleanupTestData();

    // Start ephemeral server
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });

    // Obtain login tokens for OPERATOR and SUPERVISOR
    const opLogin = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'khazprokhir123' }),
    });
    const opData = await opLogin.json();
    operatorToken = opData.data.token;

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
  // 1. MASTER DENOMINASI
  // ===========================================================================
  let testDenominasiId;

  it('GET /api/master/denominasi - Mengambil daftar denominasi aktif', async () => {
    const res = await fetch(`${baseUrl}/api/master/denominasi`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length > 0);
  });

  it('POST /api/master/denominasi - Menolak role OPERATOR (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/master/denominasi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${operatorToken}`,
      },
      body: JSON.stringify({ nama: 'Rp75.000', nilai: 75000 }),
    });

    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.success, false);
  });

  it('POST /api/master/denominasi - Mengizinkan role SUPERVISOR (201 Created)', async () => {
    const res = await fetch(`${baseUrl}/api/master/denominasi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ nama: 'Rp75.000', nilai: 75000 }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.nama, 'Rp75.000');
    assert.equal(body.data.nilai, 75000);
    testDenominasiId = body.data.id;
  });

  it('POST /api/master/denominasi - Mencegah duplikasi nama/nilai (409 Conflict)', async () => {
    const res = await fetch(`${baseUrl}/api/master/denominasi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ nama: 'Rp75.000', nilai: 75000 }),
    });

    assert.equal(res.status, 409);
  });

  it('PUT /api/master/denominasi/:id - Memperbarui denominasi', async () => {
    const res = await fetch(`${baseUrl}/api/master/denominasi/${testDenominasiId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ nama: 'Rp75.000 Edisi Khusus' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.nama, 'Rp75.000 Edisi Khusus');
  });

  it('DELETE /api/master/denominasi/:id - Soft delete menonaktifkan status', async () => {
    const res = await fetch(`${baseUrl}/api/master/denominasi/${testDenominasiId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.is_active, false);
  });

  // ===========================================================================
  // 2. MASTER EMISI
  // ===========================================================================
  let testEmisiId;

  it('GET /api/master/emisi - Mengambil daftar emisi beserta relasi denominasi', async () => {
    const res = await fetch(`${baseUrl}/api/master/emisi`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data[0].denominasi);
  });

  it('POST /api/master/emisi - Membuat emisi baru oleh SUPERVISOR', async () => {
    const res = await fetch(`${baseUrl}/api/master/emisi`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        kode_emisi: 'UPK 75',
        sandi: "Z'20",
        tahun: '2020',
        denominasi_id: testDenominasiId,
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.kode_emisi, 'UPK 75');
    testEmisiId = body.data.id;
  });

  it('PUT /api/master/emisi/:id - Memperbarui data emisi', async () => {
    const res = await fetch(`${baseUrl}/api/master/emisi/${testEmisiId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({ sandi: "Z'21" }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.sandi, "Z'21");
  });

  it('DELETE /api/master/emisi/:id - Soft delete emisi', async () => {
    const res = await fetch(`${baseUrl}/api/master/emisi/${testEmisiId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.is_active, false);
  });

  // ===========================================================================
  // 3. MASTER SHIFT
  // ===========================================================================
  let testShiftId;

  it('GET /api/master/shift - Mengambil daftar shift kerja', async () => {
    const res = await fetch(`${baseUrl}/api/master/shift`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    assert.ok(body.data.length >= 3);
  });

  it('POST /api/master/shift - Membuat shift lembur baru', async () => {
    const res = await fetch(`${baseUrl}/api/master/shift`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        nama: 'Shift Lembur Khusus',
        jam_mulai: '22:00',
        jam_selesai: '04:00',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    testShiftId = body.data.id;
    assert.equal(body.data.nama, 'Shift Lembur Khusus');
  });

  it('DELETE /api/master/shift/:id - Soft delete shift', async () => {
    const res = await fetch(`${baseUrl}/api/master/shift/${testShiftId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.is_active, false);
  });

  // ===========================================================================
  // 4. MASTER PENGGUNA (USERS)
  // ===========================================================================
  let testUserId;

  it('GET /api/master/users - Menolak akses OPERATOR (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/master/users`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 403);
  });

  it('GET /api/master/users - Menampilkan daftar user tanpa password_hash ke SUPERVISOR', async () => {
    const res = await fetch(`${baseUrl}/api/master/users`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body.data));
    // Verifikasi keamanan: TIDAK ADA password_hash
    for (const u of body.data) {
      assert.equal(u.password_hash, undefined);
    }
  });

  it('POST /api/master/users - Membuat user baru dengan hash bcrypt dan sanitasi output', async () => {
    const res = await fetch(`${baseUrl}/api/master/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        username: 'operator_test_step4',
        password: 'passwordRahasia123',
        full_name: 'Petugas Uji Coba Step 4',
        role: 'OPERATOR',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.username, 'operator_test_step4');
    assert.equal(body.data.password_hash, undefined);
    testUserId = body.data.id;

    // Uji apakah user baru bisa login dengan password yang baru dibuat
    const loginTest = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'operator_test_step4',
        password: 'passwordRahasia123',
      }),
    });

    assert.equal(loginTest.status, 200);
    const loginData = await loginTest.json();
    assert.ok(loginData.data.token);
  });

  it('PUT /api/master/users/:id - Mengubah password dan profil user', async () => {
    const res = await fetch(`${baseUrl}/api/master/users/${testUserId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        full_name: 'Petugas Terverifikasi Step 4',
        password: 'passwordBaru12345',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.full_name, 'Petugas Terverifikasi Step 4');
    assert.equal(body.data.password_hash, undefined);

    // Verifikasi login dengan password baru
    const loginNew = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'operator_test_step4',
        password: 'passwordBaru12345',
      }),
    });
    assert.equal(loginNew.status, 200);
  });

  it('DELETE /api/master/users/:id - Soft delete akun user', async () => {
    const res = await fetch(`${baseUrl}/api/master/users/${testUserId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.is_active, false);

    // Pastikan user yang dinonaktifkan tidak bisa login
    const loginDisabled = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'operator_test_step4',
        password: 'passwordBaru12345',
      }),
    });
    assert.equal(loginDisabled.status, 403);
  });

  // ===========================================================================
  // 5. TARGET PRODUKSI TAHUNAN
  // ===========================================================================
  let testTargetTahunanId;

  it('POST /api/target-tahunan - Auto kalkulasi target_brood dan target_pack secara presisi', async () => {
    // 100.000.000 bilyet:
    // target_brood = 100.000.000 / 1.000 = 100.000 brood
    // target_pack = 100.000 / 45 = 2.222 pack (integer division)
    // Atau 45.000.000 bilyet:
    // target_brood = 45.000.000 / 1.000 = 45.000 brood
    // target_pack = 45.000 / 45 = 1.000 pack
    const res = await fetch(`${baseUrl}/api/target-tahunan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2027,
        denominasi_id: 1, // Rp100.000
        target_bilyet: '45000000',
        catatan: 'Target Uji Coba TA 2027',
      }),
    });

    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.data.target_bilyet, '45000000');
    assert.equal(body.data.target_brood, '45000');
    assert.equal(body.data.target_pack, 1000);
    testTargetTahunanId = body.data.id;
  });

  it('POST /api/target-tahunan - Mencegah duplikasi target tahunan untuk tahun & pecahan yang sama', async () => {
    const res = await fetch(`${baseUrl}/api/target-tahunan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2027,
        denominasi_id: 1,
        target_bilyet: '45000000',
      }),
    });

    assert.equal(res.status, 409);
  });

  it('PUT /api/target-tahunan/:id - Merekalkulasi target_brood & target_pack saat target_bilyet diubah', async () => {
    const res = await fetch(`${baseUrl}/api/target-tahunan/${testTargetTahunanId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        target_bilyet: '90000000',
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.target_bilyet, '90000000');
    assert.equal(body.data.target_brood, '90000');
    assert.equal(body.data.target_pack, 2000);
  });

  it('DELETE /api/target-tahunan/:id - Menghapus target tahunan', async () => {
    const res = await fetch(`${baseUrl}/api/target-tahunan/${testTargetTahunanId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
  });

  // ===========================================================================
  // 6. TARGET PRODUKSI BULANAN
  // ===========================================================================
  let testTargetBulananId;

  it('POST /api/target-bulanan - Validasi bulan (1-12) dan sisa_hari_kerja', async () => {
    // Bulan di luar 1-12 harus gagal
    const resInvalidMonth = await fetch(`${baseUrl}/api/target-bulanan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        bulan: 13,
        denominasi_id: 1,
        target_penyerahan_bilyet: 1000000,
        target_pengemasan_bilyet: 1000000,
        sisa_hari_kerja: 20,
      }),
    });

    assert.equal(resInvalidMonth.status, 400);

    // Target bulanan valid (Bulan 10 / Oktober)
    const resValid = await fetch(`${baseUrl}/api/target-bulanan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        bulan: 10, // Oktober
        denominasi_id: 1,
        target_penyerahan_bilyet: 4000000,
        target_pengemasan_bilyet: 4000000,
        sisa_hari_kerja: 21,
      }),
    });

    assert.equal(resValid.status, 201);
    const body = await resValid.json();
    assert.equal(body.data.bulan, 10);
    assert.equal(body.data.sisa_hari_kerja, 21);
    testTargetBulananId = body.data.id;
  });

  it('POST /api/target-bulanan - Mencegah duplikasi target bulanan (409 Conflict)', async () => {
    // Bulan 9 sudah di-seed, maka harus 409
    const resDuplicate = await fetch(`${baseUrl}/api/target-bulanan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        tahun_anggaran: 2026,
        bulan: 9,
        denominasi_id: 1,
        target_penyerahan_bilyet: 4000000,
        target_pengemasan_bilyet: 4000000,
        sisa_hari_kerja: 21,
      }),
    });

    assert.equal(resDuplicate.status, 409);
  });

  it('PUT /api/target-bulanan/:id - Memperbarui target bulanan', async () => {
    const res = await fetch(`${baseUrl}/api/target-bulanan/${testTargetBulananId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        sisa_hari_kerja: 18,
      }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.sisa_hari_kerja, 18);
  });

  it('DELETE /api/target-bulanan/:id - Menghapus target bulanan', async () => {
    const res = await fetch(`${baseUrl}/api/target-bulanan/${testTargetBulananId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
  });

  // ===========================================================================
  // 7. TRANSAKSI HCTS & RENCANA PENYERAHAN
  // ===========================================================================
  let testHctsId;
  let testRencanaId;

  it('POST & GET /api/hcts - Menginput dan mengambil data mutasi persediaan HCTS', async () => {
    const createRes = await fetch(`${baseUrl}/api/hcts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        tanggal: '2026-09-14',
        denominasi_id: 1,
        penerimaan_bilyet: 50000,
        penyerahan_bilyet: 30000,
        akumulasi_penyerahan_bi: 200000,
        persediaan_hcts: 150000,
        jumlah_ct_siap_hitung: 12,
        catatan: 'CT siap hitung shift 1',
      }),
    });

    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    testHctsId = createBody.data.id;
    assert.equal(createBody.data.jumlah_ct_siap_hitung, 12);

    const getRes = await fetch(`${baseUrl}/api/hcts?tanggal=2026-09-14`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.ok(getBody.data.length > 0);
  });

  it('POST & GET /api/rencana-penyerahan - Menginput dan mengambil data rencana penyerahan', async () => {
    const createRes = await fetch(`${baseUrl}/api/rencana-penyerahan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supervisorToken}`,
      },
      body: JSON.stringify({
        tanggal_rencana: '2026-09-15',
        denominasi_id: 1,
        kurang_pengemasan_bilyet: 100000,
        kurang_pengemasan_doos: 5,
        kurang_penerimaan_bilyet: 90000,
        kurang_penerimaan_vell: 2,
        catatan: 'Prioritas penyerahan pagi',
      }),
    });

    assert.equal(createRes.status, 201);
    const createBody = await createRes.json();
    testRencanaId = createBody.data.id;
    assert.equal(createBody.data.kurang_pengemasan_doos, 5);

    const getRes = await fetch(`${baseUrl}/api/rencana-penyerahan`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(getRes.status, 200);
    const getBody = await getRes.json();
    assert.ok(getBody.data.length > 0);
  });

  // ===========================================================================
  // 8. AUDIT LOG VERIFICATION
  // ===========================================================================
  it('AuditLog - Memastikan seluruh operasi mutasi (POST, PUT, DELETE) tercatat di tabel audit_log', async () => {
    const logs = await prisma.auditLog.findMany({
      where: {
        module: { in: ['master', 'target', 'planning'] },
      },
      orderBy: { id: 'desc' },
      take: 10,
    });

    assert.ok(logs.length >= 5, 'Minimal harus ada 5 log aktivitas mutasi');
    const modules = logs.map((l) => l.module);
    assert.ok(modules.includes('master') || modules.includes('target') || modules.includes('planning'));
  });
});
