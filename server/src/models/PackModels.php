<?php
namespace App\models;

use PDO;

class PackModels {
    private PDO $db;

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function beginTransaction(): bool {
       return $this->db->beginTransaction();
    }

    public function commit(): bool {
       return $this->db->commit();
    }

    public function rollBack(): bool {
       return $this->db->rollBack();
    }

    public function getBatchId(string $batch): array|false {
        $sql = "SELECT id FROM batches WHERE batch = :batch";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['batch' => $batch]);
        return $stmt->fetch();
    }

    public function getPack(int $batchId, string $nomorPack): array|false {
        $sql = "SELECT id, status FROM packs WHERE batch_id = :batch_id AND nomor_pack = :nomor_pack";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['batch_id' => $batchId, 'nomor_pack' => $nomorPack]);
        return $stmt->fetch();
    }

    public function terimaPack(int $packId, string $segel): int {
        $sql = "UPDATE packs SET status = 'PERLU_SORTIR', no_segel_masuk = :segel, waktu_terima = NOW() WHERE id = :pack_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'segel' => $segel,
            'pack_id' => $packId
        ]);
        return $stmt->rowCount();
    }

    public function updateStatusPack(int $packId, string $status): int {
        $sql = "UPDATE packs SET status = :status WHERE id = :pack_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['status' => $status, 'pack_id' => $packId]);
        return $stmt->rowCount();
    }
}