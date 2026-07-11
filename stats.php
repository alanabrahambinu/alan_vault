<?php
/* ========================================
   ALAN VAULT - STATISTICS API
   Get User Statistics and Analytics
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

// For public stats (optional), allow without token
$public = $_GET['public'] ?? false;

$userId = null;
$userRole = 'user';

if (!$public && !empty($token)) {
    $userData = json_decode(base64_decode($token), true);
    if ($userData && isset($userData['id'])) {
        $userId = $userData['id'];
        $userRole = $userData['role'] ?? 'user';
    }
}

$period = $_GET['period'] ?? 'month'; // week, month, year, all

// Load data
$usersFile = __DIR__ . '/database/users.json';
$usersData = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : ['users' => []];
$allUsers = $usersData['users'] ?? [];

// Get statistics based on role
if ($userRole === 'admin' && !$public) {
    $stats = getAdminStats($allUsers, $period);
} else if ($userId) {
    $stats = getUserStats($userId, $period);
} else {
    $stats = getPublicStats();
}

echo json_encode([
    'success' => true,
    'stats' => $stats,
    'period' => $period,
    'timestamp' => date('c')
]);

/**
 * Get admin-level statistics
 */
function getAdminStats($users, $period) {
    $totalUsers = count($users);
    $activeUsers = 0;
    $totalStorage = 0;
    $totalFiles = 0;
    $totalNotes = 0;
    $totalTasks = 0;
    $totalBookmarks = 0;
    $premiumUsers = 0;
    $verifiedUsers = 0;
    
    $userStorage = [];
    $userActivity = [];
    
    foreach ($users as $user) {
        if (($user['status'] ?? 'active') === 'active') {
            $activeUsers++;
        }
        
        if (($user['plan'] ?? 'free') === 'premium') {
            $premiumUsers++;
        }
        
        if (($user['verified'] ?? false) === true) {
            $verifiedUsers++;
        }
        
        $vaultFile = __DIR__ . "/database/vault_{$user['id']}.json";
        if (file_exists($vaultFile)) {
            $vault = json_decode(file_get_contents($vaultFile), true);
            $userStorage[] = [
                'username' => $user['username'],
                'storage' => $user['storageUsed'] ?? 0
            ];
            $totalStorage += $user['storageUsed'] ?? 0;
            $totalFiles += count($vault['files'] ?? []);
            $totalNotes += count($vault['notes'] ?? []);
            $totalTasks += count($vault['tasks'] ?? []);
            $totalBookmarks += count($vault['bookmarks'] ?? []);
        }
    }
    
    // Sort users by storage usage
    usort($userStorage, function($a, $b) {
        return $b['storage'] - $a['storage'];
    });
    $topUsers = array_slice($userStorage, 0, 5);
    
    // Get activity over time
    $activityData = getActivityOverTime($period);
    
    return [
        'users' => [
            'total' => $totalUsers,
            'active' => $activeUsers,
            'premium' => $premiumUsers,
            'verified' => $verifiedUsers,
            'topUsers' => $topUsers
        ],
        'storage' => [
            'total' => $totalStorage,
            'totalFormatted' => formatBytes($totalStorage),
            'averagePerUser' => $totalUsers > 0 ? formatBytes($totalStorage / $totalUsers) : '0 Bytes'
        ],
        'content' => [
            'files' => $totalFiles,
            'notes' => $totalNotes,
            'tasks' => $totalTasks,
            'bookmarks' => $totalBookmarks,
            'totalItems' => $totalFiles + $totalNotes + $totalTasks + $totalBookmarks
        ],
        'activity' => $activityData,
        'timestamp' => date('c')
    ];
}

/**
 * Get user-specific statistics
 */
