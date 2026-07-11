<?php
/* ========================================
   ALAN VAULT - REPORTS API
   Generate System Reports for Admin
   ======================================== */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
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

// Handle different request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        handleGetReport();
        break;
    case 'POST':
        handleGenerateReport($adminId, $adminEmail);
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

/**
 * Handle GET request - retrieve report types
 */
function handleGetReport() {
    $reportId = $_GET['reportId'] ?? '';
    $format = $_GET['format'] ?? 'json';
    
    if (!empty($reportId)) {
        // Get saved report
        $reportsDir = __DIR__ . '/database/reports/';
        $reportFile = $reportsDir . "{$reportId}.json";
        
        if (file_exists($reportFile)) {
            $report = json_decode(file_get_contents($reportFile), true);
            
            if ($format === 'csv') {
                exportToCSV($report);
            } else {
                echo json_encode([
                    'success' => true,
                    'report' => $report
                ]);
            }
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Report not found']);
        }
    } else {
        // List available report types
        echo json_encode([
            'success' => true,
            'reportTypes' => [
                'users' => 'User Statistics Report',
                'storage' => 'Storage Usage Report',
                'activity' => 'User Activity Report',
                'content' => 'Content Summary Report',
                'security' => 'Security Events Report',
                'performance' => 'System Performance Report'
            ],
            'formats' => ['json', 'csv', 'html'],
            'periods' => ['day', 'week', 'month', 'year', 'all']
        ]);
    }
}

/**
 * Handle POST request - generate new report
 */
function handleGenerateReport($adminId, $adminEmail) {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $type = $input['type'] ?? '';
    $period = $input['period'] ?? 'month';
    $format = $input['format'] ?? 'json';
    $saveReport = $input['save'] ?? true;
    
    if (empty($type)) {
        http_response_code(400);
        echo json_encode(['error' => 'Report type is required']);
        exit();
    }
    
    // Generate report data
    $reportData = [];
    $reportTitle = '';
    
    switch ($type) {
        case 'users':
            $reportData = generateUsersReport($period);
            $reportTitle = 'User Statistics Report';
            break;
        case 'storage':
            $reportData = generateStorageReport($period);
            $reportTitle = 'Storage Usage Report';
            break;
        case 'activity':
            $reportData = generateActivityReport($period);
            $reportTitle = 'User Activity Report';
            break;
        case 'content':
            $reportData = generateContentReport($period);
            $reportTitle = 'Content Summary Report';
            break;
        case 'security':
            $reportData = generateSecurityReport($period);
            $reportTitle = 'Security Events Report';
            break;
        case 'performance':
            $reportData = generatePerformanceReport();
            $reportTitle = 'System Performance Report';
            break;
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Invalid report type']);
            exit();
    }
    
    $report = [
        'id' => 'report_' . time() . '_' . uniqid(),
        'title' => $reportTitle,
        'type' => $type,
        'period' => $period,
        'generatedAt' => date('c'),
        'generatedBy' => $adminId,
        'data' => $reportData
    ];
    
    // Save report if requested
    if ($saveReport) {
        $reportsDir = __DIR__ . '/database/reports/';
        if (!file_exists($reportsDir)) {
            mkdir($reportsDir, 0755, true);
        }
        file_put_contents($reportsDir . "{$report['id']}.json", json_encode($report, JSON_PRETTY_PRINT));
    }
    
    // Log activity
    logActivity($adminId, $adminEmail, 'report_generated', "Generated {$reportTitle} ({$period})");
    
    // Return based on format
    if ($format === 'csv') {
        exportToCSV($report);
    } elseif ($format === 'html') {
        echo generateHTMLReport($report);
    } else {
        echo json_encode([
            'success' => true,
            'report' => $report,
            'message' => 'Report generated successfully'
        ]);
    }
}

/**
 * Generate Users Report
 */
