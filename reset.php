<?php
/* ========================================
   ALAN VAULT - PASSWORD RESET API
   Forgot Password & Reset Functionality
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

// Handle GET request - show reset form
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $token = $_GET['token'] ?? '';
    $email = $_GET['email'] ?? '';
    
    if (empty($token) || empty($email)) {
        // Show forgot password form
        ?>
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Reset Password - Alan Vault</title>
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
                .reset-container { width: 100%; max-width: 450px; padding: 2rem; }
                .reset-card {
                    background: rgba(255,255,255,0.03);
                    backdrop-filter: blur(20px);
                    border: 1px solid rgba(139,92,246,0.3);
                    border-radius: 24px;
                    padding: 2rem;
                }
                .reset-icon {
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
                h2 { color: white; margin-bottom: 0.5rem; text-align: center; }
                p { color: #a1a1aa; margin-bottom: 1.5rem; text-align: center; }
                .form-group { margin-bottom: 1rem; }
                label { display: block; margin-bottom: 0.5rem; color: #a1a1aa; }
                input {
                    width: 100%;
                    padding: 0.75rem;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 12px;
                    color: white;
                }
                .btn {
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
                .back-link { text-align: center; margin-top: 1rem; }
                .back-link a { color: #8B5CF6; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="reset-container">
                <div class="reset-card">
                    <div class="reset-icon">🔐</div>
                    <h2>Forgot Password?</h2>
                    <p>Enter your email to receive reset instructions</p>
                    <form id="forgotForm">
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="email" required placeholder="Enter your email">
                        </div>
                        <button type="submit" class="btn">Send Reset Link</button>
                        <div id="message" class="message"></div>
                    </form>
                    <div class="back-link">
                        <a href="login.html">← Back to Login</a>
                    </div>
                </div>
            </div>
            <script>
                document.getElementById('forgotForm').addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const email = document.getElementById('email').value;
                    const messageDiv = document.getElementById('message');
                    
                    const response = await fetch('/api/auth/reset-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email, action: 'request' })
                    });
                    
                    const data = await response.json();
                    
                    if (data.success) {
                        messageDiv.className = 'message success';
                        messageDiv.textContent = 'Reset link sent! Check your email.';
                        messageDiv.style.display = 'block';
                    } else {
                        messageDiv.className = 'message error';
                        messageDiv.textContent = data.error || 'Failed to send reset link';
                        messageDiv.style.display = 'block';
                    }
                });
            </script>
        </body>
        </html>
        <?php
        exit();
    }
    
    // Show reset password form with token
    ?>
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Create New Password - Alan Vault</title>
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
            .reset-container { width: 100%; max-width: 450px; padding: 2rem; }
            .reset-card {
                background: rgba(255,255,255,0.03);
                backdrop-filter: blur(20px);
                border: 1px solid rgba(139,92,246,0.3);
                border-radius: 24px;
                padding: 2rem;
            }
            .reset-icon {
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
            h2 { color: white; margin-bottom: 0.5rem; text-align: center; }
            p { color: #a1a1aa; margin-bottom: 1.5rem; text-align: center; }
            .form-group { margin-bottom: 1rem; }
            label { display: block; margin-bottom: 0.5rem; color: #a1a1aa; }
            input {
                width: 100%;
                padding: 0.75rem;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                border-radius: 12px;
                color: white;
            }
            .btn {
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
        <div class="reset-container">
            <div class="reset-card">
                <div class="reset-icon">🔑</div>
                <h2>Create New Password</h2>
                <p>Enter your new password below</p>
                <form id="resetForm">
                    <input type="hidden" id="token" value="<?php echo htmlspecialchars($token); ?>">
                    <input type="hidden" id="email" value="<?php echo htmlspecialchars($email); ?>">
                    <div class="form-group">
                        <label>New Password</label>
                        <input type="password" id="password" required placeholder="Enter new password">
                    </div>
                    <div class="form-group">
                        <label>Confirm Password</label>
                        <input type="password" id="confirmPassword" required placeholder="Confirm new password">
                    </div>
                    <button type="submit" class="btn">Reset Password</button>
                    <div id="message" class="message"></div>
                </form>
            </div>
        </div>
        <script>
            document.getElementById('resetForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const token = document.getElementById('token').value;
                const email = document.getElementById('email').value;
                const messageDiv = document.getElementById('message');
                
                if (password.length < 6) {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = 'Password must be at least 6 characters';
                    messageDiv.style.display = 'block';
                    return;
                }
                
                if (password !== confirmPassword) {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = 'Passwords do not match';
                    messageDiv.style.display = 'block';
                    return;
                }
                
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, token: token, password: password, action: 'reset' })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    messageDiv.className = 'message success';
                    messageDiv.textContent = 'Password reset successfully! Redirecting...';
                    messageDiv.style.display = 'block';
                    setTimeout(() => { window.location.href = 'login.html'; }, 2000);
                } else {
                    messageDiv.className = 'message error';
                    messageDiv.textContent = data.error || 'Failed to reset password';
                    messageDiv.style.display = 'block';
                }
            });
        </script>
    </body>
    </html>
    <?php
    exit();
}

// Handle POST request for password reset
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    $email = $input['email'] ?? '';
    
    if ($action === 'request') {
        // Handle forgot password request
        if (empty($email)) {
            http_response_code(400);
            echo json_encode(['error' => 'Email is required']);
            exit();
        }
        
        $usersFile = __DIR__ . '/database/users.json';
        if (!file_exists($usersFile)) {
            http_response_code(500);
            echo json_encode(['error' => 'Database error']);
            exit();
        }
        
        $usersData = json_decode(file_get_contents($usersFile), true);
        $users = $usersData['users'] ?? [];
        
        $userExists = false;
        foreach ($users as $user) {
            if ($user['email'] === $email) {
                $userExists = true;
                break;
            }
        }
        
        // Always return success for security (don't reveal if email exists)
        // Generate reset token
        $resetToken = bin2hex(random_bytes(32));
        $resetData = [
            'email' => $email,
            'token' => $resetToken,
            'expires' => time() + (60 * 60) // 1 hour
        ];
        
        // Save reset token
        $resetFile = __DIR__ . "/database/reset_{$email}.json";
        file_put_contents($resetFile, json_encode($resetData, JSON_PRETTY_PRINT));
        
        logActivity(null, $email, 'password_reset_request', 'Password reset requested');
        
        echo json_encode([
            'success' => true,
            'message' => 'If an account exists with this email, you will receive reset instructions.',
            'resetLink' => "/reset.php?token={$resetToken}&email=" . urlencode($email)
        ]);
        
    } elseif ($action === 'reset') {
        // Handle password reset
        $token = $input['token'] ?? '';
        $email = $input['email'] ?? '';
        $newPassword = $input['password'] ?? '';
        
        if (empty($token) || empty($email) || empty($newPassword)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid request']);
            exit();
        }
        
        if (strlen($newPassword) < 6) {
            http_response_code(400);
            echo json_encode(['error' => 'Password must be at least 6 characters']);
            exit();
        }
        
        $resetFile = __DIR__ . "/database/reset_{$email}.json";
        
        if (!file_exists($resetFile)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid or expired reset token']);
            exit();
        }
        
        $resetData = json_decode(file_get_contents($resetFile), true);
        
        if ($resetData['token'] !== $token) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid reset token']);
            exit();
        }
        
        if ($resetData['expires'] < time()) {
            unlink($resetFile);
            http_response_code(400);
            echo json_encode(['error' => 'Reset token has expired']);
            exit();
        }
        
        // Update user password
        $usersFile = __DIR__ . '/database/users.json';
        $usersData = json_decode(file_get_contents($usersFile), true);
        $users = $usersData['users'] ?? [];
        
        $userUpdated = false;
        foreach ($users as $key => $user) {
            if ($user['email'] === $email) {
                $users[$key]['password'] = $newPassword; // In production, use password_hash()
                $userUpdated = true;
                logActivity($user['id'], $email, 'password_reset', 'Password reset successfully');
                break;
            }
        }
        
        if (!$userUpdated) {
            http_response_code(404);
            echo json_encode(['error' => 'User not found']);
            exit();
        }
        
        $usersData['users'] = $users;
        file_put_contents($usersFile, json_encode($usersData, JSON_PRETTY_PRINT));
        
        // Delete reset file
        unlink($resetFile);
        
        echo json_encode([
            'success' => true,
            'message' => 'Password reset successfully'
        ]);
    } else {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
    }
    exit();
}

/**
 * Log activity
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