function getUserStats($userId, $period) {
    $vaultFile = __DIR__ . "/database/vault_{$userId}.json";
    
    if (!file_exists($vaultFile)) {
        return [
            'files' => 0,
            'notes' => 0,
            'tasks' => 0,
            'bookmarks' => 0,
            'storageUsed' => 0,
            'completionRate' => 0
        ];
    }
    
    $vault = json_decode(file_get_contents($vaultFile), true);
    $files = $vault['files'] ?? [];
    $notes = $vault['notes'] ?? [];
    $tasks = $vault['tasks'] ?? [];
    $bookmarks = $vault['bookmarks'] ?? [];
    
    $totalSize = array_sum(array_column($files, 'size'));
    $completedTasks = count(array_filter($tasks, fn($t) => ($t['completed'] ?? false) === true));
    $totalTasks = count($tasks);
    $completionRate = $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0;
    
    // Category distribution
    $categoryCount = [];
    foreach ($notes as $note) {
        $cat = $note['category'] ?? 'general';
        $categoryCount[$cat] = ($categoryCount[$cat] ?? 0) + 1;
    }
    
    // Priority distribution
    $priorityCount = ['high' => 0, 'medium' => 0, 'low' => 0];
    foreach ($tasks as $task) {
        $priority = $task['priority'] ?? 'medium';
        $priorityCount[$priority] = ($priorityCount[$priority] ?? 0) + 1;
    }
    
    // Recent activity
    $recentActivity = getRecentActivity($userId, 10);
    
    // Activity over time
    $activityData = getUserActivityOverTime($userId, $period);
    
    // Storage by file type
    $storageByType = [
        'documents' => 0,
        'images' => 0,
        'videos' => 0,
        'audio' => 0,
        'archives' => 0,
        'other' => 0
    ];
    
    foreach ($files as $file) {
        $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (in_array($ext, ['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'])) {
            $storageByType['documents'] += $file['size'];
        } elseif (in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'])) {
            $storageByType['images'] += $file['size'];
        } elseif (in_array($ext, ['mp4', 'avi', 'mov', 'mkv', 'webm'])) {
            $storageByType['videos'] += $file['size'];
        } elseif (in_array($ext, ['mp3', 'wav', 'ogg', 'flac'])) {
            $storageByType['audio'] += $file['size'];
        } elseif (in_array($ext, ['zip', 'rar', '7z', 'tar', 'gz'])) {
            $storageByType['archives'] += $file['size'];
        } else {
            $storageByType['other'] += $file['size'];
        }
    }
    
    return [
        'files' => [
            'total' => count($files),
            'storageUsed' => $totalSize,
            'storageFormatted' => formatBytes($totalSize),
            'byType' => $storageByType,
            'byTypeFormatted' => [
                'documents' => formatBytes($storageByType['documents']),
                'images' => formatBytes($storageByType['images']),
                'videos' => formatBytes($storageByType['videos']),
                'audio' => formatBytes($storageByType['audio']),
                'archives' => formatBytes($storageByType['archives']),
                'other' => formatBytes($storageByType['other'])
            ]
        ],
        'notes' => [
            'total' => count($notes),
            'byCategory' => $categoryCount,
            'totalWords' => array_sum(array_column($notes, 'wordCount')),
            'favoriteCount' => count(array_filter($notes, fn($n) => ($n['favorite'] ?? false) === true)),
            'pinnedCount' => count(array_filter($notes, fn($n) => ($n['pinned'] ?? false) === true))
        ],
        'tasks' => [
            'total' => $totalTasks,
            'completed' => $completedTasks,
            'pending' => $totalTasks - $completedTasks,
            'completionRate' => $completionRate,
            'byPriority' => $priorityCount,
            'overdue' => count(array_filter($tasks, function($t) {
                return !($t['completed'] ?? false) && ($t['dueDate'] ?? null) && strtotime($t['dueDate']) < time();
            }))
        ],
        'bookmarks' => [
            'total' => count($bookmarks),
            'favoriteCount' => count(array_filter($bookmarks, fn($b) => ($b['favorite'] ?? false) === true)),
            'totalClicks' => array_sum(array_column($bookmarks, 'clickCount'))
        ],
        'activity' => [
            'recent' => $recentActivity,
            'timeline' => $activityData
        ],
        'summary' => [
            'totalItems' => count($files) + count($notes) + count($tasks) + count($bookmarks),
            'storageUsed' => formatBytes($totalSize),
            'storageLimit' => formatBytes(5 * 1024 * 1024 * 1024),
            'storagePercentage' => round(($totalSize / (5 * 1024 * 1024 * 1024)) * 100, 1)
        ]
    ];
}

/**
 * Get public statistics (for homepage)
 */
