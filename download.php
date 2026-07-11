<?php
/* ========================================
   ALAN VAULT - FILE DOWNLOAD API
   Download Files from Vault
   ======================================== */

// Start output buffering to prevent any extra output
ob_start();

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept GET requests
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit();
}

// Get authorization header
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
$token = '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

// Validate token
if (empty($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit();
}

// Decode token to get user info
$userData = json_decode(base64_decode($token), true);

if (!$userData || !isset($userData['id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid token']);
    exit();
}

$userId = $userData['id'];
$userEmail = $userData['email'] ?? 'Unknown';

// Get file ID from query string
$fileId = $_GET['fileId'] ?? '';

if (empty($fileId)) {
    http_response_code(400);
    echo json_encode(['error' => 'File ID is required']);
    exit();
}

// Load user's vault
$vaultFile = __DIR__ . "/database/vault_{$userId}.json";

if (!file_exists($vaultFile)) {
    http_response_code(404);
    echo json_encode(['error' => 'Vault not found']);
    exit();
}

$vault = json_decode(file_get_contents($vaultFile), true);
$files = $vault['files'] ?? [];

// Find the file
$fileToDownload = null;

foreach ($files as $file) {
    if ($file['id'] === $fileId) {
        $fileToDownload = $file;
        break;
    }
}

if (!$fileToDownload) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit();
}

// Get physical file path
$uploadDir = __DIR__ . '/uploads/';
$filePath = $uploadDir . $fileToDownload['filename'];

if (!file_exists($filePath)) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found on server']);
    exit();
}

// Log download activity
logActivity($userId, $userEmail, 'file_downloaded', "Downloaded file: {$fileToDownload['name']}");

// Clear output buffer before sending file
ob_end_clean();

// Set headers for download
header('Content-Type: application/octet-stream');
header('Content-Disposition: attachment; filename="' . rawurlencode($fileToDownload['name']) . '"');
header('Content-Length: ' . filesize($filePath));
header('Cache-Control: no-cache, must-revalidate');
header('Pragma: public');

// Send file to browser
readfile($filePath);
exit();

/**
 * Log user activity
 */
function logActivity($userId, $userEmail, $action, $details) {
    $logsFile = __DIR__ . '/database/logs.json';
    $logs = [];
    
    if (file_exists($logsFile)) {
        $logsData = json_decode(file_get_contents($logsFile), true);
        $logs = $logsData['logs'] ?? [];
    }
    
    $logEntry = [
        'id' => 'log_' . time() . '_' . uniqid(),
        'level' => 'info',
        'type' => 'file',
        'action' => $action,
        'details' => $details,
        'userId' => $userId,
        'userEmail' => $userEmail,
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown',
        'timestamp' => date('c'),
        'metadata' => [
            'ip' => $_SERVER['REMOTE_ADDR'] ?? 'Unknown'
        ]
    ];
    
    array_unshift($logs, $logEntry);
    
    if (count($logs) > 1000) {
        $logs = array_slice($logs, 0, 1000);
    }
    
    file_put_contents($logsFile, json_encode(['logs' => $logs], JSON_PRETTY_PRINT));
}
?>