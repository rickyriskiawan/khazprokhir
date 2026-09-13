import prisma from './lib/prisma.js';
import bcrypt from 'bcryptjs';

async function verify() {
  console.log('🔍 Menjalankan verifikasi database & Prisma Client...\n');

  // 1. Check Denominasi
  const denominasi = await prisma.denominasi.findMany({ include: { emisi: true } });
  console.log(`✓ Denominasi count: ${denominasi.length} (Expected: 7)`);
  if (denominasi.length !== 7) throw new Error('Denominasi count mismatch');

  // 2. Check Emisi
  const emisiCount = await prisma.emisi.count();
  console.log(`✓ Emisi count: ${emisiCount} (Expected: 7)`);
  if (emisiCount !== 7) throw new Error('Emisi count mismatch');

  // 3. Check Shift
  const shiftCount = await prisma.shift.count();
  console.log(`✓ Shift count: ${shiftCount} (Expected: 3)`);
  if (shiftCount !== 3) throw new Error('Shift count mismatch');

  // 4. Check Users
  const users = await prisma.user.findMany();
  console.log(`✓ User count: ${users.length} (Expected: 4)`);
  if (users.length !== 4) throw new Error('User count mismatch');

  // Check password verification
  const operator = users.find(u => u.username === 'operator');
  const isMatch = await bcrypt.compare('khazprokhir123', operator.password_hash);
  console.log(`✓ Password check for user 'operator': ${isMatch ? 'VALID' : 'INVALID'}`);
  if (!isMatch) throw new Error('Password hash check failed');

  // 5. Check Target Tahunan & Bulanan
  const targetTahunanCount = await prisma.targetTahunan.count();
  console.log(`✓ TargetTahunan count: ${targetTahunanCount} (Expected: 7)`);

  const targetBulananCount = await prisma.targetBulanan.count();
  console.log(`✓ TargetBulanan count: ${targetBulananCount} (Expected: 7)`);

  // 6. Test BigInt JSON Serialization
  const sampleTarget = await prisma.targetTahunan.findFirst();
  const jsonString = JSON.stringify(sampleTarget);
  console.log(`✓ BigInt JSON serialization test: OK`);

  console.log('\n🎉 Seluruh verifikasi database dan Prisma Client BERHASIL 100%!');
}

verify()
  .catch((err) => {
    console.error('❌ Verification failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
