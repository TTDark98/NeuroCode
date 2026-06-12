const express = require('express');
const cors = require('cors');
const path = require('path');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
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
const poolConfig = {
    user: process.env.DB_USER || 'neuro_admin',
    password: process.env.DB_PASSWORD || 'neuro_secure_pass_2026',
    database: process.env.DB_NAME || 'neurocode',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

if (process.env.DB_SOCKET) {
    poolConfig.socketPath = process.env.DB_SOCKET;
} else if (fs.existsSync('/tmp/mysql.sock')) {
    poolConfig.socketPath = '/tmp/mysql.sock';
} else {
    poolConfig.host = process.env.DB_HOST || 'localhost';
    poolConfig.port = process.env.DB_PORT || 3306;
}

const pool = mysql.createPool(poolConfig);

// Test connection on startup
pool.query('SELECT 1')
    .then(async () => {
        console.log('✔ Connected to MariaDB database successfully.');
        try {
            // Update users table
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS name VARCHAR(255) NULL');
            await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar LONGTEXT NULL');
            
            // Create user_activity_log
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_activity_log (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    user_id INT NOT NULL,
                    activity_type ENUM('save_project', 'run_visualizer', 'share_project', 'upvote_project') NOT NULL,
                    activity_date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_user_date (user_id, activity_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            // Create badges
            await pool.query(`
                CREATE TABLE IF NOT EXISTS badges (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    name VARCHAR(100) UNIQUE NOT NULL,
                    description VARCHAR(255) NOT NULL,
                    icon VARCHAR(50) NOT NULL,
                    color_theme VARCHAR(50) NOT NULL,
                    rule_type ENUM('total_runs', 'total_projects', 'total_shares', 'total_time') NOT NULL,
                    rule_threshold INT NOT NULL
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            // Create user_badges
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_badges (
                    user_id INT NOT NULL,
                    badge_id INT NOT NULL,
                    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (user_id, badge_id),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            // Create user_streaks
            await pool.query(`
                CREATE TABLE IF NOT EXISTS user_streaks (
                    user_id INT PRIMARY KEY,
                    current_streak INT DEFAULT 1,
                    longest_streak INT DEFAULT 1,
                    last_activity_date DATE NOT NULL,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);

            // Seed default badges if empty
            const [badgeCount] = await pool.query('SELECT COUNT(*) as count FROM badges');
            if (badgeCount[0].count === 0) {
                const defaultBadges = [
                    ['First Steps', 'Run your first algorithm visualization.', 'play_circle', 'badge-blue', 'total_runs', 1],
                    ['Code Sculptor', 'Save 5 custom algorithm projects.', 'design_services', 'badge-purple', 'total_projects', 5],
                    ['Community Beacon', 'Publish an algorithm to the shared gallery.', 'share', 'badge-orange', 'total_shares', 1],
                    ['Marathoner', 'Spend 1 hour active learning on the platform.', 'hourglass_empty', 'badge-gold', 'total_time', 3600]
                ];
                for (const badge of defaultBadges) {
                    await pool.query(
                        'INSERT INTO badges (name, description, icon, color_theme, rule_type, rule_threshold) VALUES (?, ?, ?, ?, ?, ?)',
                        badge
                    );
                }
                console.log('✔ Default badges seeded successfully.');
            }

            // Expand activity_type ENUM to include bootstrap_generated
            try {
                await pool.query(`
                    ALTER TABLE user_activity_log 
                    MODIFY COLUMN activity_type ENUM('save_project', 'run_visualizer', 'share_project', 'upvote_project', 'bootstrap_generated') NOT NULL
                `);
            } catch (e) {
                // Ignore if already modified or column doesn't exist yet
            }

            console.log('✔ Database schema verified/updated.');

            // Bootstrap activity log for development
            await bootstrapActivityLog();
        } catch (e) {
            console.error('✘ Failed to run schema migrations:', e.message);
        }
    })
    .catch((err) => {
        console.error('✘ Failed to connect to MariaDB database:', err);
        process.exit(1);
    });

/**
 * Bootstrap Activity Log
 * Generates realistic activity history from existing project data.
 * Runs ONLY when user_activity_log is completely empty.
 * Records are marked with activity_type = 'bootstrap_generated'.
 */
async function bootstrapActivityLog() {
    try {
        // 1. Check if activity log already has records
        const [countResult] = await pool.query('SELECT COUNT(*) as count FROM user_activity_log');
        if (countResult[0].count > 0) {
            return; // Real or bootstrap data exists — never regenerate
        }

        // 2. Check if there's a user to bootstrap for
        const [users] = await pool.query('SELECT id, created_at, visualizer_runs FROM users ORDER BY id ASC LIMIT 1');
        if (users.length === 0) {
            return; // No users yet
        }
        const userId = users[0].id;
        const userCreatedAt = new Date(users[0].created_at);
        const visualizerRuns = users[0].visualizer_runs || 0;

        // 3. Fetch all projects for this user
        const [projects] = await pool.query(
            'SELECT id, name, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY created_at ASC',
            [userId]
        );

        if (projects.length === 0) {
            return; // No projects to derive activity from
        }

        console.log(`⏳ Bootstrapping activity log for user ${userId} from ${projects.length} projects...`);

        const activityRows = []; // [user_id, activity_type, activity_date]
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Helper: format date as YYYY-MM-DD
        function fmt(d) {
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }

        // Helper: random int between min and max (inclusive)
        function randInt(min, max) {
            return Math.floor(Math.random() * (max - min + 1)) + min;
        }

        // Helper: random date between two dates
        function randomDateBetween(start, end) {
            const s = start.getTime();
            const e = end.getTime();
            if (e <= s) return new Date(s);
            return new Date(s + Math.random() * (e - s));
        }

        // Track which dates have activity to compute realistic streaks
        const activeDates = new Set();

        // 4. Generate activity from each project
        for (const project of projects) {
            const createdAt = new Date(project.created_at);
            const updatedAt = new Date(project.updated_at);

            // a) save_project on creation date
            const createDate = fmt(createdAt);
            activityRows.push([userId, 'save_project', createDate]);
            activeDates.add(createDate);

            // b) save_project on update date (if different from creation)
            const updateDate = fmt(updatedAt);
            if (updateDate !== createDate) {
                activityRows.push([userId, 'save_project', updateDate]);
                activeDates.add(updateDate);
            }

            // c) run_visualizer events around creation (likely tested after saving)
            const vizCount = randInt(1, 3);
            for (let v = 0; v < vizCount; v++) {
                const vizDate = new Date(createdAt);
                vizDate.setDate(vizDate.getDate() + randInt(0, 2));
                if (vizDate <= today) {
                    const d = fmt(vizDate);
                    activityRows.push([userId, 'run_visualizer', d]);
                    activeDates.add(d);
                }
            }

            // d) Distribute additional activity events between creation and last modification
            const diffDays = Math.ceil((updatedAt - createdAt) / (1000 * 60 * 60 * 24));
            if (diffDays > 3) {
                // Number of extra activity days based on project age span
                const extraDays = Math.min(randInt(2, Math.ceil(diffDays / 5)), 15);
                for (let e = 0; e < extraDays; e++) {
                    const randDate = randomDateBetween(createdAt, updatedAt);
                    if (randDate <= today) {
                        const d = fmt(randDate);
                        // Weighted: 60% low (1-2 events), 30% medium (3-5), 10% high (6-10)
                        const roll = Math.random();
                        let eventCount;
                        if (roll < 0.6) eventCount = randInt(1, 2);
                        else if (roll < 0.9) eventCount = randInt(3, 5);
                        else eventCount = randInt(6, 10);

                        for (let ev = 0; ev < eventCount; ev++) {
                            const actTypes = ['save_project', 'run_visualizer', 'save_project', 'run_visualizer', 'share_project'];
                            const aType = actTypes[randInt(0, actTypes.length - 1)];
                            activityRows.push([userId, aType, d]);
                        }
                        activeDates.add(d);
                    }
                }
            }
        }

        // 5. Add visualizer run events spread across the user's lifetime
        if (visualizerRuns > 0) {
            const vizStartDate = userCreatedAt > new Date(today.getFullYear(), 0, 1) ? userCreatedAt : new Date(today.getFullYear(), 0, 1);
            const spreadRuns = Math.min(visualizerRuns, 30); // Cap at 30 extra spread events
            for (let r = 0; r < spreadRuns; r++) {
                const rd = randomDateBetween(vizStartDate, today);
                if (rd <= today) {
                    const d = fmt(rd);
                    activityRows.push([userId, 'run_visualizer', d]);
                    activeDates.add(d);
                }
            }
        }

        // 6. Mark all rows as bootstrap_generated and insert
        // Replace actual types with bootstrap_generated so they're identifiable
        const bootstrapRows = activityRows.map(([uid, , date]) => [uid, 'bootstrap_generated', date]);

        if (bootstrapRows.length === 0) {
            return;
        }

        // Batch insert for performance
        const placeholders = bootstrapRows.map(() => '(?, ?, ?)').join(', ');
        const flatValues = bootstrapRows.flat();
        await pool.query(
            `INSERT INTO user_activity_log (user_id, activity_type, activity_date) VALUES ${placeholders}`,
            flatValues
        );

        // 7. Compute and set streak data from bootstrapped dates
        const sortedDates = Array.from(activeDates).sort();
        if (sortedDates.length > 0) {
            let currentStreak = 1;
            let longestStreak = 1;
            let tempStreak = 1;

            for (let i = 1; i < sortedDates.length; i++) {
                const prev = new Date(sortedDates[i - 1]);
                const curr = new Date(sortedDates[i]);
                const diff = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
                if (diff === 1) {
                    tempStreak++;
                    longestStreak = Math.max(longestStreak, tempStreak);
                } else if (diff > 1) {
                    tempStreak = 1;
                }
            }

            // Check if streak reaches today
            const lastDate = new Date(sortedDates[sortedDates.length - 1]);
            const todayStr = fmt(today);
            const yesterdayStr = fmt(new Date(today.getTime() - 86400000));
            if (sortedDates[sortedDates.length - 1] === todayStr || sortedDates[sortedDates.length - 1] === yesterdayStr) {
                currentStreak = tempStreak;
            } else {
                currentStreak = 0;
            }

            await pool.query(
                `INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date) 
                 VALUES (?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE current_streak = VALUES(current_streak), longest_streak = VALUES(longest_streak), last_activity_date = VALUES(last_activity_date)`,
                [userId, currentStreak, longestStreak, sortedDates[sortedDates.length - 1]]
            );
        }

        console.log(`✔ Bootstrapped ${bootstrapRows.length} activity records across ${activeDates.size} days for user ${userId}.`);
    } catch (err) {
        console.error('✘ Bootstrap activity log error:', err.message);
    }
}

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
        const [users] = await pool.query('SELECT id, email, name, avatar, visualizer_runs, time_spent, created_at FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User account not found.' });
        }
        res.json(users[0]);
    } catch (err) {
        console.error('Verify API Error:', err);
        res.status(500).json({ error: 'Server database error.' });
    }
});

