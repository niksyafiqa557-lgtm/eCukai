<?php
require_once 'config.php';
header('Content-Type: application/json');

$input   = json_decode(file_get_contents('php://input'), true);
$name    = trim($input['name'] ?? '');
$staffNo = trim($input['staff_no'] ?? '');
$email   = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if ($name === '' || $staffNo === '' || $email === '' || strlen($password) < 8) {
    http_response_code(400);
    die(json_encode(['error' => 'All fields are required and password must be at least 8 characters']));
}

// Reject duplicates up front for a clean error message
$check = $pdo->prepare('SELECT id FROM officer WHERE staff_no = ? OR email = ?');
$check->execute([$staffNo, $email]);
if ($check->fetch()) {
    http_response_code(409);
    die(json_encode(['error' => 'Staff ID or email is already registered']));
}

$hash = password_hash($password, PASSWORD_DEFAULT);

$stmt = $pdo->prepare(
    'INSERT INTO officer (staff_no, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
);
// New self-registrations default to the lowest-privilege role.
// Consider requiring admin approval before role escalation in production.
$stmt->execute([$staffNo, $name, $email, $hash, 'officer']);

echo json_encode(['success' => true]);
