const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const db = new sqlite3.Database('./inventory.db', (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'member'
        )`);

        // Inventory table
        db.run(`CREATE TABLE IF NOT EXISTS inventory (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            quantity INTEGER NOT NULL,
            price REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )`);

        // Insert default admin user
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.run(`INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)`,
            ['admin', hashedPassword, 'admin']);
    });
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false
}));
app.use(express.static(path.join(__dirname, 'public')));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware to check authentication
function requireAuth(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login');
}

// Middleware to check admin role
function requireAdmin(req, res, next) {
    if (req.session.role === 'admin') {
        return next();
    }
    res.status(403).send('Access denied');
}

// Routes
app.get('/', requireAuth, (req, res) => {
    res.render('index', { user: req.session.username, role: req.session.role });
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            return res.status(500).send('Database error');
        }
        if (user && bcrypt.compareSync(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            res.redirect('/');
        } else {
            res.render('login', { error: 'Invalid credentials' });
        }
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/password', (req, res) => {
    res.render('password');
});

app.post('/register', (req, res) => {
    const { username, password, role } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        [username, hashedPassword, role || 'member'], function(err) {
        if (err) {
            return res.render('register', { error: 'Username already exists' });
        }
        res.redirect('/login');
    });
});

// Inventory API routes
app.get('/api/inventory', requireAuth, (req, res) => {
    db.all('SELECT * FROM inventory', [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post('/api/inventory', requireAuth, (req, res) => {
    const { name, description, quantity, price } = req.body;
    db.run('INSERT INTO inventory (name, description, quantity, price) VALUES (?, ?, ?, ?)',
        [name, description, quantity, price], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ id: this.lastID });
    });
});

app.put('/api/inventory/:id', requireAuth, (req, res) => {
    const { name, description, quantity, price } = req.body;
    db.run('UPDATE inventory SET name = ?, description = ?, quantity = ?, price = ? WHERE id = ?',
        [name, description, quantity, price, req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ changes: this.changes });
    });
});

app.delete('/api/inventory/:id', requireAuth, requireAdmin, (req, res) => {
    db.run('DELETE FROM inventory WHERE id = ?', [req.params.id], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ changes: this.changes });
    });
});

// Page routes
app.get('/inventory', requireAuth, (req, res) => {
    res.render('inventory', { user: req.session.username, role: req.session.role });
});

app.get('/inventory-add', requireAuth, (req, res) => {
    res.render('inventoryAdd', { user: req.session.username, role: req.session.role });
});

// Add more routes as needed...

// app.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server running on port ${PORT}`);
//     console.log(`Local access: http://localhost:${PORT}`);
//     console.log(`Network access: http://YOUR_IP_ADDRESS:${PORT}`);
//     console.log('Replace YOUR_IP_ADDRESS with your computer\'s IP address');
// });

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});