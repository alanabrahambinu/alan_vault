<?php
/* ========================================
   ALAN VAULT - USERS MANAGEMENT API
   Admin User Management
   ======================================== */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get authorization header
$headers = getallheaders();
$authHeader = $headers['Authorization'] ?? '';
$token = '';

if (preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

// Validate admin token
if (empty($token)) {
    http_response_code(401);
    echo json_encode(['error' => 'Authentication required']);
    exit();
}

$userData = json_decode(base64_decode($token), true);

if (!$userData || !isset($userData['id']) || ($userData['role'] ?? 'user') !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Admin access required']);
    exit();
}

$adminId = $userData['id'];
$adminEmail = $userData['email'] ?? 'Unknown';

// Load users database
$usersFile = __DIR__ . '/database/users.json';
if (!file_exists($usersFile)) {
    $usersData = ['users' => [], 'stats' => ['totalUsers' => 0, 'activeUsers' => 0, 'adminCount' => 0, 'premiumUsers' => 0, 'totalStorage' => 0]];
} else {
    $usersData = json_decode(file_get_contents($usersFile), true);
}

$users = &$usersData['users'];

// Handle different request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handleGetUsers($users, $usersData);
        break;
    case 'POST':
        handleCreateUser($users, $usersData, $adminId, $adminEmail);
        break;
    case 'PUT':
        handleUpdateUser($users, $usersData, $adminId, $adminEmail);
        break;
    case 'DELETE':
        handleDeleteUser($users, $usersData, $adminId, $adminEmail);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

/**
 * Handle GET request - list users
 */
function handleGetUsers(&$users, &$usersData) {
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 20);
    $search = $_GET['search'] ?? '';
    $role = $_GET['role'] ?? '';
    $status = $_GET['status'] ?? '';
    $plan = $_GET['plan'] ?? '';
    
    $filteredUsers = $users;
    
    // Apply filters
    if (!empty($search)) {
        $filteredUsers = array_filter($filteredUsers, function($user) use ($search) {
            return stripos($user['username'], $search) !== false || 
                   stripos($user['email'], $search) !== false;
        });
    }
    
    if (!empty($role)) {
        $filteredUsers = array_filter($filteredUsers, function($user) use ($role) {
            return ($user['role'] ?? 'user') === $role;
        });
    }
    
    if (!empty($status)) {
        $filteredUsers = array_filter($filteredUsers, function($user) use ($status) {
            return ($user['status'] ?? 'active') === $status;
        });
    }
    
    if (!empty($plan)) {
        $filteredUsers = array_filter($filteredUsers, function($user) use ($plan) {
            return ($user['plan'] ?? 'free') === $plan;
        });
    }
    
    // Calculate pagination
    $total = count($filteredUsers);
    $offset = ($page - 1) * $limit;
    $paginatedUsers = array_slice($filteredUsers, $offset, $limit);
    
    // Add storage usage for each user
    foreach ($paginatedUsers as &$user) {
        $vaultFile = __DIR__ . "/database/vault_{$user['id']}.json";
        if (file_exists($vaultFile)) {
            $vault = json_decode(file_get_contents($vaultFile), true);
            $user['filesCount'] = count($vault['files'] ?? []);
            $user['notesCount'] = count($vault['notes'] ?? []);
            $user['tasksCount'] = count($vault['tasks'] ?? []);
            $user['bookmarksCount'] = count($vault['bookmarks'] ?? []);
        } else {
            $user['filesCount'] = 0;
            $user['notesCount'] = 0;
            $user['tasksCount'] = 0;
            $user['bookmarksCount'] = 0;
        }
        // Remove password from response
        unset($user['password']);
    }
    
    echo json_encode([
        'success' => true,
        'users' => array_values($paginatedUsers),
        'pagination' => [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($total / $limit)
        ],
        'filters' => [
            'search' => $search,
            'role' => $role,
            'status' => $status,
            'plan' => $plan
        ]
    ]);
}

/**
 * Handle POST request - create new user
 */