// Update profile details (name, password, avatar)
app.put('/api/auth/profile', authMiddleware, async (req, res) => {
    const { name, password, avatar } = req.body;
    const userId = req.user.id;

    try {
        let updateFields = [];
        let params = [];

        if (name !== undefined) {
            updateFields.push('name = ?');
            params.push(name);
        }

        if (avatar !== undefined) {
            updateFields.push('avatar = ?');
            params.push(avatar);
        }

        if (password !== undefined && password !== '') {
            if (password.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
            }
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(password, salt);
            updateFields.push('password_hash = ?');
            params.push(passwordHash);
        }

        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No fields to update.' });
        }

        params.push(userId);
        const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
        await pool.query(query, params);

        // Fetch updated user
        const [users] = await pool.query('SELECT id, email, name, avatar, visualizer_runs, time_spent, created_at FROM users WHERE id = ?', [userId]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User account not found.' });
        }

        res.json({
            message: 'Profile updated successfully!',
            user: users[0]
        });
    } catch (err) {
        console.error('Update Profile API Error:', err);
        res.status(500).json({ error: 'Failed to update profile.' });
    }
});

// Delete user account
app.delete('/api/auth/profile', authMiddleware, async (req, res) => {
    const userId = req.user.id;

    try {
        await pool.query('DELETE FROM users WHERE id = ?', [userId]);
        res.json({ message: 'Account deleted successfully.' });
    } catch (err) {
        console.error('Delete Account API Error:', err);
        res.status(500).json({ error: 'Failed to delete account.' });
    }
});

