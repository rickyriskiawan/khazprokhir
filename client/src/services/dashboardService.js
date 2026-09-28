import api from './api';

/**
 * Fetch daily summary for Bon Masuk (Modul 1)
 */
export async function getTodayBonMasuk(tanggal) {
  const params = tanggal ? { tanggal } : {};
  const response = await api.get('/bon-masuk/summary/today', { params });
  return response.data?.data || null;
}

/**
 * Fetch daily summary for Sortir (Modul 2)
 */
export async function getTodaySortir(tanggal) {
  const params = tanggal ? { tanggal } : {};
  const response = await api.get('/sortir/summary/today', { params });
  return response.data?.data || null;
}

/**
 * Fetch daily summary for Pengemasan Doos (Modul 3)
 */
export async function getTodayKemas(tanggal) {
  const params = tanggal ? { tanggal } : {};
  const response = await api.get('/kemas/summary/today', { params });
  return response.data?.data || null;
}

/**
 * Fetch overall monitoring doos and inventory summary (Modul 4)
 */
export async function getMonitoringDoosSummary() {
  const response = await api.get('/monitoring-doos/summary');
  return response.data?.data || null;
}

/**
 * Fetch system health & database latency
 */
export async function getSystemHealth() {
  const start = performance.now();
  try {
    const response = await api.get('/health');
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: response.data?.database === 'connected' ? 'connected' : 'degraded',
      database: response.data?.database || 'unknown',
      latencyMs,
      data: response.data,
    };
  } catch (err) {
    return {
      status: 'disconnected',
      database: 'disconnected',
      latencyMs: null,
      error: err.message,
    };
  }
}

/**
 * Fetch items to calculate output per shift
 */
export async function fetchShiftWorkData(tanggal) {
  const kemasParams = { limit: 100, ...(tanggal && { tanggal_kemas: tanggal }) };
  const sortirParams = { limit: 100, ...(tanggal && { tanggal_sortir: tanggal }) };

  const [kemasRes, sortirRes] = await Promise.allSettled([
    api.get('/kemas', { params: kemasParams }),
    api.get('/sortir', { params: sortirParams }),
  ]);

  const kemasList = kemasRes.status === 'fulfilled' ? kemasRes.value.data?.data || [] : [];
  const sortirList = sortirRes.status === 'fulfilled' ? sortirRes.value.data?.data || [] : [];

  const shiftStats = {
    1: { shift_id: 1, nama: 'Shift 1', total_doos: 0, total_pack_sortir: 0, total_bilyet: 0n },
    2: { shift_id: 2, nama: 'Shift 2', total_doos: 0, total_pack_sortir: 0, total_bilyet: 0n },
    3: { shift_id: 3, nama: 'Shift 3', total_doos: 0, total_pack_sortir: 0, total_bilyet: 0n },
  };

  for (const k of kemasList) {
    const sId = k.shift_id;
    if (shiftStats[sId]) {
      shiftStats[sId].total_doos += k.total_doos || 0;
      shiftStats[sId].total_bilyet += BigInt(k.total_bilyet || 0);
    }
  }

  for (const s of sortirList) {
    const sId = s.shift_id;
    if (shiftStats[sId]) {
      shiftStats[sId].total_pack_sortir += s.total_pack || 0;
    }
  }

  // Convert BigInt to string for safety
  return {
    1: { ...shiftStats[1], total_bilyet: shiftStats[1].total_bilyet.toString() },
    2: { ...shiftStats[2], total_bilyet: shiftStats[2].total_bilyet.toString() },
    3: { ...shiftStats[3], total_bilyet: shiftStats[3].total_bilyet.toString() },
  };
}

/**
 * Fetch unified dashboard overview in parallel with fault tolerance
 */
export async function fetchDashboardOverview(tanggal) {
  const errors = [];

  const [
    bonMasukRes,
    sortirRes,
    kemasRes,
    doosRes,
    healthRes,
    shiftRes,
  ] = await Promise.allSettled([
    getTodayBonMasuk(tanggal),
    getTodaySortir(tanggal),
    getTodayKemas(tanggal),
    getMonitoringDoosSummary(),
    getSystemHealth(),
    fetchShiftWorkData(tanggal),
  ]);

  if (bonMasukRes.status === 'rejected') errors.push({ module: 'bon-masuk', error: bonMasukRes.reason?.message });
  if (sortirRes.status === 'rejected') errors.push({ module: 'sortir', error: sortirRes.reason?.message });
  if (kemasRes.status === 'rejected') errors.push({ module: 'kemas', error: kemasRes.reason?.message });
  if (doosRes.status === 'rejected') errors.push({ module: 'monitoring-doos', error: doosRes.reason?.message });
  if (healthRes.status === 'rejected') errors.push({ module: 'health', error: healthRes.reason?.message });
  if (shiftRes.status === 'rejected') errors.push({ module: 'shift', error: shiftRes.reason?.message });

  return {
    bonMasuk: bonMasukRes.status === 'fulfilled' ? bonMasukRes.value : null,
    sortir: sortirRes.status === 'fulfilled' ? sortirRes.value : null,
    kemas: kemasRes.status === 'fulfilled' ? kemasRes.value : null,
    doosMonitoring: doosRes.status === 'fulfilled' ? doosRes.value : null,
    health: healthRes.status === 'fulfilled' ? healthRes.value : { status: 'disconnected', latencyMs: null },
    shiftStats: shiftRes.status === 'fulfilled' ? shiftRes.value : {
      1: { shift_id: 1, nama: 'Shift 1', total_doos: 0, total_pack_sortir: 0, total_bilyet: '0' },
      2: { shift_id: 2, nama: 'Shift 2', total_doos: 0, total_pack_sortir: 0, total_bilyet: '0' },
      3: { shift_id: 3, nama: 'Shift 3', total_doos: 0, total_pack_sortir: 0, total_bilyet: '0' },
    },
    lastUpdated: new Date(),
    errors,
  };
}