function generateUsersReport($period) {
    $usersFile = __DIR__ . '/database/users.json';
    $usersData = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : ['users' => []];
    $users = $usersData['users'] ?? [];
    
    $dateFilter = getDateFilter($period);
    
    $filteredUsers = $users;
    if ($dateFilter) {
        $filteredUsers = array_filter($users, function($user) use ($dateFilter) {
            return strtotime($user['createdAt']) >= $dateFilter;
        });
    }
    
    $activeUsers = array_filter($users, function($user) {
        return ($user['status'] ?? 'active') === 'active';
    });
    
    $newUsers = array_filter($filteredUsers, function($user) use ($dateFilter) {
        return strtotime($user['createdAt']) >= $dateFilter;
    });
    
    $usersByRole = [
        'admin' => count(array_filter($users, fn($u) => ($u['role'] ?? 'user') === 'admin')),
        'user' => count(array_filter($users, fn($u) => ($u['role'] ?? 'user') === 'user'))
    ];
    
    $usersByPlan = [
        'free' => count(array_filter($users, fn($u) => ($u['plan'] ?? 'free') === 'free')),
        'premium' => count(array_filter($users, fn($u) => ($u['plan'] ?? 'free') === 'premium'))
    ];
    
    return [
        'summary' => [
            'totalUsers' => count($users),
            'activeUsers' => count($activeUsers),
            'newUsers' => count($newUsers),
            'verifiedUsers' => count(array_filter($users, fn($u) => ($u['verified'] ?? false) === true)),
            'admins' => $usersByRole['admin'],
            'regularUsers' => $usersByRole['user'],
            'premiumUsers' => $usersByPlan['premium'],
            'freeUsers' => $usersByPlan['free']
        ],
        'users' => array_map(function($user) {
            return [
                'username' => $user['username'],
                'email' => $user['email'],
                'role' => $user['role'] ?? 'user',
                'status' => $user['status'] ?? 'active',
                'plan' => $user['plan'] ?? 'free',
                'joined' => $user['createdAt'],
                'lastLogin' => $user['lastLogin'] ?? 'Never',
                'storageUsed' => $user['storageUsed'] ?? 0
            ];
        }, $filteredUsers)
    ];
}

/**
 * Generate Storage Report
 */
function generateStorageReport($period) {
    $usersFile = __DIR__ . '/database/users.json';
    $usersData = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : ['users' => []];
    $users = $usersData['users'] ?? [];
    
    $totalStorage = 0;
    $userStorage = [];
    $storageByType = [
        'documents' => 0,
        'images' => 0,
        'videos' => 0,
        'audio' => 0,
        'archives' => 0,
        'other' => 0
    ];
    
    foreach ($users as $user) {
        $vaultFile = __DIR__ . "/database/vault_{$user['id']}.json";
        if (file_exists($vaultFile)) {
            $vault = json_decode(file_get_contents($vaultFile), true);
            $files = $vault['files'] ?? [];
            $userTotal = array_sum(array_column($files, 'size'));
            $totalStorage += $userTotal;
            
            $userStorage[] = [
                'username' => $user['username'],
                'email' => $user['email'],
                'storage' => $userTotal,
                'storageFormatted' => formatBytes($userTotal),
                'fileCount' => count($files)
            ];
            
            // Categorize by file type
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
        }
    }
    
    // Sort users by storage usage
    usort($userStorage, function($a, $b) {
        return $b['storage'] - $a['storage'];
    });
    
    return [
        'summary' => [
            'totalStorage' => $totalStorage,
            'totalStorageFormatted' => formatBytes($totalStorage),
            'averagePerUser' => count($users) > 0 ? formatBytes($totalStorage / count($users)) : '0 Bytes',
            'topUser' => $userStorage[0] ?? null,
            'storageLimit' => formatBytes(5 * 1024 * 1024 * 1024)
        ],
        'byType' => [
            'documents' => formatBytes($storageByType['documents']),
            'images' => formatBytes($storageByType['images']),
            'videos' => formatBytes($storageByType['videos']),
            'audio' => formatBytes($storageByType['audio']),
            'archives' => formatBytes($storageByType['archives']),
            'other' => formatBytes($storageByType['other'])
        ],
        'topUsers' => array_slice($userStorage, 0, 10)
    ];
}

/**
 * Generate Activity Report
 */
