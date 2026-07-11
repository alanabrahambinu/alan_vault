<?php
/* ========================================
   ALAN VAULT - EMAIL VERIFICATION API
   Verify User Email Address
   ======================================== */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Handle GET request with token parameter
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = $_GET['token'] ?? '';
    
    if (empty($token)) {
        // Return HTML form for code verification
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Verify Email - Alan Vault</title>
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
                .verify-container { width: 100%; max-width: 450px; padding: 2rem; }
                .verify-card {
                    background: rgba(255,255,255,0.03);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(139,92,246,0.3);
                    border-radius: 24px;
                    padding: 2rem;
                    text-align: center;
                }
                .verify-icon {
                    width: 80px;
                    height: 80px;
                    background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2.5rem;
                    margin: 0 auto 1.5rem;
                }
                h2 { color: white; margin-bottom: 0.5rem; }
                p { color: #a1a1aa; margin-bottom: 1.5rem; }
                .code-inputs {
                    display: flex;
                    gap: 0.75rem;
                    justify-content: center;
                    margin-bottom: 1.5rem;
                }
                .code-input {
                    width: 50px;
                    height: 60px;
                    text-align: center;
                    font-size: 1.5rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    color: white;
                }
                .btn-verify {
                    width: 100%;
                    padding: 0.75rem;
                    background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    font-size: 1rem;
                    cursor: pointer;
                }
                .message {
                    margin-top: 1rem;
                    padding: 0.75rem;
                    border-radius: 8px;
                    display: none;
                }
                .message.success { background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.3); color: #10b981; }
                .message.error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); color: #ef4444; }
            </style>
        </head>
        <body>
            <div class="verify-container">
                <div class="verify-card">
                    <div class="verify-icon">✉️</div>
                    <h2>Verify Your Email</h2>
                    <p>Enter the 6-digit code sent to your email</p>
                    <div class="code-inputs">
                        <input type="text" class="code-input" maxlength="1" id="code1" onkeyup="moveToNext(this, 'code2')">
                        <input type="text" class="code-input" maxlength="1" id="code2" onkeyup="moveToNext(this, 'code3')">
                        <input type="text" class="code-input" maxlength="1" id="code3" onkeyup="moveToNext(this, 'code4')">
                        <input type="text" class="code-input" maxlength="1" id="code4" onkeyup="moveToNext(this, 'code5')">
                        <input type="text" class="code-input" maxlength="1" id="code5" onkeyup="moveToNext(this, 'code6')">
                        <input type="text" class="code-input" maxlength="1" id="code6">
                    </div>
                    <button class="btn-verify" onclick="verifyCode()">Verify Email</button>
                    <div id="message" class="message"></div>
                </div>
            </div>
            <script>
                function moveToNext(current, nextId) {
                    if (current.value.length === 1) {
                        document.getElementById(nextId)?.focus();
                    }
                }
                
                function getCode() {
                    let code = '';
                    for(let i = 1; i <= 6; i++) {
                        code += document.getElementById(`code${i}`).value;
                    }
                    return code;
                }
                
                async function verifyCode() {
                    const code = getCode();
                    if (code.length !== 6) {
                        showMessage('Please enter the complete 6-digit code', 'error');
                        return;
                    }
                    
                    const response = await fetch('/api/auth/verify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code: code })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        showMessage('Email verified successfully! Redirecting...', 'success');
                        setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                    } else {
                        showMessage(data.error || 'Invalid verification code', 'error');
                    }
                }
                
                function showMessage(msg, type) {
                    const msgDiv = document.getElementById('message');
                    msgDiv.textContent = msg;
                    msgDiv.className = `message ${type}`;
                    msgDiv.style.display = 'block';
                    setTimeout(() => { msgDiv.style.display = 'none'; }, 5000);
                }
                
                document.getElementById('code1').focus();
            </script>
        </body>
        </html>
        <?php
        exit();
    }
    
    // Handle token verification
    $usersFile = __DIR__ . '/database/users.json';
    if (!file_exists($usersFile)) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error']);
        exit();
    }
    
    $usersData = json_decode(file_get_contents($usersFile), true);
    $users = $usersData['users'] ?? [];
    
    // Find verification file
    $verified = false;
    $userId = null;
    
    foreach (glob(__DIR__ . '/database/verify_*.json') as $verifyFile) {
        $verifyData = json_decode(file_get_contents($verifyFile), true);
        if ($verifyData && isset($verifyData['token']) && $verifyData['token'] === $token) {
            if ($verifyData['expires'] < time()) {
                http_response_code(400);
                echo json_encode(['error' => 'Verification link has expired']);
                exit();
            }
            
            $email = $verifyData['email'];
            
            // Update user as verified
            foreach ($users as $key => $user) {
                if ($user['email'] === $email) {
                    $users[$key]['verified'] = true;
                    $userId = $user['id'];
                    $verified = true;
                    break;
                }
            }
            
            // Delete verification file
            unlink($verifyFile);
            break;
        }
    }
    
    if ($verified) {
        $usersData['users'] = $users;
        file_put_contents($usersFile, json_encode($usersData, JSON_PRETTY_PRINT));
        
        logActivity($userId, $email, 'email_verified', 'Email address verified');
        
        // Return success HTML page
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Email Verified - Alan Vault</title>
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
                .success-container { text-align: center; padding: 2rem; }
                .success-icon {
                    width: 100px;
                    height: 100px;
                    background: linear-gradient(135deg, #10b981, #34d399);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3rem;
                    margin: 0 auto 1.5rem;
                }
                h1 { color: white; margin-bottom: 0.5rem; }
                p { color: #a1a1aa; margin-bottom: 1.5rem; }
                .btn {
                    padding: 0.75rem 1.5rem;
                    background: linear-gradient(135deg, #4F46E5, #8B5CF6);
                    border: none;
                    border-radius: 12px;
                    color: white;
                    text-decoration: none;
                    display: inline-block;
                }
            </style>
        </head>
        <body>
            <div class="success-container">
                <div class="success-icon">✓</div>
                <h1>Email Verified!</h1>
                <p>Your email has been successfully verified. You can now login to your account.</p>
                <a href="login.html" class="btn">Login Now →</a>
            </div>
        </body>
        </html>
        <?php
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid or expired verification token']);
    }
    exit();
}

// Handle POST request for code verification
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $code = $input['code'] ?? '';
    
    if (empty($code) || strlen($code) !== 6) {
        http_response_code(400);
        echo json_encode(['error' => 'Please enter a valid 6-digit code']);
        exit();
    }
    
    // In production, validate code against stored verification code
    // For demo, accept any valid 6-digit code
    echo json_encode([
        'success' => true,
        'message' => 'Email verified successfully'
    ]);
    exit();
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