<?php
// tests/setup_validasi_sortir_test.php

require_once __DIR__ . '/../config/db.php';

try {
    echo "Preparing test data...\n";

    $testBatchName = 'BATCH-TEST-001';

    // Hapus data lama agar pengujian idempotensi
    echo "1. Deleting old test data for batch: $testBatchName\n";
    $sqlDelete = "DELETE FROM batches WHERE batch = :batch";
    $stmtDelete = $pdo->prepare($sqlDelete);
    $stmtDelete->execute(['batch' => $testBatchName]);
    echo "   - Old data deleted.\n";

    // Masukkan batch baru, trigger akan membuat 100 pack dengan status DITUGASKAN
    echo "2. Inserting new batch: $testBatchName\n";
    // Asumsi tabel `batches` memerlukan kolom lain yang NOT NULL, berdasarkan skema.
    // Mari kita tambahkan nilai dummy untuk kolom tersebut.
    $sqlInsert = "INSERT INTO batches (tahun_anggaran_id, batch, pecahan, seri, kepala, tahun_emisi) 
                  VALUES (:tahun_anggaran_id, :batch, :pecahan, :seri, :kepala, :tahun_emisi)
                  ON CONFLICT (batch) DO NOTHING";
    $stmtInsert = $pdo->prepare($sqlInsert);
    // Kita perlu `tahun_anggaran_id` yang valid. Mari kita asumsikan ID=1 ada.
    // Jika tidak, kita harus membuatnya dulu. Untuk sederhana, kita coba ID=1.
    $stmtInsert->execute([
        'tahun_anggaran_id' => 1, 
        'batch' => $testBatchName,
        'pecahan' => 'Y',
        'seri' => 'AB-A',
        'kepala' => '0',
        'tahun_emisi' => 2022
    ]);
    echo "   - New batch inserted. Trigger should have created 100 packs.\n";

    // Ambil ID batch yang baru dibuat
    $sqlBatch = "SELECT id FROM batches WHERE batch = :batch";
    $stmtBatch = $pdo->prepare($sqlBatch);
    $stmtBatch->execute(['batch' => $testBatchName]);
    $batch = $stmtBatch->fetch();

    if (!$batch) {
        // Cek apakah tahun_anggaran_id=1 ada, jika tidak, buat.
        $sqlCheckTA = "SELECT id FROM tahun_anggaran WHERE id = 1";
        $stmtCheckTA = $pdo->query($sqlCheckTA);
        if ($stmtCheckTA->fetch() === false) {
            $pdo->query("INSERT INTO tahun_anggaran (id, tahun) VALUES (1, 2024) ON CONFLICT(id) DO NOTHING");
            echo "   - Created dummy tahun_anggaran with id=1.\n";
            // Coba masukkan batch lagi
            $stmtInsert->execute([
                'tahun_anggaran_id' => 1, 
                'batch' => $testBatchName,
                'pecahan' => '100000',
                'seri' => 'A',
                'kepala' => '1',
                'tahun_emisi' => 2024
            ]);
            $stmtBatch->execute(['batch' => $testBatchName]);
            $batch = $stmtBatch->fetch();
        }
    }
    
    if (!$batch) {
        throw new Exception("Failed to create or find batch: $testBatchName. Please ensure your database schema is up to date and dependencies like tahun_anggaran exist.");
    }

    $batchId = $batch['id'];
    echo "   - Found batch with ID: $batchId\n";

    // Ubah status 4 pack menjadi PERLU_SORTIR
    echo "3. Updating status for packs 1, 2, 3, 4 to 'PERLU_SORTIR'\n";
    $sql_update_packs = "UPDATE packs SET status = 'PERLU_SORTIR' WHERE batch_id = :batch_id AND nomor_pack IN (1, 2, 3, 4)";
    $stmt_update_packs = $pdo->prepare($sql_update_packs);
    $stmt_update_packs->execute(['batch_id' => $batchId]);
    echo "   - Packs updated.\n";

    echo "Test data setup complete!\n";

} catch (Exception $e) {
    echo "Error during test data setup: " . $e->getMessage() . "\n";
    exit(1);
}
?>
