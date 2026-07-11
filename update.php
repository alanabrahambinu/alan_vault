<?php
/* ========================================
   ALAN VAULT - UPDATE API
   Update Notes, Tasks, Bookmarks
   ======================================== */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: PUT, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only accept PUT or POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'PUT' && $_SERVER['REQUEST_METHOD'] !== 'POST') {
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

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? '';
$itemId = $input['itemId'] ?? '';

if (empty($type)) {
    http_response_code(400);
    echo json_encode(['error' => 'Type is required (note, task, bookmark)']);
    exit();
}

if (empty($itemId)) {
    http_response_code(400);
    echo json_encode(['error' => 'Item ID is required']);
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
$response = [];

switch ($type) {
    case 'note':
        $response = updateNote($input, $vault, $userId, $userEmail, $itemId);
        break;
    case 'task':
        $response = updateTask($input, $vault, $userId, $userEmail, $itemId);
        break;
    case 'bookmark':
        $response = updateBookmark($input, $vault, $userId, $userEmail, $itemId);
        break;
    default:
        http_response_code(400);
        echo json_encode(['error' => 'Invalid type. Use: note, task, or bookmark']);
        exit();
}

// Save updated vault
file_put_contents($vaultFile, json_encode($vault, JSON_PRETTY_PRINT));

// Return response
echo json_encode($response);

/**
 * Update a note
 */
function updateNote($input, &$vault, $userId, $userEmail, $noteId) {
    $notes = &$vault['notes'];
    $noteIndex = -1;
    
    foreach ($notes as $key => $note) {
        if ($note['id'] === $noteId && $note['userId'] === $userId) {
            $noteIndex = $key;
            break;
        }
    }
    
    if ($noteIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Note not found']);
        exit();
    }
    
    $oldTitle = $notes[$noteIndex]['title'];
    $now = date('c');
    
    // Update fields
    if (isset($input['title'])) $notes[$noteIndex]['title'] = trim($input['title']);
    if (isset($input['content'])) $notes[$noteIndex]['content'] = $input['content'];
    if (isset($input['category'])) $notes[$noteIndex]['category'] = $input['category'];
    if (isset($input['tags'])) $notes[$noteIndex]['tags'] = $input['tags'];
    if (isset($input['pinned'])) $notes[$noteIndex]['pinned'] = $input['pinned'];
    if (isset($input['favorite'])) $notes[$noteIndex]['favorite'] = $input['favorite'];
    if (isset($input['color'])) $notes[$noteIndex]['color'] = $input['color'];
    
    $notes[$noteIndex]['updatedAt'] = $now;
    $notes[$noteIndex]['wordCount'] = str_word_count($notes[$noteIndex]['content']);
    $notes[$noteIndex]['characterCount'] = strlen($notes[$noteIndex]['content']);
    $notes[$noteIndex]['version']++;
    
    // Log activity
    logActivity($userId, $userEmail, 'note_updated', "Updated note: {$oldTitle}");
    
    return [
        'success' => true,
        'note' => $notes[$noteIndex],
        'message' => 'Note updated successfully'
    ];
}

/**
 * Update a task
 */
function updateTask($input, &$vault, $userId, $userEmail, $taskId) {
    $tasks = &$vault['tasks'];
    $taskIndex = -1;
    
    foreach ($tasks as $key => $task) {
        if ($task['id'] === $taskId && $task['userId'] === $userId) {
            $taskIndex = $key;
            break;
        }
    }
    
    if ($taskIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Task not found']);
        exit();
    }
    
    $oldTitle = $tasks[$taskIndex]['title'];
    $now = date('c');
    
    // Update fields
    if (isset($input['title'])) $tasks[$taskIndex]['title'] = trim($input['title']);
    if (isset($input['description'])) $tasks[$taskIndex]['description'] = $input['description'];
    if (isset($input['priority'])) $tasks[$taskIndex]['priority'] = $input['priority'];
    if (isset($input['status'])) $tasks[$taskIndex]['status'] = $input['status'];
    if (isset($input['category'])) $tasks[$taskIndex]['category'] = $input['category'];
    if (isset($input['dueDate'])) $tasks[$taskIndex]['dueDate'] = $input['dueDate'];
    if (isset($input['reminder'])) $tasks[$taskIndex]['reminder'] = $input['reminder'];
    if (isset($input['tags'])) $tasks[$taskIndex]['tags'] = $input['tags'];
    if (isset($input['starred'])) $tasks[$taskIndex]['starred'] = $input['starred'];
    if (isset($input['repeat'])) $tasks[$taskIndex]['repeat'] = $input['repeat'];
    
    // Handle completion status
    if (isset($input['completed'])) {
        $tasks[$taskIndex]['completed'] = $input['completed'];
        $tasks[$taskIndex]['completedAt'] = $input['completed'] ? $now : null;
        $tasks[$taskIndex]['status'] = $input['completed'] ? 'completed' : 'pending';
    }
    
    // Handle subtasks
    if (isset($input['subtasks'])) {
        foreach ($input['subtasks'] as $updatedSubtask) {
            foreach ($tasks[$taskIndex]['subtasks'] as &$subtask) {
                if ($subtask['id'] === $updatedSubtask['id']) {
                    $subtask['completed'] = $updatedSubtask['completed'] ?? $subtask['completed'];
                    break;
                }
            }
        }
    }
    
    $tasks[$taskIndex]['updatedAt'] = $now;
    
    // Log activity
    $action = isset($input['completed']) && $input['completed'] ? 'task_completed' : 'task_updated';
    logActivity($userId, $userEmail, $action, "{$action}: {$oldTitle}");
    
    return [
        'success' => true,
        'task' => $tasks[$taskIndex],
        'message' => 'Task updated successfully'
    ];
}

/**
 * Update a bookmark
 */
function updateBookmark($input, &$vault, $userId, $userEmail, $bookmarkId) {
    $bookmarks = &$vault['bookmarks'];
    $bookmarkIndex = -1;
    
    foreach ($bookmarks as $key => $bookmark) {
        if ($bookmark['id'] === $bookmarkId && $bookmark['userId'] === $userId) {
            $bookmarkIndex = $key;
            break;
        }
    }
    
    if ($bookmarkIndex === -1) {
        http_response_code(404);
        echo json_encode(['error' => 'Bookmark not found']);
        exit();
    }
    
    $oldTitle = $bookmarks[$bookmarkIndex]['title'];
    $now = date('c');
    
    // Update fields
    if (isset($input['title'])) $bookmarks[$bookmarkIndex]['title'] = trim($input['title']);
    if (isset($input['url'])) {
        $bookmarks[$bookmarkIndex]['url'] = trim($input['url']);
        // Update favicon
        $domain = parse_url($bookmarks[$bookmarkIndex]['url'], PHP_URL_HOST);
        $bookmarks[$bookmarkIndex]['favicon'] = "https://www.google.com/s2/favicons?domain={$domain}&sz=64";
    }
    if (isset($input['category'])) $bookmarks[$bookmarkIndex]['category'] = $input['category'];
    if (isset($input['tags'])) $bookmarks[$bookmarkIndex]['tags'] = $input['tags'];
    if (isset($input['description'])) $bookmarks[$bookmarkIndex]['description'] = $input['description'];
    if (isset($input['favorite'])) $bookmarks[$bookmarkIndex]['favorite'] = $input['favorite'];
    
    $bookmarks[$bookmarkIndex]['updatedAt'] = $now;
    
    // Log activity
    logActivity($userId, $userEmail, 'bookmark_updated', "Updated bookmark: {$oldTitle}");
    
    return [
        'success' => true,
        'bookmark' => $bookmarks[$bookmarkIndex],
        'message' => 'Bookmark updated successfully'
    ];
}

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
        'type' => 'content',
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