<?php
require_once __DIR__ . '/../config.php';
require_officer_login();
header('Content-Type: application/json');

$year = (int) ($_GET['year'] ?? date('Y'));

$stmt = $pdo->prepare(
    "SELECT
        COUNT(*) AS total,
        SUM(status = 'PAID') AS paid,
        SUM(status = 'UNPAID') AS unpaid,
        COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS collected
     FROM tax
     WHERE year = ?"
);
$stmt->execute([$year]);

echo json_encode($stmt->fetch(PDO::FETCH_ASSOC));