function getPublicStats() {
    $usersFile = __DIR__ . '/database/users.json';
    $users = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : ['users' => []];
    $totalUsers = count($users['users'] ?? []);
    
    // Count total items across all users
    $totalFiles = 0;
    $totalNotes = 0;
    $totalTasks = 0;
    
    foreach (($users['users'] ?? []) as $user) {
        $vaultFile = __DIR__ . "/database/vault_{$user['id']}.json";
        if (file_exists($vaultFile)) {
            $vault = json_decode(file_get_contents($vaultFile), true);
            $totalFiles += count($vault['files'] ?? []);
            $totalNotes += count($vault['notes'] ?? []);
            $totalTasks += count($vault['tasks'] ?? []);
        }
    }
    
    return [
        'platform' => [
            'totalUsers' => $totalUsers,
            'totalItems' => $totalFiles + $totalNotes + $totalTasks,
            'totalFiles' => $totalFiles,
            'totalNotes' => $totalNotes,
            'totalTasks' => $totalTasks,
            'uptime' => '99.99%',
            'encryption' => '256-bit AES'
        ]
    ];
}

/**
 * Get activity over time for admin
 */
function getActivityOverTime($period) {
    $logsFile = __DIR__ . '/database/logs.json';
    if (!file_exists($logsFile)) {
        return [];
    }
    
    $logsData = json_decode(file_get_contents($logsFile), true);
    $logs = $logsData['logs'] ?? [];
    
    $activity = [];
    $now = time();
    
    if ($period === 'week') {
        $days = 7;
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $activity[$date] = ['logins' => 0, 'uploads' => 0, 'creations' => 0];
        }
        
        foreach ($logs as $log) {
            $logDate = date('Y-m-d', strtotime($log['timestamp']));
            if (isset($activity[$logDate])) {
                if ($log['action'] === 'login_success') $activity[$logDate]['logins']++;
                if ($log['action'] === 'file_uploaded') $activity[$logDate]['uploads']++;
                if (in_array($log['action'], ['note_created', 'task_created', 'bookmark_created'])) {
                    $activity[$logDate]['creations']++;
                }
            }
        }
    }
    
    return $activity;
}

/**
 * Get user activity over time
 */
function getUserActivityOverTime($userId, $period) {
    $logsFile = __DIR__ . '/database/logs.json';
    if (!file_exists($logsFile)) {
        return [];
    }
    
    $logsData = json_decode(file_get_contents($logsFile), true);
    $logs = $logsData['logs'] ?? [];
    $userLogs = array_filter($logs, fn($l) => ($l['userId'] ?? '') === $userId);
    
    $activity = [];
    $now = time();
    
    if ($period === 'week') {
        $days = 7;
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $activity[$date] = 0;
        }
        
        foreach ($userLogs as $log) {
            $logDate = date('Y-m-d', strtotime($log['timestamp']));
            if (isset($activity[$logDate])) {
                $activity[$logDate]++;
            }
        }
    } elseif ($period === 'month') {
        $days = 30;
        for ($i = $days - 1; $i >= 0; $i--) {
            $date = date('Y-m-d', strtotime("-{$i} days"));
            $activity[$date] = 0;
        }
        
        foreach ($userLogs as $log) {
            $logDate = date('Y-m-d', strtotime($log['timestamp']));
            if (isset($activity[$logDate])) {
                $activity[$logDate]++;
            }
        }
    }
    
    return $activity;
}

/**
 * Get recent user activity
 */
function getRecentActivity($userId, $limit = 10) {
    $logsFile = __DIR__ . '/database/logs.json';
    if (!file_exists($logsFile)) {
        return [];
    }
    
    $logsData = json_decode(file_get_contents($logsFile), true);
    $logs = $logsData['logs'] ?? [];
    $userLogs = array_filter($logs, fn($l) => ($l['userId'] ?? '') === $userId);
    $userLogs = array_values($userLogs);
    return array_slice($userLogs, 0, $limit);
}

/**
 * Format bytes to human readable
 */
function formatBytes($bytes) {
    if ($bytes === 0) return '0 Bytes';
    $k = 1024;
    $sizes = ['Bytes', 'KB', 'MB', 'GB'];
    $i = floor(log($bytes) / log($k));
    return round($bytes / pow($k, $i), 2) . ' ' . $sizes[$i];
}
?>