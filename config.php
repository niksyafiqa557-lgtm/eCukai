<?php
// ---------------------------------------------------------------------
// Database connection (XAMPP defaults — adjust if your setup differs)
// ---------------------------------------------------------------------
$DB_HOST = 'localhost';
$DB_PORT = '3307';
$DB_NAME = 'new_ecukai';
$DB_USER = 'root';
$DB_PASS = '';

try {
    $pdo = new PDO(
        "mysql:host=$DB_HOST;port=$DB_PORT;dbname=$DB_NAME;charset=utf8mb4",
        $DB_USER,
        $DB_PASS,
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(['error' => 'Database connection failed']));
}

// Start session for login state (used by login.php / logout.php / api/*)
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Simple guard other endpoints can call to require login
function require_officer_login() {
    if (empty($_SESSION['officer_id'])) {
        http_response_code(401);
        die(json_encode(['error' => 'Please login first before continue']));
    }
}

// Stricter guard for endpoints only admins should reach (e.g. adding properties).
// Always checks login first, so a logged-out request gets 401, not 403.
function require_admin_login() {
    require_officer_login();
    if (($_SESSION['officer_role'] ?? '') !== 'admin') {
        http_response_code(403);
        die(json_encode(['error' => 'This action requires an admin account']));
    }
}