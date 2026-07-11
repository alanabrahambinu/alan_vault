<?php
/* ========================================
   ALAN VAULT - SEARCH API
   Search Files, Notes, Tasks, Bookmarks
   ======================================== */

header('Content-Type: application/json');
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

// Get search parameters
$query = $_GET['q'] ?? '';
$type = $_GET['type'] ?? 'all'; // all, file, note, task, bookmark
$limit = intval($_GET['limit'] ?? 20);
$page = intval($_GET['page'] ?? 1);
$category = $_GET['category'] ?? '';
$priority = $_GET['priority'] ?? '';
$dateFrom = $_GET['dateFrom'] ?? '';
$dateTo = $_GET['dateTo'] ?? '';

if (empty($query)) {
    http_response_code(400);
    echo json_encode(['error' => 'Search query is required']);
    exit();
}

// Load user's vault
$vaultFile = __DIR__ . "/database/vault_{$userId}.json";

if (!file_exists($vaultFile)) {
    echo json_encode([
        'success' => true,
        'results' => [],
        'total' => 0,
        'query' => $query,
        'message' => 'No results found'
    ]);
    exit();
}

$vault = json_decode(file_get_contents($vaultFile), true);
$results = [];
$searchTerm = strtolower($query);

// Search in files
if ($type === 'all' || $type === 'file') {
    $files = $vault['files'] ?? [];
    foreach ($files as $file) {
        if (searchMatches($file['name'], $searchTerm)) {
            $file['matchType'] = 'file';
            $file['icon'] = getFileIcon($file['name']);
            $results[] = $file;
        }
    }
}

// Search in notes
if ($type === 'all' || $type === 'note') {
    $notes = $vault['notes'] ?? [];
    foreach ($notes as $note) {
        if (searchMatches($note['title'], $searchTerm) || searchMatches($note['content'], $searchTerm)) {
            $note['matchType'] = 'note';
            $note['icon'] = '📝';
            $note['preview'] = substr(strip_tags($note['content']), 0, 150) . '...';
            $results[] = $note;
        }
    }
}

// Search in tasks
if ($type === 'all' || $type === 'task') {
    $tasks = $vault['tasks'] ?? [];
    foreach ($tasks as $task) {
        if (searchMatches($task['title'], $searchTerm) || searchMatches($task['description'], $searchTerm)) {
            // Apply filters
            if ($category && $task['category'] !== $category) continue;
            if ($priority && $task['priority'] !== $priority) continue;
            
            $task['matchType'] = 'task';
            $task['icon'] = '✅';
            $results[] = $task;
        }
    }
}

// Search in bookmarks
if ($type === 'all' || $type === 'bookmark') {
    $bookmarks = $vault['bookmarks'] ?? [];
    foreach ($bookmarks as $bookmark) {
        if (searchMatches($bookmark['title'], $searchTerm) || searchMatches($bookmark['url'], $searchTerm)) {
            $bookmark['matchType'] = 'bookmark';
            $bookmark['icon'] = '🔗';
            $results[] = $bookmark;
        }
    }
}

// Apply date filters
if ($dateFrom) {
    $fromTimestamp = strtotime($dateFrom);
    $results = array_filter($results, function($item) use ($fromTimestamp) {
        $itemDate = strtotime($item['createdAt'] ?? $item['uploadDate'] ?? $item['date'] ?? '');
        return $itemDate >= $fromTimestamp;
    });
}

if ($dateTo) {
    $toTimestamp = strtotime($dateTo);
    $results = array_filter($results, function($item) use ($toTimestamp) {
        $itemDate = strtotime($item['createdAt'] ?? $item['uploadDate'] ?? $item['date'] ?? '');
        return $itemDate <= $toTimestamp;
    });
}

// Sort by relevance and date
usort($results, function($a, $b) {
    $aDate = strtotime($a['createdAt'] ?? $a['uploadDate'] ?? $a['date'] ?? 0);
    $bDate = strtotime($b['createdAt'] ?? $b['uploadDate'] ?? $b['date'] ?? 0);
    return $bDate - $aDate;
});

// Calculate pagination
$total = count($results);
$offset = ($page - 1) * $limit;
$paginatedResults = array_slice($results, $offset, $limit);

// Highlight search terms in results
foreach ($paginatedResults as &$result) {
    if (isset($result['title'])) {
        $result['highlightedTitle'] = highlightTerms($result['title'], $searchTerm);
    }
    if (isset($result['name'])) {
        $result['highlightedName'] = highlightTerms($result['name'], $searchTerm);
    }
    if (isset($result['content']) && $result['matchType'] === 'note') {
        $result['highlightedContent'] = highlightTerms($result['content'], $searchTerm);
    }
}

// Return results
echo json_encode([
    'success' => true,
    'results' => $paginatedResults,
    'total' => $total,
    'page' => $page,
    'limit' => $limit,
    'totalPages' => ceil($total / $limit),
    'query' => $query,
    'type' => $type,
    'filters' => [
        'category' => $category,
        'priority' => $priority,
        'dateFrom' => $dateFrom,
        'dateTo' => $dateTo
    ]
]);

/**
 * Check if search term matches content
 */
function searchMatches($content, $searchTerm) {
    if (empty($content)) return false;
    return strpos(strtolower($content), $searchTerm) !== false;
}

/**
 * Highlight search terms in text
 */
function highlightTerms($text, $searchTerm) {
    if (empty($text) || empty($searchTerm)) return $text;
    $pattern = '/(' . preg_quote($searchTerm, '/') . ')/i';
    return preg_replace($pattern, '<mark>$1</mark>', htmlspecialchars($text));
}

/**
 * Get file icon based on extension
 */
function getFileIcon($filename) {
    $ext = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
    $icons = [
        'pdf' => '📕', 'doc' => '📘', 'docx' => '📘', 'xls' => '📗', 'xlsx' => '📗',
        'ppt' => '📙', 'pptx' => '📙', 'jpg' => '🖼️', 'jpeg' => '🖼️', 'png' => '🖼️',
        'gif' => '🖼️', 'mp4' => '🎬', 'mp3' => '🎵', 'zip' => '📦', 'rar' => '📦',
        'txt' => '📄', 'md' => '📝', 'json' => '🔧', 'html' => '🌐', 'css' => '🎨',
        'js' => '⚡', 'py' => '🐍', 'java' => '☕'
    ];
    return $icons[$ext] ?? '📄';
}
?>