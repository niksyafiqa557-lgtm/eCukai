<?php
require_once __DIR__ . '/../config.php';
header('Content-Type: application/json');

// Only admins can add new property records
require_admin_login();

$input = json_decode(file_get_contents('php://input'), true);

$accountNo    = trim($input['account_no'] ?? '');
$address      = trim($input['address'] ?? '');
$area         = trim($input['area'] ?? '');
$propertyType = trim($input['property_type'] ?? '');
$latitude     = $input['latitude'] ?? null;
$longitude    = $input['longitude'] ?? null;
$year         = $input['year'] ?? null;
$amount       = $input['amount'] ?? null;
$status       = strtoupper(trim($input['status'] ?? 'UNPAID'));

// ---- Validation -------------------------------------------------------
$errors = [];

if ($accountNo === '') $errors[] = 'Account number is required';
if ($address === '')   $errors[] = 'Address is required';
if ($area === '')      $errors[] = 'Area is required';

$validTypes = ['Residential', 'Commercial', 'Agricultural', 'Industrial'];
if (!in_array($propertyType, $validTypes, true)) {
    $errors[] = 'Property type must be one of: ' . implode(', ', $validTypes);
}

if (!is_numeric($latitude) || !is_numeric($longitude)) {
    $errors[] = 'Latitude and longitude must be numbers';
}

if (!is_numeric($year) || (int)$year < 2000 || (int)$year > 2100) {
    $errors[] = 'Year must be a valid 4-digit year';
}

if (!is_numeric($amount) || (float)$amount < 0) {
    $errors[] = 'Amount must be a non-negative number';
}

if (!in_array($status, ['PAID', 'UNPAID'], true)) {
    $errors[] = 'Status must be PAID or UNPAID';
}

if (!empty($errors)) {
    http_response_code(400);
    die(json_encode(['error' => implode('. ', $errors)]));
}

// ---- Duplicate check ----------------------------------------------------
$check = $pdo->prepare('SELECT property_id FROM property WHERE account_no = ?');
$check->execute([$accountNo]);
if ($check->fetch()) {
    http_response_code(409);
    die(json_encode(['error' => 'A property with this account number already exists']));
}

// ---- Insert property + tax in a single transaction ----------------------
try {
    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'INSERT INTO property (account_no, address, area, property_type, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([$accountNo, $address, $area, $propertyType, $latitude, $longitude]);
    $propertyId = $pdo->lastInsertId();

    $stmt = $pdo->prepare(
        'INSERT INTO tax (property_id, year, amount, status) VALUES (?, ?, ?, ?)'
    );
    $stmt->execute([$propertyId, (int)$year, (float)$amount, $status]);

    $pdo->commit();
} catch (PDOException $e) {
    $pdo->rollBack();
    http_response_code(500);
    die(json_encode(['error' => 'Could not save property: ' . $e->getMessage()]));
}

echo json_encode([
    'success' => true,
    'property_id' => (int)$propertyId,
]);