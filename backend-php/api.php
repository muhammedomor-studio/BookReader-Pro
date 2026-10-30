<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = 'localhost';
$db   = 'bookreader_db';
$user = 'root';
$pass = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$db;charset=utf8mb4", $user, $pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
    ]);
} catch (PDOException $e) {
    echo json_encode(["status" => "error", "message" => "Database connection failed"]);
    exit();
}

$action = $_GET['action'] ?? '';

if ($action === 'sync_progress' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $bookId = $input['book_id'] ?? null;
    $page = $input['current_page'] ?? 1;

    if ($bookId) {
        $stmt = $pdo->prepare("INSERT INTO user_progress (book_id, current_page, updated_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE current_page = ?, updated_at = NOW()");
        $stmt->execute([$bookId, $page, $page]);
        echo json_encode(["status" => "success", "message" => "Progress synced"]);
    } else {
        http_response_code(400);
        echo json_encode(["status" => "error", "message" => "Missing book_id"]);
    }
} else {
    echo json_encode(["status" => "online", "api_version" => "2.0.0"]);
}