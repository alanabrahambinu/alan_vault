<?php
/* ========================================
   ALAN VAULT - LOGS MANAGEMENT API
   System Logs Viewer for Admin
   ======================================== */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, DELETE, OPTIONS');
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

// Load logs database
$logsFile = __DIR__ . '/database/logs.json';
if (!file_exists($logsFile)) {
    $logsData = ['logs' => []];
} else {
    $logsData = json_decode(file_get_contents($logsFile), true);
}

$logs = &$logsData['logs'];

// Handle different request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handleGetLogs($logs);
        break;
    case 'DELETE':
        handleDeleteLogs($logs, $adminId, $adminEmail);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

/**
 * Handle GET request - retrieve logs
 */
function handleGetLogs(&$logs) {
    $page = intval($_GET['page'] ?? 1);
    $limit = intval($_GET['limit'] ?? 50);
    $level = $_GET['level'] ?? 'all';
    $type = $_GET['type'] ?? 'all';
    $userId = $_GET['userId'] ?? '';
    $search = $_GET['search'] ?? '';
    $dateFrom = $_GET['dateFrom'] ?? '';
    $dateTo = $_GET['dateTo'] ?? '';
    
    $filteredLogs = $logs;
    
    // Apply filters
    if ($level !== 'all') {
        $filteredLogs = array_filter($filteredLogs, function($log) use ($level) {
            return ($log['level'] ?? 'info') === $level;
        });
    }
    
    if ($type !== 'all') {
        $filteredLogs = array_filter($filteredLogs, function($log) use ($type) {
            return ($log['type'] ?? 'system') === $type;
        });
    }
    
    if (!empty($userId)) {
        $filteredLogs = array_filter($filteredLogs, function($log) use ($userId) {
            return ($log['userId'] ?? '') === $userId;
        });
    }
    
    if (!empty($search)) {
        $filteredLogs = array_filter($filteredLogs, function($log) use ($search) {
            return stripos($log['action'] ?? '', $search) !== false || 
                   stripos($log['details'] ?? '', $search) !== false;
        });
    }
    
    if (!empty($dateFrom)) {
        $fromTimestamp = strtotime($dateFrom);
        $filteredLogs = array_filter($filteredLogs, function($log) use ($fromTimestamp) {
            return strtotime($log['timestamp']) >= $fromTimestamp;
        });
    }
    
    if (!empty($dateTo)) {
        $toTimestamp = strtotime($dateTo . ' 23:59:59');
        $filteredLogs = array_filter($filteredLogs, function($log) use ($toTimestamp) {
            return strtotime($log['timestamp']) <= $toTimestamp;
        });
    }
    
    // Calculate pagination
    $filteredLogs = array_values($filteredLogs);
    $total = count($filteredLogs);
    $offset = ($page - 1) * $limit;
    $paginatedLogs = array_slice($filteredLogs, $offset, $limit);
    
    // Get statistics
    $stats = getLogStats($logs);
    
    echo json_encode([
        'success' => true,
        'logs' => $paginatedLogs,
        'stats' => $stats,
        'pagination' => [
            'total' => $total,
            'page' => $page,
            'limit' => $limit,
            'totalPages' => ceil($total / $limit)
        ],
        'filters' => [
            'level' => $level,
            'type' => $type,
            'userId' => $userId,
            'search' => $search,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo
        ]
    ]);
}

/**
 * Get log statistics
 */
function getLogStats($logs) {
    $stats = [
        'total' => count($logs),
        'byLevel' => [
            'info' => 0,
            'success' => 0,
            'warning' => 0,
            'error' => 0
        ],
        'byType' => [
            'auth' => 0,
            'file' => 0,
            'content' => 0,
            'admin' => 0,
            'system' => 0,
            'share' => 0
        ],
        'last24Hours' => 0,
        'last7Days' => 0,
        'last30Days' => 0
    ];
    
    $now = time();
    $dayAgo = $now - (24 * 60 * 60);
    $weekAgo = $now - (7 * 24 * 60 * 60);
    $monthAgo = $now - (30 * 24 * 60 * 60);
    
    foreach ($logs as $log) {
        $level = $log['level'] ?? 'info';
        $type = $log['type'] ?? 'system';
        $timestamp = strtotime($log['timestamp']);
        
        if (isset($stats['byLevel'][$level])) {
            $stats['byLevel'][$level]++;
        }
        
        if (isset($stats['byType'][$type])) {
            $stats['byType'][$type]++;
        }
        
        if ($timestamp >= $dayAgo) $stats['last24Hours']++;
        if ($timestamp >= $weekAgo) $stats['last7Days']++;
        if ($timestamp >= $monthAgo) $stats['last30Days']++;
    }
    
    return $stats;
}

/**
 * Handle DELETE request - clear logs
 */
function handleDeleteLogs(&$logs, $adminId, $adminEmail) {
    $input = json_decode(file_get_contents('php://input'), true);
    $before = $input['before'] ?? null;
    $level = $input['level'] ?? null;
    
    $deletedCount = 0;
    
    if ($before) {
        $beforeTimestamp = strtotime($before);
        $originalCount = count($logs);
        $logs = array_filter($logs, function($log) use ($beforeTimestamp) {
            return strtotime($log['timestamp']) >= $beforeTimestamp;
        });
        $deletedCount = $originalCount - count($logs);
    } elseif ($level) {
        $originalCount = count($logs);
        $logs = array_filter($logs, function($log) use ($level) {
            return ($log['level'] ?? 'info') !== $level;
        });
        $deletedCount = $originalCount - count($logs);
    } else {
        $deletedCount = count($logs);
        $logs = [];
    }
    
    // Re-index array
    $logs = array_values($logs);
    
    // Save logs
    $logsFile = __DIR__ . '/database/logs.json';
    file_put_contents($logsFile, json_encode(['logs' => $logs], JSON_PRETTY_PRINT));
    
    // Log activity
    logActivity($adminId, $adminEmail, 'logs_cleared', "Cleared {$deletedCount} log entries");
    
    echo json_encode([
        'success' => true,
        'deletedCount' => $deletedCount,
        'remainingCount' => count($logs),
        'message' => "Successfully cleared {$deletedCount} log entries"
    ]);
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