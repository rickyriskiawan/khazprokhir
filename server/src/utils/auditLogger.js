import prisma from '../lib/prisma.js';

/**
 * Helper untuk mencatat aktivitas ke tabel audit_log
 * Append-only log untuk kepatuhan & audit trail
 * 
 * @param {object} params
 * @param {number} [params.userId]
 * @param {'CREATE'|'UPDATE'|'DELETE'} params.action
 * @param {string} params.module - 'bon_masuk' | 'sortir' | 'kemas' | 'pengiriman' | 'master' | 'auth'
 * @param {string} params.tableName - Nama tabel yang dimodifikasi
 * @param {number} [params.recordId] - ID record yang terkena dampak
 * @param {object} [params.oldValue] - Snapshot data sebelum perubahan
 * @param {object} [params.newValue] - Snapshot data setelah perubahan
 * @param {string} [params.ipAddress] - IP address client
 * @returns {Promise<object>}
 */
export async function createAuditLog({
  userId = null,
  action,
  module,
  tableName,
  recordId = null,
  oldValue = null,
  newValue = null,
  ipAddress = null,
}) {
  try {
    const log = await prisma.auditLog.create({
      data: {
        user_id: userId,
        action,
        module,
        table_name: tableName,
        record_id: recordId,
        old_value: oldValue ? JSON.parse(JSON.stringify(oldValue)) : undefined,
        new_value: newValue ? JSON.parse(JSON.stringify(newValue)) : undefined,
        ip_address: ipAddress,
      },
    });
    return log;
  } catch (err) {
    // Log error to console without breaking main business logic
    console.error('[AuditLogger Error] Gagal menulis audit log:', err.message);
    return null;
  }
}
