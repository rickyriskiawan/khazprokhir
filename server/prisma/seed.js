import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Memulai proses seeding master data Khazprokhir...\n');

  // 1. Seeding Master Denominasi & Emisi (Uang Kertas TE 2022)
  console.log('💵 Seeding Master Denominasi & Emisi TE 2022...');
  const denominasiData = [
    { nama: 'Rp100.000', nilai: 100000, sandi: "Y'22" },
    { nama: 'Rp50.000', nilai: 50000, sandi: "X'22" },
    { nama: 'Rp20.000', nilai: 20000, sandi: "W'22" },
    { nama: 'Rp10.000', nilai: 10000, sandi: "V'22" },
    { nama: 'Rp5.000', nilai: 5000, sandi: "U'22" },
    { nama: 'Rp2.000', nilai: 2000, sandi: "T'22" },
    { nama: 'Rp1.000', nilai: 1000, sandi: "S'22" },
  ];

  const createdDenominasi = [];

  for (const item of denominasiData) {
    // Cari apakah denominasi sudah ada berdasarkan nilai
    let denom = await prisma.denominasi.findFirst({
      where: { nilai: item.nilai },
    });

    if (!denom) {
      denom = await prisma.denominasi.create({
        data: {
          nama: item.nama,
          nilai: item.nilai,
          is_active: true,
        },
      });
      console.log(`  ✓ Created Denominasi: ${denom.nama}`);
    } else {
      console.log(`  - Denominasi exists: ${denom.nama}`);
    }
    createdDenominasi.push({ ...denom, sandi: item.sandi });

    // Emisi TE 2022
    const existingEmisi = await prisma.emisi.findFirst({
      where: {
        denominasi_id: denom.id,
        kode_emisi: 'TE 2022',
      },
    });

    if (!existingEmisi) {
      const emisi = await prisma.emisi.create({
        data: {
          kode_emisi: 'TE 2022',
          sandi: item.sandi,
          tahun: '2022',
          denominasi_id: denom.id,
          is_active: true,
        },
      });
      console.log(`    ✓ Created Emisi: ${emisi.kode_emisi} (${emisi.sandi})`);
    } else {
      console.log(`    - Emisi exists: ${existingEmisi.kode_emisi} (${existingEmisi.sandi})`);
    }
  }

  // 2. Seeding Master Shift
  console.log('\n⏰ Seeding Master Shift Kerja...');
  const shiftData = [
    { nama: 'Shift 1', jam_mulai: '06:00', jam_selesai: '14:00' },
    { nama: 'Shift 2', jam_mulai: '14:00', jam_selesai: '22:00' },
    { nama: 'Shift 3', jam_mulai: '22:00', jam_selesai: '06:00' },
  ];

  for (const shift of shiftData) {
    const existingShift = await prisma.shift.findFirst({
      where: { nama: shift.nama },
    });

    if (!existingShift) {
      await prisma.shift.create({
        data: {
          nama: shift.nama,
          jam_mulai: shift.jam_mulai,
          jam_selesai: shift.jam_selesai,
          is_active: true,
        },
      });
      console.log(`  ✓ Created Shift: ${shift.nama} (${shift.jam_mulai} - ${shift.jam_selesai})`);
    } else {
      console.log(`  - Shift exists: ${shift.nama}`);
    }
  }

  // 3. Seeding Default Users
  console.log('\n👤 Seeding Default User Accounts...');
  const saltRounds = 10;
  const defaultPasswordHash = await bcrypt.hash('khazprokhir123', saltRounds);

  const userData = [
    {
      username: 'operator',
      password_hash: defaultPasswordHash,
      full_name: 'Petugas Operator Khazprokhir',
      role: Role.OPERATOR,
    },
    {
      username: 'supervisor',
      password_hash: defaultPasswordHash,
      full_name: 'M. Rulli Maulana (Kepala Seksi Khazprokhir)',
      role: Role.SUPERVISOR,
    },
    {
      username: 'manajemen',
      password_hash: defaultPasswordHash,
      full_name: 'Pimpinan Departemen Produksi',
      role: Role.MANAGEMENT,
    },
    {
      username: 'auditor',
      password_hash: defaultPasswordHash,
      full_name: 'Tim Auditor & Compliance',
      role: Role.AUDITOR,
    },
  ];

  for (const user of userData) {
    const upsertedUser = await prisma.user.upsert({
      where: { username: user.username },
      update: {
        full_name: user.full_name,
        role: user.role,
        is_active: true,
      },
      create: user,
    });
    console.log(`  ✓ Upserted User: ${upsertedUser.username} [Role: ${upsertedUser.role}]`);
  }

  // 4. Seeding Initial Target Produksi TA 2026
  console.log('\n🎯 Seeding Target Produksi TA 2026...');
  const tahunAnggaran = 2026;

  for (const denom of createdDenominasi) {
    // Target Tahunan per pecahan
    const targetBilyet = BigInt(450_000_000); // 450 juta bilyet
    const targetBrood = targetBilyet / BigInt(1000);
    const targetPack = Number(targetBrood / BigInt(45));

    await prisma.targetTahunan.upsert({
      where: {
        tahun_anggaran_denominasi_id: {
          tahun_anggaran: tahunAnggaran,
          denominasi_id: denom.id,
        },
      },
      update: {
        target_bilyet: targetBilyet,
        target_brood: targetBrood,
        target_pack: targetPack,
        catatan: `Target Produksi Tahunan TA ${tahunAnggaran} Pecahan ${denom.nama}`,
      },
      create: {
        tahun_anggaran: tahunAnggaran,
        denominasi_id: denom.id,
        target_bilyet: targetBilyet,
        target_brood: targetBrood,
        target_pack: targetPack,
        catatan: `Target Produksi Tahunan TA ${tahunAnggaran} Pecahan ${denom.nama}`,
      },
    });
    console.log(`  ✓ Target Tahunan TA ${tahunAnggaran} Pecahan ${denom.nama}`);

    // Target Bulanan (Bulan September / Bulan 9)
    await prisma.targetBulanan.upsert({
      where: {
        tahun_anggaran_bulan_denominasi_id: {
          tahun_anggaran: tahunAnggaran,
          bulan: 9,
          denominasi_id: denom.id,
        },
      },
      update: {
        target_penyerahan_bilyet: BigInt(40_000_000),
        target_pengemasan_bilyet: BigInt(45_000_000),
        sisa_hari_kerja: 12,
      },
      create: {
        tahun_anggaran: tahunAnggaran,
        bulan: 9,
        denominasi_id: denom.id,
        target_penyerahan_bilyet: BigInt(40_000_000),
        target_pengemasan_bilyet: BigInt(45_000_000),
        sisa_hari_kerja: 12,
      },
    });
  }
  console.log(`  ✓ Target Bulanan September TA ${tahunAnggaran} (7 Denominasi)`);

  console.log('\n✅ Seeding data master Khazprokhir selesai dengan sukses!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error executing seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
