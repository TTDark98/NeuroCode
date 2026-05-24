const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'neuro_session_jwt_secret_token_key_2026';

// Enable CORS and body parsers
app.use(cors());
app.use(express.json());

// ═══════════════════════════════════════
// DATABASE CONFIGURATION & CONNECTION
// ═══════════════════════════════════════
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'neuro_admin',
    password: process.env.DB_PASSWORD || 'neuro_secure_pass_2026',
    database: process.env.DB_NAME || 'neurocode',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Test connection on startup
pool.query('SELECT 1')
    .then(() => console.log('✔ Connected to MariaDB database successfully.'))
    .catch((err) => {
        console.error('✘ Failed to connect to MariaDB database:', err.message);
        process.exit(1);
    });

// ═══════════════════════════════════════
// AUTHENTICATION MIDDLEWARE
// ═══════════════════════════════════════
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(400).json({ error: 'Invalid Authorization header format. Must be "Bearer <token>"' });
    }

    const token = parts[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach user payload ({ id, email }) to request
        next();
    } catch (err) {
        return res.status(403).json({ error: 'Session expired or invalid authentication token.' });
    }
}

// ═══════════════════════════════════════
// API ROUTES: USER AUTHENTICATION
// ═══════════════════════════════════════

// Register a new user
app.post('/api/auth/register', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please enter all fields.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    try {
        // Check if user already exists
        const [users] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
        if (users.length > 0) {
            return res.status(400).json({ error: 'An account with this email address already exists.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        // Insert new user
        const [result] = await pool.query(
            'INSERT INTO users (email, password_hash, visualizer_runs) VALUES (?, ?, 0)',
            [email, passwordHash]
        );

        res.status(201).json({
            message: 'Registration successful!',
            user: { id: result.insertId, email }
        });
    } catch (err) {
        console.error('Registration API Error:', err);
        res.status(500).json({ error: 'Server database error. Please try again.' });
    }
});

// Authenticate user & return JWT token
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Please enter all fields.' });
    }

    try {
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(400).json({ error: 'Invalid user credentials.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: 'Invalid user credentials.' });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email }
        });
    } catch (err) {
        console.error('Login API Error:', err);
        res.status(500).json({ error: 'Server database error. Please try again.' });
    }
});

// Verify current JWT token & return stats
app.get('/api/auth/verify', authMiddleware, async (req, res) => {
    try {
        const [users] = await pool.query('SELECT id, email, visualizer_runs, created_at FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User account not found.' });
        }
        res.json(users[0]);
    } catch (err) {
        console.error('Verify API Error:', err);
        res.status(500).json({ error: 'Server database error.' });
    }
});

// ═══════════════════════════════════════
// API ROUTES: SAVED PROJECTS / ALGORITHMS
// ═══════════════════════════════════════

// Get all saved projects/algorithms for the authenticated user
app.get('/api/projects', authMiddleware, async (req, res) => {
    try {
        const [projects] = await pool.query(
            'SELECT id, name, code, input_data, visualization_type, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
            [req.user.id]
        );
        res.json(projects);
    } catch (err) {
        console.error('Get Projects API Error:', err);
        res.status(500).json({ error: 'Failed to fetch saved projects.' });
    }
});

// Save or update custom algorithm project
app.post('/api/projects', authMiddleware, async (req, res) => {
    const { name, code, input_data, visualization_type } = req.body;

    if (!name || !code) {
        return res.status(400).json({ error: 'Project name and source code are required.' });
    }

    try {
        // Check if project with the same name already exists for this user
        const [existing] = await pool.query(
            'SELECT id FROM projects WHERE user_id = ? AND name = ?',
            [req.user.id, name]
        );

        if (existing.length > 0) {
            // Update existing project
            const projectId = existing[0].id;
            await pool.query(
                'UPDATE projects SET code = ?, input_data = ?, visualization_type = ? WHERE id = ?',
                [code, input_data, visualization_type || 'bars', projectId]
            );
            res.json({ message: 'Project updated successfully!', id: projectId });
        } else {
            // Insert new project
            const [result] = await pool.query(
                'INSERT INTO projects (user_id, name, code, input_data, visualization_type) VALUES (?, ?, ?, ?, ?)',
                [req.user.id, name, code, input_data, visualization_type || 'bars']
            );
            res.status(201).json({ message: 'Project saved successfully!', id: result.insertId });
        }
    } catch (err) {
        console.error('Save Project API Error:', err);
        res.status(500).json({ error: 'Failed to save project.' });
    }
});

// Delete a project
app.delete('/api/projects/:id', authMiddleware, async (req, res) => {
    const projectId = req.params.id;

    try {
        const [result] = await pool.query(
            'DELETE FROM projects WHERE id = ? AND user_id = ?',
            [projectId, req.user.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Project not found or unauthorized.' });
        }

        res.json({ message: 'Project deleted successfully!' });
    } catch (err) {
        console.error('Delete Project API Error:', err);
        res.status(500).json({ error: 'Failed to delete project.' });
    }
});

// ═══════════════════════════════════════
// API ROUTES: VISUALIZATION TRACKING
// ═══════════════════════════════════════

// Increment user visualizer runs count
app.post('/api/users/increment-runs', authMiddleware, async (req, res) => {
    try {
        await pool.query(
            'UPDATE users SET visualizer_runs = visualizer_runs + 1 WHERE id = ?',
            [req.user.id]
        );

        const [users] = await pool.query('SELECT visualizer_runs FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        res.json({ visualizer_runs: users[0].visualizer_runs });
    } catch (err) {
        console.error('Increment Runs API Error:', err);
        res.status(500).json({ error: 'Failed to increment visualizer execution count.' });
    }
});

// ═══════════════════════════════════════
// SERVE STATIC CLIENT & SPA FALLBACK
// ═══════════════════════════════════════
app.use(express.static(path.join(__dirname)));

// Express 5 route compatibility: Matches any route and redirects to dashboard (except APIs)
app.get('/{*splat}', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
        return next();
    }
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start listening
app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🧠 NeuroCode Consolidated Server on http://localhost:${PORT}`);
    console.log(`====================================================`);
});
