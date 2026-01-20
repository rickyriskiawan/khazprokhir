<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');


$dummyData = [
    ['batch' => 'BATCH-TEST-DB', 'packs' => [1, 2, 3, 4]],
    // ['batch' => 'BATCH-TEST-DB', 'packs' => [5, 6, 7, 8]],
    // ['batch' => 'BATCH-TEST-DB1', 'packs' => [21,22,23,24]],
];

try {
    $pdo->beginTransaction();
    
    foreach ($dummyData as $data) {
        $jumlahPacks = count($data['packs']);

        if ($jumlahPacks === 0 || $jumlahPacks % 4 !== 0) {
            throw new Exception("Jumlah packs harus kelipatan 4 untuk batch: {$data['batch']}");
        };

        $sql = "SELECT id FROM batches WHERE batch = :batch";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['batch' => $data['batch']]);
        $batch = $stmt->fetch();

        if (!$batch) {
            throw new Exception("Batch not found: {$data['batch']}");
        };

        $batchId = $batch['id'];
    }
    
} catch (Exception $e) {
    //throw $th;
}


?>