function generateActivityReport($period) {
    $logsFile = __DIR__ . '/database/logs.json';
    $logsData = file_exists($logsFile) ? json_decode(file_get_contents($logsFile), true) : ['logs' => []];
    $logs = $logsData['logs'] ?? [];
    
    $dateFilter = getDateFilter($period);
    
    if ($dateFilter) {
        $logs = array_filter($logs, function($log) use ($dateFilter) {
            return strtotime($log['timestamp']) >= $dateFilter;
        });
    }
    
    $activityByType = [
        'auth' => 0,
        'file' => 0,
        'content' => 0,
        'admin' => 0,
        'system' => 0,
        'share' => 0
    ];
    
    $activityByLevel = [
        'info' => 0,
        'success' => 0,
        'warning' => 0,
        'error' => 0
    ];
    
    $dailyActivity = [];
    $mostActiveUsers = [];
    
    foreach ($logs as $log) {
        $type = $log['type'] ?? 'system';
        $level = $log['level'] ?? 'info';
        $date = date('Y-m-d', strtotime($log['timestamp']));
        $userId = $log['userId'] ?? 'anonymous';
        
        if (isset($activityByType[$type])) $activityByType[$type]++;
        if (isset($activityByLevel[$level])) $activityByLevel[$level]++;
        
        if (!isset($dailyActivity[$date])) {
            $dailyActivity[$date] = 0;
        }
        $dailyActivity[$date]++;
        
        if (!isset($mostActiveUsers[$userId])) {
            $mostActiveUsers[$userId] = 0;
        }
        $mostActiveUsers[$userId]++;
    }
    
    // Get usernames for most active users
    $usersFile = __DIR__ . '/database/users.json';
    $usersData = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : ['users' => []];
    $users = $usersData['users'] ?? [];
    $userNames = [];
    foreach ($users as $user) {
        $userNames[$user['id']] = $user['username'];
    }
    
    $topUsers = [];
    arsort($mostActiveUsers);
    foreach (array_slice($mostActiveUsers, 0, 10, true) as $userId => $count) {
        $topUsers[] = [
            'userId' => $userId,
            'username' => $userNames[$userId] ?? 'Unknown',
            'activityCount' => $count
        ];
    }
    
    return [
        'period' => $period,
        'summary' => [
            'totalActivities' => count($logs),
            'byType' => $activityByType,
            'byLevel' => $activityByLevel
        ],
        'dailyActivity' => $dailyActivity,
        'topActiveUsers' => $topUsers
    ];
}

/**
 * Generate Content Report
 */
function generateContentReport($period) {
    $usersFile = __DIR__ . '/database/users.json';
    $usersData = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : ['users' => []];
    $users = $usersData['users'] ?? [];
    
    $totalFiles = 0;
    $totalNotes = 0;
    $totalTasks = 0;
    $totalBookmarks = 0;
    $completedTasks = 0;
    
    $notesByCategory = [];
    $tasksByPriority = ['high' => 0, 'medium' => 0, 'low' => 0];
    $filesByType = [];
    
    foreach ($users as $user) {
        $vaultFile = __DIR__ . "/database/vault_{$user['id']}.json";
        if (file_exists($vaultFile)) {
            $vault = json_decode(file_get_contents($vaultFile), true);
            
            $files = $vault['files'] ?? [];
            $notes = $vault['notes'] ?? [];
            $tasks = $vault['tasks'] ?? [];
            $bookmarks = $vault['bookmarks'] ?? [];
            
            $totalFiles += count($files);
            $totalNotes += count($notes);
            $totalTasks += count($tasks);
            $totalBookmarks += count($bookmarks);
            $completedTasks += count(array_filter($tasks, fn($t) => ($t['completed'] ?? false) === true));
            
            // Notes by category
            foreach ($notes as $note) {
                $cat = $note['category'] ?? 'general';
                $notesByCategory[$cat] = ($notesByCategory[$cat] ?? 0) + 1;
            }
            
            // Tasks by priority
            foreach ($tasks as $task) {
                $priority = $task['priority'] ?? 'medium';
                if (isset($tasksByPriority[$priority])) {
                    $tasksByPriority[$priority]++;
                }
            }
            
            // Files by type (extension)
            foreach ($files as $file) {
                $ext = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
                if (empty($ext)) $ext = 'unknown';
                $filesByType[$ext] = ($filesByType[$ext] ?? 0) + 1;
            }
        }
    }
    
    return [
        'summary' => [
            'totalFiles' => $totalFiles,
            'totalNotes' => $totalNotes,
            'totalTasks' => $totalTasks,
            'totalBookmarks' => $totalBookmarks,
            'totalItems' => $totalFiles + $totalNotes + $totalTasks + $totalBookmarks,
            'completedTasks' => $completedTasks,
            'taskCompletionRate' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100) : 0
        ],
        'notesByCategory' => $notesByCategory,
        'tasksByPriority' => $tasksByPriority,
        'topFileTypes' => array_slice($filesByType, 0, 10, true)
    ];
}

/**
 * Generate Security Report
 */
