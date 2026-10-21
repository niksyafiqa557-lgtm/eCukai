<?php
require_once __DIR__ . '/../config.php';
require_officer_login();
header('Content-Type: application/json');

$q    = trim($_GET['q'] ?? '');
$area = trim($_GET['area'] ?? '');

$sql = "SELECT p.property_id, p.account_no, p.address, p.area, p.property_type,
               p.latitude, p.longitude, t.year, t.amount, t.status
        FROM property p
        JOIN tax t ON t.property_id = p.property_id
                  AND t.year = (SELECT MAX(year) FROM tax WHERE property_id = p.property_id)
        WHERE 1=1";
$params = [];

if ($q !== '') {
    $sql .= " AND (p.address LIKE ? OR p.account_no LIKE ?)";
    $params[] = "%$q%";
    $params[] = "%$q%";
}
if ($area !== '' && $area !== 'all') {
    $sql .= " AND p.area = ?";
    $params[] = $area;
}

$sql .= " ORDER BY p.address";

$stmt = $pdo->prepare($sql);
$stmt->execute($params);
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
