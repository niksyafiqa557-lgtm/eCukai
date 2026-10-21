<?php
require_once __DIR__ . '/../config.php';
require_officer_login();
header('Content-Type: application/json');

$propertyId = (int) ($_GET['property_id'] ?? 0);
if (!$propertyId) {
    http_response_code(400);
    die(json_encode(['error' => 'property_id is required']));
}

$stmt = $pdo->prepare(
    "SELECT p.property_id, p.account_no, p.address, p.area, p.property_type,
            p.latitude, p.longitude, t.tax_id, t.year, t.amount, t.status
     FROM property p
     JOIN tax t ON t.property_id = p.property_id
               AND t.year = (SELECT MAX(year) FROM tax WHERE property_id = p.property_id)
     WHERE p.property_id = ?"
);
$stmt->execute([$propertyId]);
$record = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$record) {
    http_response_code(404);
    die(json_encode(['error' => 'Property not found']));
}

if ($record['status'] === 'PAID') {
    $payStmt = $pdo->prepare(
        'SELECT payment_amount, payment_date FROM payment WHERE tax_id = ? ORDER BY payment_date DESC LIMIT 1'
    );
    $payStmt->execute([$record['tax_id']]);
    $record['payment'] = $payStmt->fetch(PDO::FETCH_ASSOC) ?: null;
} else {
    $record['payment'] = null;
}

echo json_encode($record);