function handleCreateUser(&$users, &$usersData, $adminId, $adminEmail) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $username = trim($input['username'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';
    $role = $input['role'] ?? 'user';
    $plan = $input['plan'] ?? 'free';
    $status = $input['status'] ?? 'active';
    
    // Validate input
    $errors = [];
    
    if (empty($username)) {
        $errors[] = 'Username is required';
    } elseif (strlen($username) < 3) {
        $errors[] = 'Username must be at least 3 characters';
    }
    
    if (empty($email)) {
        $errors[] = 'Email is required';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email format';
    }
    
    if (empty($password)) {
        $errors[] = 'Password is required';
    } elseif (strlen($password) < 6) {
        $errors[] = 'Password must be at least 6 characters';
    }
    
    // Check for existing user
    foreach ($users as $user) {
        if ($user['email'] === $email) {
            $errors[] = 'User with this email already exists';
            break;
        }
        if ($user['username'] === $username) {
            $errors[] = 'Username already taken';
            break;
        }
    }
    
    if (!empty($errors)) {
        http_response_code(400);
        echo json_encode(['error' => $errors[0], 'errors' => $errors]);
        exit();
    }
    
    // Create new user
    $userId = 'user_' . time() . '_' . uniqid();
    $newUser = [
        'id' => $userId,
        'username' => $username,
        'email' => $email,
        'password' => $password, // In production, use password_hash()
        'role' => $role,
        'status' => $status,
        'plan' => $plan,
        'verified' => false,
        'createdAt' => date('c'),
        'lastLogin' => null,
        'storageUsed' => 0,
        'avatar' => null
    ];
    
    $users[] = $newUser;
    
    // Create empty vault for new user
    $emptyVault = [
        'files' => [],
        'notes' => [],
        'tasks' => [],
        'bookmarks' => []
    ];
    file_put_contents(__DIR__ . "/database/vault_{$userId}.json", json_encode($emptyVault, JSON_PRETTY_PRINT));
    
    // Update stats
    updateStats($usersData);
    file_put_contents(__DIR__ . '/database/users.json', json_encode($usersData, JSON_PRETTY_PRINT));
    
    // Log activity
    logActivity($adminId, $adminEmail, 'user_created', "Created user: {$username} ({$email})");
    
    // Remove password from response
    unset($newUser['password']);
    
    echo json_encode([
        'success' => true,
        'user' => $newUser,
        'message' => 'User created successfully'
    ]);
}

/**
 * Handle PUT request - update user
 */
function handleUpdateUser(&$users, &$usersData, $adminId, $adminEmail) {
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['userId'] ?? '';
    
    if (empty($userId)) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID is required']);
        exit();
    }
    
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
    
    $oldUsername = $users[$userIndex]['username'];
    $oldEmail = $users[$userIndex]['email'];
    
    // Update fields
    if (isset($input['username'])) {
        $users[$userIndex]['username'] = trim($input['username']);
    }
    if (isset($input['email'])) {
        $users[$userIndex]['email'] = trim($input['email']);
    }
    if (isset($input['role'])) {
        $users[$userIndex]['role'] = $input['role'];
    }
    if (isset($input['status'])) {
        $users[$userIndex]['status'] = $input['status'];
    }
    if (isset($input['plan'])) {
        $users[$userIndex]['plan'] = $input['plan'];
    }
    if (isset($input['password']) && !empty($input['password'])) {
        if (strlen($input['password']) >= 6) {
            $users[$userIndex]['password'] = $input['password'];
        } else {
            http_response_code(400);
            echo json_encode(['error' => 'Password must be at least 6 characters']);
            exit();
        }
    }
    
    $users[$userIndex]['updatedAt'] = date('c');
    
    // Update stats
    updateStats($usersData);
    file_put_contents(__DIR__ . '/database/users.json', json_encode($usersData, JSON_PRETTY_PRINT));
    
    // Log activity
    logActivity($adminId, $adminEmail, 'user_updated', "Updated user: {$oldUsername} ({$oldEmail})");
    
    // Remove password from response
    $updatedUser = $users[$userIndex];
    unset($updatedUser['password']);
    
    echo json_encode([
        'success' => true,
        'user' => $updatedUser,
        'message' => 'User updated successfully'
    ]);
}

/**
 * Handle DELETE request - delete user
 */
function handleDeleteUser(&$users, &$usersData, $adminId, $adminEmail) {
    $input = json_decode(file_get_contents('php://input'), true);
    $userId = $input['userId'] ?? '';
    
    if (empty($userId)) {
        http_response_code(400);
        echo json_encode(['error' => 'User ID is required']);
        exit();
    }
    
    // Prevent deleting own account
    if ($userId === $adminId) {
        http_response_code(403);
        echo json_encode(['error' => 'Cannot delete your own account']);
        exit();
    }
    
    $userIndex = -1;
    $userToDelete = null;
    
    foreach ($users as $key => $user) {
        if ($user['id'] === $userId) {
            $userIndex = $key;
            $userToDelete = $user;
            break;
        }
    }
    
    if ($userIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }
    
    // Remove user
    array_splice($users, $userIndex, 1);
    
    // Delete user's vault
    $vaultFile = __DIR__ . "/database/vault_{$userId}.json";
    if (file_exists($vaultFile)) {
        unlink($vaultFile);
    }
    
    // Delete user's settings
    $settingsFile = __DIR__ . "/database/settings_{$userId}.json";
    if (file_exists($settingsFile)) {
        unlink($settingsFile);
    }
    
    // Update stats
    updateStats($usersData);
    file_put_contents(__DIR__ . '/database/users.json', json_encode($usersData, JSON_PRETTY_PRINT));
    
    // Log activity
    logActivity($adminId, $adminEmail, 'user_deleted', "Deleted user: {$userToDelete['username']} ({$userToDelete['email']})");
    
    echo json_encode([
        'success' => true,
        'message' => 'User deleted successfully'
    ]);
}

/**
 * Update users statistics
 */
function updateStats(&$usersData) {
    $users = $usersData['users'] ?? [];
    $usersData['stats'] = [
        'totalUsers' => count($users),
        'activeUsers' => count(array_filter($users, fn($u) => ($u['status'] ?? 'active') === 'active')),
        'adminCount' => count(array_filter($users, fn($u) => ($u['role'] ?? 'user') === 'admin')),
        'premiumUsers' => count(array_filter($users, fn($u) => ($u['plan'] ?? 'free') === 'premium')),
        'totalStorage' => array_sum(array_column($users, 'storageUsed'))
    ];
}

/**
 * Log admin activity
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
        'type' => 'admin',
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