// ═══════════════════════════════════════
// API ROUTES: SAVED PROJECTS / ALGORITHMS
// ═══════════════════════════════════════

// Get all saved projects/algorithms for the authenticated user
app.get('/api/projects', authMiddleware, async (req, res) => {
    try {
        const [projects] = await pool.query(
            'SELECT id, name, code, input_data, visualization_type, steps_json, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC',
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
    const { name, code, input_data, visualization_type, steps_json } = req.body;

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
                'UPDATE projects SET code = ?, input_data = ?, visualization_type = ?, steps_json = ? WHERE id = ?',
                [code, input_data, visualization_type || 'bars', steps_json || null, projectId]
            );
            logUserActivity(req.user.id, 'save_project').catch(err => console.error(err));
            res.json({ message: 'Project updated successfully!', id: projectId });
        } else {
            // Insert new project
            const [result] = await pool.query(
                'INSERT INTO projects (user_id, name, code, input_data, visualization_type, steps_json) VALUES (?, ?, ?, ?, ?, ?)',
                [req.user.id, name, code, input_data, visualization_type || 'bars', steps_json || null]
            );
            logUserActivity(req.user.id, 'save_project').catch(err => console.error(err));
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

// Helper functions for user activity logs, streaks and achievements/badges
async function checkAndUnlockBadges(userId) {
    try {
        const [projectCountRow] = await pool.query('SELECT COUNT(*) as count FROM projects WHERE user_id = ?', [userId]);
        const [userRow] = await pool.query('SELECT visualizer_runs, time_spent FROM users WHERE id = ?', [userId]);
        
        const totalProjects = projectCountRow[0] ? projectCountRow[0].count : 0;
        const totalRuns = userRow.length > 0 ? userRow[0].visualizer_runs : 0;
        const totalTime = userRow.length > 0 ? userRow[0].time_spent : 0;

        const [sharesRow] = await pool.query('SELECT COUNT(*) as count FROM projects WHERE user_id = ? AND steps_json IS NOT NULL', [userId]);
        const totalShares = sharesRow[0] ? sharesRow[0].count : 0;

        const [unlockedBadges] = await pool.query('SELECT badge_id FROM user_badges WHERE user_id = ?', [userId]);
        const unlockedIds = unlockedBadges.map(b => b.badge_id);

        const [allBadges] = await pool.query('SELECT * FROM badges');
        for (const badge of allBadges) {
            if (unlockedIds.includes(badge.id)) continue;

            let conditionMet = false;
            if (badge.rule_type === 'total_runs' && totalRuns >= badge.rule_threshold) {
                conditionMet = true;
            } else if (badge.rule_type === 'total_projects' && totalProjects >= badge.rule_threshold) {
                conditionMet = true;
            } else if (badge.rule_type === 'total_shares' && totalShares >= badge.rule_threshold) {
                conditionMet = true;
            } else if (badge.rule_type === 'total_time' && totalTime >= badge.rule_threshold) {
                conditionMet = true;
            }

            if (conditionMet) {
                await pool.query('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)', [userId, badge.id]);
                console.log(`✔ User ${userId} unlocked badge: ${badge.name}`);
            }
        }
    } catch (err) {
        console.error('Error checking user badges:', err);
    }
}

async function logUserActivity(userId, activityType) {
    const today = new Date().toISOString().slice(0, 10);
    try {
        // 1. Log activity
        await pool.query(
            'INSERT INTO user_activity_log (user_id, activity_type, activity_date) VALUES (?, ?, ?)',
            [userId, activityType, today]
        );

        // 2. Update Daily Streak
        const [streakRow] = await pool.query('SELECT current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = ?', [userId]);
        if (streakRow.length === 0) {
            await pool.query(
                'INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date) VALUES (?, 1, 1, ?)',
                [userId, today]
            );
        } else {
            const streak = streakRow[0];
            const lastDate = new Date(streak.last_activity_date);
            const currentDate = new Date(today);
            const diffTime = Math.abs(currentDate - lastDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 1) {
                const newStreak = streak.current_streak + 1;
                const newLongest = Math.max(streak.longest_streak, newStreak);
                await pool.query(
                    'UPDATE user_streaks SET current_streak = ?, longest_streak = ?, last_activity_date = ? WHERE user_id = ?',
                    [newStreak, newLongest, today, userId]
                );
            } else if (diffDays > 1) {
                await pool.query(
                    'UPDATE user_streaks SET current_streak = 1, last_activity_date = ? WHERE user_id = ?',
                    [today, userId]
                );
            }
        }

        // 3. Trigger badge check
        await checkAndUnlockBadges(userId);
    } catch (err) {
        console.error('Error logging user activity:', err);
    }
}

// ═══════════════════════════════════════
// API ROUTES: GAMIFICATION & ACTIVITIES
// ═══════════════════════════════════════

// Get user contributions for the heatmap calendar
app.get('/api/users/contributions', authMiddleware, async (req, res) => {
    try {
        const currentYear = new Date().getFullYear();
        const [rows] = await pool.query(
            `SELECT activity_date, activity_type, COUNT(*) as count 
             FROM user_activity_log 
             WHERE user_id = ? AND YEAR(activity_date) = ?
             GROUP BY activity_date, activity_type 
             ORDER BY activity_date ASC`,
            [req.user.id, currentYear]
        );
        // Also count total distinct active days for the year
        const [activeDaysResult] = await pool.query(
            `SELECT COUNT(DISTINCT activity_date) as active_days 
             FROM user_activity_log 
             WHERE user_id = ? AND YEAR(activity_date) = ?`,
            [req.user.id, currentYear]
        );
        res.json({
            activities: rows,
            active_days: activeDaysResult[0]?.active_days || 0
        });
    } catch (err) {
        console.error('Contributions API Error:', err);
        res.status(500).json({ error: 'Failed to fetch contributions.' });
    }
});

// Get user badges
app.get('/api/users/badges', authMiddleware, async (req, res) => {
    try {
        const [allBadges] = await pool.query('SELECT id, name, description, icon, color_theme, rule_type, rule_threshold FROM badges');
        const [unlockedRows] = await pool.query('SELECT badge_id, unlocked_at FROM user_badges WHERE user_id = ?', [req.user.id]);
        
        const unlockedMap = {};
        unlockedRows.forEach(row => {
            unlockedMap[row.badge_id] = row.unlocked_at;
        });

        const badges = allBadges.map(badge => ({
            ...badge,
            unlocked: typeof unlockedMap[badge.id] !== 'undefined',
            unlocked_at: unlockedMap[badge.id] || null
        }));

        res.json(badges);
    } catch (err) {
        console.error('Badges API Error:', err);
        res.status(500).json({ error: 'Failed to fetch badges.' });
    }
});

// Get user streak details
app.get('/api/users/streak', authMiddleware, async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT current_streak, longest_streak, last_activity_date FROM user_streaks WHERE user_id = ?', [req.user.id]);
        if (rows.length === 0) {
            return res.json({ current_streak: 0, longest_streak: 0, last_activity_date: null });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Streak API Error:', err);
        res.status(500).json({ error: 'Failed to fetch streak.' });
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

        logUserActivity(req.user.id, 'run_visualizer').catch(err => console.error(err));

        res.json({ visualizer_runs: users[0].visualizer_runs });
    } catch (err) {
        console.error('Increment Runs API Error:', err);
        res.status(500).json({ error: 'Failed to increment visualizer execution count.' });
    }
});

// Increment user active time spent (in seconds)
app.post('/api/users/increment-time', authMiddleware, async (req, res) => {
    const { seconds } = req.body;
    const increment = parseInt(seconds, 10) || 0;
    if (increment <= 0) {
        return res.status(400).json({ error: 'Invalid time increment value.' });
    }

    try {
        await pool.query(
            'UPDATE users SET time_spent = time_spent + ? WHERE id = ?',
            [increment, req.user.id]
        );

        const [users] = await pool.query('SELECT time_spent FROM users WHERE id = ?', [req.user.id]);
        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found.' });
        }

        checkAndUnlockBadges(req.user.id).catch(err => console.error(err));

        res.json({ time_spent: users[0].time_spent });
    } catch (err) {
        console.error('Increment Time API Error:', err);
        res.status(500).json({ error: 'Failed to update time spent.' });
    }
});

// Proxy NVIDIA models request to bypass CORS
app.get('/api/nvidia/models', authMiddleware, async (req, res) => {
    const authHeader = req.headers['x-nvidia-authorization'];
    if (!authHeader) {
        return res.status(400).json({ error: 'NVIDIA Authorization key is required' });
    }

    try {
        const response = await fetch('https://integrate.api.nvidia.com/v1/models', {
            headers: {
                'Authorization': authHeader
            }
        });
        
        const data = await response.json();
        res.status(response.status).json(data);
    } catch (err) {
        console.error('NVIDIA Proxy Models Error:', err);
        res.status(500).json({ error: 'Failed to proxy request to NVIDIA API' });
    }
});

// Proxy NVIDIA chat completions request to bypass CORS (supports streaming)
app.post('/api/nvidia/chat/completions', authMiddleware, async (req, res) => {
    const authHeader = req.headers['x-nvidia-authorization'];
    if (!authHeader) {
        return res.status(400).json({ error: 'NVIDIA Authorization key is required' });
    }

    const isStreaming = req.body.stream === true;

    try {
        console.log(`[NVIDIA Proxy] Sending ${isStreaming ? 'streaming' : 'non-streaming'} request to NVIDIA API (model: ${req.body.model})`);
        const startTime = Date.now();

        const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': authHeader
            },
            body: JSON.stringify(req.body)
        });

        console.log(`[NVIDIA Proxy] Got response status ${response.status} in ${Date.now() - startTime}ms`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: { message: `HTTP ${response.status}` } }));
            return res.status(response.status).json(errorData);
        }

        if (isStreaming && response.body) {
            // Pipe SSE stream directly through to the client
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders(); // Flush headers to resolve client's fetch promise immediately

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(decoder.decode(value, { stream: true }));
                }
            } catch (streamErr) {
                console.error('[NVIDIA Proxy] Stream read error:', streamErr.message);
            } finally {
                res.end();
                console.log(`[NVIDIA Proxy] Stream completed in ${Date.now() - startTime}ms`);
            }
        } else {
            const data = await response.json();
            console.log(`[NVIDIA Proxy] Non-streaming completed in ${Date.now() - startTime}ms`);
            res.status(response.status).json(data);
        }
    } catch (err) {
        console.error('NVIDIA Proxy Completions Error:', err);
        res.status(500).json({ error: 'Failed to proxy request to NVIDIA API' });
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
