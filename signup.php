<?php
/* ========================================
   ALAN VAULT - SIGNUP API
   User Registration
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

$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$confirmPassword = $input['confirmPassword'] ?? '';
$terms = $input['terms'] ?? false;

// Validate input
$errors = [];

if (empty($username)) {
    $errors[] = 'Username is required';
} elseif (strlen($username) < 3) {
    $errors[] = 'Username must be at least 3 characters';
} elseif (strlen($username) > 20) {
    $errors[] = 'Username must be less than 20 characters';
} elseif (!preg_match('/^[a-zA-Z0-9_]+$/', $username)) {
    $errors[] = 'Username can only contain letters, numbers, and underscores';
}

if (empty($email)) {
    $errors[] = 'Email is required';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = 'Please enter a valid email address';
}

if (empty($password)) {
    $errors[] = 'Password is required';
} elseif (strlen($password) < 6) {
    $errors[] = 'Password must be at least 6 characters';
}

if ($password !== $confirmPassword) {
    $errors[] = 'Passwords do not match';
}

if (!$terms) {
    $errors[] = 'You must agree to the Terms of Service';
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['error' => $errors[0], 'errors' => $errors]);
    exit();
}

// Load users database
$usersFile = __DIR__ . '/database/users.json';
if (!file_exists($usersFile)) {
    // Create database directory if it doesn't exist
    $dbDir = __DIR__ . '/database';
    if (!file_exists($dbDir)) {
        mkdir($dbDir, 0755, true);
    }
    
    $usersData = ['users' => [], 'stats' => ['totalUsers' => 0, 'activeUsers' => 0, 'adminCount' => 0, 'premiumUsers' => 0, 'totalStorage' => 0]];
} else {
    $usersData = json_decode(file_get_contents($usersFile), true);
}

$users = $usersData['users'] ?? [];

// Check if email already exists
foreach ($users as $u) {
    if ($u['email'] === $email) {
        http_response_code(409);
        echo json_encode(['error' => 'User already exists with this email']);
        exit();
    }
}

// Check if username already exists
foreach ($users as $u) {
    if ($u['username'] === $username) {
        http_response_code(409);
        echo json_encode(['error' => 'Username already taken']);
        exit();
    }
}

// Create new user
$userId = 'user_' . time() . '_' . uniqid();
$newUser = [
    'id' => $userId,
    'username' => $username,
    'email' => $email,
    'password' => $password, // In production, use password_hash($password, PASSWORD_DEFAULT)
    'role' => 'user',
    'status' => 'active',
    'verified' => false,
    'createdAt' => date('c'),
    'lastLogin' => null,
    'storageUsed' => 0,
    'plan' => 'free',
    'avatar' => null
];

$users[] = $newUser;
$usersData['users'] = $users;
$usersData['stats']['totalUsers'] = count($users);
$usersData['stats']['activeUsers'] = count(array_filter($users, fn($u) => ($u['status'] ?? 'active') === 'active'));
$usersData['stats']['adminCount'] = count(array_filter($users, fn($u) => ($u['role'] ?? 'user') === 'admin'));
$usersData['stats']['premiumUsers'] = count(array_filter($users, fn($u) => ($u['plan'] ?? 'free') === 'premium'));
$usersData['stats']['totalStorage'] = array_sum(array_column($users, 'storageUsed'));

file_put_contents($usersFile, json_encode($usersData, JSON_PRETTY_PRINT));

// Create empty vault for new user
$vaultFile = __DIR__ . "/database/vault_{$userId}.json";
$emptyVault = [
    'files' => [],
    'notes' => [],
    'tasks' => [],
    'bookmarks' => []
];
file_put_contents($vaultFile, json_encode($emptyVault, JSON_PRETTY_PRINT));

// Generate verification token
$verificationToken = bin2hex(random_bytes(32));
$verificationData = [
    'email' => $email,
    'token' => $verificationToken,
    'expires' => time() + (24 * 60 * 60) // 24 hours
];
file_put_contents(__DIR__ . "/database/verify_{$userId}.json", json_encode($verificationData, JSON_PRETTY_PRINT));

// Log signup activity
logActivity($userId, $email, 'user_registered', "New user registered: {$username}");

// Return success response
echo json_encode([
    'success' => true,
    'message' => 'Account created successfully! Please verify your email.',
    'verificationToken' => $verificationToken // In production, send via email
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
    
    if (count($logs) > 1000) {
        $logs = array_slice($logs, 0, 1000);
    }
    
    file_put_contents($logsFile, json_encode(['logs' => $logs], JSON_PRETTY_PRINT));
}
?>