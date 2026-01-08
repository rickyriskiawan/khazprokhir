<?php
namespace App\models;

use App\config\Database;
use PDO;

class Pack {
    private $pdo;

    public function __construct() {
        $this->db = Database::getConnection();
    }

    public function beginTransaction() {
       return $this->db->beginTransaction();
    }

    public function commit() {
       return $this->db->commit();
    }

    public function rollBack() {
       return $this->db->rollBack();
    }

    public function getBatchId($batch) {
        $sql = "SELECT id FROM batches WHERE batch = :batch";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['batch' => $batch]);
        return $stmt->fetch();
    }

    public function getPack($batchId, $nomorPack) {
        $sql = "SELECT id, status FROM packs WHERE batch_id = :batch_id AND nomor_pack = :nomor_pack";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['batch_id' => $batchId, 'nomor_pack' => $nomorPack]);
        return $stmt->fetch();
    }

    public function terimaPack($packId, $segel) {
        $sql = "UPDATE packs SET status = 'PERLU_SORTIR', no_segel_masuk = :segel, waktu_terima = NOW() WHERE id = :pack_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute([
            'segel' => $segel,
            'pack_id' => $packId
        ]);
        return $stmt->affectedRows();
    }

    public function updateStatusPack($packId, $status) {
        $sql = "UPDATE packs SET status = :status WHERE id = :pack_id";
        $stmt = $this->db->prepare($sql);
        $stmt->execute(['status' => $status, 'pack_id' => $packId]);
        return $stmt->affectedRows();
    }
}

?>