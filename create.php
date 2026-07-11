<?php
/* ========================================
   ALAN VAULT - CREATE API
   Create Notes, Tasks, Bookmarks
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
$userName = $userData['username'] ?? 'User';

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
$type = $input['type'] ?? '';

if (empty($type)) {
    http_response_code(400);
    echo json_encode(['error' => 'Type is required (note, task, bookmark)']);
    exit();
}

// Load user's vault
$vaultFile = __DIR__ . "/database/vault_{$userId}.json";

if (!file_exists($vaultFile)) {
    $vault = ['files' => [], 'notes' => [], 'tasks' => [], 'bookmarks' => []];
} else {
    $vault = json_decode(file_get_contents($vaultFile), true);
}

$response = [];

switch ($type) {
    case 'note':
        $response = createNote($input, $vault, $userId, $userEmail, $userName);
        break;
    case 'task':
        $response = createTask($input, $vault, $userId, $userEmail, $userName);
        break;
    case 'bookmark':
        $response = createBookmark($input, $vault, $userId, $userEmail, $userName);
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
 * Create a new note
 */
function createNote($input, &$vault, $userId, $userEmail, $userName) {
    $title = trim($input['title'] ?? 'Untitled Note');
    $content = $input['content'] ?? '';
    $category = $input['category'] ?? 'general';
    $tags = $input['tags'] ?? [];
    $pinned = $input['pinned'] ?? false;
    $favorite = $input['favorite'] ?? false;
    $color = $input['color'] ?? null;
    
    if (empty($title)) {
        http_response_code(400);
        echo json_encode(['error' => 'Note title is required']);
        exit();
    }
    
    $noteId = 'note_' . time() . '_' . uniqid();
    $now = date('c');
    
    $note = [
        'id' => $noteId,
        'title' => $title,
        'content' => $content,
        'category' => $category,
        'tags' => $tags,
        'pinned' => $pinned,
        'favorite' => $favorite,
        'color' => $color,
        'userId' => $userId,
        'createdAt' => $now,
        'updatedAt' => $now,
        'wordCount' => str_word_count($content),
        'characterCount' => strlen($content),
        'version' => 1
    ];
    
    $vault['notes'][] = $note;
    
    // Log activity
    logActivity($userId, $userEmail, 'note_created', "Created note: {$title}");
    
    return [
        'success' => true,
        'note' => $note,
        'message' => 'Note created successfully'
    ];
}

/**
 * Create a new task
 */
function createTask($input, &$vault, $userId, $userEmail, $userName) {
    $title = trim($input['title'] ?? '');
    $description = $input['description'] ?? '';
    $priority = $input['priority'] ?? 'medium';
    $status = $input['status'] ?? 'pending';
    $category = $input['category'] ?? 'general';
    $dueDate = $input['dueDate'] ?? null;
    $reminder = $input['reminder'] ?? null;
    $tags = $input['tags'] ?? [];
    $subtasks = $input['subtasks'] ?? [];
    $starred = $input['starred'] ?? false;
    $repeat = $input['repeat'] ?? null;
    
    if (empty($title)) {
        http_response_code(400);
        echo json_encode(['error' => 'Task title is required']);
        exit();
    }
    
    $taskId = 'task_' . time() . '_' . uniqid();
    $now = date('c');
    
    // Format subtasks
    $formattedSubtasks = [];
    foreach ($subtasks as $subtask) {
        $formattedSubtasks[] = [
            'id' => 'sub_' . time() . '_' . uniqid(),
            'title' => $subtask['title'] ?? '',
            'completed' => $subtask['completed'] ?? false,
            'createdAt' => $now
        ];
    }
    
    $task = [
        'id' => $taskId,
        'title' => $title,
        'description' => $description,
        'priority' => $priority,
        'status' => $status,
        'category' => $category,
        'dueDate' => $dueDate,
        'reminder' => $reminder,
        'tags' => $tags,
        'subtasks' => $formattedSubtasks,
        'attachments' => [],
        'comments' => [],
        'userId' => $userId,
        'completed' => false,
        'completedAt' => null,
        'starred' => $starred,
        'repeat' => $repeat,
        'createdAt' => $now,
        'updatedAt' => $now
    ];
    
    $vault['tasks'][] = $task;
    
    // Log activity
    logActivity($userId, $userEmail, 'task_created', "Created task: {$title}");
    
    return [
        'success' => true,
        'task' => $task,
        'message' => 'Task created successfully'
    ];
}

/**
 * Create a new bookmark
 */
function createBookmark($input, &$vault, $userId, $userEmail, $userName) {
    $url = trim($input['url'] ?? '');
    $title = trim($input['title'] ?? '');
    $category = $input['category'] ?? 'General';
    $tags = $input['tags'] ?? [];
    $description = $input['description'] ?? '';
    $favorite = $input['favorite'] ?? false;
    
    if (empty($url)) {
        http_response_code(400);
        echo json_encode(['error' => 'Bookmark URL is required']);
        exit();
    }
    
    // Validate URL
    if (!filter_var($url, FILTER_VALIDATE_URL)) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid URL format']);
        exit();
    }
    
    // Auto-extract title if not provided
    if (empty($title)) {
        $title = parse_url($url, PHP_URL_HOST);
        $title = str_replace('www.', '', $title);
        $title = ucfirst(explode('.', $title)[0]);
    }
    
    $bookmarkId = 'bookmark_' . time() . '_' . uniqid();
    $now = date('c');
    
    // Get favicon URL
    $domain = parse_url($url, PHP_URL_HOST);
    $favicon = "https://www.google.com/s2/favicons?domain={$domain}&sz=64";
    
    $bookmark = [
        'id' => $bookmarkId,
        'url' => $url,
        'title' => $title,
        'category' => $category,
        'tags' => $tags,
        'description' => $description,
        'favorite' => $favorite,
        'favicon' => $favicon,
        'clickCount' => 0,
        'lastVisited' => null,
        'userId' => $userId,
        'createdAt' => $now,
        'updatedAt' => $now
    ];
    
    $vault['bookmarks'][] = $bookmark;
    
    // Log activity
    logActivity($userId, $userEmail, 'bookmark_created', "Created bookmark: {$title} ({$url})");
    
    return [
        'success' => true,
        'bookmark' => $bookmark,
        'message' => 'Bookmark created successfully'
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
        'level' => 'success',
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