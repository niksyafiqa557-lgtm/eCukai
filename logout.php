<?php
require_once 'config.php';
header('Content-Type: application/json');
$_SESSION = [];
session_destroy();
echo json_encode(['success' => true]);
