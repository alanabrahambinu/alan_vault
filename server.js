const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the current directory (where server.js is located)
app.use(express.static(__dirname));

// Also serve files from public directory if it exists (for backward compatibility)
if (fs.existsSync('./public')) {
    app.use(express.static('public'));
}

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// Ensure uploads directory exists
const uploadDir = './uploads/';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Ensure database directory exists
const dbDir = './database/';
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 }
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// In-memory database
const db = {
    users: [],
    files: [],
    notes: [],
    tasks: [],
    sessions: []
};

// Load initial data if exists
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

// Save data functions
function saveData() {
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

// Serve HTML files
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

// API Routes

// Auth endpoints
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (db.users.find(u => u.email === email)) {
            return res.status(400).json({ message: 'User already exists' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        
        const user = {
            id: Date.now().toString(),
            username,
            email,
            password: hashedPassword,
            createdAt: new Date().toISOString(),
            storageUsed: 0
        };
        
        db.users.push(user);
        saveData();
        
        res.status(201).json({ 
            success: true, 
            message: 'User created successfully' 
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = db.users.find(u => u.email === email);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
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
                email: user.email
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

// File endpoints
app.post('/api/files/upload', authenticateToken, upload.single('file'), (req, res) => {
    try {
        const file = req.file;
        const fileData = {
            id: Date.now().toString(),
            name: file.originalname,
            filename: file.filename,
            size: file.size,
            type: file.mimetype,
            userId: req.user.id,
            uploadDate: new Date().toISOString()
        };
        
        db.files.push(fileData);
        saveData();
        
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

app.get('/api/files/list', authenticateToken, (req, res) => {
    const userFiles = db.files.filter(f => f.userId === req.user.id);
    res.json({ files: userFiles });
});

app.delete('/api/files/delete/:id', authenticateToken, (req, res) => {
    const fileId = req.params.id;
    const fileIndex = db.files.findIndex(f => f.id === fileId && f.userId === req.user.id);
    
    if (fileIndex === -1) {
        return res.status(404).json({ message: 'File not found' });
    }
    
    const file = db.files[fileIndex];
    const filePath = path.join(uploadDir, file.filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    
    db.files.splice(fileIndex, 1);
    saveData();
    
    res.json({ success: true, message: 'File deleted successfully' });
});

// Notes endpoints
app.post('/api/notes/create', authenticateToken, (req, res) => {
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
    
    db.notes.push(note);
    saveData();
    
    res.json({ success: true, note });
});

app.get('/api/notes/list', authenticateToken, (req, res) => {
    const userNotes = db.notes.filter(n => n.userId === req.user.id);
    res.json({ notes: userNotes });
});

app.put('/api/notes/update/:id', authenticateToken, (req, res) => {
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
    res.json({ success: true, note: db.notes[noteIndex] });
});

// Tasks endpoints
app.post('/api/tasks/create', authenticateToken, (req, res) => {
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
    
    db.tasks.push(task);
    saveData();
    
    res.json({ success: true, task });
});

app.get('/api/tasks/list', authenticateToken, (req, res) => {
    const userTasks = db.tasks.filter(t => t.userId === req.user.id);
    res.json({ tasks: userTasks });
});

app.put('/api/tasks/update/:id', authenticateToken, (req, res) => {
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
    res.json({ success: true, task: db.tasks[taskIndex] });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// 404 handler for all other routes (serves 404.html)
app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, '404.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
    ╔═══════════════════════════════════════════════════════╗
    ║                                                       ║
    ║   🚀 ALAN VAULT SERVER STARTED SUCCESSFULLY!         ║
    ║                                                       ║
    ║   📍 Local:    http://localhost:${PORT}                 ║
    ║   📁 Root:     ${__dirname.substring(0, 40)}...  ║
    ║   🟢 Status:   Running                               ║
    ║                                                       ║
    ╚═══════════════════════════════════════════════════════╝
    `);
});