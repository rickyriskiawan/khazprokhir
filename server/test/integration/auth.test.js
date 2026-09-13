import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';
import prisma from '../../src/lib/prisma.js';
import { authenticateToken } from '../../src/middleware/auth.middleware.js';
import { authorize } from '../../src/middleware/rbac.middleware.js';

import express from 'express';

let server;
let baseUrl;
let operatorToken;
let supervisorToken;

describe('Integration Test: Autentikasi & RBAC', () => {
  before(async () => {
    const testApp = express();
    testApp.use(express.json());

    // Test routes for RBAC verification
    testApp.get('/api/test-rbac/supervisor-only', authenticateToken, authorize('SUPERVISOR'), (req, res) => {
      res.status(200).json({ success: true, message: 'Akses khusus supervisor diizinkan' });
    });

    testApp.get('/api/test-rbac/multi-role', authenticateToken, authorize('SUPERVISOR', 'OPERATOR'), (req, res) => {
      res.status(200).json({ success: true, message: 'Akses multi-role diizinkan' });
    });

    // Delegate to production app
    testApp.use(app);

    // Start ephemeral HTTP server
    await new Promise((resolve) => {
      server = testApp.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  });

  it('POST /api/auth/login - Harus gagal jika body kosong atau tidak lengkap', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator' }),
    });

    assert.equal(res.status, 400);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.match(data.message, /wajib diisi/i);
  });

  it('POST /api/auth/login - Harus gagal jika password salah', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'password_salah_123' }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'InvalidCredentials');
  });

  it('POST /api/auth/login - Harus gagal jika username tidak terdaftar', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'user_fiktif', password: 'khazprokhir123' }),
    });

    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('POST /api/auth/login - Berhasil login sebagai operator dan menerima JWT token', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'operator', password: 'khazprokhir123' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.ok(body.data.token, 'Token JWT harus tersedia');
    assert.equal(body.data.user.username, 'operator');
    assert.equal(body.data.user.role, 'OPERATOR');
    assert.equal(body.data.user.password_hash, undefined, 'Password hash tidak boleh bocor ke client');

    operatorToken = body.data.token;
  });

  it('POST /api/auth/login - Berhasil login sebagai supervisor', async () => {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'supervisor', password: 'khazprokhir123' }),
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.data.user.role, 'SUPERVISOR');
    supervisorToken = body.data.token;
  });

  it('GET /api/auth/me - Menolak akses tanpa token otentikasi (401 Unauthorized)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'Unauthorized');
  });

  it('GET /api/auth/me - Menolak akses dengan token tidak valid (401 InvalidToken)', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: 'Bearer token_ngawur_palsu_123' },
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.error, 'InvalidToken');
  });

  it('GET /api/auth/me - Berhasil mengembalikan data profil pengguna saat token valid', async () => {
    const res = await fetch(`${baseUrl}/api/auth/me`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.success, true);
    assert.equal(body.data.username, 'operator');
    assert.equal(body.data.role, 'OPERATOR');
  });

  it('RBAC - Menolak Operator mengakses rute khusus SUPERVISOR (403 Forbidden)', async () => {
    const res = await fetch(`${baseUrl}/api/test-rbac/supervisor-only`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 403);
    const data = await res.json();
    assert.equal(data.success, false);
    assert.equal(data.error, 'Forbidden');
    assert.match(data.message, /tidak memiliki izin/i);
  });

  it('RBAC - Mengizinkan Supervisor mengakses rute khusus SUPERVISOR (200 OK)', async () => {
    const res = await fetch(`${baseUrl}/api/test-rbac/supervisor-only`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  it('RBAC - Mengizinkan baik Operator maupun Supervisor pada rute multi-role', async () => {
    const resOp = await fetch(`${baseUrl}/api/test-rbac/multi-role`, {
      headers: { Authorization: `Bearer ${operatorToken}` },
    });
    assert.equal(resOp.status, 200);

    const resSp = await fetch(`${baseUrl}/api/test-rbac/multi-role`, {
      headers: { Authorization: `Bearer ${supervisorToken}` },
    });
    assert.equal(resSp.status, 200);
  });

  it('POST /api/auth/logout - Berhasil logout', async () => {
    const res = await fetch(`${baseUrl}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${operatorToken}` },
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  it('AuditLog - Memastikan riwayat login tercatat di tabel audit_log', async () => {
    const recentAudit = await prisma.auditLog.findFirst({
      where: { module: 'auth' },
      orderBy: { id: 'desc' },
    });

    assert.ok(recentAudit, 'Audit log untuk modul auth harus tercatat');
    assert.equal(recentAudit.module, 'auth');
    assert.equal(recentAudit.action, 'CREATE');
  });
});
