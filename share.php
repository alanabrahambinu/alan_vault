<?php
/* ========================================
   ALAN VAULT - FILE SHARE API
   Create and Manage Shareable Links
   ======================================== */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, DELETE, OPTIONS');
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

// Create shares directory if not exists
$sharesDir = __DIR__ . '/database/shares/';
if (!file_exists($sharesDir)) {
    mkdir($sharesDir, 0755, true);
}

// Handle different request methods
switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        // Create a new share link
        handleCreateShare($token, $sharesDir);
        break;
        
    case 'GET':
        // Get shared file (public access - no token required)
        handleGetSharedFile($sharesDir);
        break;
        
    case 'DELETE':
        // Delete a share link
        handleDeleteShare($token, $sharesDir);
        break;
        
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

/**
 * Handle creating a share link
 */
function handleCreateShare($token, $sharesDir) {
    // Validate token for authenticated users only
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        return;
    }
    
    $userData = json_decode(base64_decode($token), true);
    
    if (!$userData || !isset($userData['id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid token']);
        return;
    }
    
    $userId = $userData['id'];
    $userEmail = $userData['email'] ?? 'Unknown';
    
    // Get request data
    $input = json_decode(file_get_contents('php://input'), true);
    $fileId = $input['fileId'] ?? '';
    $expiresIn = $input['expiresIn'] ?? 7; // days
    $password = $input['password'] ?? null;
    $maxAccess = $input['maxAccess'] ?? null;
    $allowDownload = $input['allowDownload'] ?? true;
    
    if (empty($fileId)) {
        http_response_code(400);
        echo json_encode(['error' => 'File ID is required']);
        return;
    }
    
    // Load user's vault to get file info
    $vaultFile = __DIR__ . "/database/vault_{$userId}.json";
    
    if (!file_exists($vaultFile)) {
        http_response_code(404);
        echo json_encode(['error' => 'Vault not found']);
        return;
    }
    
    $vault = json_decode(file_get_contents($vaultFile), true);
    $files = $vault['files'] ?? [];
    
    $fileToShare = null;
    foreach ($files as $file) {
        if ($file['id'] === $fileId) {
            $fileToShare = $file;
            break;
        }
    }
    
    if (!$fileToShare) {
        http_response_code(404);
        echo json_encode(['error' => 'File not found']);
        return;
    }
    
    // Generate share token
    $shareToken = bin2hex(random_bytes(32));
    $shareId = 'share_' . time() . '_' . uniqid();
    
    // Calculate expiry date
    $expiresAt = date('c', time() + ($expiresIn * 24 * 60 * 60));
    
    // Create share record
    $shareRecord = [
        'id' => $shareId,
        'shareToken' => $shareToken,
        'fileId' => $fileId,
        'fileName' => $fileToShare['name'],
        'fileSize' => $fileToShare['size'],
        'fileType' => $fileToShare['type'],
        'userId' => $userId,
        'userEmail' => $userEmail,
        'createdAt' => date('c'),
        'expiresAt' => $expiresAt,
        'accessCount' => 0,
        'maxAccess' => $maxAccess,
        'password' => $password ? password_hash($password, PASSWORD_DEFAULT) : null,
        'allowDownload' => $allowDownload
    ];
    
    // Save share record
    $shareFile = $sharesDir . "{$shareToken}.json";
    file_put_contents($shareFile, json_encode($shareRecord, JSON_PRETTY_PRINT));
    
    // Generate share URL
    $shareUrl = (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . '/share.php?token=' . $shareToken;
    
    // Log activity
    logActivity($userId, $userEmail, 'file_shared', "Created share link for file: {$fileToShare['name']}");
    
    echo json_encode([
        'success' => true,
        'shareId' => $shareId,
        'shareToken' => $shareToken,
        'shareUrl' => $shareUrl,
        'expiresAt' => $expiresAt,
        'message' => 'Share link created successfully'
    ]);
}

/**
 * Handle getting a shared file (public access)
 */
