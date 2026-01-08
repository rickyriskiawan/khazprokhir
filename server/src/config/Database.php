<?php
namespace App\config;

use PDO;
use PDOException;
use Dotenv\Dotenv;

class Database {
    private static $pdo = null;
    
    /**
     * The constructor is private to prevent direct creation of a new instance.
     */
    private function __construct() {
    }

    /**
     * Get the database connection.
     * Implements a lazy-loading singleton pattern.
     *
     * @return PDO The PDO database connection.
     * @throws PDOException if the connection fails.
     */
    public static function getConnection() {
        if (self::$pdo === null) {
            $dotenv = Dotenv::createImmutable(__DIR__ . '/../../');
            $dotenv->load();

            $dbHost = $_ENV['DB_HOST'];
            $dbPort = $_ENV['DB_PORT'];
            $dbName = $_ENV['DB_NAME'];
            $dbUser = $_ENV['DB_USER'];
            $dbPass = $_ENV['DB_PASS'];

            try {
                $dsn = "pgsql:host=$dbHost;port=$dbPort;dbname=$dbName";
                $options = [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                ];
                self::$pdo = new PDO($dsn, $dbUser, $dbPass, $options);
            } catch (PDOException $e) {
                // Re-throw the exception to allow the caller to handle it gracefully.
                // This avoids abruptly terminating the script with die().
                throw $e;
            }
        }

        return self::$pdo;
    }
};
?>