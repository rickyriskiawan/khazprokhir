<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');


$dummyData = [
    ['batch' => 'BATCH-TEST-DB', 'packs' => [1, 3, 5], 'segel' => 'SEGEL-TEST-001'],
    ['batch' => 'BATCH-TEST-DB', 'packs' => [2, 4], 'segel' => 'SEGEL-TEST-001'],
    ['batch' => 'BATCH-TEST-DB1', 'packs' => [21,22,23,24,25], 'segel' => 'SEGEL-TEST-003'],
];

try {
    $sukses = 0;

    foreach ($dummyData as $data) {
        $sql = "SELECT id FROM batches WHERE batch = :batch";
        $stmt = $pdo->prepare($sql);
        $stmt->execute(['batch' => $data['batch']]);
        $batch = $stmt->fetch();
        
        if (!$batch) {
            echo json_encode(['status' => 'error', 'message' => "Batch $data[batch] not found"]);
            continue;
        }

        $batchId = $batch['id'];

        foreach ($data['packs'] as $nomorPack) {
            $sqlCheckPack = "SELECT id, status FROM packs WHERE batch_id = :batch_id AND nomor_pack = :nomor_pack";
            $stmtCheckPack = $pdo->prepare($sqlCheckPack);
            $stmtCheckPack->execute(['batch_id' => $batchId, 'nomor_pack' => $nomorPack]);
            $pack = $stmtCheckPack->fetch();

            if ($pack && $pack['status'] === 'DITUGASKAN') {
                $sqlUpdatePack = "UPDATE packs SET status = 'PERLU_SORTIR', no_segel_masuk = :segel, waktu_terima = NOW() WHERE id = :pack_id";
                $stmtUpdatePack = $pdo->prepare($sqlUpdatePack);
                $stmtUpdatePack->execute([
                    'segel' => $data['segel'],
                    'pack_id' => $pack['id']
                ]);
                $sukses++;
            }
            }
    }
    
    echo json_encode(['status' => 'success', 'message' => "$sukses pack(s) updated successfully."]);    
 
} catch (PDOException $e) {
    echo json_encode(['status' => 'error', 'message' => 'Database query failed: ' . $e->getMessage()]);
    exit;
}
    
?>