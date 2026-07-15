const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// SUPABASE CONFIGURATION
// ============================================
const supabaseUrl = 'https://cbpxibyyvmiherounzeu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNicHhpYnl5dm1pZWhyb3VuemV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMTkwNDksImV4cCI6MjA5OTY5NTA0OX0.GaHC7Z4mRgGxu5CpM48zxWihxIXp929cVuq-0rRBz4k';
const supabase = createClient(supabaseUrl, supabaseKey);
console.log('✅ Connected to Supabase');

// ============================================
// MIDDLEWARE
// ============================================
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(__dirname));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// ============================================
// VERCEL COMPATIBILITY - Use /tmp for uploads
// ============================================
const isVercel = process.env.VERCEL === '1';

// Use /tmp for uploads on Vercel (writable), local ./uploads otherwise
const uploadDir = isVercel ? '/tmp/uploads/' : './uploads/';

// Only create directories locally (Vercel can't write to filesystem)
if (!isVercel) {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
    }
    if (!fs.existsSync('./database/')) {
        fs.mkdirSync('./database/', { recursive: true });
    }
}

// File upload configuration
let upload;

if (isVercel) {
    // Vercel: Use memory storage (no disk write)
    upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit on Vercel
    });
} else {
    // Local: Use disk storage
    const storage = multer.diskStorage({
        destination: (req, file, cb) => {
            cb(null, uploadDir);
        },
        filename: (req, file, cb) => {
            const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
            cb(null, uniqueSuffix + path.extname(file.originalname));
        }
    });
    upload = multer({
        storage: storage,
        limits: { fileSize: 100 * 1024 * 1024 }
    });
}

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// ============================================
// IN-MEMORY DATABASE (FALLBACK)
// ============================================
const db = {
    users: [],
    files: [],
    notes: [],
    tasks: [],
    sessions: []
};

// Load initial data (only works locally)
if (!isVercel) {
    try {
        if (fs.existsSync('./database/users.json')) {
            db.users = JSON.parse(fs.readFileSync('./database/users.json'));
            console.log(`✅ Loaded ${db.users.length} users from database`);
        }
        if (fs.existsSync('./database/files.json')) {
            db.files = JSON.parse(fs.readFileSync('./database/files.json'));
        }
        if (fs.existsSync('./database/notes.json')) {
            db.notes = JSON.parse(fs.readFileSync('./database/notes.json'));
        }
        if (fs.existsSync('./database/tasks.json')) {
            db.tasks = JSON.parse(fs.readFileSync('./database/tasks.json'));
        }
    } catch (error) {
        console.error('Error loading database:', error);
    }
}

// Save data function (only works locally)
function saveData() {
    if (isVercel) return; // Skip on Vercel

    try {
        fs.writeFileSync('./database/users.json', JSON.stringify(db.users, null, 2));
        fs.writeFileSync('./database/files.json', JSON.stringify(db.files, null, 2));
        fs.writeFileSync('./database/notes.json', JSON.stringify(db.notes, null, 2));
        fs.writeFileSync('./database/tasks.json', JSON.stringify(db.tasks, null, 2));
    } catch (error) {
        console.error('Error saving database:', error);
    }
}

// Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// ============================================
// SYNC FUNCTIONS (Supabase + Local DB)
// ============================================

// Sync user to Supabase
async function syncUserToSupabase(user) {
    try {
        // Check if user exists in Supabase
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('email', user.email)
            .single();

        if (!existing) {
            // Insert user to Supabase
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    username: user.username,
                    email: user.email,
                    password_hash: user.password,
                    role: user.role || 'user',
                    status: 'active',
                    created_at: user.createdAt || new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;
        }
        return existing;
    } catch (error) {
        console.error('Error syncing user to Supabase:', error);
        return null;
    }
}

