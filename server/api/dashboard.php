<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

try {
    // 1. Ambil Data Mentah dari Database
    // Query ini mengambil rekap per status
    $sql = "SELECT 
                b.batch AS nama_batch, 
                p.status, 
                COUNT(p.id) AS jumlah
            FROM packs p
            JOIN batches b ON p.batch_id = b.id
            GROUP BY b.batch, p.status
            ORDER BY b.batch ASC";
            
    $stmt = $pdo->prepare($sql);
    $stmt->execute();
    $rawResults = $stmt->fetchAll();

    // 2. Formatting Data (Grouping by PHP)
    // Kita ubah dari format Baris SQL menjadi format Objek JSON yang cantik
    $dashboardData = [];

    foreach ($rawResults as $row) {
        $batchName = $row['nama_batch'];
        $status = $row['status'];
        $jumlah = $row['jumlah'];

        // Jika batch ini belum ada di array dashboard, buat kerangkanya
        if (!isset($dashboardData[$batchName])) {
            $dashboardData[$batchName] = [
                'nama_batch' => $batchName,
                'total_pack' => 0, // Nanti kita hitung
                'stats' => [
                    'DITUGASKAN' => 0,
                    'PERLU_SORTIR' => 0,
                    'SIAP_KEMAS' => 0,
                    'DIKEMAS' => 0
                ]
            ];
        }

        // Isi jumlah sesuai status yang ditemukan
        $dashboardData[$batchName]['stats'][$status] = (int)$jumlah;
        
        // Tambahkan ke total
        $dashboardData[$batchName]['total_pack'] += $jumlah;
    }

    // 3. Hitung Persentase Sederhana (Opsional - Pemanis Dashboard)
    // Kita ubah array asosiatif menjadi array index biasa agar JSON-nya jadi [...]
    $finalOutput = [];
    foreach ($dashboardData as $batch) {
        // Hitung berapa yang sudah selesai (SIAP_KEMAS + DIKEMAS)
        $selesai = $batch['stats']['SIAP_KEMAS'] + $batch['stats']['DIKEMAS'];
        $total = $batch['total_pack'];
        
        // Hindari pembagian dengan nol
        $persen = ($total > 0) ? round(($selesai / $total) * 100, 1) : 0;
        
        $batch['progress_percent'] = $persen . '%';
        $finalOutput[] = $batch;
    }

    echo json_encode([
        'status' => 'success',
        'timestamp' => date('Y-m-d H:i:s'),
        'data' => $finalOutput
    ]);

} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
?>