function generateSecurityReport($period) {
    $logsFile = __DIR__ . '/database/logs.json';
    $logsData = file_exists($logsFile) ? json_decode(file_get_contents($logsFile), true) : ['logs' => []];
    $logs = $logsData['logs'] ?? [];
    
    $dateFilter = getDateFilter($period);
    
    if ($dateFilter) {
        $logs = array_filter($logs, function($log) use ($dateFilter) {
            return strtotime($log['timestamp']) >= $dateFilter;
        });
    }
    
    // Filter security-related logs
    $securityLogs = array_filter($logs, function($log) {
        $type = $log['type'] ?? '';
        $action = $log['action'] ?? '';
        return $type === 'auth' || $type === 'security' || 
               strpos($action, 'login') !== false || 
               strpos($action, 'password') !== false;
    });
    
    $failedLogins = array_filter($securityLogs, function($log) {
        return strpos($log['action'] ?? '', 'login') !== false && 
               ($log['level'] ?? '') === 'warning';
    });
    
    $successfulLogins = array_filter($securityLogs, function($log) {
        return $log['action'] === 'login_success';
    });
    
    $passwordResets = array_filter($securityLogs, function($log) {
        return $log['action'] === 'password_reset';
    });
    
    $uniqueIPs = [];
    foreach ($securityLogs as $log) {
        $ip = $log['metadata']['ip'] ?? 'Unknown';
        $uniqueIPs[$ip] = true;
    }
    
    return [
        'period' => $period,
        'summary' => [
            'totalSecurityEvents' => count($securityLogs),
            'successfulLogins' => count($successfulLogins),
            'failedLogins' => count($failedLogins),
            'passwordResets' => count($passwordResets),
            'uniqueIPs' => count($uniqueIPs),
            'suspiciousActivities' => 0 // Would need additional logic
        ],
        'failedLoginAttempts' => array_values($failedLogins),
        'recentSecurityEvents' => array_slice(array_values($securityLogs), 0, 20)
    ];
}

/**
 * Generate Performance Report
 */
function generatePerformanceReport() {
    // Calculate database sizes
    $dbSize = 0;
    $dbDir = __DIR__ . '/database/';
    if (file_exists($dbDir)) {
        $files = glob($dbDir . '*.json');
        foreach ($files as $file) {
            $dbSize += filesize($file);
        }
    }
    
    // Count users
    $usersFile = __DIR__ . '/database/users.json';
    $usersData = file_exists($usersFile) ? json_decode(file_get_contents($usersFile), true) : ['users' => []];
    $totalUsers = count($usersData['users'] ?? []);
    
    // Get uptime (mock data - in production would read from system)
    $uptime = 99.99;
    
    return [
        'generatedAt' => date('c'),
        'system' => [
            'phpVersion' => PHP_VERSION,
            'serverSoftware' => $_SERVER['SERVER_SOFTWARE'] ?? 'Unknown',
            'uploadMaxSize' => ini_get('upload_max_filesize'),
            'memoryLimit' => ini_get('memory_limit'),
            'maxExecutionTime' => ini_get('max_execution_time')
        ],
        'database' => [
            'size' => formatBytes($dbSize),
            'userCount' => $totalUsers,
            'fileCount' => 0 // Would need to sum across all users
        ],
        'performance' => [
            'uptime' => "{$uptime}%",
            'responseTime' => '~200ms',
            'cacheHitRate' => '85%'
        ]
    ];
}

/**
 * Get date filter based on period
 */
function getDateFilter($period) {
    switch ($period) {
        case 'day':
            return strtotime('-1 day');
        case 'week':
            return strtotime('-7 days');
        case 'month':
            return strtotime('-30 days');
        case 'year':
            return strtotime('-365 days');
        default:
            return null;
    }
}

/**
 * Export report to CSV
 */
function exportToCSV($report) {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $report['id'] . '.csv"');
    
    $output = fopen('php://output', 'w');
    
    // Add headers
    fputcsv($output, ['Report: ' . $report['title']]);
    fputcsv($output, ['Generated: ' . $report['generatedAt']]);
    fputcsv($output, ['Period: ' . $report['period']]);
    fputcsv($output, []);
    
    // Flatten data for CSV
    flattenArrayForCSV($output, $report['data']);
    
    fclose($output);
}

/**
 * Flatten array for CSV export
 */
function flattenArrayForCSV($output, $data, $prefix = '') {
    foreach ($data as $key => $value) {
        if (is_array($value)) {
            flattenArrayForCSV($output, $value, $prefix . $key . '.');
        } else {
            fputcsv($output, [$prefix . $key, $value]);
        }
    }
}

/**
 * Generate HTML report
 */
function generateHTMLReport($report) {
    $html = '<!DOCTYPE html>
    <html>
    <head>
        <title>' . htmlspecialchars($report['title']) . '</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; background: #0a0a0f; color: #fff; }
            .container { max-width: 1200px; margin: 0 auto; }
            h1 { color: #8B5CF6; }
            .section { background: rgba(255,255,255,0.05); border-radius: 12px; padding: 20px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 10px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.1); }
            th { color: #8B5CF6; }
            .value { color: #10b981; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>' . htmlspecialchars($report['title']) . '</h1>
            <p>Generated: ' . $report['generatedAt'] . '</p>
            <p>Period: ' . $report['period'] . '</p>';
    
    $html .= '<div class="section"><pre>' . json_encode($report['data'], JSON_PRETTY_PRINT) . '</pre></div>';
    
    $html .= '</div></body></html>';
    
    return $html;
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