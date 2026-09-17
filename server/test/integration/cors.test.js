import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';

let server;
let baseUrl;

describe('Integration Test: CORS Policy & Headers', () => {
  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('Mengizinkan Origin http://localhost:5173', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });

  it('Mengizinkan Origin http://127.0.0.1:5173 pada mode development', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://127.0.0.1:5173',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5173');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });

  it('Mengizinkan Origin localhost dengan port lain pada mode development', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://localhost:3000',
      },
    });

    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:3000');
    assert.equal(res.headers.get('access-control-allow-credentials'), 'true');
  });

  it('Merespons preflight OPTIONS request dengan status 204 dan header yang lengkap', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization',
      },
    });

    assert.equal(res.status, 204);
    assert.equal(res.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    assert.ok(res.headers.get('access-control-allow-methods')?.includes('POST'));
    assert.ok(res.headers.get('access-control-allow-headers')?.toLowerCase().includes('authorization'));
  });

  it('Menolak origin eksternal tanpa menghasilkan server 500 crash', async () => {
    const res = await fetch(`${baseUrl}/api/health`, {
      headers: {
        Origin: 'http://unauthorized-domain.com',
      },
    });

    // Request tetap diproses tetapi header CORS allow-origin TIDAK disertakan
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('access-control-allow-origin'), null);
  });
});