function handleGetSharedFile($sharesDir) {
    $shareToken = $_GET['token'] ?? '';
    $password = $_GET['password'] ?? null;
    
    if (empty($shareToken)) {
        // Show share page HTML
        showSharePage();
        return;
    }
    
    $shareFile = $sharesDir . "{$shareToken}.json";
    
    if (!file_exists($shareFile)) {
        http_response_code(404);
        echo "<!DOCTYPE html><html><head><title>Share Not Found</title></head><body style='font-family: Arial; text-align: center; padding: 50px;'><h1>🔗 Share Link Not Found</h1><p>The share link you're trying to access does not exist or has been removed.</p></body></html>";
        exit();
    }
    
    $shareRecord = json_decode(file_get_contents($shareFile), true);
    
    // Check expiry
    if (strtotime($shareRecord['expiresAt']) < time()) {
        unlink($shareFile);
        http_response_code(410);
        echo "<!DOCTYPE html><html><head><title>Share Expired</title></head><body style='font-family: Arial; text-align: center; padding: 50px;'><h1>⏰ Share Link Expired</h1><p>This share link has expired.</p></body></html>";
        exit();
    }
    
    // Check max access
    if ($shareRecord['maxAccess'] && $shareRecord['accessCount'] >= $shareRecord['maxAccess']) {
        unlink($shareFile);
        http_response_code(410);
        echo "<!DOCTYPE html><html><head><title>Share Limit Reached</title></head><body style='font-family: Arial; text-align: center; padding: 50px;'><h1>📊 Share Limit Reached</h1><p>This share link has reached its maximum number of accesses.</p></body></html>";
        exit();
    }
    
    // Check password
    if ($shareRecord['password']) {
        if (!$password) {
            showPasswordForm($shareToken);
            exit();
        }
        
        if (!password_verify($password, $shareRecord['password'])) {
            showPasswordForm($shareToken, true);
            exit();
        }
    }
    
    // Increment access count
    $shareRecord['accessCount']++;
    $shareRecord['lastAccessed'] = date('c');
    file_put_contents($shareFile, json_encode($shareRecord, JSON_PRETTY_PRINT));
    
    // Get file info
    $filePath = __DIR__ . '/uploads/' . $shareRecord['filename'];
    
    if (!file_exists($filePath)) {
        http_response_code(404);
        echo "<!DOCTYPE html><html><head><title>File Not Found</title></head><body style='font-family: Arial; text-align: center; padding: 50px;'><h1>📁 File Not Found</h1><p>The requested file no longer exists.</p></body></html>";
        exit();
    }
    
    // Show share preview page
    showSharePreview($shareRecord);
}

/**
 * Show share page for public access
 */
