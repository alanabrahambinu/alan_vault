<?php
/* ========================================
   ALAN VAULT - FILE UPLOAD API
   Handle File Uploads with Validation
   ======================================== */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
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

// Check if file was uploaded
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(['error' => 'No file uploaded or upload error']);
    exit();
}

$file = $_FILES['file'];
$fileName = basename($file['name']);
$fileTmpPath = $file['tmp_name'];
$fileSize = $file['size'];
$fileType = $file['type'];

// Validate file size (max 100MB)
$maxFileSize = 100 * 1024 * 1024; // 100MB
if ($fileSize > $maxFileSize) {
    http_response_code(400);
    echo json_encode(['error' => 'File size exceeds limit (100MB)']);
    exit();
}

// Validate file type
$allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/markdown',
    'application/json',
    'application/zip', 'application/x-rar-compressed',
    'video/mp4', 'video/webm', 'audio/mpeg'
];

$allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'json', 'zip', 'rar', 'mp4', 'webm', 'mp3'];
$fileExtension = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));

if (!in_array($fileType, $allowedTypes) && !in_array($fileExtension, $allowedExtensions)) {
    http_response_code(400);
    echo json_encode(['error' => 'File type not allowed']);
    exit();
}

// Check storage quota
$usersFile = __DIR__ . '/database/users.json';
$usersData = json_decode(file_get_contents($usersFile), true);
$users = $usersData['users'] ?? [];

$userIndex = -1;
foreach ($users as $key => $user) {
    if ($user['id'] === $userId) {
        $userIndex = $key;
        break;
    }
}

if ($userIndex === -1) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit();
}

$storageUsed = $users[$userIndex]['storageUsed'] ?? 0;
$storageLimit = 5 * 1024 * 1024 * 1024; // 5GB for free users

if ($users[$userIndex]['plan'] === 'premium') {
    $storageLimit = 50 * 1024 * 1024 * 1024; // 50GB for premium
}

if ($storageUsed + $fileSize > $storageLimit) {
    http_response_code(400);
    echo json_encode(['error' => 'Storage quota exceeded']);
    exit();
}

// Create uploads directory if not exists
$uploadDir = __DIR__ . '/uploads/';
if (!file_exists($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate unique filename
$uniqueId = time() . '_' . uniqid();
$newFileName = $uniqueId . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $fileName);
$destination = $uploadDir . $newFileName;

// Move uploaded file
if (!move_uploaded_file($fileTmpPath, $destination)) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to save file']);
    exit();
}

// Get folder ID from request
$input = json_decode(file_get_contents('php://input'), true);
$folderId = $input['folderId'] ?? 'root';

// Create file record
$fileId = 'file_' . time() . '_' . uniqid();
$fileRecord = [
    'id' => $fileId,
    'name' => $fileName,
    'filename' => $newFileName,
    'size' => $fileSize,
    'type' => $fileType,
    'userId' => $userId,
    'folderId' => $folderId,
    'uploadDate' => date('c'),
    'encrypted' => false,
    'favorite' => false,
    'tags' => [],
    'description' => ''
];

// Load user's vault
$vaultFile = __DIR__ . "/database/vault_{$userId}.json";
$vault = [];

if (file_exists($vaultFile)) {
    $vault = json_decode(file_get_contents($vaultFile), true);
}

$vault['files'][] = $fileRecord;
file_put_contents($vaultFile, json_encode($vault, JSON_PRETTY_PRINT));

// Update user storage used
$users[$userIndex]['storageUsed'] = $storageUsed + $fileSize;
$usersData['users'] = $users;
$usersData['stats']['totalStorage'] = array_sum(array_column($users, 'storageUsed'));
file_put_contents($usersFile, json_encode($usersData, JSON_PRETTY_PRINT));

// Log activity
logActivity($userId, $userEmail, 'file_uploaded', "Uploaded file: {$fileName} ({$fileSize} bytes)");

// Return success response
echo json_encode([
    'success' => true,
    'file' => $fileRecord,
    'message' => 'File uploaded successfully'
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
        'level' => 'success',
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