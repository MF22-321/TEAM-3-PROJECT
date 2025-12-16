const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Simple JSON file database
const DB_FILE = './database.json';

// Initialize database
function initializeDatabase() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [],
            inventory: []
        };

        // Create default admin user
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        initialData.users.push({
            id: 1,
            username: 'admin',
            password: hashedPassword,
            role: 'admin'
        });

        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
        console.log('Database initialized with default admin user.');
    } else {
        console.log('Database file exists.');
    }
}

// Database helper functions
function readDatabase() {
    try {
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        return { users: [], inventory: [] };
    }
}

function writeDatabase(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing database:', error);
    }
}

// Initialize database on startup
initializeDatabase();

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
    const data = readDatabase();
    const user = data.users.find(u => u.username === username);

    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        res.redirect('/');
    } else {
        res.render('login', { error: 'Invalid credentials' });
    }
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
    const data = readDatabase();
    res.json(data.inventory);
});

app.post('/api/inventory', requireAuth, (req, res) => {
    const { name, description, quantity, price } = req.body;
    const data = readDatabase();

    const newItem = {
        id: data.inventory.length + 1,
        name: name,
        description: description || '',
        quantity: parseInt(quantity),
        price: parseFloat(price),
        created_at: new Date().toISOString()
    };

    data.inventory.push(newItem);
    writeDatabase(data);
    res.json({ id: newItem.id });
});

app.put('/api/inventory/:id', requireAuth, (req, res) => {
    const { name, description, quantity, price } = req.body;
    const data = readDatabase();
    const itemId = parseInt(req.params.id);

    const itemIndex = data.inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }

    data.inventory[itemIndex] = {
        ...data.inventory[itemIndex],
        name: name,
        description: description || '',
        quantity: parseInt(quantity),
        price: parseFloat(price)
    };

    writeDatabase(data);
    res.json({ changes: 1 });
});

app.delete('/api/inventory/:id', requireAuth, requireAdmin, (req, res) => {
    const data = readDatabase();
    const itemId = parseInt(req.params.id);

    const itemIndex = data.inventory.findIndex(item => item.id === itemId);
    if (itemIndex === -1) {
        return res.status(404).json({ error: 'Item not found' });
    }

    data.inventory.splice(itemIndex, 1);
    writeDatabase(data);
    res.json({ changes: 1 });
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