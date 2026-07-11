<?php
/* ========================================
   ALAN VAULT - FILE DELETE API
   Delete Files from Vault
   ======================================== */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept DELETE or POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'DELETE' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
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

// Get file ID from request
if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $fileId = $input['fileId'] ?? '';
} else {
    $fileId = $_POST['fileId'] ?? '';
}

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
$fileIndex = -1;
$fileToDelete = null;

foreach ($files as $key => $file) {
    if ($file['id'] === $fileId) {
        $fileIndex = $key;
        $fileToDelete = $file;
        break;
    }
}

if ($fileIndex === -1) {
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    exit();
}

// Delete physical file
$uploadDir = __DIR__ . '/uploads/';
$filePath = $uploadDir . $fileToDelete['filename'];

if (file_exists($filePath)) {
    unlink($filePath);
}

// Remove from vault
array_splice($files, $fileIndex, 1);
$vault['files'] = $files;
file_put_contents($vaultFile, json_encode($vault, JSON_PRETTY_PRINT));

// Update user storage used
$usersFile = __DIR__ . '/database/users.json';
$usersData = json_decode(file_get_contents($usersFile), true);
$users = $usersData['users'] ?? [];

foreach ($users as $key => $user) {
    if ($user['id'] === $userId) {
        $users[$key]['storageUsed'] = max(0, ($user['storageUsed'] ?? 0) - ($fileToDelete['size'] ?? 0));
        break;
    }
}

$usersData['users'] = $users;
$usersData['stats']['totalStorage'] = array_sum(array_column($users, 'storageUsed'));
file_put_contents($usersFile, json_encode($usersData, JSON_PRETTY_PRINT));

// Log activity
logActivity($userId, $userEmail, 'file_deleted', "Deleted file: {$fileToDelete['name']}");

// Return success response
echo json_encode([
    'success' => true,
    'message' => 'File deleted successfully'
]);

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
        'level' => 'warning',
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