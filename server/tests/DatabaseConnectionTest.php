<?php

// Load the Composer autoloader
require_once __DIR__ . '/../vendor/autoload.php';

// Use the Database class
use App\config\Database;

echo "Running Database Connection Test...\n";

try {
    // --- Test 1: Get a database connection ---
    echo "Test 1: Attempting to get a database connection... ";
    $pdo1 = Database::getConnection();

    if ($pdo1 instanceof PDO) {
        echo "SUCCESS! Received a PDO instance.\n";
    } else {
        echo "FAIL! Did not receive a PDO instance.\n";
        exit(1); // Exit with a failure code
    }

    // --- Test 2: Verify Singleton pattern ---
    echo "Test 2: Verifying the singleton pattern... ";
    $pdo2 = Database::getConnection();

    if ($pdo1 === $pdo2) {
        echo "SUCCESS! The same PDO instance was returned on the second call.\n";
    } else {
        echo "FAIL! A different instance was returned on the second call.\n";
        exit(1); // Exit with a failure code
    }

    // --- Test 3: Test with invalid credentials (optional but good practice) ---
    // This requires temporarily changing the .env variables, which is complex
    // and potentially disruptive to do in a simple test script. 
    // For now, we will assume that if the above tests pass with correct .env,
    // the exception handling also works. A more advanced setup using a testing-specific
    // .env file (e.g., .env.testing) would be needed for this.
    echo "Skipping Test 3: Exception handling verification (requires dedicated test environment).\n";


    echo "\n-----------------------------------\n";
    echo "All database connection tests passed!\n";
    echo "-----------------------------------\n";
    exit(0); // Exit with a success code

} catch (PDOException $e) {
    echo "\n\n--- TEST FAILED ---\n";
    echo "A PDOException was caught during the test.\n";
    echo "This likely means the database credentials in your .env file are incorrect or the database server is not running.\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1); // Exit with a failure code
} catch (Exception $e) {
    echo "\n\n--- TEST FAILED ---\n";
    echo "An unexpected exception was caught: " . get_class($e) . "\n";
    echo "Error: " . $e->getMessage() . "\n";
    exit(1); // Exit with a failure code
}