// ============================================
// SERVE HTML FILES
// ============================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/:page', (req, res) => {
    const page = req.params.page;
    const pageName = page.split('?')[0];
    const filePath = path.join(__dirname, pageName);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        res.sendFile(filePath);
    } else if (fs.existsSync(`${filePath}.html`)) {
        res.sendFile(`${filePath}.html`);
    } else {
        res.status(404).sendFile(path.join(__dirname, '404.html'));
    }
});

// ============================================
// API ROUTES
// ============================================

// ========== AUTH ENDPOINTS ==========

// Signup
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Check if user exists in local DB
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Check if user exists in Supabase
        const { data: existingSupabase } = await supabase
            .from('users')
            .select('email')
            .eq('email', email)
            .single();

        if (existingSupabase) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            role: 'user',
            status: 'active',
            createdAt: new Date().toISOString(),
            storageUsed: 0
        };

        // Save to local DB
        db.users.push(user);
        saveData();

        // Sync to Supabase
        await syncUserToSupabase(user);

        res.status(201).json({
            success: true,
            message: 'User created successfully'
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Try to find user in local DB first
        let user = db.users.find(u => u.email === email);

        // If not in local DB, try Supabase
        if (!user) {
            const { data: supabaseUser, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (!error && supabaseUser) {
                // Convert Supabase user to local format
                user = {
                    id: supabaseUser.id,
                    username: supabaseUser.username,
                    email: supabaseUser.email,
                    password: supabaseUser.password_hash,
                    role: supabaseUser.role || 'user',
                    status: supabaseUser.status || 'active',
                    createdAt: supabaseUser.created_at,
                    storageUsed: 0
                };
                // Add to local DB for caching
                db.users.push(user);
                saveData();
            }
        }

        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Update last_login in Supabase
        await supabase
            .from('users')
            .update({ last_login: new Date().toISOString() })
            .eq('email', email);

        const token = jwt.sign(
            { id: user.id, email: user.email, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role || 'user'
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ========== USERS API (Admin) ==========

// Get all users (Admin only)
app.get('/api/admin/users', authenticateToken, async (req, res) => {
    try {
        // Get users from Supabase
        const { data: users, error } = await supabase
            .from('users')
            .select('id, username, email, role, status, created_at, last_login')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, users: users || [] });
    } catch (error) {
        console.error('Error fetching users:', error);
        // Fallback to local DB
        const localUsers = db.users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            role: u.role || 'user',
            status: u.status || 'active',
            created_at: u.createdAt,
            last_login: null
        }));
        res.json({ success: true, users: localUsers });
    }
});

// Delete user (Admin only)
app.delete('/api/admin/users/:userId', authenticateToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Delete from Supabase
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        // Delete from local DB
        const userIndex = db.users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            db.users.splice(userIndex, 1);
            saveData();
        }

        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Failed to delete user' });
    }
});

// ========== FILES ENDPOINTS ==========

app.post('/api/files/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileData = {
            id: Date.now().toString(),
            name: file.originalname,
            size: file.size,
            type: file.mimetype,
            userId: req.user.id,
            uploadDate: new Date().toISOString()
        };

        // Store file data differently based on environment
        if (isVercel) {
            fileData.data = file.buffer.toString('base64');
        } else {
            fileData.filename = file.filename;
        }

        // Save to local DB
        db.files.push(fileData);
        saveData();

        // Save to Supabase
        try {
            await supabase
                .from('files')
                .insert([{
                    user_id: req.user.id,
                    name: file.originalname,
                    size: file.size,
                    type: file.mimetype,
                    path: isVercel ? 'memory' : file.filename,
                    uploaded_at: new Date().toISOString()
                }]);
        } catch (supabaseError) {
            console.error('Error saving file to Supabase:', supabaseError);
            // Continue anyway - local data is saved
        }

        res.json({
            success: true,
            file: fileData,
            message: 'File uploaded successfully'
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Upload failed' });
    }
});