function showSharePage() {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Shared File - Alan Vault</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { text-align: center; padding: 2rem; }
            .card {
                background: rgba(255,255,255,0.03);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(139,92,246,0.3);
                border-radius: 24px;
                padding: 3rem;
                max-width: 500px;
            }
            .icon { font-size: 4rem; margin-bottom: 1rem; }
            h1 { color: white; margin-bottom: 0.5rem; }
            p { color: #a1a1aa; margin-bottom: 1.5rem; }
            .btn {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                border: none;
                border-radius: 12px;
                color: white;
                text-decoration: none;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="icon">🔗</div>
                <h1>Shared File</h1>
                <p>This share link requires a valid token. Please use the complete URL provided by the sender.</p>
                <a href="/" class="btn">Go to Alan Vault →</a>
            </div>
        </div>
    </body>
    </html>
    <?php
}

/**
 * Show password form for protected shares
 */
function showPasswordForm($shareToken, $error = false) {
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Required - Alan Vault</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { width: 100%; max-width: 450px; padding: 2rem; }
            .card {
                background: rgba(255,255,255,0.03);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(139,92,246,0.3);
                border-radius: 24px;
                padding: 2rem;
            }
            .icon { font-size: 3rem; text-align: center; margin-bottom: 1rem; }
            h2 { color: white; margin-bottom: 0.5rem; text-align: center; }
            p { color: #a1a1aa; margin-bottom: 1.5rem; text-align: center; }
            input {
                width: 100%;
                padding: 0.75rem;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: white;
                margin-bottom: 1rem;
            }
            .btn {
                width: 100%;
                padding: 0.75rem;
                background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                border: none;
                border-radius: 12px;
                color: white;
                cursor: pointer;
            }
            .error {
                background: rgba(239,68,68,0.1);
                border: 1px solid rgba(239,68,68,0.3);
                color: #ef4444;
                padding: 0.75rem;
                border-radius: 8px;
                margin-bottom: 1rem;
                display: <?php echo $error ? 'block' : 'none'; ?>;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="icon">🔒</div>
                <h2>Password Protected</h2>
                <p>This file is password protected. Please enter the password to access it.</p>
                <div class="error" id="errorMsg">Incorrect password. Please try again.</div>
                <form method="GET" action="">
                    <input type="hidden" name="token" value="<?php echo htmlspecialchars($shareToken); ?>">
                    <input type="password" name="password" placeholder="Enter password" required>
                    <button type="submit" class="btn">Access File →</button>
                </form>
            </div>
        </div>
    </body>
    </html>
    <?php
}

/**
 * Show share preview page
 */
function showSharePreview($shareRecord) {
    $fileName = $shareRecord['fileName'];
    $fileSize = formatBytes($shareRecord['fileSize']);
    $fileType = $shareRecord['fileType'];
    $allowDownload = $shareRecord['allowDownload'];
    $fileId = $shareRecord['fileId'];
    $shareToken = $shareRecord['shareToken'];
    
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title><?php echo htmlspecialchars($fileName); ?> - Shared via Alan Vault</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
                font-family: 'Inter', sans-serif;
                background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .container { width: 100%; max-width: 600px; padding: 2rem; }
            .card {
                background: rgba(255,255,255,0.03);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(139,92,246,0.3);
                border-radius: 24px;
                padding: 2rem;
                text-align: center;
            }
            .file-icon { font-size: 5rem; margin-bottom: 1rem; }
            h1 { color: white; margin-bottom: 0.5rem; word-break: break-word; }
            .meta {
                color: #a1a1aa;
                margin-bottom: 1.5rem;
                padding-bottom: 1rem;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .info {
                text-align: left;
                margin-bottom: 1.5rem;
            }
            .info-row {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                border-bottom: 1px solid rgba(255,255,255,0.05);
            }
            .label { color: #71717a; }
            .value { color: white; }
            .btn {
                display: inline-block;
                padding: 0.75rem 2rem;
                background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                border: none;
                border-radius: 12px;
                color: white;
                text-decoration: none;
                cursor: pointer;
                margin: 0.5rem;
            }
            .btn-outline {
                background: transparent;
                border: 1px solid rgba(139,92,246,0.5);
            }
            .footer {
                margin-top: 1.5rem;
                color: #71717a;
                font-size: 0.75rem;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card">
                <div class="file-icon">📄</div>
                <h1><?php echo htmlspecialchars($fileName); ?></h1>
                <div class="meta">
                    Shared via Alan Vault • Secure Cloud Platform
                </div>
                <div class="info">
                    <div class="info-row">
                        <span class="label">File Size</span>
                        <span class="value"><?php echo $fileSize; ?></span>
                    </div>
                    <div class="info-row">
                        <span class="label">File Type</span>
                        <span class="value"><?php echo htmlspecialchars($fileType); ?></span>
                    </div>
                    <div class="info-row">
                        <span class="label">Shared by</span>
                        <span class="value">Alan Vault User</span>
                    </div>
                </div>
                <?php if ($allowDownload): ?>
                    <a href="/download.php?fileId=<?php echo urlencode($fileId); ?>" class="btn">📥 Download File</a>
                <?php endif; ?>
                <a href="/" class="btn btn-outline">🔐 Try Alan Vault</a>
                <div class="footer">
                    <p>This file was shared securely using Alan Vault. The link expires on <?php echo date('F j, Y', strtotime($shareRecord['expiresAt'])); ?>.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    <?php
}

/**
 * Handle deleting a share link
 */
function handleDeleteShare($token, $sharesDir) {
    if (empty($token)) {
        http_response_code(401);
        echo json_encode(['error' => 'Authentication required']);
        return;
    }
    
    $userData = json_decode(base64_decode($token), true);
    
    if (!$userData || !isset($userData['id'])) {
        http_response_code(401);
        echo json_encode(['error' => 'Invalid token']);
        return;
    }
    
    $userId = $userData['id'];
    
    $input = json_decode(file_get_contents('php://input'), true);
    $shareToken = $input['shareToken'] ?? '';
    
    if (empty($shareToken)) {
        http_response_code(400);
        echo json_encode(['error' => 'Share token is required']);
        return;
    }
    
    $shareFile = $sharesDir . "{$shareToken}.json";
    
    if (!file_exists($shareFile)) {
        http_response_code(404);
        echo json_encode(['error' => 'Share link not found']);
        return;
    }
    
    $shareRecord = json_decode(file_get_contents($shareFile), true);
    
    // Verify ownership
    if ($shareRecord['userId'] !== $userId) {
        http_response_code(403);
        echo json_encode(['error' => 'You do not have permission to delete this share link']);
        return;
    }
    
    unlink($shareFile);
    
    logActivity($userId, $userData['email'] ?? 'Unknown', 'share_deleted', "Deleted share link for file: {$shareRecord['fileName']}");
    
    echo json_encode([
        'success' => true,
        'message' => 'Share link deleted successfully'
    ]);
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
        'type' => 'share',
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