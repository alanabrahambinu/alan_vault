<?php
/* ========================================
   ALAN VAULT - LOGIN API
   User Authentication
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

// Get JSON input
$input = json_decode(file_get_contents('php://input'), true);

$email = $input['email'] ?? '';
$password = $input['password'] ?? '';

// Validate input
if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    exit();
}

// Load users database
$usersFile = __DIR__ . '/database/users.json';
if (!file_exists($usersFile)) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
    exit();
}

$usersData = json_decode(file_get_contents($usersFile), true);
$users = $usersData['users'] ?? [];

// Find user by email
$user = null;
foreach ($users as $u) {
    if ($u['email'] === $email) {
        $user = $u;
        break;
    }
}

// Check if user exists
if (!$user) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    exit();
}

// Verify password (plain text for demo, use password_hash() in production)
if ($user['password'] !== $password) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid email or password']);
    exit();
}

// Check if user is active
if (($user['status'] ?? 'active') !== 'active') {
    http_response_code(403);
    echo json_encode(['error' => 'Account is suspended. Please contact support.']);
    exit();
}

// Generate session token (simple JWT-like token for demo)
$token = base64_encode(json_encode([
    'id' => $user['id'],
    'email' => $user['email'],
    'username' => $user['username'],
    'role' => $user['role'] ?? 'user',
    'exp' => time() + (24 * 60 * 60) // 24 hours
]));

// Update last login time
$user['lastLogin'] = date('c');
foreach ($users as $key => $u) {
    if ($u['id'] === $user['id']) {
        $users[$key]['lastLogin'] = date('c');
        break;
    }
}
$usersData['users'] = $users;
file_put_contents($usersFile, json_encode($usersData, JSON_PRETTY_PRINT));

// Log login attempt
logActivity($user['id'], $user['email'], 'login_success', 'User logged in successfully');

// Return success response
echo json_encode([
    'success' => true,
    'token' => $token,
    'user' => [
        'id' => $user['id'],
        'username' => $user['username'],
        'email' => $user['email'],
        'role' => $user['role'] ?? 'user',
        'plan' => $user['plan'] ?? 'free'
    ],
    'message' => 'Login successful'
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
        'type' => 'auth',
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
    
    // Keep only last 1000 logs
    if (count($logs) > 1000) {
        $logs = array_slice($logs, 0, 1000);
    }
    
    file_put_contents($logsFile, json_encode(['logs' => $logs], JSON_PRETTY_PRINT));
}
?>