app.get('/api/files/list', authenticateToken, async (req, res) => {
    try {
        // Try to get files from Supabase
        const { data: supabaseFiles, error } = await supabase
            .from('files')
            .select('*')
            .eq('user_id', req.user.id)
            .order('uploaded_at', { ascending: false });

        if (!error && supabaseFiles && supabaseFiles.length > 0) {
            const formattedFiles = supabaseFiles.map(f => ({
                id: f.id,
                name: f.name,
                size: f.size,
                type: f.type,
                userId: f.user_id,
                uploadDate: f.uploaded_at
            }));
            return res.json({ files: formattedFiles });
        }
    } catch (error) {
        console.error('Error fetching files from Supabase:', error);
    }

    // Fallback to local DB
    const userFiles = db.files.filter(f => f.userId === req.user.id);
    res.json({ files: userFiles });
});

app.delete('/api/files/delete/:id', authenticateToken, async (req, res) => {
    const fileId = req.params.id;

    try {
        // Delete from Supabase
        await supabase
            .from('files')
            .delete()
            .eq('id', fileId);
    } catch (error) {
        console.error('Error deleting file from Supabase:', error);
    }

    // Delete from local DB
    const fileIndex = db.files.findIndex(f => f.id === fileId && f.userId === req.user.id);

    if (fileIndex === -1) {
        return res.status(404).json({ message: 'File not found' });
    }

    // Delete physical file (local only)
    if (!isVercel) {
        const file = db.files[fileIndex];
        if (file.filename) {
            const filePath = path.join(uploadDir, file.filename);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }
    }

    db.files.splice(fileIndex, 1);
    saveData();

    res.json({ success: true, message: 'File deleted successfully' });
});

// ========== NOTES ENDPOINTS ==========

