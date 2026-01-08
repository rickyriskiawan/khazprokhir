<?php
require_once __DIR__ . '/../config/db.php';
header('Content-Type: application/json');

$dummyData = [
    ['batch' => 'BATCH-TEST-DB', 'packs' => [1, 2, 3, 4]],
    // ['batch' => 'BATCH-TEST-DB', 'packs' => [5, 6, 7, 8]],
    // ['batch' => 'BATCH-TEST-DB1', 'packs' => [21,22,23,24]],
];

try{
    $pdo->beginTransaction();

    foreach ($dummyData as $data) {

        $jumlahPacks = count($data['packs']);
        if ($jumlahPacks % 4 !== 0) {
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

        foreach ($data['packs'] as $nomorPack) {
            $sqlCheckPack = "SELECT id, status FROM packs WHERE batch_id = :batch_id AND nomor_pack = :nomor_pack";
            $stmtCheckPack = $pdo->prepare($sqlCheckPack);
            $stmtCheckPack->execute(['batch_id' => $batchId, 'nomor_pack' => $nomorPack]);
            $pack = $stmtCheckPack->fetch();

            if (!$pack) {
                throw new Exception("Pack not found: ${nomorPack} in batch {$data['batch']}");
            }

            if ($pack['status'] !== 'PERLU_SORTIR') {
                throw new Exception("Pack status is not PERLU_SORTIR for pack: ${nomorPack} in batch {$data['batch']}");
            }

            $sqlUpdate = "UPDATE packs SET status = 'SIAP_KEMAS' WHERE id = :pack_id";
            $stmtUpdate = $pdo->prepare($sqlUpdate);
            $stmtUpdate->execute(['pack_id' => $pack['id']]);

        };
    };
    
    $pdo->commit();
    echo json_encode([
        'status' => 'success', 
        'message' => "Packs in batch $data[batch] updated successfully."
    ]);
        

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode([
        'status' => 'error', 
        'message' => 'Transaction failed: ' . $e->getMessage()
    ]);
    exit;
}
?>