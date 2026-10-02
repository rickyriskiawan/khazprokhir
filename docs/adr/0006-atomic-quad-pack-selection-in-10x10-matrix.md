# Pemilihan Atomik Kelompok 4 Pack (Quad Pack) pada Matriks Grid 10x10

## Status
Accepted

## Konteks & Keputusan
Dalam alur kerja Seksi Khazprokhir, proses sortir (Modul 2) dan pengemasan (Modul 3) diwajibkan memproses pack dalam kelipatan ketat 4 pack (ADR 0001: 4 pack = 9 doos = 180.000 bilyet). Pada antarmuka matriks visual 10 baris × 10 kolom (100 pack per batch), pemilihan pack individual secara manual (klik per 1 pack) berisiko tinggi menimbulkan kesalahan input operator berupa jumlah ganjil atau pemilihan pack yang tidak lengkap dalam satu siklus pengemasan.

Diputuskan bahwa antarmuka visualisasi matriks 10x10 menerapkan **Pemilihan Atomik Kelompok 4 Pack (Atomic Quad Pack Selection)**:
1. 100 pack dalam batch dipartisi menjadi 25 kelompok atomik tetap beranggotakan 4 pack berurutan (Quad 1: Pack 1-4, Quad 2: Pack 5-8, ..., Quad 25: Pack 97-100).
2. Satu klik pada salah satu petak di dalam quad otomatis memilih atau membatalkan seluruh 4 pack dalam kelompok tersebut.
3. Sinkronisasi hover: mengarahkan kursor ke salah satu petak otomatis menyorot keempat petak dalam quad secara bersamaan dengan outline/ring highlight.
4. Kunci atomik ketat (*Strict Atomic Locking*): Jika salah satu pack di dalam quad memiliki status yang tidak memenuhi syarat (misal 2 pack `RECEIVED` tetapi 2 pack lainnya masih `PENDING`), maka seluruh quad tersebut dinonaktifkan (*disabled*) dari pemilihan sortir dan memberikan tooltip edukatif.
5. Tata letak fisik tetap mempertahankan matriks simetris 10x10 standar Peruri agar konsisten dengan kebiasaan operator di lantai pabrik.

## Konsekuensi
- Operator tidak mungkin secara teknis memilih jumlah pack yang bukan kelipatan 4 melalui antarmuka matriks.
- Menghilangkan friksi kognitif operator: cukup 1 klik per set (4 pack = 9 doos) alih-alih 4 kali klik manual.
- Komponen `PackMatrixGrid.jsx` dapat beroperasi dalam mode seleksi interaktif (`selectable={true}`) maupun mode baca/audit (`selectable={false}`).
- Diperlukan penanganan visual yang cermat pada perpotongan baris (misal Quad 3 yang terbagi antara Pack 9-10 di ujung baris 1 dan Pack 11-12 di awal baris 2).