app.post('/api/notes/create', authenticateToken, async (req, res) => {
    const { title, content, category } = req.body;

    const note = {
        id: Date.now().toString(),
        title: title || 'Untitled',
        content: content || '',
        category: category || 'general',
        userId: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Save to local DB
    db.notes.push(note);
    saveData();

    // Save to Supabase
    try {
        await supabase
            .from('notes')
            .insert([{
                user_id: req.user.id,
                title: note.title,
                content: note.content,
                category: note.category,
                created_at: note.createdAt,
                updated_at: note.updatedAt
            }]);
    } catch (error) {
        console.error('Error saving note to Supabase:', error);
    }

    res.json({ success: true, note });
});

app.get('/api/notes/list', authenticateToken, async (req, res) => {
    try {
        // Try to get notes from Supabase
        const { data: supabaseNotes, error } = await supabase
            .from('notes')
            .select('*')
            .eq('user_id', req.user.id)
            .order('updated_at', { ascending: false });

        if (!error && supabaseNotes && supabaseNotes.length > 0) {
            const formattedNotes = supabaseNotes.map(n => ({
                id: n.id,
                title: n.title,
                content: n.content,
                category: n.category,
                userId: n.user_id,
                createdAt: n.created_at,
                updatedAt: n.updated_at
            }));
            return res.json({ notes: formattedNotes });
        }
    } catch (error) {
        console.error('Error fetching notes from Supabase:', error);
    }

    // Fallback to local DB
    const userNotes = db.notes.filter(n => n.userId === req.user.id);
    res.json({ notes: userNotes });
});

app.put('/api/notes/update/:id', authenticateToken, async (req, res) => {
    const noteId = req.params.id;
    const { title, content, category } = req.body;

    const noteIndex = db.notes.findIndex(n => n.id === noteId && n.userId === req.user.id);

    if (noteIndex === -1) {
        return res.status(404).json({ message: 'Note not found' });
    }

    db.notes[noteIndex] = {
        ...db.notes[noteIndex],
        title: title || db.notes[noteIndex].title,
        content: content || db.notes[noteIndex].content,
        category: category || db.notes[noteIndex].category,
        updatedAt: new Date().toISOString()
    };

    saveData();

    // Update in Supabase
    try {
        await supabase
            .from('notes')
            .update({
                title: db.notes[noteIndex].title,
                content: db.notes[noteIndex].content,
                category: db.notes[noteIndex].category,
                updated_at: db.notes[noteIndex].updatedAt
            })
            .eq('id', noteId);
    } catch (error) {
        console.error('Error updating note in Supabase:', error);
    }

    res.json({ success: true, note: db.notes[noteIndex] });
});

app.delete('/api/notes/delete/:id', authenticateToken, async (req, res) => {
    const noteId = req.params.id;
    const noteIndex = db.notes.findIndex(n => n.id === noteId && n.userId === req.user.id);

    if (noteIndex === -1) {
        return res.status(404).json({ message: 'Note not found' });
    }

    db.notes.splice(noteIndex, 1);
    saveData();

    // Delete from Supabase
    try {
        await supabase
            .from('notes')
            .delete()
            .eq('id', noteId);
    } catch (error) {
        console.error('Error deleting note from Supabase:', error);
    }

    res.json({ success: true, message: 'Note deleted successfully' });
});

// ========== TASKS ENDPOINTS ==========

app.post('/api/tasks/create', authenticateToken, async (req, res) => {
    const { title, description, dueDate, priority, status } = req.body;

    const task = {
        id: Date.now().toString(),
        title,
        description: description || '',
        dueDate: dueDate || null,
        priority: priority || 'medium',
        status: status || 'pending',
        userId: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    // Save to local DB
    db.tasks.push(task);
    saveData();

    // Save to Supabase
    try {
        await supabase
            .from('tasks')
            .insert([{
                user_id: req.user.id,
                title: task.title,
                description: task.description,
                priority: task.priority,
                status: task.status,
                due_date: task.dueDate,
                created_at: task.createdAt
            }]);
    } catch (error) {
        console.error('Error saving task to Supabase:', error);
    }

    res.json({ success: true, task });
});

app.get('/api/tasks/list', authenticateToken, async (req, res) => {
    try {
        // Try to get tasks from Supabase
        const { data: supabaseTasks, error } = await supabase
            .from('tasks')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (!error && supabaseTasks && supabaseTasks.length > 0) {
            const formattedTasks = supabaseTasks.map(t => ({
                id: t.id,
                title: t.title,
                description: t.description,
                priority: t.priority,
                status: t.status,
                dueDate: t.due_date,
                userId: t.user_id,
                createdAt: t.created_at,
                updatedAt: t.updated_at || t.created_at
            }));
            return res.json({ tasks: formattedTasks });
        }
    } catch (error) {
        console.error('Error fetching tasks from Supabase:', error);
    }

    // Fallback to local DB
    const userTasks = db.tasks.filter(t => t.userId === req.user.id);
    res.json({ tasks: userTasks });
});

app.put('/api/tasks/update/:id', authenticateToken, async (req, res) => {
    const taskId = req.params.id;
    const updates = req.body;

    const taskIndex = db.tasks.findIndex(t => t.id === taskId && t.userId === req.user.id);

    if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
    }

    db.tasks[taskIndex] = {
        ...db.tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString()
    };

    saveData();

    // Update in Supabase
    try {
        await supabase
            .from('tasks')
            .update({
                title: db.tasks[taskIndex].title,
                description: db.tasks[taskIndex].description,
                priority: db.tasks[taskIndex].priority,
                status: db.tasks[taskIndex].status,
                due_date: db.tasks[taskIndex].dueDate
            })
            .eq('id', taskId);
    } catch (error) {
        console.error('Error updating task in Supabase:', error);
    }

    res.json({ success: true, task: db.tasks[taskIndex] });
});

app.delete('/api/tasks/delete/:id', authenticateToken, async (req, res) => {
    const taskId = req.params.id;
    const taskIndex = db.tasks.findIndex(t => t.id === taskId && t.userId === req.user.id);

    if (taskIndex === -1) {
        return res.status(404).json({ message: 'Task not found' });
    }

    db.tasks.splice(taskIndex, 1);
    saveData();

    // Delete from Supabase
    try {
        await supabase
            .from('tasks')
            .delete()
            .eq('id', taskId);
    } catch (error) {
        console.error('Error deleting task from Supabase:', error);
    }

    res.json({ success: true, message: 'Task deleted successfully' });
});

// ========== MIGRATION ENDPOINT ==========

// Migrate localStorage data to Supabase
app.post('/api/migrate', authenticateToken, async (req, res) => {
    try {
        const { data } = req.body;
        let count = 0;

        // Migrate files
        if (data.files && data.files.length > 0) {
            for (const file of data.files) {
                const { error } = await supabase.from('files').insert([{
                    user_id: req.user.id,
                    name: file.name || 'Untitled',
                    size: file.size || 0,
                    type: file.type || 'unknown',
                    path: file.path || '',
                    sha256: file.sha256 || '',
                    uploaded_at: file.uploaded_at || new Date().toISOString()
                }]);
                if (!error) count++;
            }
        }

        // Migrate notes
        if (data.notes && data.notes.length > 0) {
            for (const note of data.notes) {
                const { error } = await supabase.from('notes').insert([{
                    user_id: req.user.id,
                    title: note.title || 'Untitled',
                    content: note.content || '',
                    category: note.category || 'General',
                    pinned: note.pinned || false,
                    created_at: note.created_at || new Date().toISOString(),
                    updated_at: note.updated_at || new Date().toISOString()
                }]);
                if (!error) count++;
            }
        }

        // Migrate tasks
        if (data.tasks && data.tasks.length > 0) {
            for (const task of data.tasks) {
                const { error } = await supabase.from('tasks').insert([{
                    user_id: req.user.id,
                    title: task.title || 'Untitled Task',
                    description: task.description || '',
                    priority: task.priority || 'medium',
                    status: task.status || 'pending',
                    due_date: task.due_date || null,
                    created_at: task.created_at || new Date().toISOString()
                }]);
                if (!error) count++;
            }
        }

        // Migrate bookmarks
        if (data.bookmarks && data.bookmarks.length > 0) {
            for (const bookmark of data.bookmarks) {
                const { error } = await supabase.from('bookmarks').insert([{
                    user_id: req.user.id,
                    url: bookmark.url || '',
                    title: bookmark.title || 'Untitled',
                    category: bookmark.category || 'General',
                    favicon: bookmark.favicon || '',
                    created_at: bookmark.created_at || new Date().toISOString()
                }]);
                if (!error) count++;
            }
        }

        res.json({ success: true, message: `Migrated ${count} items to database!`, count });

    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ error: 'Migration failed: ' + error.message });
    }
});

// ========== HEALTH CHECK ==========

app.get('/api/health', async (req, res) => {
    let supabaseStatus = 'connected';
    try {
        const { data, error } = await supabase.from('users').select('count').limit(1);
        if (error) supabaseStatus = 'error';
    } catch (error) {
        supabaseStatus = 'disconnected';
    }

    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: isVercel ? 'vercel' : 'local',
        supabase: supabaseStatus
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// 404 handler for all other routes
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// ============================================
// EXPORT FOR VERCEL
// ============================================
module.exports = app;

// Start server (only locally)
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 ALAN VAULT SERVER STARTED SUCCESSFULLY!         ║
║                                                       ║
║   📍 Local:    http://localhost:${PORT}                 ║
║   📁 Root:     ${__dirname.substring(0, 40)}...  ║
║   🟢 Status:   Running                               ║
║   📦 Mode:    ${isVercel ? 'Vercel' : 'Local'} + Supabase    ║
║   🗄️ Database: Supabase + Local Fallback              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
        `);
    });
}