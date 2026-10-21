<?php
require_once 'config.php';
header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);
$staffNo  = trim($input['staff_no'] ?? '');
$password = $input['password'] ?? '';

if ($staffNo === '' || $password === '') {
    http_response_code(400);
    die(json_encode(['error' => 'Staff number and password are required']));
}

$stmt = $pdo->prepare('SELECT id, staff_no, name, password_hash, role FROM officer WHERE staff_no = ?');
$stmt->execute([$staffNo]);
$officer = $stmt->fetch(PDO::FETCH_ASSOC);

if (!$officer || !password_verify($password, $officer['password_hash'])) {
    http_response_code(401);
    die(json_encode(['error' => 'Invalid staff number or password']));
}

$_SESSION['officer_id']   = $officer['id'];
$_SESSION['officer_name'] = $officer['name'];
$_SESSION['officer_role'] = $officer['role'];

echo json_encode([
    'success' => true,
    'officer' => [
        'staff_no' => $officer['staff_no'],
        'name'     => $officer['name'],
        'role'     => $officer['role'],
    ],
]);